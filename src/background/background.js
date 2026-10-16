/**
 * Background Service Worker / Event Script.
 * Coordinates dictionary API lookups and configuration requests.
 */

import { lookupWord } from './dictionary-service.js';
import { getSettings } from '../common/storage.js';

// Resolve browser / chrome runtime namespace
const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

/**
 * Handle incoming messages from content scripts and options UI.
 */
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

// Register listener with promise return support (Firefox WebExtensions)
runtime.onMessage.addListener((message, sender, sendResponse) => {
  // If the consumer uses sendResponse (Chrome callback style) or returns a Promise (Firefox style)
  const promise = handleMessage(message, sender);

  // Returning a Promise tells Firefox to wait for the resolution
  if (typeof sendResponse === 'function') {
    promise.then(sendResponse).catch((err) => {
      sendResponse({ status: 'error', errorMessage: err.message || 'Internal background error' });
    });
    return true; // Keep channel open for async response in Chrome
  }

  return promise;
});

console.log('[English Dictionary] Background service initialized.');
