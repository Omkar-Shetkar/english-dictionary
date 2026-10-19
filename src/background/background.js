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

console.log('[English Dictionary] Background service initialized.');
