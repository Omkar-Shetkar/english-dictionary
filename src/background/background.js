/**
 * Background Service Worker / Event Script.
 * Coordinates dictionary API lookups and configuration requests.
 */

import { lookupWord, lookupDomainTerm } from './dictionary-service.js';
import { getSettings } from '../common/storage.js';

async function handleMessage(message, sender) {
  if (!message || typeof message !== 'object') {
    return { status: 'error', errorMessage: 'Invalid message payload' };
  }

  switch (message.action) {
    case 'LOOKUP_DOMAIN_TERM': {
      const payload = message.payload || message;
      const res = await lookupDomainTerm(payload);
      if (res && res.entry && !res.data) {
        res.data = res.entry;
      }
      return res;
    }

    case 'LOOKUP_WORD': {
      const { word } = message;
      return await lookupWord(word);
    }

    case 'GET_SETTINGS':
    case 'GET_CONFIG': {
      const data = await getSettings();
      return { status: 'success', data };
    }

    default:
      return { status: 'error', errorMessage: `Unknown action: ${message.action}` };
  }
}

// In Firefox, browser.runtime is native and promises are returned from the listener.
// In Chrome, chrome.runtime uses sendResponse callback and returns true.
const isFirefox = typeof browser !== 'undefined' && Boolean(browser.runtime?.id);

if (isFirefox) {
  browser.runtime.onMessage.addListener((message, sender) => {
    return handleMessage(message, sender);
  });
} else if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ status: 'error', errorMessage: err.message || 'Internal background error' }));
    return true;
  });
}

let activeLookupWindowId = null;

export const CONTEXT_MENU_ID = 'simple-dict-lookup';

/**
 * Checks if a URL represents a PDF document or privileged browser page
 * where content scripts are restricted by browser security policies.
 * @param {string} url
 * @returns {boolean}
 */
export function isPrivilegedOrPdfUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.pdf') ||
    lower.includes('.pdf?') ||
    lower.includes('.pdf#') ||
    lower.startsWith('resource://') ||
    lower.startsWith('about:') ||
    lower.startsWith('chrome:') ||
    lower.startsWith('view-source:')
  );
}

/**
 * Opens fallback lookup tab when windows.create is unavailable.
 */
export async function openLookupTab(url) {
  const tabsApi = typeof browser !== 'undefined' && browser.tabs
    ? browser.tabs
    : (typeof chrome !== 'undefined' && chrome.tabs ? chrome.tabs : null);

  if (tabsApi && typeof tabsApi.create === 'function') {
    return new Promise((resolve) => {
      const res = tabsApi.create({ url, active: true }, resolve);
      if (res instanceof Promise) res.then(resolve);
    });
  }
}

/**
 * Opens a dedicated, floating dictionary card popup window for looking up terms.
 * Used for PDF documents, privileged browser tabs, and when content scripts are unmounted.
 * @param {string} term
 */
export async function openLookupWindow(term) {
  const cleanTerm = (term || '').trim();
  const path = `options/lookup.html?term=${encodeURIComponent(cleanTerm)}`;
  const url = (typeof browser !== 'undefined' && browser.runtime?.getURL)
    ? browser.runtime.getURL(path)
    : (typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL(path)
        : path);

  const windowsApi = typeof browser !== 'undefined' && browser.windows
    ? browser.windows
    : (typeof chrome !== 'undefined' && chrome.windows ? chrome.windows : null);

  if (windowsApi && typeof windowsApi.create === 'function') {
    if (activeLookupWindowId !== null) {
      try {
        await new Promise((resolve, reject) => {
          const res = windowsApi.update(activeLookupWindowId, { focused: true }, (win) => {
            if (chrome?.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(win);
          });
          if (res instanceof Promise) res.then(resolve).catch(reject);
        });

        const tabsApi = typeof browser !== 'undefined' && browser.tabs
          ? browser.tabs
          : (typeof chrome !== 'undefined' && chrome.tabs ? chrome.tabs : null);

        if (tabsApi && typeof tabsApi.query === 'function') {
          const tabs = await new Promise((resolve) => {
            const res = tabsApi.query({ windowId: activeLookupWindowId }, resolve);
            if (res instanceof Promise) res.then(resolve);
          });
          if (Array.isArray(tabs) && tabs[0]?.id) {
            await new Promise((resolve) => {
              const res = tabsApi.update(tabs[0].id, { url }, resolve);
              if (res instanceof Promise) res.then(resolve);
            });
            return;
          }
        }
      } catch (e) {
        activeLookupWindowId = null;
      }
    }

    try {
      const win = await new Promise((resolve, reject) => {
        const createData = {
          url,
          type: 'popup',
          width: 390,
          height: 520,
          focused: true
        };
        const res = windowsApi.create(createData, (created) => {
          if (chrome?.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(created);
        });
        if (res instanceof Promise) res.then(resolve).catch(reject);
      });

      if (win?.id) {
        activeLookupWindowId = win.id;
      }
      return win;
    } catch (err) {
      return openLookupTab(url);
    }
  }

  return openLookupTab(url);
}

/**
 * Initializes context menu item for selected text.
 */
export function setupContextMenu() {
  const menusApi = typeof browser !== 'undefined' && browser.contextMenus
    ? browser.contextMenus
    : (typeof chrome !== 'undefined' && chrome.contextMenus ? chrome.contextMenus : null);

  if (!menusApi) return;

  const createItem = () => {
    try {
      menusApi.create({
        id: CONTEXT_MENU_ID,
        title: 'Look up "%s" in Simple English Dictionary',
        contexts: ['selection']
      }, () => {
        const lastErr = typeof chrome !== 'undefined' && chrome.runtime?.lastError;
        if (lastErr && !lastErr.message?.includes('duplicate')) {
          // Ignore duplicate id warnings on live extension reload
        }
      });
    } catch (e) {
      // Ignore synchronous duplicate item errors
    }
  };

  if (typeof menusApi.removeAll === 'function') {
    menusApi.removeAll(() => {
      createItem();
    });
  } else {
    createItem();
  }
}

/**
 * Dispatches context menu click event to active tab, or falls back to
 * standalone floating lookup window on PDFs and restricted pages.
 */
export async function handleContextMenuClick(info, tab) {
  if (!info || info.menuItemId !== CONTEXT_MENU_ID || !info.selectionText || !tab?.id) {
    return;
  }

  const selectionText = info.selectionText.trim();
  if (!selectionText) return;

  // On PDF tabs or privileged browser pages, content scripts cannot run.
  // Directly open the floating lookup window without delay.
  if (isPrivilegedOrPdfUrl(tab.url)) {
    return await openLookupWindow(selectionText);
  }

  const payload = {
    action: 'TRIGGER_SELECTION_LOOKUP',
    payload: {
      term: selectionText
    }
  };

  const tabsApi = typeof browser !== 'undefined' && browser.tabs ? browser.tabs : (typeof chrome !== 'undefined' ? chrome.tabs : null);
  if (!tabsApi) {
    return await openLookupWindow(selectionText);
  }

  if (typeof browser !== 'undefined' && browser.tabs?.sendMessage) {
    try {
      await browser.tabs.sendMessage(tab.id, payload);
    } catch (err) {
      // Content script unreachable (e.g. PDF viewer, local file without permissions, or un-injected page)
      return await openLookupWindow(selectionText);
    }
  } else if (typeof chrome !== 'undefined' && chrome.tabs?.sendMessage) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, payload, (response) => {
        if (chrome.runtime?.lastError) {
          openLookupWindow(selectionText).then(resolve);
        } else {
          resolve(response);
        }
      });
    });
  }
}

const menusApi = typeof browser !== 'undefined' && browser.contextMenus
  ? browser.contextMenus
  : (typeof chrome !== 'undefined' && chrome.contextMenus ? chrome.contextMenus : null);

if (menusApi && menusApi.onClicked) {
  menusApi.onClicked.addListener((info, tab) => {
    handleContextMenuClick(info, tab);
  });
}

const windowsApi = typeof browser !== 'undefined' && browser.windows
  ? browser.windows
  : (typeof chrome !== 'undefined' && chrome.windows ? chrome.windows : null);

if (windowsApi && windowsApi.onRemoved) {
  try {
    windowsApi.onRemoved.addListener((windowId) => {
      if (windowId === activeLookupWindowId) {
        activeLookupWindowId = null;
      }
    });
  } catch (e) {
    // Ignore in test environments
  }
}

setupContextMenu();

const runtimeApi = typeof browser !== 'undefined' ? browser.runtime : (typeof chrome !== 'undefined' ? chrome.runtime : null);
if (runtimeApi && runtimeApi.onInstalled) {
  runtimeApi.onInstalled.addListener(() => {
    setupContextMenu();
  });
}

console.log('[Simple English Dictionary] Background service initialized.');

