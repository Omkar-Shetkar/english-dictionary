# Phase 0 Research: English Dictionary Firefox Addon

**Feature Branch**: `001-dictionary-word-lookup`  
**Date**: 2026-10-16  
**Status**: Completed  

## 1. Extension Manifest Version: Manifest V3 (MV3) for Firefox

- **Decision**: Adopt WebExtensions Manifest V3 (`manifest_version: 3`) using a background scripts configuration compatible with Firefox.
- **Rationale**: 
  - Mozilla Firefox fully supports Manifest V3 with event-driven background scripts (`"background": { "scripts": ["background/background.js"] }`).
  - MV3 provides modern security standards, streamlined permission declarations, and long-term future-proofing across browser updates.
- **Alternatives Considered**:
  - *Manifest V2*: Older, deprecated in modern extension stores, though supported for legacy addons. MV3 is standard for new extensions in 2026.

---

## 2. UI Style Isolation: Closed/Open Shadow DOM

- **Decision**: Render the floating dictionary popup inside a Web Component / Shadow DOM container (`attachShadow({ mode: 'open' })`) attached directly to `document.documentElement` or `document.body`.
- **Rationale**:
  - Web pages contain unpredictable CSS (e.g., global `* { box-sizing: content-box }`, `div { color: red !important; }`, or framework resets) that could easily break popup layouts.
  - Shadow DOM ensures strict style encapsulation (satisfying **FR-013**), preventing host page stylesheets from bleeding into the dictionary popup and vice-versa.
  - Unlike an `<iframe>`, Shadow DOM is lightweight, zero-latency, doesn't require cross-origin message passing for rendering, and allows seamless audio playback.
- **Alternatives Considered**:
  - *`<iframe>`*: Heavy memory overhead, difficult dynamic resizing based on definition height, and sluggish initial render.
  - *Namespaced CSS (`.ext-dict-popup *`)*: Prone to host pages using `!important` or aggressive reset rules.

---

## 3. Network Fetch Strategy: Background Script Proxy

- **Decision**: Content scripts delegate dictionary lookup requests to `background.js` via `browser.runtime.sendMessage()`.
- **Rationale**:
  - Performing HTTP fetches in the background script completely avoids host page Content Security Policy (CSP) restrictions (`connect-src`), Mixed Content errors (HTTP/HTTPS restrictions), and CORS issues.
  - Centralizes API error handling, network timeout detection, and status checking in one reliable service layer.
- **Alternatives Considered**:
  - *Direct fetch in Content Script*: Often blocked by restrictive CSP headers on enterprise or banking websites (e.g. GitHub, Twitter, Banking portals).

---

## 4. Dictionary API Response Normalization (`api.dictionaryapi.dev`)

- **Decision**: Implement a robust normalizer utility in `src/common/dictionary-parser.js`.
- **Rationale**:
  - The Free Dictionary API returns an array of word entries:
    ```json
    [
      {
        "word": "hello",
        "phonetic": "/həˈloʊ/",
        "phonetics": [
          { "text": "/həˈloʊ/", "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/hello-w-au.mp3" }
        ],
        "meanings": [
          {
            "partOfSpeech": "noun",
            "definitions": [
              {
                "definition": "An expression of greeting.",
                "example": "she said hello to everyone"
              }
            ]
          }
        ]
      }
    ]
    ```
  - The normalizer extracts:
    1. Primary canonical word.
    2. Best phonetic string (from top-level `phonetic` or first non-empty `phonetics[].text`).
    3. First non-empty, valid audio URL (often ending in `.mp3`).
    4. Grouped meanings by part of speech with cleaned definitions and example sentences.
- **Alternatives Considered**:
  - *Direct raw JSON consumption in UI*: Fragile, since missing phonetic or audio fields could lead to `undefined` errors.

---

## 5. Word Detection, Sanitization, and Modifier Key Matching

- **Decision**:
  - Listen for `dblclick` events on `window`.
  - Check the active modifier key against the stored user preference:
    - `"none"`: triggers if no modifier is required (or regardless of modifiers).
    - `"alt"`: requires `event.altKey === true`.
    - `"ctrl"`: requires `event.ctrlKey === true` (or `event.metaKey === true` on macOS).
    - `"shift"`: requires `event.shiftKey === true`.
  - Extract the selected string via `window.getSelection().toString()`.
  - Sanitize word lemma: trim leading/trailing whitespace, quotation marks (`"`, `'`, `“`, `”`), brackets, commas, periods, and colons:
    `const cleaned = rawWord.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');`
  - Ignore empty strings, numeric strings, or selections with length > 45 characters.

---

## 6. Viewport Boundary & Anchor Positioning

- **Decision**: Calculate popup coordinates using `Range.getBoundingClientRect()` from `window.getSelection().getRangeAt(0)`.
- **Placement Logic**:
  - Default: Place popup directly below the word (`top = rect.bottom + 8px`, `left = rect.left`).
  - Top overflow / Bottom collision: If `rect.bottom + popupHeight + 16px > window.innerHeight`, flip position to appear above the word (`top = rect.top - popupHeight - 8px`).
  - Right edge collision: If `left + popupWidth > window.innerWidth - 16px`, clamp `left = window.innerWidth - popupWidth - 16px`.
  - Left edge collision: Clamp `left = Math.max(16px, left)`.
  - Satisfies **SC-004** (100% popups remain visible within viewport boundaries).

---

## 7. Audio Playback in Browser Extension

- **Decision**: Use standard Web Audio / HTMLAudioElement: `const audio = new Audio(audioUrl); audio.play();`.
- **Rationale**:
  - Audio playback is triggered directly by user gesture (clicking the speaker button inside the popup card).
  - Modern browsers permit audio playback when initiated by a user click event without autoplay blocking.
