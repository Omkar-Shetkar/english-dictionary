import { sanitizeDomainTerm } from '../common/sanitize.js';
import { calculatePopupPosition } from '../common/position.js';
import { matchesModifier, getSettings } from '../common/storage.js';
import { PopupView } from './popup-view.js';
import { FloatingIcon } from './floating-icon.js';
import { POPUP_STYLES } from './popup-styles.js';

const popupView = new PopupView();
popupView.setStyles(POPUP_STYLES);

const floatingIcon = new FloatingIcon();
floatingIcon.setStyles(POPUP_STYLES);

// In-memory cached configuration for fast synchronous event checks
let activeConfig = {
  modifierKey: 'none',
  enabled: true,
  theme: 'auto',
  multiWordEnabled: true,
  domainBadgesEnabled: true
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
 * Coordinates dictionary lookup and rendering.
 * @param {object} sanitized
 * @param {DOMRect} anchorRect
 */
async function performLookup(sanitized, anchorRect) {
  const word = sanitized.cleanTerm;
  const coords = calculatePopupPosition({
    anchorRect,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  });

  popupView.showLoading(word, coords, activeConfig.theme);

  try {
    const response = await sendBackgroundMessage({
      action: 'LOOKUP_DOMAIN_TERM',
      payload: {
        term: sanitized.cleanTerm,
        rawText: sanitized.raw,
        isUppercase: sanitized.isUppercase,
        wordCount: sanitized.wordCount
      }
    });

    if (!response || response.status !== 'success') {
      const msg = response?.errorMessage || `No definitions found for "${word}". Check spelling.`;
      popupView.showError(msg, word, coords, activeConfig.theme);
      return;
    }

    const entry = response.entry || response.data;
    popupView.showResult(entry, coords, activeConfig.theme, activeConfig);
  } catch (err) {
    popupView.showError('Unable to connect to dictionary service. Please check your internet connection.', word, coords, activeConfig.theme);
  }
}

/**
 * Resolves the best anchor rect for selection in standard DOM and PDF text layers.
 * @param {Selection} selection
 * @param {MouseEvent} [event]
 * @returns {DOMRect|object}
 */
function resolveAnchorRect(selection, event) {
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      return rect;
    }
    const clientRects = range.getClientRects();
    if (clientRects.length > 0 && (clientRects[0].width > 0 || clientRects[0].height > 0)) {
      return clientRects[0];
    }
  }

  if (event && event.target && typeof event.target.getBoundingClientRect === 'function') {
    const targetRect = event.target.getBoundingClientRect();
    if (targetRect.width > 0 && targetRect.height > 0) {
      return targetRect;
    }
  }

  if (event && typeof event.clientX === 'number') {
    return { top: event.clientY, bottom: event.clientY, left: event.clientX, right: event.clientX, width: 0, height: 0 };
  }

  return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
}

/**
 * Main double-click event listener for single-word lookup.
 * Includes settlement delay for PDF.js text layer selection models.
 */
document.addEventListener('dblclick', (event) => {
  if (!activeConfig.enabled) {
    return;
  }

  if (!matchesModifier(event, activeConfig.modifierKey)) {
    return;
  }

  // Brief delay to allow PDF text layer selection model to settle
  setTimeout(async () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const rawText = selection.toString();
    const sanitized = sanitizeDomainTerm(rawText);

    if (!sanitized.isValid || !sanitized.cleanTerm) {
      return;
    }

    const anchorRect = resolveAnchorRect(selection, event);

    floatingIcon.dismiss();
    await performLookup(sanitized, anchorRect);
  }, 15);
});

/**
 * Multi-word drag-selection listener (2 to 4 words).
 */
document.addEventListener('mouseup', (event) => {
  if (!activeConfig.enabled || !activeConfig.multiWordEnabled) {
    return;
  }

  if (event.target && event.target.id && String(event.target.id).startsWith('eng-dict-')) {
    return;
  }

  // Slight timeout to let selection settle
  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      floatingIcon.dismiss();
      return;
    }

    const rawText = selection.toString();
    const sanitized = sanitizeDomainTerm(rawText);

    // Only trigger for 2 to 4 word phrases
    if (!sanitized.isValid || sanitized.wordCount < 2 || sanitized.wordCount > 4) {
      floatingIcon.dismiss();
      return;
    }

    const anchorRect = resolveAnchorRect(selection, event);
    if (anchorRect.width === 0 && anchorRect.height === 0 && !anchorRect.left) {
      floatingIcon.dismiss();
      return;
    }

    // Direct modifier trigger if configured
    const hasModifier = activeConfig.modifierKey !== 'none' && matchesModifier(event, activeConfig.modifierKey);
    if (hasModifier) {
      floatingIcon.dismiss();
      performLookup(sanitized, anchorRect);
      return;
    }

    // Compute floating icon coordinates
    let top = anchorRect.top - 34;
    if (top < 10) {
      top = anchorRect.bottom + 6;
    }
    let left = Math.min(anchorRect.right + 4, window.innerWidth - 36);
    top = Math.max(8, Math.min(top, window.innerHeight - 36));
    left = Math.max(8, Math.min(left, window.innerWidth - 36));

    floatingIcon.show({ top, left }, () => {
      performLookup(sanitized, anchorRect);
    });
  }, 15);
});

// Runtime message listener for context menu lookups
const runtimeMsgApi = typeof browser !== 'undefined' ? browser.runtime : (typeof chrome !== 'undefined' ? chrome.runtime : null);
if (runtimeMsgApi && runtimeMsgApi.onMessage) {
  runtimeMsgApi.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.action === 'TRIGGER_SELECTION_LOOKUP') {
      const termToQuery = message.payload?.term || (typeof window !== 'undefined' && window.getSelection ? window.getSelection().toString() : '');
      const sanitized = sanitizeDomainTerm(termToQuery);

      if (!sanitized.isValid || !sanitized.cleanTerm) {
        if (sendResponse) sendResponse({ status: 'ignored', reason: 'Invalid or empty term' });
        return;
      }

      const selection = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
      const anchorRect = resolveAnchorRect(selection);

      floatingIcon.dismiss();
      performLookup(sanitized, anchorRect);
      if (sendResponse) sendResponse({ status: 'success' });
    }
  });
}

