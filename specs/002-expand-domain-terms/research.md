# Phase 0 Research: Technical, Scientific, and Domain-Specific Vocabulary Lookup

**Feature Branch**: `002-expand-domain-terms`  
**Date**: 2026-10-19  
**Status**: Completed  

## 1. Online-Only Multi-Provider Cascade & Smart Query Routing

- **Decision**: Implement an online-only multi-provider cascade in `src/background/dictionary-service.js` combining Wiktionary REST API, Wikipedia REST API Summary endpoint, and Free Dictionary API with smart case-sensitive routing and concurrent dispatch.
- **Rationale**:
  - The Free Dictionary API lowercases queries and lacks acronym expansions (returning "three-toed sloth" for "AI", or 404 for "ROI", "API", "CPU", "EBITDA").
  - **Wiktionary REST API** (`https://en.wiktionary.org/api/rest_v1/page/definition/{term}`) is case-sensitive: querying `AI` directly yields `Noun: (computing) Artificial intelligence`, `(medicine) Aortic insufficiency`, etc., and tags definitions with domain labels like `(computing)`, `(mathematics)`, `(physics)`.
  - **Wikipedia REST API Summary endpoint** (`https://en.wikipedia.org/api/rest_v1/page/summary/{title}`) returns clean, concise encyclopedic lead summaries (`extract`), short descriptions (`description`, e.g. "Field of computer science"), and canonical URLs. It excels at multi-word compound terms ("machine learning", "compound interest", "black hole") and historical eras ("Renaissance", "Cold War", "Industrial Revolution").
  - **Free Dictionary API** (`https://api.dictionaryapi.dev/api/v2/entries/en/{term}`) continues to provide phonetics audio recordings (`.mp3`) and general English definitions.
- **Zero-Latency Routing Architecture**:
  - To prevent sequential multi-hop latency penalties:
    1. **Uppercase / Acronym Queries** (e.g., `AI`, `RAM`, `DNA`, `API`): Route directly and concurrently to Wiktionary REST and Wikipedia Summary. Bypasses Free Dictionary API delay or races them concurrently.
    2. **Multi-Word Phrases** (2–4 words, e.g., `machine learning`, `black hole`): Free Dictionary API does not index compound phrases. Route directly to Wikipedia Summary and Wiktionary concurrently.
    3. **General Lowercase Words** (e.g., `ephemeral`, `serendipity`): Query Free Dictionary API with Wiktionary fallback as established.
  - **Timeouts**: Each provider fetch is bounded by a strict 2500ms `AbortController` timeout.
  - **In-Memory Cache**: Preserves results keyed by canonical query lemma for instant sub-millisecond retrieval during repeated lookups in the browser session.
- **Alternatives Considered**:
  - *Bundled Offline SQLite / JSON Dictionary*: Rejected per user clarification to avoid bloating addon package size and maintaining static dictionaries; online-only with smart routing fulfills the zero-latency requirement.
  - *Sequential Waterfall without Routing*: Rejected because sequential 404 timeouts on Free Dictionary API would cause 3–4 second delays for acronyms and compound phrases.

---

## 2. Multi-Word Phrase Selection & Floating Icon Trigger

- **Decision**: In `src/content/content.js`, detect text selections between 2 and 4 words on `mouseup`. If the user has a modifier key configured and held down, trigger lookup immediately; if no modifier key is held, anchor a compact, unobtrusive floating dictionary icon near the end of the selection. Clicking the icon opens the definition popup.
- **Rationale**:
  - Double-clicking in web browsers only selects a single word lemma. Looking up compound terms ("machine learning", "supply and demand") requires dragging to select.
  - Automatically opening the full dictionary popup on every drag selection would disrupt standard user actions like copying text, highlighting notes, or editing forms.
  - A small floating icon (18x18px) anchored near the cursor provides immediate discoverability without interrupting copy-paste. Clicking it opens the popup card.
  - Users who configure a modifier key (Alt, Ctrl, or Shift) can hold the key while dragging to bypass the floating icon and open the popup directly upon releasing the mouse button.
  - The floating icon automatically removes itself on outside click, window scroll, or text deselect.
- **Alternatives Considered**:
  - *Immediate Popup on All Multi-Word Highlights*: Severely disruptive to ordinary copy-paste workflows.
  - *Context Menu (Right-Click) Only*: Lower discoverability and requires two extra clicks across deep browser menus.

---

## 3. Disambiguation & Stacked Layout UI

- **Decision**: When a queried term contains both an acronym/domain expansion and general English lexical definitions (e.g., "AI", "RAM", "IT"), present a stacked layout inside the Shadow DOM popup card.
- **Rationale**:
  - The acronym expansion (e.g., `AI → Artificial Intelligence`) and its technical domain definition are displayed prominently at the top as the primary heading and first definition block.
  - A clearly demarcated section ("General English Meanings") follows below, presenting lexical definitions (e.g., [Zoology] "three-toed sloth") without requiring tab switching or extra clicks.
  - Visual domain badges (`[Computing]`, `[Science]`, `[Mathematics]`, `[Finance]`, `[History]`) are rendered with refined, accessible color palettes to allow instant visual scanning.
- **Alternatives Considered**:
  - *Tabbed View*: Requires explicit tab clicks to view alternate meanings, hiding relevant information.
  - *Acronym-Only / Drop General Meaning*: Causes data loss for queries where the user actually intended the general meaning.

---

## 4. Enhanced Sanitization & Case Preservation

- **Decision**: Upgrade `src/common/sanitize.js` to support:
  1. **Case Preservation**: Distinguish uppercase acronyms (e.g., `AI`, `RAM`, `WHO`) from lowercase words (`ai`, `ram`, `who`) while trimming boundary quotes and brackets.
  2. **Internal Punctuation**: Preserve internal periods and slashes in abbreviations (e.g., `A.I.`, `e.g.`, `i.e.`, `U.S.`, `P/E ratio`).
  3. **Multi-Word Compounds**: Support 2 to 4 space-separated words, sanitizing boundary punctuation while maintaining internal spaces and hyphens.
- **Rationale**:
  - Previous regex stripped all non-alphabetical characters and unconditionally lowercased all input, which broke acronym identification.
- **Alternatives Considered**:
  - *Hardcoded Acronym List*: Fragile and impossible to maintain. Preserving case and utilizing case-sensitive provider APIs automatically scales to any acronym.
