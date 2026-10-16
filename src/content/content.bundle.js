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
  function createSvg(markup) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(markup.trim(), "image/svg+xml");
    const svg = doc.documentElement;
    return document.importNode(svg, true);
  }
  var SVG_SPEAKER = `
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>
`;
  var SVG_CLOSE = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>
`;
  var SVG_ALERT = `
<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <line x1="12" y1="8" x2="12" y2="12"></line>
  <line x1="12" y1="16" x2="12.01" y2="16"></line>
</svg>
`;
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
      document.addEventListener("mousedown", this._handleOutsideClick, true);
      window.addEventListener("keydown", this._handleKeydown, true);
      window.addEventListener("scroll", this._handleScroll, { passive: true, capture: true });
    }
    _updatePosition(coords) {
      if (!this.host || !coords) return;
      this.host.style.top = `${coords.top}px`;
      this.host.style.left = `${coords.left}px`;
    }
    _createHeader(word, phoneticText = "", audioUrl = null) {
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
      if (audioUrl) {
        const audioBtn = document.createElement("button");
        audioBtn.className = "dict-btn dict-audio-btn";
        audioBtn.title = "Listen to pronunciation";
        audioBtn.setAttribute("aria-label", "Listen to pronunciation");
        audioBtn.appendChild(createSvg(SVG_SPEAKER));
        audioBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.playAudio(audioUrl, audioBtn);
        });
        actions.appendChild(audioBtn);
      }
      const closeBtn = document.createElement("button");
      closeBtn.className = "dict-btn dict-close-btn";
      closeBtn.title = "Close";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.appendChild(createSvg(SVG_CLOSE));
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
      card.appendChild(this._createHeader(word));
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
      card.appendChild(this._createHeader(entry.word, entry.phonetic, entry.audioUrl));
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
      card.appendChild(this._createHeader(word || "Lookup"));
      const errorView = document.createElement("div");
      errorView.className = "dict-error-view";
      const icon = document.createElement("div");
      icon.className = "dict-error-icon";
      icon.appendChild(createSvg(SVG_ALERT));
      errorView.appendChild(icon);
      const title = document.createElement("div");
      title.className = "dict-error-title";
      title.textContent = "No Definitions Found";
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
    playAudio(url, buttonEl) {
      if (this.activeAudio) {
        this.activeAudio.pause();
        this.activeAudio = null;
      }
      if (buttonEl) buttonEl.classList.add("playing");
      try {
        const audio = new Audio(url);
        this.activeAudio = audio;
        audio.onended = () => {
          if (buttonEl) buttonEl.classList.remove("playing");
          this.activeAudio = null;
        };
        audio.onerror = () => {
          if (buttonEl) buttonEl.classList.remove("playing");
          this.activeAudio = null;
        };
        audio.play().catch((err) => {
          console.warn("[Dictionary Addon] Audio playback failed:", err);
          if (buttonEl) buttonEl.classList.remove("playing");
          this.activeAudio = null;
        });
      } catch (err) {
        console.warn("[Dictionary Addon] Audio initialization failed:", err);
        if (buttonEl) buttonEl.classList.remove("playing");
      }
    }
    dismiss() {
      if (this.activeAudio) {
        this.activeAudio.pause();
        this.activeAudio = null;
      }
      if (this.host && document.contains(this.host)) {
        this.host.remove();
      }
      this.host = null;
      this.shadowRoot = null;
      document.removeEventListener("mousedown", this._handleOutsideClick, true);
      window.removeEventListener("keydown", this._handleKeydown, true);
      window.removeEventListener("scroll", this._handleScroll, { capture: true });
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
    _handleScroll() {
      this.dismiss();
    }
  };

  // src/content/popup-styles.js
  var POPUP_STYLES = '/* ==========================================================================\n   English Dictionary Firefox Addon - Shadow DOM Popup Styles\n   Glassmorphic, Modern, Responsive & Dynamic Card\n   ========================================================================== */\n\n:host {\n  all: initial;\n  position: fixed;\n  z-index: 2147483647;\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;\n  font-size: 14px;\n  line-height: 1.5;\n  color: #1e293b;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n/* Light Theme Variables (Default) */\n.dict-card {\n  --bg-primary: rgba(255, 255, 255, 0.94);\n  --bg-surface: #f8fafc;\n  --bg-hover: #f1f5f9;\n  --text-primary: #0f172a;\n  --text-secondary: #475569;\n  --text-muted: #64748b;\n  --accent-color: #4f46e5;\n  --accent-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);\n  --accent-light: #e0e7ff;\n  --border-color: rgba(226, 232, 240, 0.9);\n  --shadow-lg: 0 14px 34px -4px rgba(15, 23, 42, 0.12), 0 8px 16px -6px rgba(15, 23, 42, 0.08);\n  --pill-bg: #eef2ff;\n  --pill-color: #4338ca;\n  --example-border: #6366f1;\n}\n\n/* Dark Theme Support */\n@media (prefers-color-scheme: dark) {\n  .dict-card {\n    --bg-primary: rgba(15, 23, 42, 0.94);\n    --bg-surface: #1e293b;\n    --bg-hover: #334155;\n    --text-primary: #f8fafc;\n    --text-secondary: #cbd5e1;\n    --text-muted: #94a3b8;\n    --accent-color: #818cf8;\n    --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);\n    --accent-light: rgba(99, 102, 241, 0.2);\n    --border-color: rgba(51, 65, 85, 0.85);\n    --shadow-lg: 0 16px 36px -4px rgba(0, 0, 0, 0.45), 0 8px 16px -6px rgba(0, 0, 0, 0.35);\n    --pill-bg: rgba(99, 102, 241, 0.18);\n    --pill-color: #a5b4fc;\n    --example-border: #818cf8;\n  }\n}\n\n/* Explicit class theme overrides */\n.dict-card.theme-dark {\n  --bg-primary: rgba(15, 23, 42, 0.94);\n  --bg-surface: #1e293b;\n  --bg-hover: #334155;\n  --text-primary: #f8fafc;\n  --text-secondary: #cbd5e1;\n  --text-muted: #94a3b8;\n  --accent-color: #818cf8;\n  --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);\n  --accent-light: rgba(99, 102, 241, 0.2);\n  --border-color: rgba(51, 65, 85, 0.85);\n  --shadow-lg: 0 16px 36px -4px rgba(0, 0, 0, 0.45);\n  --pill-bg: rgba(99, 102, 241, 0.18);\n  --pill-color: #a5b4fc;\n  --example-border: #818cf8;\n}\n\n.dict-card.theme-light {\n  --bg-primary: rgba(255, 255, 255, 0.94);\n  --bg-surface: #f8fafc;\n  --bg-hover: #f1f5f9;\n  --text-primary: #0f172a;\n  --text-secondary: #475569;\n  --text-muted: #64748b;\n  --accent-color: #4f46e5;\n  --accent-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);\n  --accent-light: #e0e7ff;\n  --border-color: rgba(226, 232, 240, 0.9);\n  --shadow-lg: 0 14px 34px -4px rgba(15, 23, 42, 0.12);\n  --pill-bg: #eef2ff;\n  --pill-color: #4338ca;\n  --example-border: #6366f1;\n}\n\n/* Card Container */\n.dict-card {\n  width: 340px;\n  max-width: calc(100vw - 24px);\n  max-height: 420px;\n  background: var(--bg-primary);\n  backdrop-filter: blur(18px);\n  -webkit-backdrop-filter: blur(18px);\n  border: 1px solid var(--border-color);\n  border-radius: 16px;\n  box-shadow: var(--shadow-lg);\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  animation: dictFadeInScale 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n  transform-origin: top left;\n  user-select: text;\n}\n\n@keyframes dictFadeInScale {\n  from {\n    opacity: 0;\n    transform: translateY(6px) scale(0.97);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n  }\n}\n\n/* Header */\n.dict-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 12px 14px 10px 16px;\n  border-bottom: 1px solid var(--border-color);\n  background: var(--bg-surface);\n}\n\n.dict-title-group {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  overflow: hidden;\n}\n\n.dict-word {\n  font-size: 18px;\n  font-weight: 700;\n  color: var(--text-primary);\n  letter-spacing: -0.01em;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.dict-phonetic {\n  font-size: 12.5px;\n  color: var(--text-muted);\n  font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;\n}\n\n.dict-header-actions {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  flex-shrink: 0;\n}\n\n/* Buttons */\n.dict-btn {\n  background: transparent;\n  border: none;\n  border-radius: 8px;\n  cursor: pointer;\n  padding: 5px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: var(--text-secondary);\n  transition: all 0.15s ease;\n}\n\n.dict-btn:hover {\n  background: var(--bg-hover);\n  color: var(--text-primary);\n}\n\n.dict-btn:active {\n  transform: scale(0.93);\n}\n\n/* Audio Speaker Button */\n.dict-audio-btn {\n  width: 28px;\n  height: 28px;\n  border-radius: 50%;\n  color: var(--accent-color);\n  background: var(--accent-light);\n  transition: transform 0.15s ease, background-color 0.15s ease;\n}\n\n.dict-audio-btn:hover {\n  background: var(--accent-color);\n  color: #ffffff;\n  transform: scale(1.06);\n}\n\n.dict-audio-btn.playing {\n  animation: dictPulse 0.9s infinite alternate;\n}\n\n@keyframes dictPulse {\n  from { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }\n  to { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }\n}\n\n/* Close Button */\n.dict-close-btn {\n  width: 26px;\n  height: 26px;\n  border-radius: 50%;\n  color: var(--text-muted);\n}\n\n.dict-close-btn:hover {\n  background: rgba(239, 68, 68, 0.12);\n  color: #ef4444;\n}\n\n/* Body / Scrollable Content */\n.dict-body {\n  padding: 14px 16px;\n  overflow-y: auto;\n  flex: 1;\n  scrollbar-width: thin;\n  scrollbar-color: var(--border-color) transparent;\n}\n\n.dict-body::-webkit-scrollbar {\n  width: 5px;\n}\n\n.dict-body::-webkit-scrollbar-thumb {\n  background-color: var(--border-color);\n  border-radius: 10px;\n}\n\n/* Meaning Group */\n.dict-meaning-group {\n  margin-bottom: 14px;\n}\n\n.dict-meaning-group:last-child {\n  margin-bottom: 0;\n}\n\n.dict-pos-badge {\n  display: inline-block;\n  font-size: 11px;\n  font-weight: 700;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  padding: 2px 8px;\n  border-radius: 20px;\n  background: var(--pill-bg);\n  color: var(--pill-color);\n  margin-bottom: 8px;\n}\n\n.dict-definitions-list {\n  margin: 0;\n  padding-left: 18px;\n}\n\n.dict-def-item {\n  font-size: 13.5px;\n  color: var(--text-primary);\n  margin-bottom: 8px;\n  line-height: 1.45;\n}\n\n.dict-def-item:last-child {\n  margin-bottom: 0;\n}\n\n.dict-example {\n  margin-top: 4px;\n  padding-left: 8px;\n  border-left: 2px solid var(--example-border);\n  font-size: 12.5px;\n  color: var(--text-muted);\n  font-style: italic;\n  line-height: 1.4;\n}\n\n.dict-synonyms {\n  margin-top: 6px;\n  font-size: 11.5px;\n  color: var(--text-muted);\n}\n\n.dict-synonyms span {\n  color: var(--accent-color);\n  font-weight: 500;\n}\n\n/* Loading State */\n.dict-loading-view {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  padding: 28px 16px;\n  gap: 12px;\n  color: var(--text-muted);\n}\n\n.dict-spinner {\n  width: 24px;\n  height: 24px;\n  border: 2.5px solid var(--border-color);\n  border-top-color: var(--accent-color);\n  border-radius: 50%;\n  animation: dictSpin 0.7s linear infinite;\n}\n\n@keyframes dictSpin {\n  to { transform: rotate(360deg); }\n}\n\n/* Empty & Error State */\n.dict-error-view {\n  padding: 24px 18px;\n  text-align: center;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n}\n\n.dict-error-icon {\n  width: 32px;\n  height: 32px;\n  color: #f59e0b;\n  margin-bottom: 2px;\n}\n\n.dict-error-title {\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--text-primary);\n}\n\n.dict-error-desc {\n  font-size: 12.5px;\n  color: var(--text-muted);\n  line-height: 1.4;\n  margin: 0;\n}\n';

  // src/content/content.js
  var runtime = typeof browser !== "undefined" ? browser.runtime : chrome.runtime;
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
      const response = await runtime.sendMessage({
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
