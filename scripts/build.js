#!/usr/bin/env node

/**
 * Multi-target build script for Simple English Dictionary.
 * Compiles JavaScript bundles and outputs clean distribution directories
 * for both Google Chrome and Mozilla Firefox.
 *
 * Usage:
 *   node scripts/build.js           # Build both Chrome and Firefox targets
 *   node scripts/build.js chrome    # Build only Chrome target (dist/chrome)
 *   node scripts/build.js firefox   # Build only Firefox target (dist/firefox)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const TARGETS = {
  chrome: {
    name: 'Google Chrome',
    outDir: path.join(DIST_DIR, 'chrome'),
    manifestSrc: path.join(SRC_DIR, 'manifest.chrome.json')
  },
  firefox: {
    name: 'Mozilla Firefox',
    outDir: path.join(DIST_DIR, 'firefox'),
    manifestSrc: path.join(SRC_DIR, 'manifest.firefox.json')
  }
};

/**
 * Recursively copies a directory.
 */
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Builds all JavaScript bundles into memory / temporary paths.
 */
async function buildBundles() {
  console.log('⚡ Bundling JavaScript with esbuild...');

  const startTime = Date.now();

  const [contentRes, backgroundRes, optionsRes] = await Promise.all([
    esbuild.build({
      entryPoints: [path.join(SRC_DIR, 'content', 'content.js')],
      bundle: true,
      format: 'iife',
      write: false,
      logLevel: 'warning'
    }),
    esbuild.build({
      entryPoints: [path.join(SRC_DIR, 'background', 'background.js')],
      bundle: true,
      format: 'iife',
      write: false,
      logLevel: 'warning'
    }),
    esbuild.build({
      entryPoints: [path.join(SRC_DIR, 'options', 'options.js')],
      bundle: true,
      format: 'iife',
      write: false,
      logLevel: 'warning'
    })
  ]);

  const elapsed = Date.now() - startTime;
  console.log(`✓ JavaScript bundles compiled in ${elapsed}ms`);

  return {
    contentBundle: contentRes.outputFiles[0].text,
    backgroundBundle: backgroundRes.outputFiles[0].text,
    optionsBundle: optionsRes.outputFiles[0].text
  };
}

/**
 * Assembles a target distribution directory.
 */
function assembleTarget(targetKey, bundles) {
  const target = TARGETS[targetKey];
  if (!target) {
    throw new Error(`Unknown target: ${targetKey}`);
  }

  console.log(`\n📦 Assembling ${target.name} target -> ${path.relative(ROOT_DIR, target.outDir)}/`);

  // Ensure clean output directory
  fs.rmSync(target.outDir, { recursive: true, force: true });
  fs.mkdirSync(target.outDir, { recursive: true });

  // 1. Copy and validate manifest
  if (!fs.existsSync(target.manifestSrc)) {
    throw new Error(`Manifest template not found: ${target.manifestSrc}`);
  }

  const manifestRaw = fs.readFileSync(target.manifestSrc, 'utf8');
  let manifestJson;
  try {
    manifestJson = JSON.parse(manifestRaw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${target.manifestSrc}: ${err.message}`);
  }

  const outManifestPath = path.join(target.outDir, 'manifest.json');
  fs.writeFileSync(outManifestPath, JSON.stringify(manifestJson, null, 2), 'utf8');
  console.log(`  ✓ Written manifest.json (v${manifestJson.version})`);

  // 2. Write compiled bundles
  const bgDir = path.join(target.outDir, 'background');
  const contentDir = path.join(target.outDir, 'content');
  const optionsDir = path.join(target.outDir, 'options');

  fs.mkdirSync(bgDir, { recursive: true });
  fs.mkdirSync(contentDir, { recursive: true });
  fs.mkdirSync(optionsDir, { recursive: true });

  fs.writeFileSync(path.join(bgDir, 'background.bundle.js'), bundles.backgroundBundle, 'utf8');
  fs.writeFileSync(path.join(contentDir, 'content.bundle.js'), bundles.contentBundle, 'utf8');
  fs.writeFileSync(path.join(optionsDir, 'options.bundle.js'), bundles.optionsBundle, 'utf8');
  console.log(`  ✓ Placed compiled bundles`);

  // 3. Copy static assets
  const staticFiles = [
    { src: path.join(SRC_DIR, 'options', 'options.html'), dest: path.join(optionsDir, 'options.html') },
    { src: path.join(SRC_DIR, 'options', 'options.css'), dest: path.join(optionsDir, 'options.css') }
  ];

  for (const { src, dest } of staticFiles) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  // 4. Copy icons
  const iconsSrc = path.join(SRC_DIR, 'icons');
  const iconsDest = path.join(target.outDir, 'icons');
  if (fs.existsSync(iconsSrc)) {
    copyDirSync(iconsSrc, iconsDest);
    console.log(`  ✓ Copied icons`);
  }

  console.log(`✓ ${target.name} distribution assembled successfully.`);
}

/**
 * Updates in-source bundles for backward compatibility with local testing tools.
 */
function updateSourceBundles(bundles) {
  fs.writeFileSync(path.join(SRC_DIR, 'background', 'background.bundle.js'), bundles.backgroundBundle, 'utf8');
  fs.writeFileSync(path.join(SRC_DIR, 'content', 'content.bundle.js'), bundles.contentBundle, 'utf8');
  fs.writeFileSync(path.join(SRC_DIR, 'options', 'options.bundle.js'), bundles.optionsBundle, 'utf8');
}

async function main() {
  const arg = (process.argv[2] || 'all').toLowerCase();
  const validTargets = Object.keys(TARGETS);

  const targetsToBuild = arg === 'all'
    ? validTargets
    : validTargets.filter(t => t === arg);

  if (targetsToBuild.length === 0) {
    console.error(`Invalid target "${arg}". Valid options are: ${validTargets.join(', ')}, all`);
    process.exit(1);
  }

  try {
    const bundles = await buildBundles();

    // Maintain in-source bundles for legacy scripts (e.g. web-ext run --source-dir src)
    updateSourceBundles(bundles);

    for (const targetKey of targetsToBuild) {
      assembleTarget(targetKey, bundles);
    }

    console.log('\n✨ Build completed successfully.');
  } catch (err) {
    console.error('\n❌ Build failed:', err.message);
    process.exit(1);
  }
}

main();
