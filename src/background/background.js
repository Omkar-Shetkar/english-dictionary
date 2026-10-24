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

export const CONTEXT_MENU_ID = 'simple-dict-lookup';

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
 * Dispatches context menu click event to active tab.
 */
export async function handleContextMenuClick(info, tab) {
  if (!info || info.menuItemId !== CONTEXT_MENU_ID || !info.selectionText || !tab?.id) {
    return;
  }

  const payload = {
    action: 'TRIGGER_SELECTION_LOOKUP',
    payload: {
      term: info.selectionText
    }
  };

  const tabsApi = typeof browser !== 'undefined' && browser.tabs ? browser.tabs : (typeof chrome !== 'undefined' ? chrome.tabs : null);
  if (!tabsApi) return;

  if (typeof browser !== 'undefined' && browser.tabs?.sendMessage) {
    try {
      await browser.tabs.sendMessage(tab.id, payload);
    } catch (err) {
      console.warn('[Dictionary Addon] Context menu message send error:', err);
    }
  } else if (typeof chrome !== 'undefined' && chrome.tabs?.sendMessage) {
    chrome.tabs.sendMessage(tab.id, payload, () => {
      if (chrome.runtime?.lastError) {
        // Suppress expected frame unreachability
      }
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

setupContextMenu();

const runtimeApi = typeof browser !== 'undefined' ? browser.runtime : (typeof chrome !== 'undefined' ? chrome.runtime : null);
if (runtimeApi && runtimeApi.onInstalled) {
  runtimeApi.onInstalled.addListener(() => {
    setupContextMenu();
  });
}

console.log('[Simple English Dictionary] Background service initialized.');
