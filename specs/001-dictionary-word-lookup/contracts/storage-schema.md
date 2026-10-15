# Contract: Storage Schema

Storage contract for addon user preferences stored in `browser.storage.sync` (with automatic fallback to `browser.storage.local`).

---

## Storage Key: `settings`

### Type: `Object`

| Property | Type | Allowed Values | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `modifierKey` | `string` | `"none"`, `"alt"`, `"ctrl"`, `"shift"` | `"none"` | The key that must be held during double-click. `"none"` means standard double-click. |
| `enabled` | `boolean` | `true`, `false` | `true` | When `false`, double-click events are ignored by the extension. |
| `theme` | `string` | `"auto"`, `"light"`, `"dark"` | `"auto"` | UI color theme for the popup card. |

### JSON Serialization Example

```json
{
  "settings": {
    "modifierKey": "none",
    "enabled": true,
    "theme": "auto"
  }
}
```
