# Implementation Plan: PDF Document Dictionary Support

**Branch**: `004-pdf-dictionary-support` | **Date**: 2026-10-24 | **Spec**: [specs/004-pdf-dictionary-support/spec.md](spec.md)  
**Input**: Feature specification from `/specs/004-pdf-dictionary-support/spec.md`

## Summary

Extend dictionary lookup functionality to PDF documents opened in both Google Chrome and Mozilla Firefox (covering online web-hosted PDFs and local `file://` PDFs). Configures Manifest V3 content scripts with `all_frames: true` and `match_about_blank: true` to inject into viewer frames, adds the `contextMenus` API permission and background context menu listener for 100% reliable right-click fallback lookups, enhances word sanitization to handle PDF hyphenated line-breaks, adds fallback centering positioning when text selection boundaries are zero, and adds a dedicated status and guidance card in the Options interface for local file permissions.

## Technical Context

**Language/Version**: JavaScript (ES2022+), HTML5, Vanilla CSS  
**Primary Dependencies**: Chrome Extensions API / Mozilla WebExtensions API (Manifest V3), esbuild (bundler), Vitest (unit testing), web-ext (Firefox linter & runner)  
**Storage**: `chrome.storage.sync` / `browser.storage.sync` with local fallback  
**Testing**: Vitest unit test suite; manual verification in Chrome and Firefox with online and local PDFs  
**Target Platform**: Google Chrome Desktop, Chromium browsers (Edge, Brave), Mozilla Firefox 112+ Desktop  
**Project Type**: Browser Extension (Cross-browser MV3)  
**Performance Goals**: <1s dictionary lookup presentation; 0ms UI blocking; zero distortion of host PDF viewers  
**Constraints**: Chromium PDF viewer plugin sandbox restrictions; browser security restrictions requiring explicit user permission for `file://` URLs; strict ephemeral privacy (no history tracking)  
**Scale/Scope**: Client-side content script and background service enhancements across Chrome and Firefox targets  

## Constitution Check

- **Modular Architecture**: Reuses existing dictionary cascade, shadow DOM UI encapsulation, and build pipeline (`scripts/build.js`, `scripts/package.js`).
- **Test-First Validation**: Preserves all 78 existing unit tests and adds targeted test suites for PDF sanitization, fallback positioning, manifest compliance, and context menu dispatching.
- **Simplicity & Privacy**: Native WebExtensions APIs without external third-party dependencies; maintains zero tracking and zero telemetry.
- **Gate Evaluation**: PASSED.

## Project Structure

### Documentation (this feature)

```text
specs/004-pdf-dictionary-support/
├── plan.md              # This file
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── spec.md              # Feature specification
```

### Source Code (repository root)

```text
src/
├── manifest.chrome.json       # Chrome MV3 manifest (adds contextMenus, all_frames)
├── manifest.firefox.json      # Firefox MV3 manifest (adds contextMenus, all_frames)
├── manifest.json              # Base manifest (adds contextMenus, all_frames)
├── background/
│   └── background.js          # Registers context menu and routes selection lookup messages
├── content/
│   ├── content.js             # Handles TRIGGER_SELECTION_LOOKUP, PDF selection settlement
│   ├── popup-view.js          # Shadow DOM popup card component
│   └── floating-icon.js       # Multi-word floating trigger
├── options/
│   ├── options.html           # Options UI with Local PDF Permissions card
│   └── options.js             # Checks isAllowedFileSchemeAccess() and updates status UI
├── common/
│   ├── sanitize.js            # De-hyphenates line breaks from PDF selection
│   └── position.js            # Fallback viewport centering when bounds are empty
tests/
└── unit/                      # Vitest test suite covering sanitize, position, manifests
```
