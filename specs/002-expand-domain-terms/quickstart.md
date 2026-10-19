# Quickstart Guide: Technical, Scientific, and Domain Vocabulary Lookup

**Feature Branch**: `002-expand-domain-terms`  
**Date**: 2026-10-19  

This guide explains how to test and verify the expanded technical, scientific, business, mathematical, historical, and acronym vocabulary lookup capabilities.

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **Mozilla Firefox**: Modern desktop release (Firefox 115+ ESR or Firefox 120+)
- **Package Manager**: `npm`

---

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build extension bundles:
   ```bash
   npm run build
   ```

3. Launch in Firefox with `web-ext`:
   ```bash
   npm start
   # or: npx web-ext run --source-dir src
   ```

---

## Verifying Feature Capabilities

### 1. Test Acronym Recognition & Expansion (User Story 1 - P1)
1. Open any tech or news article containing the acronym `"AI"`.
2. Double-click `"AI"`.
3. **Expected**:
   - The popup card immediately displays the expanded full title: **"AI — Artificial Intelligence"**.
   - The primary definition describes machine intelligence in computer science with a **`[Computing]`** badge.
   - The general zoological definition ("three-toed sloth") is displayed in a demarcated **"General English Meanings"** section below, not replacing the acronym.
4. Test with `"RAM"`, `"API"`, `"ROI"`, `"DNA"`, and `"GDP"`.
   - All uppercase queries return their primary acronym expansions without delay.

### 2. Test Technical & Scientific Vocabulary (User Story 2 - P2)
1. Double-click specialized terms:
   - Science: `"photosynthesis"`, `"homeostasis"`, `"CRISPR"` → Displays biological definitions with **`[Biology]`** or **`[Science]`** badge.
   - Math: `"eigenvalue"`, `"asymptote"` → Displays mathematical explanations with **`[Mathematics]`** badge.
   - Computing: `"polymorphism"`, `"hypervisor"` → Displays software/hardware definitions with **`[Computing]`** badge.

### 3. Test Business & Historical Vocabulary (User Story 3 - P3)
1. Double-click business/economic terms:
   - `"amortization"`, `"liquidity"`, `"EBITDA"` → Displays corporate finance definitions with **`[Finance]`** or **`[Business]`** badge.
2. Double-click historical eras/events:
   - `"Renaissance"`, `"feudalism"` → Displays concise historical overviews and cultural significance with a **`[History]`** badge.

### 4. Test Multi-Word Phrase Selection (User Story 4 - P4)
1. Highlight a 2-to-4 word compound concept (e.g., `"machine learning"` or `"compound interest"`).
2. Release the mouse button without holding a modifier key.
3. **Expected**:
   - A compact floating dictionary icon appears adjacent to the selected phrase.
   - Normal text copying is completely unhindered.
   - Click the floating icon: The dictionary popup card opens, displaying the unified definition for `"machine learning"`.
4. Hold <kbd>Alt</kbd> (or configured modifier) while highlighting `"black hole"` and release.
   - **Expected**: The popup opens immediately without needing to click the floating icon.

### 5. Test Stacked Disambiguation (User Story 5 - P5)
1. Double-click `"RAM"`.
2. **Expected**:
   - Top section: **Random Access Memory** [Computing] definition.
   - Bottom section: **General English Meanings** [Zoology] "A male sheep".

---

## Running Unit Tests

Execute the automated test suite to verify routing, sanitization, and parsing:

```bash
npm test
```
