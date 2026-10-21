import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Manifest V3 Multi-Target Schema Verification', () => {
  const chromePath = path.join(ROOT_DIR, 'src', 'manifest.chrome.json');
  const firefoxPath = path.join(ROOT_DIR, 'src', 'manifest.firefox.json');

  it('both manifest source templates exist and are valid JSON', () => {
    expect(fs.existsSync(chromePath)).toBe(true);
    expect(fs.existsSync(firefoxPath)).toBe(true);

    const chromeJson = JSON.parse(fs.readFileSync(chromePath, 'utf8'));
    const firefoxJson = JSON.parse(firefoxPath ? fs.readFileSync(firefoxPath, 'utf8') : '{}');

    expect(chromeJson.manifest_version).toBe(3);
    expect(firefoxJson.manifest_version).toBe(3);
    expect(chromeJson.name).toBe('Simple English Dictionary');
    expect(firefoxJson.name).toBe('Simple English Dictionary');
    expect(chromeJson.version).toBe(firefoxJson.version);
  });

  it('validates Chrome Manifest V3 specific requirements', () => {
    const chrome = JSON.parse(fs.readFileSync(chromePath, 'utf8'));

    // Chrome MV3 requires background.service_worker
    expect(chrome.background).toBeDefined();
    expect(chrome.background.service_worker).toBe('background/background.bundle.js');
    expect(chrome.background.scripts).toBeUndefined();

    // Chrome rejects or warns on Gecko specific settings
    expect(chrome.browser_specific_settings).toBeUndefined();

    // Permissions and actions
    expect(chrome.permissions).toContain('storage');
    expect(chrome.host_permissions).toContain('https://api.dictionaryapi.dev/*');
    expect(chrome.host_permissions).toContain('https://en.wiktionary.org/*');
    expect(chrome.host_permissions).toContain('https://en.wikipedia.org/*');
    expect(chrome.action?.default_popup).toBe('options/options.html');
  });

  it('validates Firefox Manifest V3 specific requirements', () => {
    const firefox = JSON.parse(fs.readFileSync(firefoxPath, 'utf8'));

    // Firefox MV3 uses background.scripts array
    expect(firefox.background).toBeDefined();
    expect(Array.isArray(firefox.background.scripts)).toBe(true);
    expect(firefox.background.scripts).toContain('background/background.bundle.js');
    expect(firefox.background.service_worker).toBeUndefined();

    // Firefox requires gecko settings with ID for signing
    expect(firefox.browser_specific_settings?.gecko?.id).toBe('english-dictionary@antigravity.dev');

    // Permissions and actions
    expect(firefox.permissions).toContain('storage');
    expect(firefox.host_permissions).toContain('https://api.dictionaryapi.dev/*');
    expect(firefox.action?.default_popup).toBe('options/options.html');
  });

  it('ensures dist/ builds reflect the correct manifest schemas', () => {
    const distChromePath = path.join(ROOT_DIR, 'dist', 'chrome', 'manifest.json');
    const distFirefoxPath = path.join(ROOT_DIR, 'dist', 'firefox', 'manifest.json');

    if (fs.existsSync(distChromePath)) {
      const distChrome = JSON.parse(fs.readFileSync(distChromePath, 'utf8'));
      expect(distChrome.background?.service_worker).toBe('background/background.bundle.js');
      expect(distChrome.browser_specific_settings).toBeUndefined();
    }

    if (fs.existsSync(distFirefoxPath)) {
      const distFirefox = JSON.parse(fs.readFileSync(distFirefoxPath, 'utf8'));
      expect(distFirefox.background?.scripts).toContain('background/background.bundle.js');
      expect(distFirefox.browser_specific_settings?.gecko?.id).toBe('english-dictionary@antigravity.dev');
    }
  });

  it('verifies packaged release archives contain valid root manifests', async () => {
    const AdmZip = (await import('adm-zip')).default;
    const chromeZipPath = path.join(ROOT_DIR, 'web-ext-artifacts', 'simple-english-dictionary-chrome-1.0.3.zip');
    const firefoxZipPath = path.join(ROOT_DIR, 'web-ext-artifacts', 'simple-english-dictionary-firefox-1.0.3.zip');

    if (fs.existsSync(chromeZipPath)) {
      const zip = new AdmZip(chromeZipPath);
      const manifestEntry = zip.getEntry('manifest.json');
      expect(manifestEntry).toBeDefined();
      expect(zip.getEntry('.DS_Store')).toBeNull();

      const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
      expect(manifest.background?.service_worker).toBe('background/background.bundle.js');
    }

    if (fs.existsSync(firefoxZipPath)) {
      const zip = new AdmZip(firefoxZipPath);
      const manifestEntry = zip.getEntry('manifest.json');
      expect(manifestEntry).toBeDefined();
      expect(zip.getEntry('.DS_Store')).toBeNull();

      const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
      expect(manifest.background?.scripts).toContain('background/background.bundle.js');
    }
  });
});
