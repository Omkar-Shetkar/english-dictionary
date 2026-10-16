import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  VALID_MODIFIER_KEYS,
  validateConfig,
  matchesModifier
} from '../../src/common/storage.js';

describe('storage and trigger configuration', () => {
  it('has correct default configuration per spec', () => {
    expect(DEFAULT_CONFIG.modifierKey).toBe('none');
    expect(DEFAULT_CONFIG.enabled).toBe(true);
    expect(DEFAULT_CONFIG.theme).toBe('auto');
  });

  it('validates and accepts valid configuration values', () => {
    for (const key of VALID_MODIFIER_KEYS) {
      const valid = validateConfig({ modifierKey: key, enabled: false, theme: 'dark' });
      expect(valid.modifierKey).toBe(key);
      expect(valid.enabled).toBe(false);
      expect(valid.theme).toBe('dark');
    }
  });

  it('falls back to defaults for invalid configuration fields', () => {
    const fallback = validateConfig({
      modifierKey: 'invalid_key',
      enabled: 'not_a_boolean',
      theme: 'neon_pink'
    });

    expect(fallback.modifierKey).toBe('none');
    expect(fallback.enabled).toBe(true);
    expect(fallback.theme).toBe('auto');
  });

  it('matchesModifier returns true for "none" regardless of keys pressed', () => {
    expect(matchesModifier({}, 'none')).toBe(true);
    expect(matchesModifier({ altKey: true }, 'none')).toBe(true);
  });

  it('matchesModifier correctly verifies "alt" modifier', () => {
    expect(matchesModifier({ altKey: true }, 'alt')).toBe(true);
    expect(matchesModifier({ altKey: false }, 'alt')).toBe(false);
    expect(matchesModifier({}, 'alt')).toBe(false);
  });

  it('matchesModifier correctly verifies "ctrl" modifier (and metaKey on macOS)', () => {
    expect(matchesModifier({ ctrlKey: true }, 'ctrl')).toBe(true);
    expect(matchesModifier({ metaKey: true }, 'ctrl')).toBe(true);
    expect(matchesModifier({ ctrlKey: false, metaKey: false }, 'ctrl')).toBe(false);
  });

  it('matchesModifier correctly verifies "shift" modifier', () => {
    expect(matchesModifier({ shiftKey: true }, 'shift')).toBe(true);
    expect(matchesModifier({ shiftKey: false }, 'shift')).toBe(false);
  });
});
