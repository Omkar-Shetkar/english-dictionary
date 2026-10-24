/**
 * Calculates optimal viewport coordinates for anchoring the floating popup card
 * adjacent to the selected word without overflowing viewport boundaries.
 */

export const POPUP_DEFAULT_WIDTH = 340;
export const POPUP_ESTIMATED_HEIGHT = 220;
export const ANCHOR_GAP = 8;
export const VIEWPORT_MARGIN = 12;

/**
 * Computes fixed viewport coordinates for the popup card.
 *
 * @param {object} params
 * @param {DOMRect|object} params.anchorRect - Bounding rect of the selected word.
 * @param {number} [params.popupWidth] - Width of popup card in pixels.
 * @param {number} [params.popupHeight] - Height of popup card in pixels.
 * @param {number} [params.viewportWidth] - Viewport window.innerWidth.
 * @param {number} [params.viewportHeight] - Viewport window.innerHeight.
 * @returns {{ top: number, left: number, placement: 'bottom' | 'top' }}
 */
export function calculatePopupPosition({
  anchorRect,
  popupWidth = POPUP_DEFAULT_WIDTH,
  popupHeight = POPUP_ESTIMATED_HEIGHT,
  viewportWidth = (typeof window !== 'undefined' ? window.innerWidth : 1024),
  viewportHeight = (typeof window !== 'undefined' ? window.innerHeight : 768)
}) {
  if (!anchorRect) {
    return { top: VIEWPORT_MARGIN, left: VIEWPORT_MARGIN, placement: 'bottom' };
  }

  // Handle collapsed / zero-dimension selection (e.g. context menu click in PDF viewers)
  if (anchorRect.width === 0 && anchorRect.height === 0) {
    const centeredLeft = Math.max(VIEWPORT_MARGIN, Math.round((viewportWidth - popupWidth) / 2));
    const fallbackTop = Math.min(80, Math.max(VIEWPORT_MARGIN, Math.round((viewportHeight - popupHeight) / 3)));
    return { top: fallbackTop, left: centeredLeft, placement: 'bottom' };
  }

  // Horizontal calculation: align with word left, clamp to viewport edges
  let left = anchorRect.left;

  // If overflowing right edge, clamp back
  if (left + popupWidth > viewportWidth - VIEWPORT_MARGIN) {
    left = viewportWidth - popupWidth - VIEWPORT_MARGIN;
  }

  // If overflowing left edge, clamp forward
  if (left < VIEWPORT_MARGIN) {
    left = VIEWPORT_MARGIN;
  }

  // Vertical calculation:
  // Default: below anchor word
  const spaceBelow = viewportHeight - anchorRect.bottom - ANCHOR_GAP;
  const spaceAbove = anchorRect.top - ANCHOR_GAP;

  let top = anchorRect.bottom + ANCHOR_GAP;
  let placement = 'bottom';

  // If insufficient space below AND more space above, flip above
  if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
    top = Math.max(VIEWPORT_MARGIN, anchorRect.top - popupHeight - ANCHOR_GAP);
    placement = 'top';
  } else {
    // If placing below, ensure it doesn't clip off the bottom edge
    if (top + popupHeight > viewportHeight - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, viewportHeight - popupHeight - VIEWPORT_MARGIN);
    }
  }

  return {
    top: Math.round(top),
    left: Math.round(left),
    placement
  };
}
