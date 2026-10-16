(() => {
  // src/common/sanitize.js
  var LEADING_BOUNDARY_REGEX = /^[\s\p{P}\p{S}]+/u;
  var TRAILING_BOUNDARY_REGEX = /[\s\p{P}\p{S}]+$/u;
  var HAS_LETTER_REGEX = /\p{L}/u;
  var MAX_WORD_LENGTH = 45;
  function sanitizeWord(rawText) {
    if (typeof rawText !== "string") {
      return { isValid: false, word: "", raw: "" };
    }
    const raw = rawText.trim();
    if (!raw) {
      return { isValid: false, word: "", raw };
    }
    let cleaned = raw.replace(LEADING_BOUNDARY_REGEX, "").replace(TRAILING_BOUNDARY_REGEX, "");
    cleaned = cleaned.toLowerCase();
    const isValid = Boolean(
      cleaned.length > 0 && cleaned.length <= MAX_WORD_LENGTH && HAS_LETTER_REGEX.test(cleaned) && !/\s/.test(cleaned)
    );
    return {
      isValid,
      word: isValid ? cleaned : "",
      raw
    };
  }

  // src/common/position.js
  var POPUP_DEFAULT_WIDTH = 340;
  var POPUP_ESTIMATED_HEIGHT = 220;
  var ANCHOR_GAP = 8;
  var VIEWPORT_MARGIN = 12;
  function calculatePopupPosition({
    anchorRect,
    popupWidth = POPUP_DEFAULT_WIDTH,
    popupHeight = POPUP_ESTIMATED_HEIGHT,
    viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024,
    viewportHeight = typeof window !== "undefined" ? window.innerHeight : 768
  }) {
    if (!anchorRect) {
      return { top: VIEWPORT_MARGIN, left: VIEWPORT_MARGIN, placement: "bottom" };
    }
    let left = anchorRect.left;
    if (left + popupWidth > viewportWidth - VIEWPORT_MARGIN) {
      left = viewportWidth - popupWidth - VIEWPORT_MARGIN;
    }
    if (left < VIEWPORT_MARGIN) {
      left = VIEWPORT_MARGIN;
    }
    const spaceBelow = viewportHeight - anchorRect.bottom - ANCHOR_GAP;
    const spaceAbove = anchorRect.top - ANCHOR_GAP;
    let top = anchorRect.bottom + ANCHOR_GAP;
    let placement = "bottom";
    if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
      top = Math.max(VIEWPORT_MARGIN, anchorRect.top - popupHeight - ANCHOR_GAP);
      placement = "top";
    } else {
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

  // src/common/storage.js
  var VALID_MODIFIER_KEYS = ["none", "alt", "ctrl", "shift"];
  var VALID_THEMES = ["auto", "light", "dark"];
  var DEFAULT_CONFIG = Object.freeze({
    modifierKey: "none",
    enabled: true,
    theme: "auto"
  });
  var STORAGE_KEY = "settings";
  function getStorageArea() {
    if (typeof browser !== "undefined" && browser.storage) {
      return browser.storage.sync || browser.storage.local;
    }
    if (typeof chrome !== "undefined" && chrome.storage) {
      return chrome.storage.sync || chrome.storage.local;
    }
    return null;
  }
  function validateConfig(raw = {}) {
    const modifierKey = VALID_MODIFIER_KEYS.includes(raw.modifierKey) ? raw.modifierKey : DEFAULT_CONFIG.modifierKey;
    const enabled = typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_CONFIG.enabled;
    const theme = VALID_THEMES.includes(raw.theme) ? raw.theme : DEFAULT_CONFIG.theme;
    return { modifierKey, enabled, theme };
  }
  async function getSettings() {
    const storage = getStorageArea();
    if (!storage) {
      return { ...DEFAULT_CONFIG };
    }
    try {
      const result = await storage.get(STORAGE_KEY);
      const stored = result && result[STORAGE_KEY] ? result[STORAGE_KEY] : {};
      return validateConfig(stored);
    } catch (err) {
      console.warn("[Dictionary Addon] Failed to load settings from storage:", err);
      return { ...DEFAULT_CONFIG };
    }
  }
  function matchesModifier(event, modifierKey = "none") {
    if (!event) return false;
    switch (modifierKey) {
      case "none":
        return true;
      case "alt":
        return Boolean(event.altKey);
      case "ctrl":
        return Boolean(event.ctrlKey || event.metaKey);
      case "shift":
        return Boolean(event.shiftKey);
      default:
        return true;
    }
  }

  // src/content/popup-view.js
  var HOST_ELEMENT_ID = "eng-dict-firefox-host-root";
  var SVG_NS = "http://www.w3.org/2000/svg";
  function createSvgElement(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, val] of Object.entries(attrs)) {
      el.setAttribute(key, val);
    }
    return el;
  }
  function createSpeakerSvg() {
    const svg = createSvgElement("svg", {
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2.2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
    const polygon = createSvgElement("polygon", {
      points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5",
      fill: "currentColor"
    });
    const path1 = createSvgElement("path", {
      d: "M15.54 8.46a5 5 0 0 1 0 7.07",
      fill: "none"
    });
    const path2 = createSvgElement("path", {
      d: "M19.07 4.93a10 10 0 0 1 0 14.14",
      fill: "none"
    });
    svg.appendChild(polygon);
    svg.appendChild(path1);
    svg.appendChild(path2);
    return svg;
  }
  function createCloseSvg() {
    const svg = createSvgElement("svg", {
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2.2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
    const line1 = createSvgElement("line", {
      x1: "18",
      y1: "6",
      x2: "6",
      y2: "18"
    });
    const line2 = createSvgElement("line", {
      x1: "6",
      y1: "6",
      x2: "18",
      y2: "18"
    });
    svg.appendChild(line1);
    svg.appendChild(line2);
    return svg;
  }
  function createAlertSvg() {
    const svg = createSvgElement("svg", {
      width: "32",
      height: "32",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
    const circle = createSvgElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    });
    const line1 = createSvgElement("line", {
      x1: "12",
      y1: "8",
      x2: "12",
      y2: "12"
    });
    const line2 = createSvgElement("line", {
      x1: "12",
      y1: "16",
      x2: "12.01",
      y2: "16"
    });
    svg.appendChild(circle);
    svg.appendChild(line1);
    svg.appendChild(line2);
    return svg;
  }
  var PopupView = class {
    constructor() {
      this.host = null;
      this.shadowRoot = null;
      this.activeAudio = null;
      this.cssText = "";
      this._handleOutsideClick = this._handleOutsideClick.bind(this);
      this._handleKeydown = this._handleKeydown.bind(this);
      this._handleScroll = this._handleScroll.bind(this);
    }
    setStyles(css) {
      this.cssText = css;
    }
    _ensureMounted() {
      if (this.host && document.contains(this.host)) {
        return;
      }
      const existing = document.getElementById(HOST_ELEMENT_ID);
      if (existing) existing.remove();
      this.host = document.createElement("div");
      this.host.id = HOST_ELEMENT_ID;
      this.shadowRoot = this.host.attachShadow({ mode: "open" });
      const styleEl = document.createElement("style");
      styleEl.textContent = this.cssText;
      this.shadowRoot.appendChild(styleEl);
      document.documentElement.appendChild(this.host);
      this.host.addEventListener("wheel", (e) => {
        e.stopPropagation();
      }, { passive: true });
      document.addEventListener("mousedown", this._handleOutsideClick, true);
      window.addEventListener("keydown", this._handleKeydown, true);
      window.addEventListener("scroll", this._handleScroll, { passive: true });
    }
    _updatePosition(coords) {
      if (!this.host || !coords) return;
      this.host.style.top = `${coords.top}px`;
      this.host.style.left = `${coords.left}px`;
    }
    _createHeader(word, phoneticText = "", audioUrl = null, showAudio = false) {
      const header = document.createElement("div");
      header.className = "dict-header";
      const titleGroup = document.createElement("div");
      titleGroup.className = "dict-title-group";
      const wordEl = document.createElement("span");
      wordEl.className = "dict-word";
      wordEl.textContent = word;
      titleGroup.appendChild(wordEl);
      if (phoneticText) {
        const phoneticEl = document.createElement("span");
        phoneticEl.className = "dict-phonetic";
        phoneticEl.textContent = phoneticText;
        titleGroup.appendChild(phoneticEl);
      }
      const actions = document.createElement("div");
      actions.className = "dict-header-actions";
      if (showAudio) {
        const audioBtn = document.createElement("button");
        audioBtn.className = "dict-btn dict-audio-btn";
        audioBtn.title = "Listen to pronunciation";
        audioBtn.setAttribute("aria-label", "Listen to pronunciation");
        audioBtn.appendChild(createSpeakerSvg());
        audioBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.playAudio(word, audioUrl, audioBtn);
        });
        actions.appendChild(audioBtn);
      }
      const closeBtn = document.createElement("button");
      closeBtn.className = "dict-btn dict-close-btn";
      closeBtn.title = "Close";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.appendChild(createCloseSvg());
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.dismiss();
      });
      actions.appendChild(closeBtn);
      header.appendChild(titleGroup);
      header.appendChild(actions);
      return header;
    }
    showLoading(word, coords, theme = "auto") {
      this._ensureMounted();
      this._updatePosition(coords);
      const card = document.createElement("div");
      card.className = `dict-card ${this._getThemeClass(theme)}`;
      card.appendChild(this._createHeader(word, "", null, false));
      const loadingView = document.createElement("div");
      loadingView.className = "dict-loading-view";
      const spinner = document.createElement("div");
      spinner.className = "dict-spinner";
      loadingView.appendChild(spinner);
      const text = document.createElement("span");
      text.textContent = "Searching dictionary...";
      loadingView.appendChild(text);
      card.appendChild(loadingView);
      this._renderCard(card);
    }
    showResult(entry, coords, theme = "auto") {
      this._ensureMounted();
      this._updatePosition(coords);
      const card = document.createElement("div");
      card.className = `dict-card ${this._getThemeClass(theme)}`;
      card.appendChild(this._createHeader(entry.word, entry.phonetic, entry.audioUrl, true));
      const body = document.createElement("div");
      body.className = "dict-body";
      for (const group of entry.meanings) {
        const groupEl = document.createElement("div");
        groupEl.className = "dict-meaning-group";
        const badge = document.createElement("span");
        badge.className = "dict-pos-badge";
        badge.textContent = group.partOfSpeech;
        groupEl.appendChild(badge);
        const list = document.createElement("ol");
        list.className = "dict-definitions-list";
        for (const d of group.definitions.slice(0, 3)) {
          const item = document.createElement("li");
          item.className = "dict-def-item";
          const defText = document.createElement("div");
          defText.textContent = d.definition;
          item.appendChild(defText);
          if (d.example) {
            const ex = document.createElement("div");
            ex.className = "dict-example";
            ex.textContent = `\u201C${d.example}\u201D`;
            item.appendChild(ex);
          }
          if (d.synonyms && d.synonyms.length > 0) {
            const syn = document.createElement("div");
            syn.className = "dict-synonyms";
            syn.textContent = "Similar: ";
            const synSpan = document.createElement("span");
            synSpan.textContent = d.synonyms.join(", ");
            syn.appendChild(synSpan);
            item.appendChild(syn);
          }
          list.appendChild(item);
        }
        groupEl.appendChild(list);
        body.appendChild(groupEl);
      }
      card.appendChild(body);
      this._renderCard(card);
    }
    showError(message, word, coords, theme = "auto") {
      this._ensureMounted();
      this._updatePosition(coords);
      const card = document.createElement("div");
      card.className = `dict-card ${this._getThemeClass(theme)}`;
      card.appendChild(this._createHeader(word || "Lookup", "", null, false));
      const errorView = document.createElement("div");
      errorView.className = "dict-error-view";
      const icon = document.createElement("div");
      icon.className = "dict-error-icon";
      icon.appendChild(createAlertSvg());
      errorView.appendChild(icon);
      const title = document.createElement("div");
      title.className = "dict-error-title";
      const isNetwork = message && (message.includes("internet") || message.includes("connect") || message.includes("timed out"));
      title.textContent = isNetwork ? "Connection Issue" : "No Definitions Found";
      errorView.appendChild(title);
      const desc = document.createElement("p");
      desc.className = "dict-error-desc";
      desc.textContent = message || "Unable to retrieve definition.";
      errorView.appendChild(desc);
      card.appendChild(errorView);
      this._renderCard(card);
    }
    _getThemeClass(theme) {
      if (theme === "dark") return "theme-dark";
      if (theme === "light") return "theme-light";
      return "";
    }
    _renderCard(cardElement) {
      const existing = this.shadowRoot.querySelector(".dict-card");
      if (existing) existing.remove();
      this.shadowRoot.appendChild(cardElement);
    }
    playAudio(word, url, buttonEl) {
      if (this.activeAudio) {
        this.activeAudio.pause();
        this.activeAudio = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (buttonEl) buttonEl.classList.add("playing");
      const stopButtonState = () => {
        if (buttonEl) buttonEl.classList.remove("playing");
      };
      const speakFallback = () => {
        if (typeof window !== "undefined" && "speechSynthesis" in window && word) {
          try {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = "en-US";
            utterance.rate = 0.9;
            utterance.onend = stopButtonState;
            utterance.onerror = stopButtonState;
            window.speechSynthesis.speak(utterance);
          } catch (synthErr) {
            console.warn("[Dictionary Addon] Speech synthesis failed:", synthErr);
            stopButtonState();
          }
        } else {
          stopButtonState();
        }
      };
      if (url && typeof url === "string") {
        let audioUrl = url.trim();
        if (audioUrl.startsWith("//")) {
          audioUrl = "https:" + audioUrl;
        }
        try {
          const audio = new Audio(audioUrl);
          this.activeAudio = audio;
          let fallbackTriggered = false;
          const triggerFallback = () => {
            if (fallbackTriggered) return;
            fallbackTriggered = true;
            this.activeAudio = null;
            speakFallback();
          };
          audio.onended = () => {
            stopButtonState();
            this.activeAudio = null;
          };
          audio.onerror = () => {
            triggerFallback();
          };
          const playPromise = audio.play();
          if (playPromise !== void 0) {
            playPromise.catch((err) => {
              console.warn("[Dictionary Addon] Audio playback failed, falling back to speech synthesis:", err);
              triggerFallback();
            });
          }
        } catch (err) {
          console.warn("[Dictionary Addon] Audio initialization failed, falling back to speech synthesis:", err);
          speakFallback();
        }
      } else {
        speakFallback();
      }
    }
    dismiss() {
      if (this.activeAudio) {
        this.activeAudio.pause();
        this.activeAudio = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (this.host && document.contains(this.host)) {
        this.host.remove();
      }
      this.host = null;
      this.shadowRoot = null;
      document.removeEventListener("mousedown", this._handleOutsideClick, true);
      window.removeEventListener("keydown", this._handleKeydown, true);
      window.removeEventListener("scroll", this._handleScroll);
    }
    _handleOutsideClick(event) {
      if (this.host && !this.host.contains(event.target)) {
        this.dismiss();
      }
    }
    _handleKeydown(event) {
      if (event.key === "Escape") {
        this.dismiss();
      }
    }
    _handleScroll(event) {
      if (this.host) {
        if (event.target === this.host) return;
        if (this.host.contains(event.target)) return;
        const path = event.composedPath ? event.composedPath() : [];
        if (path.includes(this.host) || this.shadowRoot && path.includes(this.shadowRoot)) {
          return;
        }
      }
      this.dismiss();
    }
  };

  // src/content/popup-styles.js
  var POPUP_STYLES = `/* ==========================================================================
   English Dictionary Firefox Addon - Shadow DOM Popup Styles
   Glassmorphic, Modern, Responsive & Dynamic Card
   ========================================================================== */

:host {
  all: initial;
  position: fixed;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #1e293b;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*, *::before, *::after {
  box-sizing: border-box;
}

/* Light Theme Variables (Default) */
.dict-card {
  --bg-primary: rgba(255, 255, 255, 0.94);
  --bg-surface: #f8fafc;
  --bg-hover: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --accent-color: #4f46e5;
  --accent-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  --accent-light: #e0e7ff;
  --border-color: rgba(226, 232, 240, 0.9);
  --shadow-lg: 0 14px 34px -4px rgba(15, 23, 42, 0.12), 0 8px 16px -6px rgba(15, 23, 42, 0.08);
  --pill-bg: #eef2ff;
  --pill-color: #4338ca;
  --example-border: #6366f1;
}

/* Dark Theme Support */
@media (prefers-color-scheme: dark) {
  .dict-card {
    --bg-primary: rgba(15, 23, 42, 0.94);
    --bg-surface: #1e293b;
    --bg-hover: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-muted: #94a3b8;
    --accent-color: #818cf8;
    --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    --accent-light: rgba(99, 102, 241, 0.2);
    --border-color: rgba(51, 65, 85, 0.85);
    --shadow-lg: 0 16px 36px -4px rgba(0, 0, 0, 0.45), 0 8px 16px -6px rgba(0, 0, 0, 0.35);
    --pill-bg: rgba(99, 102, 241, 0.18);
    --pill-color: #a5b4fc;
    --example-border: #818cf8;
  }
}

/* Explicit class theme overrides */
.dict-card.theme-dark {
  --bg-primary: rgba(15, 23, 42, 0.94);
  --bg-surface: #1e293b;
  --bg-hover: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --accent-color: #818cf8;
  --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  --accent-light: rgba(99, 102, 241, 0.2);
  --border-color: rgba(51, 65, 85, 0.85);
  --shadow-lg: 0 16px 36px -4px rgba(0, 0, 0, 0.45);
  --pill-bg: rgba(99, 102, 241, 0.18);
  --pill-color: #a5b4fc;
  --example-border: #818cf8;
}

.dict-card.theme-light {
  --bg-primary: rgba(255, 255, 255, 0.94);
  --bg-surface: #f8fafc;
  --bg-hover: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --accent-color: #4f46e5;
  --accent-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  --accent-light: #e0e7ff;
  --border-color: rgba(226, 232, 240, 0.9);
  --shadow-lg: 0 14px 34px -4px rgba(15, 23, 42, 0.12);
  --pill-bg: #eef2ff;
  --pill-color: #4338ca;
  --example-border: #6366f1;
}

/* Card Container */
.dict-card {
  width: 340px;
  max-width: calc(100vw - 24px);
  max-height: 420px;
  background: var(--bg-primary);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: dictFadeInScale 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transform-origin: top left;
  user-select: text;
  overscroll-behavior: contain;
}

@keyframes dictFadeInScale {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Header */
.dict-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 10px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-surface);
}

.dict-title-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
  overflow: hidden;
}

.dict-word {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dict-phonetic {
  font-size: 12.5px;
  color: var(--text-muted);
  font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;
}

.dict-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* Buttons */
.dict-btn {
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.dict-btn svg {
  display: block;
  pointer-events: none;
  flex-shrink: 0;
}

.dict-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.dict-btn:active {
  transform: scale(0.93);
}

/* Audio Speaker Button */
.dict-audio-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  border-radius: 50%;
  color: var(--accent-color);
  background: var(--accent-light);
  transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dict-audio-btn svg {
  width: 15px;
  height: 15px;
}

.dict-audio-btn:hover {
  background: var(--accent-color);
  color: #ffffff;
  transform: scale(1.08);
}

.dict-audio-btn.playing {
  animation: dictPulse 0.9s infinite alternate;
}

@keyframes dictPulse {
  from { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  to { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
}

/* Close Button */
.dict-close-btn {
  width: 26px;
  height: 26px;
  min-width: 26px;
  min-height: 26px;
  border-radius: 50%;
  color: var(--text-muted);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dict-close-btn svg {
  width: 14px;
  height: 14px;
}

.dict-close-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

/* Body / Scrollable Content */
.dict-body {
  padding: 14px 16px;
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
  overscroll-behavior: contain;
}

.dict-body::-webkit-scrollbar {
  width: 5px;
}

.dict-body::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 10px;
}

/* Meaning Group */
.dict-meaning-group {
  margin-bottom: 14px;
}

.dict-meaning-group:last-child {
  margin-bottom: 0;
}

.dict-pos-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--pill-bg);
  color: var(--pill-color);
  margin-bottom: 8px;
}

.dict-definitions-list {
  margin: 0;
  padding-left: 18px;
}

.dict-def-item {
  font-size: 13.5px;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.45;
}

.dict-def-item:last-child {
  margin-bottom: 0;
}

.dict-example {
  margin-top: 4px;
  padding-left: 8px;
  border-left: 2px solid var(--example-border);
  font-size: 12.5px;
  color: var(--text-muted);
  font-style: italic;
  line-height: 1.4;
}

.dict-synonyms {
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.dict-synonyms span {
  color: var(--accent-color);
  font-weight: 500;
}

/* Loading State */
.dict-loading-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 16px;
  gap: 12px;
  color: var(--text-muted);
}

.dict-spinner {
  width: 24px;
  height: 24px;
  border: 2.5px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: dictSpin 0.7s linear infinite;
}

@keyframes dictSpin {
  to { transform: rotate(360deg); }
}

/* Empty & Error State */
.dict-error-view {
  padding: 24px 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.dict-error-icon {
  width: 32px;
  height: 32px;
  color: #f59e0b;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dict-error-icon svg {
  width: 32px;
  height: 32px;
  display: block;
}

.dict-error-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.dict-error-desc {
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0;
}
`;

  // src/content/content.js
  var popupView = new PopupView();
  popupView.setStyles(POPUP_STYLES);
  var activeConfig = {
    modifierKey: "none",
    enabled: true,
    theme: "auto"
  };
  async function syncConfig() {
    try {
      activeConfig = await getSettings();
    } catch (err) {
      console.warn("[Dictionary Addon] Failed to sync config:", err);
    }
  }
  syncConfig();
  var storageArea = typeof browser !== "undefined" ? browser.storage : typeof chrome !== "undefined" ? chrome.storage : null;
  if (storageArea && storageArea.onChanged) {
    storageArea.onChanged.addListener((changes) => {
      if (changes.settings?.newValue) {
        activeConfig = changes.settings.newValue;
      }
    });
  }
  async function sendBackgroundMessage(payload) {
    if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
      try {
        const res = await browser.runtime.sendMessage(payload);
        if (res !== void 0) {
          return res;
        }
      } catch (err) {
        console.warn("[Dictionary Addon] browser.runtime.sendMessage error:", err);
      }
    }
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(payload, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ status: "error", errorMessage: chrome.runtime.lastError.message });
          } else {
            resolve(response || { status: "error", errorMessage: "Empty response from background service" });
          }
        });
      });
    }
    return { status: "error", errorMessage: "Extension runtime not available." };
  }
  document.addEventListener("dblclick", async (event) => {
    if (!activeConfig.enabled) {
      return;
    }
    if (!matchesModifier(event, activeConfig.modifierKey)) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const rawText = selection.toString();
    const { isValid, word } = sanitizeWord(rawText);
    if (!isValid || !word) {
      return;
    }
    const range = selection.getRangeAt(0);
    const anchorRect = range.getBoundingClientRect();
    if (anchorRect.width === 0 && anchorRect.height === 0) {
      return;
    }
    const coords = calculatePopupPosition({
      anchorRect,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });
    popupView.showLoading(word, coords, activeConfig.theme);
    try {
      const response = await sendBackgroundMessage({
        action: "LOOKUP_WORD",
        word
      });
      if (!response || response.status !== "success") {
        const msg = response?.errorMessage || `No definitions found for "${word}". Check spelling.`;
        popupView.showError(msg, word, coords, activeConfig.theme);
        return;
      }
      popupView.showResult(response.entry, coords, activeConfig.theme);
    } catch (err) {
      popupView.showError("Unable to connect to dictionary service. Please check your internet connection.", word, coords, activeConfig.theme);
    }
  });
})();
