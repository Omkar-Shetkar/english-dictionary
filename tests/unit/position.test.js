import { describe, it, expect } from 'vitest';
import { calculatePopupPosition, VIEWPORT_MARGIN, ANCHOR_GAP } from '../../src/common/position.js';

describe('calculatePopupPosition', () => {
  const viewport = { viewportWidth: 1000, viewportHeight: 800 };
  const popup = { popupWidth: 300, popupHeight: 200 };

  it('positions popup directly below anchor when space is ample', () => {
    const anchorRect = { top: 100, bottom: 120, left: 150, right: 200, width: 50, height: 20 };
    const pos = calculatePopupPosition({ anchorRect, ...popup, ...viewport });

    expect(pos.placement).toBe('bottom');
    expect(pos.top).toBe(anchorRect.bottom + ANCHOR_GAP);
    expect(pos.left).toBe(anchorRect.left);
  });

  it('clamps left coordinate when anchor is near the right edge of viewport', () => {
    // Word at x = 950, popup width 300 in 1000px viewport
    const anchorRect = { top: 100, bottom: 120, left: 950, right: 980, width: 30, height: 20 };
    const pos = calculatePopupPosition({ anchorRect, ...popup, ...viewport });

    expect(pos.left).toBe(1000 - 300 - VIEWPORT_MARGIN);
    expect(pos.left + 300).toBeLessThanOrEqual(1000);
  });

  it('clamps left coordinate when anchor is near the left edge of viewport', () => {
    const anchorRect = { top: 100, bottom: 120, left: 2, right: 30, width: 28, height: 20 };
    const pos = calculatePopupPosition({ anchorRect, ...popup, ...viewport });

    expect(pos.left).toBe(VIEWPORT_MARGIN);
  });

  it('flips popup above anchor when near the bottom of viewport', () => {
    // Word at bottom y = 720 in 800px viewport, popup height 200
    const anchorRect = { top: 700, bottom: 720, left: 200, right: 250, width: 50, height: 20 };
    const pos = calculatePopupPosition({ anchorRect, ...popup, ...viewport });

    expect(pos.placement).toBe('top');
    expect(pos.top).toBe(anchorRect.top - 200 - ANCHOR_GAP);
    expect(pos.top).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
  });

  it('handles null/missing anchorRect gracefully with fallback', () => {
    const pos = calculatePopupPosition({ anchorRect: null, ...popup, ...viewport });
    expect(pos.top).toBe(VIEWPORT_MARGIN);
    expect(pos.left).toBe(VIEWPORT_MARGIN);
  });

  it('centers popup horizontally when anchorRect has zero width and height', () => {
    const zeroRect = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
    const pos = calculatePopupPosition({ anchorRect: zeroRect, ...popup, ...viewport });
    expect(pos.left).toBe(Math.round((1000 - 300) / 2));
    expect(pos.top).toBe(80);
    expect(pos.placement).toBe('bottom');
  });
});
