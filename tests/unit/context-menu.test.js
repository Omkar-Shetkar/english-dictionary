import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupContextMenu, handleContextMenuClick, CONTEXT_MENU_ID } from '../../src/background/background.js';

describe('Context Menu Selection Lookup', () => {
  let mockContextMenus;
  let mockTabs;

  beforeEach(() => {
    mockContextMenus = {
      create: vi.fn((opts, cb) => { if (cb) cb(); }),
      removeAll: vi.fn((cb) => { if (cb) cb(); }),
      onClicked: { addListener: vi.fn() }
    };

    mockTabs = {
      sendMessage: vi.fn()
    };

    globalThis.chrome = {
      contextMenus: mockContextMenus,
      tabs: mockTabs,
      runtime: { lastError: null, onMessage: { addListener: vi.fn() } }
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

  it('dispatches TRIGGER_SELECTION_LOOKUP to the active tab upon click', async () => {
    const info = {
      menuItemId: CONTEXT_MENU_ID,
      selectionText: 'hypothesis'
    };
    const tab = { id: 42 };

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

  it('ignores clicks for other menu items or empty selections', async () => {
    await handleContextMenuClick({ menuItemId: 'other-id', selectionText: 'word' }, { id: 10 });
    expect(mockTabs.sendMessage).not.toHaveBeenCalled();

    await handleContextMenuClick({ menuItemId: CONTEXT_MENU_ID, selectionText: '' }, { id: 10 });
    expect(mockTabs.sendMessage).not.toHaveBeenCalled();

    await handleContextMenuClick({ menuItemId: CONTEXT_MENU_ID, selectionText: 'word' }, null);
    expect(mockTabs.sendMessage).not.toHaveBeenCalled();
  });
});
