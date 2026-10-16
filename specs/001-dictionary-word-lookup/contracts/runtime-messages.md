# Contract: Extension Internal Runtime Messages

Internal communication protocol between Content Script, Background Service, and Options UI using `browser.runtime.sendMessage()` and `browser.runtime.onMessage`.

---

## 1. Message: `LOOKUP_WORD`

- **Sender**: Content Script
- **Receiver**: Background Service
- **Purpose**: Requests definition and audio metadata for a double-clicked word without violating host-page CSP.

### Payload Schema

```json
{
  "action": "LOOKUP_WORD",
  "word": "serendipity"
}
```

### Response Schema (`LookupResult`)

#### Success Case:
```json
{
  "status": "success",
  "entry": {
    "word": "serendipity",
    "phonetic": "/ˌsɛɹənˈdɪpɪti/",
    "audioUrl": "https://api.dictionaryapi.dev/media/pronunciations/en/serendipity-us.mp3",
    "meanings": [
      {
        "partOfSpeech": "noun",
        "definitions": [
          {
            "definition": "An unsought, unintended, and desirable discovery and disclosure.",
            "example": "Finding this café was pure serendipity."
          }
        ]
      }
    ]
  }
}
```

#### Not Found Case:
```json
{
  "status": "not_found",
  "errorMessage": "No definitions found for \"serendipity\". Check spelling."
}
```

#### Network Error Case:
```json
{
  "status": "network_error",
  "errorMessage": "Unable to connect to dictionary service. Please check your internet connection."
}
```

---

## 2. Message: `GET_CONFIG`

- **Sender**: Content Script / Options Script
- **Receiver**: Background Service
- **Purpose**: Retrieve the current trigger modifier configuration and enabled flag.

### Payload Schema
```json
{
  "action": "GET_CONFIG"
}
```

### Response Schema (`TriggerConfiguration`)
```json
{
  "modifierKey": "none",
  "enabled": true,
  "theme": "auto"
}
```

---

## 3. Message: `CONFIG_UPDATED`

- **Sender**: Options Script
- **Receiver**: Background Service / Active Content Scripts
- **Purpose**: Broadcast updated settings when the user modifies key combinations in options.

### Payload Schema
```json
{
  "action": "CONFIG_UPDATED",
  "config": {
    "modifierKey": "alt",
    "enabled": true,
    "theme": "auto"
  }
}
```
