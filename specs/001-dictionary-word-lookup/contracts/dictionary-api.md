# Contract: Free Dictionary API

**Source**: `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`  
**Method**: `GET`  
**Authentication**: None (Public)  
**Headers**: `Accept: application/json`  

## Request Specification

- **Path Parameter**: `{word}` (URL-encoded sanitized English word string).
- **Example Request**:
  ```http
  GET https://api.dictionaryapi.dev/api/v2/entries/en/dictionary HTTP/1.1
  Accept: application/json
  ```

---

## Response Specification

### Success (`200 OK`)

Returns a JSON array of word definition objects.

```json
[
  {
    "word": "dictionary",
    "phonetic": "/ˈdɪkʃən(ə)ɹi/",
    "phonetics": [
      {
        "text": "/ˈdɪkʃən(ə)ɹi/",
        "audio": "https://api.dictionaryapi.dev/media/pronunciations/en/dictionary-uk.mp3",
        "sourceUrl": "https://commons.wikimedia.org/wiki/File:Dictionary.ogg"
      }
    ],
    "meanings": [
      {
        "partOfSpeech": "noun",
        "definitions": [
          {
            "definition": "A reference work with a list of words from one or more languages, normally ordered alphabetically, explaining each word's meaning.",
            "synonyms": ["wordbook", "lexicon", "vocabulary"],
            "antonyms": [],
            "example": "I always keep a dictionary on my desk."
          }
        ]
      }
    ],
    "license": {
      "name": "CC BY-SA 3.0",
      "url": "https://creativecommons.org/licenses/by-sa/3.0"
    },
    "sourceUrls": [
      "https://en.wiktionary.org/wiki/dictionary"
    ]
  }
]
```

### Word Not Found (`404 Not Found`)

```json
{
  "title": "No Definitions Found",
  "message": "Sorry pal, we couldn't find definitions for the word you were looking for.",
  "resolution": "You can try the search again at later time or head to the web instead."
}
```

### Network Failure / Offline

- Handled via `fetch` catch handler in background script.
- Generates a local synthetic response with `status: "network_error"`.
