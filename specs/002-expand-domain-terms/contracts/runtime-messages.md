# Contract: WebExtension Runtime Messaging

**Feature Branch**: `002-expand-domain-terms`  
**Date**: 2026-10-19  
**Status**: Active  

This document specifies the message protocol between the content script (injected in web pages) and the background service worker via `browser.runtime.sendMessage`.

## 1. Action: `LOOKUP_DOMAIN_TERM`

Dispatched by content script when a single word is double-clicked or a multi-word phrase is triggered.

### Request Payload

```typescript
{
  action: 'LOOKUP_DOMAIN_TERM',
  payload: {
    term: string;         // Cleaned lemma, casing preserved (e.g., "AI", "machine learning")
    rawText: string;      // Original raw selection
    isUppercase: boolean; // True if uppercase acronym or titlecase
    wordCount: number;    // Number of words (1 to 4)
  }
}
```

### Success Response Payload

```typescript
{
  status: 'success',
  data: {
    word: string;
    isAcronym: boolean;
    acronymExpansion: string | null;
    meanings: Array<{
      domain: 'Computing' | 'Science' | 'Mathematics' | 'Business' | 'History' | 'General';
      partOfSpeech: string;
      definitions: Array<{
        definition: string;
        example: string | null;
        synonyms: string[];
        antonyms: string[];
      }>;
    }>;
    generalMeanings: Array<{
      domain: 'General';
      partOfSpeech: string;
      definitions: Array<{
        definition: string;
        example: string | null;
      }>;
    }>;
    phonetic: string | null;
    audioUrl: string | null;
    encyclopedicSummary: string | null;
    referenceUrl: string | null;
    source: 'wiktionary' | 'wikipedia' | 'freedictionary' | 'hybrid';
  }
}
```

### Error / Not Found Response Payload

```typescript
{
  status: 'not_found' | 'error' | 'offline',
  errorMessage: string;
  term: string;
}
```

---

## 2. Action: `GET_SETTINGS`

Dispatched by content script upon initialization or when checking configuration.

### Response Payload

```typescript
{
  status: 'success',
  data: {
    triggerModifier: 'none' | 'alt' | 'ctrl' | 'shift';
    multiWordEnabled: boolean;
    domainBadgesEnabled: boolean;
  }
}
```
