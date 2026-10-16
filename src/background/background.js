/**
 * Background Service Worker / Event Script.
 * Coordinates dictionary API lookups and configuration requests.
 */

import { lookupWord } from './dictionary-service.js';
import { getSettings } from '../common/storage.js';

async function handleMessage(message, sender) {
  if (!message || typeof message !== 'object') {
    return { status: 'error', errorMessage: 'Invalid message payload' };
  }

  switch (message.action) {
    case 'LOOKUP_WORD': {
      const { word } = message;
      return await lookupWord(word);
    }

    case 'GET_CONFIG': {
      return await getSettings();
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

console.log('[English Dictionary] Background service initialized.');
