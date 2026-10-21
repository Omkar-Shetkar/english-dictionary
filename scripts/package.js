#!/usr/bin/env node

/**
 * Packaging script for Simple English Dictionary.
 * Generates clean, store-ready zip archives for Google Chrome and Mozilla Firefox.
 *
 * Usage:
 *   node scripts/package.js           # Package both Chrome and Firefox archives
 *   node scripts/package.js chrome    # Package only Chrome archive
 *   node scripts/package.js firefox   # Package only Firefox archive
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'web-ext-artifacts');

const TARGETS = {
  chrome: {
    name: 'Google Chrome',
    distDir: path.join(DIST_DIR, 'chrome')
  },
  firefox: {
    name: 'Mozilla Firefox',
    distDir: path.join(DIST_DIR, 'firefox')
  }
};

/**
 * Validates that an assembled dist directory is ready for packaging.
 */
function validateDist(targetKey, distDir) {
  if (!fs.existsSync(distDir)) {
    throw new Error(`Distribution directory for ${targetKey} does not exist at ${distDir}. Run build first.`);
  }

  const manifestPath = path.join(distDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json missing in ${distDir}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.name || !manifest.version) {
    throw new Error(`Invalid manifest in ${distDir}: missing name or version`);
  }

  if (targetKey === 'chrome' && !manifest.background?.service_worker) {
    throw new Error('Chrome manifest missing background.service_worker declaration');
  }

  if (targetKey === 'firefox' && !manifest.background?.scripts) {
    throw new Error('Firefox manifest missing background.scripts declaration');
  }

  return manifest;
}

/**
 * Recursively adds directory files to an AdmZip instance, excluding unwanted files.
 */
function addDirectoryToZip(zip, dirPath, zipSubDir = '') {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    // Exclude unwanted development files
    if (entry.name === '.DS_Store' || entry.name.endsWith('.tmp') || entry.name.endsWith('.map')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const entryZipPath = zipSubDir ? `${zipSubDir}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      addDirectoryToZip(zip, fullPath, entryZipPath);
    } else {
      const data = fs.readFileSync(fullPath);
      zip.addFile(entryZipPath, data);
    }
  }
}

/**
 * Packages a target into a release zip.
 */
function packageTarget(targetKey) {
  const target = TARGETS[targetKey];
  const manifest = validateDist(targetKey, target.distDir);
  const version = manifest.version;

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const zipFilename = `simple-english-dictionary-${targetKey}-${version}.zip`;
  const outZipPath = path.join(ARTIFACTS_DIR, zipFilename);

  console.log(`\n📦 Packaging ${target.name} release archive...`);

  const zip = new AdmZip();
  addDirectoryToZip(zip, target.distDir, '');

  zip.writeZip(outZipPath);

  // Verification: Ensure manifest.json is present at the zip root
  const verifyZip = new AdmZip(outZipPath);
  const manifestEntry = verifyZip.getEntry('manifest.json');
  if (!manifestEntry) {
    throw new Error(`Verification failed: manifest.json is not at the root of ${zipFilename}`);
  }

  const stats = fs.statSync(outZipPath);
  const sizeKb = (stats.size / 1024).toFixed(1);

  console.log(`✓ Created: ${path.relative(ROOT_DIR, outZipPath)} (${sizeKb} KB)`);
  console.log(`✓ Root manifest verified (v${version})`);

  return outZipPath;
}

function main() {
  const arg = (process.argv[2] || 'all').toLowerCase();
  const validTargets = Object.keys(TARGETS);

  const targetsToPackage = arg === 'all'
    ? validTargets
    : validTargets.filter(t => t === arg);

  if (targetsToPackage.length === 0) {
    console.error(`Invalid target "${arg}". Valid options are: ${validTargets.join(', ')}, all`);
    process.exit(1);
  }

  try {
    for (const targetKey of targetsToPackage) {
      packageTarget(targetKey);
    }

    console.log('\n✨ Packaging completed successfully.');
  } catch (err) {
    console.error('\n❌ Packaging failed:', err.message);
    process.exit(1);
  }
}

main();
