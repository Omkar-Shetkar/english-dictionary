# Data Model: Technical, Scientific, and Domain-Specific Vocabulary Lookup

**Feature Branch**: `002-expand-domain-terms`  
**Date**: 2026-10-19  
**Status**: Completed  

## Entities & Interfaces

### 1. DomainLookupRequest

Represents an incoming user request initiated from a web page via double-click or multi-word text selection.

```typescript
interface DomainLookupRequest {
  /** The exact raw text as selected on the page */
  rawText: string;
  /** Sanitized lemma with outer boundary whitespace and punctuation trimmed */
  cleanTerm: string;
  /** True if the query was all-caps or titlecase (e.g., "AI", "RAM", "DNA") */
  isUppercase: boolean;
  /** True if the query contains 2 to 4 space-separated words */
  isMultiWord: boolean;
  /** Number of words in the sanitized query (1 to 4) */
  wordCount: number;
  /** Viewport coordinates for popup anchoring */
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Interaction mechanism that initiated the lookup */
  triggerType: 'double-click' | 'floating-icon' | 'modifier-selection';
}
```

---

### 2. DomainDefinition

A single definition item within a meaning group.

```typescript
interface DomainDefinition {
  /** The definition text */
  definition: string;
  /** Optional contextual usage example */
  example: string | null;
  /** Related synonyms */
  synonyms: string[];
  /** Related antonyms */
  antonyms: string[];
}
```

---

### 3. MeaningGroup

A categorized collection of definitions belonging to a specific part of speech and academic/industry domain.

```typescript
interface MeaningGroup {
  /** Domain classification label (e.g., 'Computing', 'Biology', 'Mathematics', 'Finance', 'History', 'General') */
  domain: 'Computing' | 'Science' | 'Mathematics' | 'Business' | 'History' | 'General';
  /** Grammatical role (e.g., 'noun', 'verb', 'adjective', 'abbreviation', 'proper noun') */
  partOfSpeech: string;
  /** List of definitions belonging to this group */
  definitions: DomainDefinition[];
}
```

---

### 4. DomainDictionaryEntry

The unified normalized response structure delivered to the content script for rendering.

```typescript
interface DomainDictionaryEntry {
  /** The canonical query term */
  word: string;
  /** True if recognized as an abbreviation, initialism, or acronym */
  isAcronym: boolean;
  /** Expanded full form if acronym (e.g., "Artificial Intelligence") */
  acronymExpansion: string | null;
  /** Primary domain-specific meanings (displayed prominently at top) */
  meanings: MeaningGroup[];
  /** Secondary general English meanings for stacked disambiguation */
  generalMeanings: MeaningGroup[];
  /** Written phonetic transcription (e.g., IPA "/ˌeɪ ˈaɪ/") */
  phonetic: string | null;
  /** URL to spoken audio pronunciation file */
  audioUrl: string | null;
  /** Optional concise encyclopedic summary (from Wikipedia REST API) */
  encyclopedicSummary: string | null;
  /** External canonical reference URL (e.g., Wikipedia article link) */
  referenceUrl: string | null;
  /** Provider source attribution */
  source: 'wiktionary' | 'wikipedia' | 'freedictionary' | 'hybrid';
}
```

---

### 5. DomainCategoryBadge

Configuration for visual domain tags rendered in the popup.

```typescript
interface DomainCategoryBadge {
  id: 'computing' | 'science' | 'mathematics' | 'business' | 'history' | 'general';
  label: string;
  cssClass: string;
  badgeStyle: {
    background: string;
    color: string;
    border: string;
  };
}
```

**Palette Specifications**:
- `Computing`: Background `#e0f2fe` (Dark mode: `#0c4a6e`), Text `#0369a1` (Dark mode: `#38bdf8`)
- `Science`: Background `#ecfdf5` (Dark mode: `#064e3b`), Text `#047857` (Dark mode: `#34d399`)
- `Mathematics`: Background `#f5f3ff` (Dark mode: `#3b0764`), Text `#6d28d9` (Dark mode: `#c084fc`)
- `Business`: Background `#fef3c7` (Dark mode: `#451a03`), Text `#b45309` (Dark mode: `#fbbf24`)
- `History`: Background `#ffedd5` (Dark mode: `#431407`), Text `#c2410c` (Dark mode: `#fb923c`)
- `General`: Background `#f3f4f6` (Dark mode: `#1f2937`), Text `#4b5563` (Dark mode: `#9ca3af`)

---

## State Transitions & Lookup Flow

```
[User Text Selection]
       │
       ├── Single word double-click ───► [Sanitize Single Word]
       │                                         │
       └── 2-4 word drag-selection               │
               │                                 │
               ├── Modifier Held? ─► Yes ────────┤
               │         │                       │
               │        No                       │
               │         ▼                       │
               │  [Show Floating Icon]           │
               │         │ (User clicks icon)    │
               │         ▼                       │
               └──► [Sanitize Multi-Word] ───────┤
                                                 ▼
                                     [Domain Lookup Request]
                                                 │
                                                 ▼
                                     [Smart Query Router]
                                 (Check In-Memory Cache)
                                                 │
                      ┌──────────────────────────┴──────────────────────────┐
                      ▼                                                     ▼
           [Uppercase / Acronym]                               [Multi-Word / Jargon]
         Concurrent Query:                                   Concurrent Query:
         - Wiktionary REST (case-sensitive)                  - Wikipedia Summary REST
         - Wikipedia Summary REST                            - Wiktionary REST
                      │                                                     │
                      └──────────────────────────┬──────────────────────────┘
                                                 ▼
                                     [Normalize & Merge Result]
                                   - Extract acronym expansions
                                   - Assign domain badges
                                   - Stack general vs domain
                                                 │
                                                 ▼
                                     [Render Stacked Popup UI]
```
