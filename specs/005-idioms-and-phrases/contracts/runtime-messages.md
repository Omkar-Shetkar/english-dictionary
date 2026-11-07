# Contract: WebExtension Runtime Messaging

**Feature Branch**: `005-idioms-and-phrases`  
**Date**: 2026-11-07  
**Status**: Active  

This document defines runtime message schemas passed between content scripts and the background service worker via `chrome.runtime.sendMessage` and `browser.runtime.sendMessage`.

---

## 1. Action: `LOOKUP_DOMAIN_TERM` (Extended for Idioms & Multi-Word Phrases)

Dispatched by content script when a user highlights a word or multi-word phrase (2 to 8 words), clicks the floating book icon, triggers with modifier key, or clicks context menu.

### Request Payload

```typescript
{
  action: 'LOOKUP_DOMAIN_TERM',
  payload: {
    term: string;          // Sanitized phrase (e.g. "bite the bullet", "weather", "look forward to")
    rawText: string;       // Original user selection
    isUppercase: boolean;  // True if query was uppercase
    wordCount: number;     // Number of words (1 to 8)
    candidates?: string[]; // Optional pre-computed lemmatized candidate queries
  }
}
```

### Success Response Payload

```typescript
{
  status: 'success',
  entry: {
    word: string;                      // Display headword / canonical idiom
    canonicalForm?: string | null;     // Canonical form if query was an inflected variant
    expressionType?: 'idiom' | 'phrasal_verb' | 'proverb' | 'saying' | 'general';
    origin?: string | null;            // Origin/etymology if available
    phonetic?: string | null;
    audioUrl?: string | null;
    meanings: Array<{
      domain: string;                  // 'Idiom' | 'Phrasal Verb' | 'Proverb' | 'General' | domain
      partOfSpeech: string;
      definitions: Array<{
        definition: string;
        example: string | null;
        synonyms: string[];
        antonyms: string[];
      }>;
    }>;
    literalMeanings?: Array<{
      partOfSpeech: string;
      definitions: Array<{
        definition: string;
        example: string | null;
      }>;
    }>;
    relatedIdioms?: Array<{
      phrase: string;
      summary: string;
      badge: 'Idiom' | 'Phrasal Verb' | 'Proverb';
    }>;
    encyclopedicSummary?: string | null;
    referenceUrl?: string | null;
    source: 'wiktionary' | 'freedictionary' | 'wikipedia' | 'cascade';
  },
  errorMessage: null
}
```

### Not Found Response Payload

```typescript
{
  status: 'not_found',
  entry: null,
  errorMessage: 'No definitions or idiomatic expressions found for "phrase". Check spelling.',
  suggestedWords?: string[] // Optional individual words for user convenience
}
```

---

## 2. Action: `TRIGGER_SELECTION_LOOKUP` (Context Menu Trigger)

Dispatched from background service worker to the active tab when user clicks the context menu item.

### Message Payload

```typescript
{
  action: 'TRIGGER_SELECTION_LOOKUP',
  payload: {
    term: string; // The selected text up to 8 words
  }
}
```
