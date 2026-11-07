# Quickstart: Idioms and Phrasal Expressions Verification

**Feature Branch**: `005-idioms-and-phrases`  
**Date**: 2026-11-07  

This document describes how to verify the idioms and phrasal expressions lookup feature in developer and testing environments.

---

## 1. Running Unit Tests

Run Vitest unit tests covering phrase sanitization, lemmatization of inflected idioms, pronoun normalization, multi-provider idiom queries, and popup badge rendering:

```bash
npm test
```

To run only idiom-related tests:

```bash
npx vitest run tests/unit/phrase-normalizer.test.js tests/unit/idiom-service.test.js
```

---

## 2. Interactive Browser Verification

### Testing in Google Chrome (Chromium)

1. Build the Chrome distribution:
   ```bash
   npm run build:chrome
   ```
2. Open `chrome://extensions` in Google Chrome and enable **Developer mode**.
3. Click **Load unpacked** and select `dist/chrome`.
4. Open any webpage containing idioms (e.g. news article, Wikipedia page, or test fixture).
5. **Test Scenarios**:
   - **Multi-Word Idiom**: Highlight `"bite the bullet"` or `"break the ice"` (2–8 words). Click the floating book icon. Verify the popup card displays an `[Idiom]` badge, figurative definition, and example sentence.
   - **Inflected Idiom**: Highlight `"bit the bullet"` or `"spilled the beans"`. Verify that the popup successfully maps to canonical headwords and returns figurative definitions.
   - **Pronoun Variation**: Highlight `"pulling his leg"` or `"lost her cool"`. Verify the phrase maps to canonical forms (`"pull someone's leg"` / `"lose one's cool"`).
   - **Phrasal Verb**: Highlight `"look forward to"` or `"give up"`. Verify the popup displays a `[Phrasal Verb]` badge with meaning and examples.
   - **Single-Word Related Idioms**: Double-click `"weather"` or `"ice"`. In the card, look at the bottom section for "Related Idioms & Phrases" (e.g., "under the weather", "break the ice"). Click on one of the items and confirm the card seamlessly transitions to that idiom.
   - **Context Menu**: Select `"actions speak louder than words"`, right-click, and choose **"Look up in Simple English Dictionary"**. Verify the popup opens with the idiom definition.

### Testing in Mozilla Firefox

1. Launch Firefox with live development profile:
   ```bash
   npm start
   ```
2. Repeat the test scenarios described above.
