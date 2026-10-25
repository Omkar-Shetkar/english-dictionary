import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setupContextMenu,
  handleContextMenuClick,
  CONTEXT_MENU_ID,
  isPrivilegedOrPdfUrl,
  openLookupWindow
} from '../../src/background/background.js';

describe('Context Menu Selection Lookup', () => {
  let mockContextMenus;
  let mockTabs;
  let mockWindows;

  beforeEach(() => {
    mockContextMenus = {
      create: vi.fn((opts, cb) => { if (cb) cb(); }),
      removeAll: vi.fn((cb) => { if (cb) cb(); }),
      onClicked: { addListener: vi.fn() }
    };

    mockTabs = {
      sendMessage: vi.fn((tabId, payload, cb) => {
        if (cb) cb({ status: 'success' });
      }),
      create: vi.fn((opts, cb) => {
        const t = { id: 202 };
        if (cb) cb(t);
        return Promise.resolve(t);
      })
    };

    mockWindows = {
      create: vi.fn((opts, cb) => {
        const win = { id: 101 };
        if (cb) cb(win);
        return Promise.resolve(win);
      }),
      update: vi.fn((id, opts, cb) => {
        const win = { id };
        if (cb) cb(win);
        return Promise.resolve(win);
      }),
      onRemoved: { addListener: vi.fn() }
    };

    globalThis.chrome = {
      contextMenus: mockContextMenus,
      tabs: mockTabs,
      windows: mockWindows,
      runtime: {
        lastError: null,
        getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
        onMessage: { addListener: vi.fn() }
      }
    };
  });

  it('registers the context menu item with selection context', () => {
    setupContextMenu();

    expect(mockContextMenus.removeAll).toHaveBeenCalled();
    expect(mockContextMenus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: CONTEXT_MENU_ID,
        contexts: ['selection']
      }),
      expect.any(Function)
    );
  });

  it('correctly identifies PDF documents and privileged URLs', () => {
    expect(isPrivilegedOrPdfUrl('file:///Users/omkar/document.pdf')).toBe(true);
    expect(isPrivilegedOrPdfUrl('https://example.com/research-paper.pdf')).toBe(true);
    expect(isPrivilegedOrPdfUrl('https://example.com/doc.pdf?version=2')).toBe(true);
    expect(isPrivilegedOrPdfUrl('resource://pdf.js/web/viewer.html')).toBe(true);
    expect(isPrivilegedOrPdfUrl('about:reader?url=https...')).toBe(true);

    expect(isPrivilegedOrPdfUrl('https://en.wikipedia.org/wiki/Quantum_mechanics')).toBe(false);
    expect(isPrivilegedOrPdfUrl('http://localhost:3000/dashboard')).toBe(false);
    expect(isPrivilegedOrPdfUrl(undefined)).toBe(false);
  });

  it('dispatches TRIGGER_SELECTION_LOOKUP to the active tab upon click for standard web pages', async () => {
    const info = {
      menuItemId: CONTEXT_MENU_ID,
      selectionText: 'hypothesis'
    };
    const tab = { id: 42, url: 'https://en.wikipedia.org/wiki/Science' };

    await handleContextMenuClick(info, tab);

    expect(mockTabs.sendMessage).toHaveBeenCalledWith(
      42,
      {
        action: 'TRIGGER_SELECTION_LOOKUP',
        payload: {
          term: 'hypothesis'
        }
      },
      expect.any(Function)
    );
  });

  it('immediately opens the floating lookup window when on a PDF document', async () => {
    const info = {
      menuItemId: CONTEXT_MENU_ID,
      selectionText: 'mitochondria'
    };
    const tab = { id: 42, url: 'file:///Users/omkar/biology-notes.pdf' };

    await handleContextMenuClick(info, tab);

    // Should NOT call sendMessage because content scripts are restricted on PDF documents
    expect(mockTabs.sendMessage).not.toHaveBeenCalled();
    expect(mockWindows.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('options/lookup.html?term=mitochondria'),
        type: 'popup'
      }),
      expect.any(Function)
    );
  });

  it('falls back to the floating lookup window when content script sendMessage fails', async () => {
    mockTabs.sendMessage = vi.fn((tabId, payload, callback) => {
      chrome.runtime.lastError = { message: 'Receiving end does not exist' };
      if (callback) callback();
      chrome.runtime.lastError = null;
    });

    const info = {
      menuItemId: CONTEXT_MENU_ID,
      selectionText: 'serendipity'
    };
    const tab = { id: 99, url: 'https://restricted-internal-page.com' };

    await handleContextMenuClick(info, tab);

    expect(mockTabs.sendMessage).toHaveBeenCalled();
    expect(mockWindows.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('options/lookup.html?term=serendipity'),
        type: 'popup'
      }),
      expect.any(Function)
    );
  });

  it('ignores clicks for other menu items or empty selections', async () => {
    await handleContextMenuClick({ menuItemId: 'other-id', selectionText: 'word' }, { id: 10 });
    expect(mockTabs.sendMessage).not.toHaveBeenCalled();
    expect(mockWindows.create).not.toHaveBeenCalled();

    await handleContextMenuClick({ menuItemId: CONTEXT_MENU_ID, selectionText: '' }, { id: 10 });
    expect(mockTabs.sendMessage).not.toHaveBeenCalled();
    expect(mockWindows.create).not.toHaveBeenCalled();

    await handleContextMenuClick({ menuItemId: CONTEXT_MENU_ID, selectionText: 'word' }, null);
    expect(mockTabs.sendMessage).not.toHaveBeenCalled();
    expect(mockWindows.create).not.toHaveBeenCalled();
  });
});

