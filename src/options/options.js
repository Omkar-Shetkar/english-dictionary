/**
 * Options page controller: Loads, binds, and persists user settings.
 */

import { getSettings, saveSettings } from '../common/storage.js';

let saveTimeout = null;

function flashSavedBadge() {
  const badge = document.getElementById('saveStatus');
  if (!badge) return;

  badge.classList.add('visible');
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    badge.classList.remove('visible');
  }, 1600);
}

async function initializeOptions() {
  const toggleEnabled = document.getElementById('toggleEnabled');
  const themeSelect = document.getElementById('themeSelect');
  const modifierRadios = document.querySelectorAll('input[name="modifierKey"]');

  // Load current configuration
  const config = await getSettings();

  // Populate controls
  if (toggleEnabled) {
    toggleEnabled.checked = config.enabled;
  }

  if (themeSelect) {
    themeSelect.value = config.theme;
  }

  for (const radio of modifierRadios) {
    if (radio.value === config.modifierKey) {
      radio.checked = true;
    }
  }

  // Handle toggle change
  if (toggleEnabled) {
    toggleEnabled.addEventListener('change', async () => {
      await saveSettings({ enabled: toggleEnabled.checked });
      flashSavedBadge();
    });
  }

  // Handle modifier key radio change
  for (const radio of modifierRadios) {
    radio.addEventListener('change', async () => {
      if (radio.checked) {
        await saveSettings({ modifierKey: radio.value });
        flashSavedBadge();
      }
    });
  }

  // Handle theme select change
  if (themeSelect) {
    themeSelect.addEventListener('change', async () => {
      await saveSettings({ theme: themeSelect.value });
      flashSavedBadge();
    });
  }
}

document.addEventListener('DOMContentLoaded', initializeOptions);
