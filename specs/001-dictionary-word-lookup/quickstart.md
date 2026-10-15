# Quickstart Guide: English Dictionary Firefox Addon

**Feature Branch**: `001-dictionary-word-lookup`  
**Date**: 2026-10-16  

This guide explains how to build, test, and run the English Dictionary Firefox Addon locally.

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **Mozilla Firefox**: Any recent desktop release (e.g. Firefox 115+ ESR or Firefox 120+)
- **Package Manager**: `npm`

---

## Installation & Setup

1. Clone or navigate to the repository:
   ```bash
   cd /Users/omkar/projects/english-dictionary
   ```

2. Install development dependencies:
   ```bash
   npm install
   ```

---

## Running the Extension in Firefox

### Option A: Using `web-ext` (Recommended for Development)

Run the extension in a clean temporary Firefox profile with auto-reload:

```bash
npx web-ext run --source-dir src
```

### Option B: Manual Loading in Firefox

1. Open Firefox and navigate to:
   ```text
   about:debugging#/runtime/this-firefox
   ```
2. Click **"Load Temporary Add-on..."**.
3. Select `src/manifest.json` from this repository.
4. The addon will immediately be active.

---

## Verifying User Stories

### 1. Test Double-Click Word Lookup (User Story 1 - P1)
1. Open any article or website (e.g., Wikipedia).
2. Double-click any word (e.g., `"ubiquitous"`).
3. **Expected**: A floating dictionary popup card appears next to the word with phonetic transcription, part of speech, definition, and example usage.
4. Click anywhere outside or press <kbd>Esc</kbd> to dismiss.

### 2. Test Key Combination Configuration (User Story 2 - P2)
1. Open the addon options page (click Addon icon in toolbar > Options, or open `about:addons` > English Dictionary > Preferences).
2. Select **"Alt + Double-click"** as the trigger modifier and save.
3. Return to the web page:
   - Double-click a word without holding <kbd>Alt</kbd> -> Only normal text selection occurs; no popup appears.
   - Hold <kbd>Alt</kbd> and double-click a word -> The dictionary popup card appears near the word.

### 3. Test Audio Pronunciation (User Story 3 - P3)
1. Double-click a common word (e.g., `"serendipity"`).
2. Look for the speaker icon next to the phonetic spelling.
3. Click the speaker icon.
4. **Expected**: Spoken audio pronunciation plays clearly.

### 4. Test Error Handling (User Story 4 - P4)
1. Double-click a non-existent word (e.g., `"asdfqwerty123"`).
2. **Expected**: A polite card appears stating: *"No definitions found. Check spelling."*
3. Disable Wi-Fi and double-click a word.
4. **Expected**: Clear message stating: *"Unable to connect to dictionary service. Please check your internet connection."*

---

## Running Tests

Execute unit tests covering word sanitization, dictionary response parsing, and viewport positioning logic:

```bash
npm test
```
