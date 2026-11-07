# Contract: Multi-Provider Idiom & Phrase API Endpoints

**Feature Branch**: `005-idioms-and-phrases`  
**Date**: 2026-11-07  
**Status**: Active  

This document specifies the external public REST endpoints utilized by the background service worker to fetch idiomatic definitions, phrasal verbs, and sayings.

---

## 1. Wiktionary REST API

- **Endpoint**: `https://en.wiktionary.org/api/rest_v1/page/definition/{phrase}`
- **Method**: `GET`
- **Headers**: `Accept: application/json`
- **Timeout**: `2500ms` (aborted via `AbortController`)
- **Query Parameter**: Phrase formatted with spaces replaced by underscores or URL-encoded (e.g. `bite_the_bullet`, `break_the_ice`).

### Response Structure

```json
{
  "en": [
    {
      "partOfSpeech": "Phrase",
      "language": "en",
      "definitions": [
        {
          "definition": "<p>To accept or endure a grim or dire situation with fortitude.</p>",
          "examples": [
            "<p>We'll just have to bite the bullet and pay the fine.</p>"
          ]
        }
      ]
    }
  ]
}
```

### Parsing Rules

- Extract definitions where `partOfSpeech` matches `Phrase`, `Idiom`, `Proverb`, or `Verb`.
- Strip HTML tags using `cleanHtml`.
- Extract example sentences and format them.
- If etymology or origin is embedded, extract it for the `origin` property.

---

## 2. Free Dictionary API

- **Endpoint**: `https://api.dictionaryapi.dev/api/v2/entries/en/{phrase}`
- **Method**: `GET`
- **Headers**: `Accept: application/json`
- **Timeout**: `2500ms`

### Response Structure

```json
[
  {
    "word": "give up",
    "phonetics": [],
    "meanings": [
      {
        "partOfSpeech": "verb",
        "definitions": [
          {
            "definition": "To surrender or yield.",
            "example": "He gave up after two rounds.",
            "synonyms": ["surrender", "quit"],
            "antonyms": ["persevere"]
          }
        ]
      }
    ]
  }
]
```

### Parsing Rules

- Used primarily for multi-word phrasal verbs and pronunciation phonetics.

---

## 3. Wikipedia Summary REST API

- **Endpoint**: `https://en.wikipedia.org/api/rest_v1/page/summary/{title}`
- **Method**: `GET`
- **Headers**: `Accept: application/json`
- **Timeout**: `2500ms`

### Parsing Rules

- Used as fallback for cultural idioms, mythological sayings (e.g., "Achilles' heel", "Pandora's box", "Trojan horse"), and historical proverbs.
