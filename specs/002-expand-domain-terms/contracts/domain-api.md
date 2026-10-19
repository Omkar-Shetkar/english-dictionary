# Contract: Domain & Lexical APIs

**Feature Branch**: `002-expand-domain-terms`  
**Date**: 2026-10-19  
**Status**: Active  

This document specifies the external REST API contracts consumed by the background script.

## 1. Wiktionary REST API (Definitions & Acronyms)

- **Base URL**: `https://en.wiktionary.org/api/rest_v1/page/definition`
- **Method**: `GET /{term}`
- **Headers**:
  - `Accept: application/json`
  - `User-Agent: EnglishDictionaryFirefoxAddon/1.1.0`
- **Case Sensitivity**: Strictly preserves casing (e.g. `/AI` returns computing acronym entries; `/ai` returns zoological entries).
- **Timeout**: 2,500ms via `AbortController`.

### Response Payload Structure

```json
{
  "en": [
    {
      "partOfSpeech": "Noun",
      "language": "en",
      "definitions": [
        {
          "definition": "<p>(computing) <a href=\"/wiki/Artificial_intelligence\">Artificial intelligence</a>.</p>",
          "examples": [
            "We are using AI to analyze image patterns."
          ]
        },
        {
          "definition": "<p>(medicine) Aortic insufficiency.</p>"
        }
      ]
    }
  ]
}
```

### Extraction Logic
- Strip HTML tags (`<p>`, `<a>`, `<span>`).
- Extract parenthetical context tags like `(computing)`, `(medicine)`, `(mathematics)`, `(finance)` into domain badges.
- Detect acronym definitions containing phrases like "abbreviation of", "initialism of", "acronym for".

---

## 2. Wikipedia REST API (Encyclopedic Summaries)

- **Base URL**: `https://en.wikipedia.org/api/rest_v1/page/summary`
- **Method**: `GET /{title}`
- **Headers**:
  - `Accept: application/json`
  - `User-Agent: EnglishDictionaryFirefoxAddon/1.1.0`
- **Timeout**: 2,500ms via `AbortController`.

### Response Payload Structure

```json
{
  "type": "standard",
  "title": "Artificial intelligence",
  "displaytitle": "<i>Artificial intelligence</i>",
  "description": "Field of computer science",
  "extract": "Artificial intelligence (AI), in its broadest sense, is intelligence exhibited by machines, particularly computer systems.",
  "content_urls": {
    "desktop": {
      "page": "https://en.wikipedia.org/wiki/Artificial_intelligence"
    }
  }
}
```

### Extraction Logic
- `extract`: Clean plain-text lead summary (~2–3 sentences).
- `description`: Used as contextual domain classification subtitle.
- `content_urls.desktop.page`: Canonical link for users wanting deep reading.

---

## 3. Free Dictionary API (General Lexical & Audio)

- **Base URL**: `https://api.dictionaryapi.dev/api/v2/entries/en`
- **Method**: `GET /{term}`
- **Timeout**: 2,500ms via `AbortController`.

### Response Payload Structure

```json
[
  {
    "word": "artificial",
    "phonetics": [
      {
        "text": "/ˌɑːtɪˈfɪʃl/",
        "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/artificial-us.mp3"
      }
    ],
    "meanings": [
      {
        "partOfSpeech": "adjective",
        "definitions": [
          {
            "definition": "Made by humans; produced rather than naturally occurring.",
            "example": "artificial light"
          }
        ]
      }
    ]
  }
]
```

### Extraction Logic
- Extracts audio URL (`.mp3`) and phonetic transcription (IPA).
