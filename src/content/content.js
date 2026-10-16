/**
 * Content Script: Double-click detector and popup coordinator.
 * Injected into web pages to listen for word selections and render dictionary popups.
 */

import { sanitizeWord } from '../common/sanitize.js';
import { calculatePopupPosition } from '../common/position.js';
import { matchesModifier, getSettings } from '../common/storage.js';
import { PopupView } from './popup-view.js';
import { POPUP_STYLES } from './popup-styles.js';

const popupView = new PopupView();
popupView.setStyles(POPUP_STYLES);

// In-memory cached configuration for fast synchronous event checks
let activeConfig = {
  modifierKey: 'none',
  enabled: true,
  theme: 'auto'
};

/**
 * Synchronize settings from storage.
 */
async function syncConfig() {
  try {
    activeConfig = await getSettings();
  } catch (err) {
    console.warn('[Dictionary Addon] Failed to sync config:', err);
  }
}

// Initial config fetch
syncConfig();

// Listen for live configuration updates
const storageArea = typeof browser !== 'undefined' ? browser.storage : (typeof chrome !== 'undefined' ? chrome.storage : null);
if (storageArea && storageArea.onChanged) {
  storageArea.onChanged.addListener((changes) => {
    if (changes.settings?.newValue) {
      activeConfig = changes.settings.newValue;
    }
  });
}

/**
 * Safe message dispatcher supporting Firefox native promises and Chrome callback styles.
 * @param {object} payload
 * @returns {Promise<object>}
 */
async function sendBackgroundMessage(payload) {
  if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
    try {
      const res = await browser.runtime.sendMessage(payload);
      if (res !== undefined) {
        return res;
      }
    } catch (err) {
      console.warn('[Dictionary Addon] browser.runtime.sendMessage error:', err);
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ status: 'error', errorMessage: chrome.runtime.lastError.message });
        } else {
          resolve(response || { status: 'error', errorMessage: 'Empty response from background service' });
        }
      });
    });
  }

  return { status: 'error', errorMessage: 'Extension runtime not available.' };
}

/**
 * Main double-click event listener.
 */
document.addEventListener('dblclick', async (event) => {
  // If extension is disabled by user, ignore
  if (!activeConfig.enabled) {
    return;
  }

  // Validate modifier key combination (none, alt, ctrl, shift)
  if (!matchesModifier(event, activeConfig.modifierKey)) {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const rawText = selection.toString();
  const { isValid, word } = sanitizeWord(rawText);

  // If not a valid word, do nothing (preserves standard text selection)
  if (!isValid || !word) {
    return;
  }

  const range = selection.getRangeAt(0);
  const anchorRect = range.getBoundingClientRect();

  // If anchor rectangle is invisible or zero-sized, skip
  if (anchorRect.width === 0 && anchorRect.height === 0) {
    return;
  }

  // Calculate boundary-aware coordinates
  const coords = calculatePopupPosition({
    anchorRect,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  });

  // Immediately render loading card for instant user feedback (<16ms)
  popupView.showLoading(word, coords, activeConfig.theme);

  try {
    const response = await sendBackgroundMessage({
      action: 'LOOKUP_WORD',
      word
    });

    if (!response || response.status !== 'success') {
      const msg = response?.errorMessage || `No definitions found for "${word}". Check spelling.`;
      popupView.showError(msg, word, coords, activeConfig.theme);
      return;
    }

    // Render full definitions and pronunciation card
    popupView.showResult(response.entry, coords, activeConfig.theme);
  } catch (err) {
    popupView.showError('Unable to connect to dictionary service. Please check your internet connection.', word, coords, activeConfig.theme);
  }
});
