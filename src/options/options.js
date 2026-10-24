/**
 * Options page controller: Loads, binds, and persists user settings,
 * and provides live interactive testing of dictionary popups.
 */

import { getSettings, saveSettings, matchesModifier } from '../common/storage.js';
import { sanitizeDomainTerm } from '../common/sanitize.js';
import { calculatePopupPosition } from '../common/position.js';
import { PopupView } from '../content/popup-view.js';
import { FloatingIcon } from '../content/floating-icon.js';
import { POPUP_STYLES } from '../content/popup-styles.js';
import { lookupDomainTerm } from '../background/dictionary-service.js';

const popupView = new PopupView();
popupView.setStyles(POPUP_STYLES);

const floatingIcon = new FloatingIcon();
floatingIcon.setStyles(POPUP_STYLES);

let saveTimeout = null;
let hintTimeout = null;

let activeConfig = {
  modifierKey: 'none',
  enabled: true,
  theme: 'auto',
  multiWordEnabled: true,
  domainBadgesEnabled: true
};

function flashSavedBadge() {
  const badge = document.getElementById('saveStatus');
  if (!badge) return;

  badge.classList.add('visible');
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    badge.classList.remove('visible');
  }, 1600);
}

function showHint(message) {
  const hintEl = document.getElementById('testHint');
  if (!hintEl) return;

  hintEl.textContent = message;
  hintEl.classList.add('visible');

  if (hintTimeout) clearTimeout(hintTimeout);
  hintTimeout = setTimeout(() => {
    hintEl.classList.remove('visible');
  }, 2800);
}

async function sendBackgroundMessage(payload) {
  if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
    try {
      const res = await browser.runtime.sendMessage(payload);
      if (res !== undefined) return res;
    } catch (err) {
      console.warn('[Dictionary Addon] browser.runtime.sendMessage error:', err);
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      return await new Promise((resolve) => {
        chrome.runtime.sendMessage(payload, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ status: 'error', errorMessage: chrome.runtime.lastError.message });
          } else {
            resolve(response || { status: 'error', errorMessage: 'Empty response' });
          }
        });
      });
    } catch (err) {
      console.warn('[Dictionary Addon] chrome.runtime.sendMessage error:', err);
    }
  }

  // Fallback to direct lookup if extension background message channel is unreachable
  if (payload.action === 'LOOKUP_DOMAIN_TERM' && payload.payload) {
    return lookupDomainTerm(payload.payload);
  }

  return { status: 'error', errorMessage: 'Extension runtime not available.' };
}

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
      const msg = response?.errorMessage || `No definitions found for "${word}".`;
      popupView.showError(msg, word, coords, activeConfig.theme);
      return;
    }

    const entry = response.entry || response.data;
    popupView.showResult(entry, coords, activeConfig.theme, activeConfig);
  } catch (err) {
    popupView.showError('Unable to connect to dictionary service. Please check your internet connection.', word, coords, activeConfig.theme);
  }
}

async function handleDoubleClick(event) {
  if (!activeConfig.enabled) {
    const sandbox = document.querySelector('.test-sandbox');
    if (sandbox && (sandbox.contains(event.target) || event.target.closest('.test-area'))) {
      showHint('⚠️ Double-Click Lookup is currently disabled above.');
    }
    return;
  }

  if (!matchesModifier(event, activeConfig.modifierKey)) {
    const sandbox = document.querySelector('.test-sandbox');
    if (sandbox && (sandbox.contains(event.target) || event.target.closest('.test-area'))) {
      const keyName = activeConfig.modifierKey === 'alt' ? 'Alt / Option'
        : activeConfig.modifierKey === 'ctrl' ? 'Ctrl / Cmd'
        : activeConfig.modifierKey === 'shift' ? 'Shift' : '';
      showHint(`💡 Hold the [${keyName}] key while double-clicking to trigger lookup.`);
    }
    return;
  }

  let text = '';
  let anchorRect = null;

  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    text = selection.toString();
    const range = selection.getRangeAt(0);
    anchorRect = range.getBoundingClientRect();
  }

  // If selection text is empty or clicked directly on a demo word
  if (!text.trim() && event.target && event.target.classList.contains('demo-word')) {
    text = event.target.textContent;
    anchorRect = event.target.getBoundingClientRect();
  }

  const sanitized = sanitizeDomainTerm(text);
  if (!sanitized.isValid || !sanitized.cleanTerm) {
    return;
  }

  if (!anchorRect || (anchorRect.width === 0 && anchorRect.height === 0)) {
    if (event.target && typeof event.target.getBoundingClientRect === 'function') {
      anchorRect = event.target.getBoundingClientRect();
    } else {
      return;
    }
  }

  floatingIcon.dismiss();
  await performLookup(sanitized, anchorRect);
}

function handleMouseUp(event) {
  if (!activeConfig.enabled || !activeConfig.multiWordEnabled) {
    return;
  }

  const sandbox = document.querySelector('.test-sandbox');
  if (!sandbox || (!sandbox.contains(event.target) && !event.target.closest('.test-area'))) {
    return;
  }

  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      floatingIcon.dismiss();
      return;
    }

    const text = selection.toString();
    const sanitized = sanitizeDomainTerm(text);

    if (!sanitized.isValid || sanitized.wordCount < 2 || sanitized.wordCount > 4) {
      floatingIcon.dismiss();
      return;
    }

    const range = selection.getRangeAt(0);
    const anchorRect = range.getBoundingClientRect();
    if (anchorRect.width === 0 && anchorRect.height === 0) {
      floatingIcon.dismiss();
      return;
    }

    const hasModifier = activeConfig.modifierKey !== 'none' && matchesModifier(event, activeConfig.modifierKey);
    if (hasModifier) {
      floatingIcon.dismiss();
      performLookup(sanitized, anchorRect);
      return;
    }

    let top = anchorRect.top - 34;
    if (top < 10) top = anchorRect.bottom + 6;
    let left = Math.min(anchorRect.right + 4, window.innerWidth - 36);
    top = Math.max(8, Math.min(top, window.innerHeight - 36));
    left = Math.max(8, Math.min(left, window.innerWidth - 36));

    floatingIcon.show({ top, left }, () => {
      performLookup(sanitized, anchorRect);
    });
  }, 10);
}

async function initializeOptions() {
  const toggleEnabled = document.getElementById('toggleEnabled');
  const toggleMultiWord = document.getElementById('toggleMultiWord');
  const toggleDomainBadges = document.getElementById('toggleDomainBadges');
  const themeSelect = document.getElementById('themeSelect');
  const modifierRadios = document.querySelectorAll('input[name="modifierKey"]');

  // Load current configuration
  try {
    activeConfig = await getSettings();
  } catch (err) {
    console.warn('[Dictionary Addon] Failed to load settings:', err);
  }

  // Populate controls
  if (toggleEnabled) {
    toggleEnabled.checked = activeConfig.enabled;
  }

  if (toggleMultiWord) {
    toggleMultiWord.checked = activeConfig.multiWordEnabled;
  }

  if (toggleDomainBadges) {
    toggleDomainBadges.checked = activeConfig.domainBadgesEnabled;
  }

  if (themeSelect) {
    themeSelect.value = activeConfig.theme;
  }

  for (const radio of modifierRadios) {
    if (radio.value === activeConfig.modifierKey) {
      radio.checked = true;
    }
  }

  // Handle master toggle change
  if (toggleEnabled) {
    toggleEnabled.addEventListener('change', async () => {
      activeConfig.enabled = toggleEnabled.checked;
      await saveSettings({ enabled: toggleEnabled.checked });
      flashSavedBadge();
    });
  }

  // Handle multi-word toggle change
  if (toggleMultiWord) {
    toggleMultiWord.addEventListener('change', async () => {
      activeConfig.multiWordEnabled = toggleMultiWord.checked;
      await saveSettings({ multiWordEnabled: toggleMultiWord.checked });
      flashSavedBadge();
    });
  }

  // Handle domain badges toggle change
  if (toggleDomainBadges) {
    toggleDomainBadges.addEventListener('change', async () => {
      activeConfig.domainBadgesEnabled = toggleDomainBadges.checked;
      await saveSettings({ domainBadgesEnabled: toggleDomainBadges.checked });
      flashSavedBadge();
    });
  }

  // Handle modifier key radio change
  for (const radio of modifierRadios) {
    radio.addEventListener('change', async () => {
      if (radio.checked) {
        activeConfig.modifierKey = radio.value;
        await saveSettings({ modifierKey: radio.value });
        flashSavedBadge();
      }
    });
  }

  // Handle theme select change
  if (themeSelect) {
    themeSelect.addEventListener('change', async () => {
      activeConfig.theme = themeSelect.value;
      await saveSettings({ theme: themeSelect.value });
      flashSavedBadge();
    });
  }

  // Update local file access status badge
  await updateFileAccessStatus();

  // Attach handlers for live sandbox testing
  document.addEventListener('dblclick', handleDoubleClick);
  document.addEventListener('mouseup', handleMouseUp);
}

/**
 * Checks whether the extension has permission to access file:// URLs.
 * @returns {Promise<boolean>}
 */
export async function checkFileSchemeAccess() {
  const extensionApi = typeof browser !== 'undefined' ? browser.extension : (typeof chrome !== 'undefined' ? chrome.extension : null);
  if (!extensionApi || !extensionApi.isAllowedFileSchemeAccess) {
    return false;
  }
  return new Promise((resolve) => {
    try {
      extensionApi.isAllowedFileSchemeAccess((isAllowed) => {
        resolve(Boolean(isAllowed));
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Updates the file access status badge and explanation in options UI.
 */
export async function updateFileAccessStatus() {
  const badgeEl = document.getElementById('fileAccessBadge');
  const detailsEl = document.getElementById('fileAccessDetails');
  if (!badgeEl) return;

  const isAllowed = await checkFileSchemeAccess();
  if (isAllowed) {
    badgeEl.className = 'status-pill status-enabled';
    badgeEl.textContent = 'Enabled';
    if (detailsEl) {
      detailsEl.textContent = 'Local file access is active. Double-click and context menu dictionary lookups work on local PDFs opened from your computer.';
    }
  } else {
    badgeEl.className = 'status-pill status-disabled';
    badgeEl.textContent = 'Disabled';
    if (detailsEl) {
      detailsEl.textContent = 'Local file access is not enabled. Follow the steps below in your browser extension manager to enable lookups on local PDF files.';
    }
  }
}

document.addEventListener('DOMContentLoaded', initializeOptions);

