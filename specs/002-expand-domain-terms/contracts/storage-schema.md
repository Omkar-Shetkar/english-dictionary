# Contract: Storage Schema

**Feature Branch**: `002-expand-domain-terms`  
**Date**: 2026-10-19  
**Status**: Active  

This document specifies the key-value schema persisted in `browser.storage.sync` (with automatic fallback to `browser.storage.local`).

## Schema Definition

```typescript
interface AddonSettings {
  /**
   * Modifier key required for double-click trigger.
   * Default: "none" (direct double-click)
   */
  triggerModifier: 'none' | 'alt' | 'ctrl' | 'shift';

  /**
   * Whether multi-word compound term selection (2–4 words) is active.
   * Default: true
   */
  multiWordEnabled: boolean;

  /**
   * Whether academic and industry domain badges (Computing, Science, Math, etc.)
   * are visibly rendered on definitions.
   * Default: true
   */
  domainBadgesEnabled: boolean;

  /**
   * Version of the settings schema.
   * Default: 2
   */
  schemaVersion: number;
}
```

## Default Values

```json
{
  "triggerModifier": "none",
  "multiWordEnabled": true,
  "domainBadgesEnabled": true,
  "schemaVersion": 2
}
```
