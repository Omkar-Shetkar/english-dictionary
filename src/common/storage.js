/**
 * Storage and Trigger Preference Helpers.
 * Manages user preferences stored in browser.storage.sync with local fallback.
 */

export const VALID_MODIFIER_KEYS = ['none', 'alt', 'ctrl', 'shift'];
export const VALID_THEMES = ['auto', 'light', 'dark'];

export const DEFAULT_CONFIG = Object.freeze({
  modifierKey: 'none',
  enabled: true,
  theme: 'auto',
  multiWordEnabled: true,
  domainBadgesEnabled: true,
  schemaVersion: 2
});

export const STORAGE_KEY = 'settings';

/**
 * Resolves the browser storage area (sync with fallback to local).
 * @returns {object|null}
 */
export function getStorageArea() {
  if (typeof browser !== 'undefined' && browser.storage) {
    return browser.storage.sync || browser.storage.local;
  }
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage.sync || chrome.storage.local;
  }
  return null;
}

/**
 * Validates and normalizes configuration values.
 * @param {object} raw
 * @returns {typeof DEFAULT_CONFIG}
 */
export function validateConfig(raw = {}) {
  const modifierKey = VALID_MODIFIER_KEYS.includes(raw.modifierKey)
    ? raw.modifierKey
    : DEFAULT_CONFIG.modifierKey;

  const enabled = typeof raw.enabled === 'boolean'
    ? raw.enabled
    : DEFAULT_CONFIG.enabled;

  const theme = VALID_THEMES.includes(raw.theme)
    ? raw.theme
    : DEFAULT_CONFIG.theme;

  const multiWordEnabled = typeof raw.multiWordEnabled === 'boolean'
    ? raw.multiWordEnabled
    : DEFAULT_CONFIG.multiWordEnabled;

  const domainBadgesEnabled = typeof raw.domainBadgesEnabled === 'boolean'
    ? raw.domainBadgesEnabled
    : DEFAULT_CONFIG.domainBadgesEnabled;

  const schemaVersion = typeof raw.schemaVersion === 'number'
    ? raw.schemaVersion
    : DEFAULT_CONFIG.schemaVersion;

  return {
    modifierKey,
    enabled,
    theme,
    multiWordEnabled,
    domainBadgesEnabled,
    schemaVersion
  };
}

/**
 * Loads current settings from browser storage.
 * @returns {Promise<typeof DEFAULT_CONFIG>}
 */
export async function getSettings() {
  const storage = getStorageArea();
  if (!storage) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const result = await storage.get(STORAGE_KEY);
    const stored = result && result[STORAGE_KEY] ? result[STORAGE_KEY] : {};
    return validateConfig(stored);
  } catch (err) {
    console.warn('[Dictionary Addon] Failed to load settings from storage:', err);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Saves updated settings to browser storage.
 * @param {Partial<typeof DEFAULT_CONFIG>} partialConfig
 * @returns {Promise<typeof DEFAULT_CONFIG>}
 */
export async function saveSettings(partialConfig) {
  const current = await getSettings();
  const updated = validateConfig({ ...current, ...partialConfig });

  const storage = getStorageArea();
  if (storage) {
    try {
      await storage.set({ [STORAGE_KEY]: updated });
    } catch (err) {
      console.error('[Dictionary Addon] Failed to save settings to storage:', err);
    }
  }

  return updated;
}

/**
 * Verifies if a MouseEvent matches the active modifier key requirement.
 * @param {MouseEvent} event
 * @param {'none'|'alt'|'ctrl'|'shift'} modifierKey
 * @returns {boolean}
 */
export function matchesModifier(event, modifierKey = 'none') {
  if (!event) return false;

  switch (modifierKey) {
    case 'none':
      return true;
    case 'alt':
      return Boolean(event.altKey);
    case 'ctrl':
      return Boolean(event.ctrlKey || event.metaKey);
    case 'shift':
      return Boolean(event.shiftKey);
    default:
      return true;
  }
}
