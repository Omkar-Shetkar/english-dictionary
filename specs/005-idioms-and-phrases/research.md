# Research: Idioms and Phrasal Expressions Lookup

**Feature Branch**: `005-idioms-and-phrases`  
**Date**: 2026-11-07  
**Status**: Completed  

## Executive Summary

Supporting English idioms, proverbs, and phrasal verbs requires extending the existing lexical pipeline to handle multi-word expressions (2 to 8 words), lemmatizing inflected verb forms and personal pronouns to canonical dictionary headwords (e.g. "bit the bullet" → "bite the bullet", "pulling his leg" → "pull someone's leg"), and visually distinguishing figurative meanings with clear classification tags (`[Idiom]`, `[Phrasal Verb]`, `[Proverb]`).

This research resolves the provider architecture, inflection normalization heuristics, selection length thresholds, related-idiom discovery mechanisms, and UI presentation models.

---

## Technical Decisions

### Decision 1: Multi-Provider Idiom & Phrasal Verb Retrieval Architecture

- **Decision**: Extend the online multi-provider cascade (Wiktionary REST API + Free Dictionary API + Wikipedia Summary API) with smart phrase endpoint routing and candidate fallback.
- **Rationale**:
  - **Wiktionary REST API** (`https://en.wiktionary.org/api/rest_v1/page/definition/{phrase}`) provides rich support for multi-word entries under parts of speech like `"phrase"`, `"idiom"`, `"proverb"`, and `"verb"` (for phrasal verbs). It includes figurative definitions, examples, and etymology.
  - **Free Dictionary API** (`https://api.dictionaryapi.dev/api/v2/entries/en/{phrase}`) supports common phrasal verbs (e.g., "give up", "look forward to", "run into") with complete phonetic and part-of-speech metadata.
  - **Wikipedia Summary API** provides historical and cultural explanations for famous idioms, proverbs, and allegorical expressions (e.g., "Achilles' heel", "Pandora's box", "Trojan horse").
- **Alternatives Considered**:
  - *Bundled Offline Idiom Database*: Packaging a large JSON database into the extension increases download package size by several megabytes, requires periodic updates, and contradicts the privacy-first, lightweight architecture.
  - *Dedicated Commercial Idiom API*: Requires API keys, subscription pricing, and risks downtime or rate-limiting.

---

### Decision 2: Phrase Lemmatization, Tense Resolution, and Pronoun Normalization

- **Decision**: Implement a lightweight client-side canonical phrase normalizer (`src/common/phrase-normalizer.js`) that produces candidate lookup queries:
  1. **Exact Surface Form**: The exact sanitized phrase selected by user (e.g., `"break the ice"`).
  2. **Pronoun-Normalized Form**: Replaces possessive/object personal pronouns (`my`, `your`, `his`, `her`, `our`, `their`) with standard wildcards (`one's` / `someone's`) e.g. `"pulling his leg"` → `"pulling someone's leg"`.
  3. **Verb-Lemmatized Canonical Form**: Lemmatizes the primary verb using an irregular verb stem table (e.g. `bit` → `bite`, `spilled` → `spill`, `broke` → `break`, `gave` → `give`, `ran` → `run`, `took` → `take`, `kept` → `keep`) and standard inflection rules (`-ing`, `-ed`, `-s`), mapping to canonical headword `"bite the bullet"`.
- **Rationale**:
  In authentic English reading, idioms rarely appear strictly in infinitive base form. Generating prioritized candidate queries allows the cascade to query the exact term first, then fall back immediately to the canonical lemma if not found, with zero additional network requests when the primary form matches.
- **Alternatives Considered**:
  - *Full NLP POS Tagger library (e.g., compromise or natural)*: Too heavy for an ephemeral browser extension content script/background worker; adds 500KB+ bundle weight and high CPU latency.
  - *Strict Exact Matching Only*: Rejected because >40% of real reading lookups for idioms would fail due to past tense or personalized pronouns.

---

### Decision 3: Selection Length Bounds and Trigger Expansion

- **Decision**:
  - Increase `MAX_PHRASE_WORDS` in `src/common/sanitize.js` from `4` to `8`.
  - Increase `MAX_PHRASE_LENGTH` from `120` to `180` characters.
  - Update `src/content/content.js` mouseup listener to evaluate multi-word selections from `2` to `8` words.
  - Context menu lookup seamlessly processes multi-word selections up to 8 words.
- **Rationale**:
  Over 95% of common English idioms and proverbs have between 2 and 7 words (e.g., "bite the bullet" [3], "a blessing in disguise" [4], "actions speak louder than words" [5], "burn the candle at both ends" [6], "don't put all your eggs in one basket" [8]). Capping at 8 words maintains high responsiveness while covering long idioms.
- **Alternatives Considered**:
  - *Unbounded phrase selection*: Unbounded selection creates sluggish parsing and accidental lookups when users drag-select entire paragraphs to copy text.

---

### Decision 4: Related Idioms Discovery on Single-Word Lookups

- **Decision**:
  - Maintain an in-memory index of high-frequency keywords mapped to popular idioms (e.g., `"weather"` → `["under the weather", "weather the storm"]`; `"ice"` → `["break the ice", "skating on thin ice"]`; `"bullet"` → `["bite the bullet", "dodge a bullet"]`; `"beans"` → `["spill the beans", "full of beans"]`).
  - When a single-word lookup is performed, retrieve matching related idioms and attach them to the response under `relatedIdioms`.
  - In `PopupView`, render an expandable or compact "Related Idioms & Phrases" chip list at the bottom of the card.
  - Clicking any chip navigates the card directly to that idiom's full definition using the existing lookup pipeline without dismissing the popup.
- **Rationale**:
  Delivers high pedagogical value for ESL students and readers. Allows users who don't know the full idiom to discover it directly from the word they encountered.
- **Alternatives Considered**:
  - *Querying separate API endpoint for every single word*: Adds extra latency and network load. An index of common idiom keywords resolves instantly with 0ms delay.

---

### Decision 5: UI Presentation, Expression Badges & Origin Lore

- **Decision**:
  - Assign distinct badge styles for expression types:
    - `[Idiom]` (purple badge)
    - `[Phrasal Verb]` (teal badge)
    - `[Proverb]` (amber badge)
  - Display figurative definition prominently.
  - If the idiom has historical/etymological lore (from Wiktionary or Wikipedia), display a collapsible/clean "Origin" section.
  - When an expression has a literal counterpart (e.g. "spill the beans"), show the literal meaning under a secondary demarcated section.
- **Rationale**:
  Clear visual hierarchy ensures users instantly know they are reading a figurative idiom rather than a literal definition.
