(() => {
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
  async function saveSettings(partialConfig) {
    const current = await getSettings();
    const updated = validateConfig({ ...current, ...partialConfig });
    const storage = getStorageArea();
    if (storage) {
      try {
        await storage.set({ [STORAGE_KEY]: updated });
      } catch (err) {
        console.error("[Dictionary Addon] Failed to save settings to storage:", err);
      }
    }
    return updated;
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
  var cachedVoices = [];
  function loadVoices() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      cachedVoices = window.speechSynthesis.getVoices() || [];
    }
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== void 0) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }
  function getBestNaturalVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return null;
    }
    const voices = cachedVoices && cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    const enVoices = voices.filter((v) => v.lang && (v.lang.toLowerCase().startsWith("en") || v.lang.toLowerCase().includes("en")));
    const pool = enVoices.length > 0 ? enVoices : voices;
    const naturalKeywords = [
      "natural",
      "enhanced",
      "premium",
      "neural",
      "siri",
      "samantha",
      "ava",
      "allison",
      "zoe",
      "serena",
      "karen",
      "daniel",
      "oliver",
      "alex",
      "google",
      "jenny",
      "guy",
      "aria"
    ];
    for (const keyword of naturalKeywords) {
      const match = pool.find((v) => v.name && v.name.toLowerCase().includes(keyword));
      if (match) return match;
    }
    const enUs = pool.find((v) => v.lang && (v.lang === "en-US" || v.lang === "en_US"));
    if (enUs) return enUs;
    const enGb = pool.find((v) => v.lang && (v.lang === "en-GB" || v.lang === "en_GB"));
    if (enGb) return enGb;
    const defaultVoice = pool.find((v) => v.default);
    return defaultVoice || pool[0] || null;
  }
  function getCandidateAudioUrls(word, apiAudioUrl) {
    const urls = [];
    const cleanWord = (word || "").trim().toLowerCase();
    if (cleanWord) {
      urls.push(`https://ssl.gstatic.com/dictionary/static/sounds/20200429/${encodeURIComponent(cleanWord)}--_us_1.mp3`);
      urls.push(`https://ssl.gstatic.com/dictionary/static/sounds/20200429/${encodeURIComponent(cleanWord)}--_gb_1.mp3`);
    }
    if (apiAudioUrl && typeof apiAudioUrl === "string") {
      let u = apiAudioUrl.trim();
      if (u.startsWith("//")) u = "https:" + u;
      if (u.startsWith("http://") || u.startsWith("https://")) {
        if (!u.includes("api.dictionaryapi.dev/media")) {
          urls.unshift(u);
        } else {
          urls.push(u);
        }
      }
    }
    return urls;
  }
  var PopupView = class {
    constructor() {
      this.host = null;
      this.shadowRoot = null;
      this.activeAudio = null;
      this.audioTimeoutId = null;
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
      if (this.audioTimeoutId) {
        clearTimeout(this.audioTimeoutId);
        this.audioTimeoutId = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (buttonEl) buttonEl.classList.add("playing");
      const stopButtonState = () => {
        if (buttonEl) buttonEl.classList.remove("playing");
      };
      const speakWithNaturalVoice = () => {
        if (typeof window !== "undefined" && "speechSynthesis" in window && word) {
          try {
            const utterance = new SpeechSynthesisUtterance(word);
            const naturalVoice = getBestNaturalVoice();
            if (naturalVoice) {
              utterance.voice = naturalVoice;
              utterance.lang = naturalVoice.lang || "en-US";
            } else {
              utterance.lang = "en-US";
            }
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.onend = stopButtonState;
            utterance.onerror = stopButtonState;
            window.speechSynthesis.speak(utterance);
          } catch (synthErr) {
            console.warn("[Dictionary Addon] Natural speech synthesis failed:", synthErr);
            stopButtonState();
          }
        } else {
          stopButtonState();
        }
      };
      const candidateUrls = getCandidateAudioUrls(word, url);
      let candidateIndex = 0;
      const tryNextCandidate = () => {
        if (candidateIndex >= candidateUrls.length) {
          speakWithNaturalVoice();
          return;
        }
        const audioUrl = candidateUrls[candidateIndex++];
        try {
          const audio = new Audio(audioUrl);
          this.activeAudio = audio;
          let handled = false;
          const advance2 = () => {
            if (handled) return;
            handled = true;
            if (this.audioTimeoutId) {
              clearTimeout(this.audioTimeoutId);
              this.audioTimeoutId = null;
            }
            this.activeAudio = null;
            tryNextCandidate();
          };
          this.audioTimeoutId = setTimeout(() => {
            advance2();
          }, 1500);
          audio.onplaying = () => {
            if (this.audioTimeoutId) {
              clearTimeout(this.audioTimeoutId);
              this.audioTimeoutId = null;
            }
          };
          audio.onended = () => {
            if (this.audioTimeoutId) {
              clearTimeout(this.audioTimeoutId);
              this.audioTimeoutId = null;
            }
            stopButtonState();
            this.activeAudio = null;
          };
          audio.onerror = () => {
            advance2();
          };
          const playPromise = audio.play();
          if (playPromise !== void 0) {
            playPromise.catch(() => {
              advance2();
            });
          }
        } catch (err) {
          advance();
        }
      };
      tryNextCandidate();
    }
    dismiss() {
      if (this.activeAudio) {
        this.activeAudio.pause();
        this.activeAudio = null;
      }
      if (this.audioTimeoutId) {
        clearTimeout(this.audioTimeoutId);
        this.audioTimeoutId = null;
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

  // src/background/dictionary-service.js
  var DICTIONARY_API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
  var WIKTIONARY_API_BASE = "https://en.wiktionary.org/api/rest_v1/page/definition";
  var FETCH_TIMEOUT_MS = 4e3;
  var lookupCache = /* @__PURE__ */ new Map();
  var MAX_CACHE_SIZE = 100;
  function normalizeDictionaryResponse(data, fallbackWord = "") {
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    const primary = data[0];
    const word = primary.word || fallbackWord;
    let phonetic = primary.phonetic || null;
    if (!phonetic && Array.isArray(primary.phonetics)) {
      const itemWithText = primary.phonetics.find((p) => p && typeof p.text === "string" && p.text.trim().length > 0);
      if (itemWithText) {
        phonetic = itemWithText.text.trim();
      }
    }
    let audioUrl = null;
    for (const entry of data) {
      if (Array.isArray(entry.phonetics)) {
        for (const p of entry.phonetics) {
          if (!p || typeof p.audio !== "string") continue;
          let url = p.audio.trim();
          if (url.startsWith("//")) {
            url = "https:" + url;
          }
          if (url.startsWith("http://") || url.startsWith("https://")) {
            audioUrl = url;
            break;
          }
        }
        if (audioUrl) break;
      }
    }
    const meanings = [];
    for (const entry of data) {
      if (Array.isArray(entry.meanings)) {
        for (const m of entry.meanings) {
          if (!m || !m.partOfSpeech) continue;
          const partOfSpeech = m.partOfSpeech;
          const definitions = [];
          if (Array.isArray(m.definitions)) {
            for (const d of m.definitions) {
              if (!d || !d.definition) continue;
              definitions.push({
                definition: d.definition.trim(),
                example: d.example ? d.example.trim() : null,
                synonyms: Array.isArray(d.synonyms) ? d.synonyms.slice(0, 5) : [],
                antonyms: Array.isArray(d.antonyms) ? d.antonyms.slice(0, 5) : []
              });
            }
          }
          if (definitions.length > 0) {
            const existing = meanings.find((item) => item.partOfSpeech.toLowerCase() === partOfSpeech.toLowerCase());
            if (existing) {
              existing.definitions.push(...definitions);
            } else {
              meanings.push({
                partOfSpeech,
                definitions
              });
            }
          }
        }
      }
    }
    return {
      word,
      phonetic,
      audioUrl,
      meanings
    };
  }
  function cleanHtml(html) {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
  }
  function normalizeWiktionaryResponse(data, word) {
    if (!data || !data.en || !Array.isArray(data.en)) {
      return null;
    }
    const meanings = [];
    for (const item of data.en) {
      const partOfSpeech = item.partOfSpeech || "general";
      const definitions = [];
      if (Array.isArray(item.definitions)) {
        for (const d of item.definitions) {
          const text = cleanHtml(d.definition);
          if (text && text.length > 2) {
            const ex = Array.isArray(d.examples) && d.examples.length > 0 ? cleanHtml(d.examples[0]) : null;
            definitions.push({
              definition: text,
              example: ex,
              synonyms: [],
              antonyms: []
            });
          }
        }
      }
      if (definitions.length > 0) {
        meanings.push({
          partOfSpeech,
          definitions
        });
      }
    }
    if (meanings.length === 0) {
      return null;
    }
    return {
      word,
      phonetic: null,
      audioUrl: null,
      meanings
    };
  }
  async function lookupWord(word, fetchFn = globalThis.fetch) {
    if (!word || typeof word !== "string") {
      return {
        status: "error",
        entry: null,
        errorMessage: "Invalid word requested."
      };
    }
    const cleanWord = word.trim().toLowerCase();
    if (lookupCache.has(cleanWord)) {
      return lookupCache.get(cleanWord);
    }
    const primaryResult = await fetchFromFreeDictionary(cleanWord, fetchFn);
    if (primaryResult.status === "success") {
      cacheResult(cleanWord, primaryResult);
      return primaryResult;
    }
    console.info(`[Dictionary Addon] Primary lookup for "${cleanWord}" unsuccessful (${primaryResult.status}); checking Wiktionary fallback...`);
    const fallbackResult = await fetchFromWiktionary(cleanWord, fetchFn);
    if (fallbackResult.status === "success") {
      cacheResult(cleanWord, fallbackResult);
      return fallbackResult;
    }
    const finalResult = {
      status: "not_found",
      entry: null,
      errorMessage: `No definitions found for "${cleanWord}". Check spelling.`
    };
    cacheResult(cleanWord, finalResult);
    return finalResult;
  }
  function cacheResult(word, result) {
    if (lookupCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = lookupCache.keys().next().value;
      lookupCache.delete(oldestKey);
    }
    lookupCache.set(word, result);
  }
  async function fetchFromFreeDictionary(cleanWord, fetchFn) {
    const url = `${DICTIONARY_API_BASE}/${encodeURIComponent(cleanWord)}`;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;
    try {
      const response = await fetchFn(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller ? controller.signal : void 0
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (response.status === 200) {
        const data = await response.json();
        const entry = normalizeDictionaryResponse(data, cleanWord);
        if (entry && entry.meanings.length > 0) {
          return { status: "success", entry, errorMessage: null };
        }
      }
      if (response.status === 404) {
        return { status: "not_found", entry: null };
      }
      return { status: "error", entry: null };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      return { status: "network_error", entry: null };
    }
  }
  async function fetchFromWiktionary(cleanWord, fetchFn) {
    const url = `${WIKTIONARY_API_BASE}/${encodeURIComponent(cleanWord)}`;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;
    try {
      const response = await fetchFn(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller ? controller.signal : void 0
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (response.status === 200) {
        const data = await response.json();
        const entry = normalizeWiktionaryResponse(data, cleanWord);
        if (entry && entry.meanings.length > 0) {
          return { status: "success", entry, errorMessage: null };
        }
      }
      return { status: "not_found", entry: null };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      return { status: "network_error", entry: null };
    }
  }

  // src/options/options.js
  var popupView = new PopupView();
  popupView.setStyles(POPUP_STYLES);
  var saveTimeout = null;
  var hintTimeout = null;
  var activeConfig = {
    modifierKey: "none",
    enabled: true,
    theme: "auto"
  };
  function flashSavedBadge() {
    const badge = document.getElementById("saveStatus");
    if (!badge) return;
    badge.classList.add("visible");
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      badge.classList.remove("visible");
    }, 1600);
  }
  function showHint(message) {
    const hintEl = document.getElementById("testHint");
    if (!hintEl) return;
    hintEl.textContent = message;
    hintEl.classList.add("visible");
    if (hintTimeout) clearTimeout(hintTimeout);
    hintTimeout = setTimeout(() => {
      hintEl.classList.remove("visible");
    }, 2800);
  }
  async function sendBackgroundMessage(payload) {
    if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
      try {
        const res = await browser.runtime.sendMessage(payload);
        if (res !== void 0) return res;
      } catch (err) {
        console.warn("[Dictionary Addon] browser.runtime.sendMessage error:", err);
      }
    }
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      try {
        return await new Promise((resolve) => {
          chrome.runtime.sendMessage(payload, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ status: "error", errorMessage: chrome.runtime.lastError.message });
            } else {
              resolve(response || { status: "error", errorMessage: "Empty response" });
            }
          });
        });
      } catch (err) {
        console.warn("[Dictionary Addon] chrome.runtime.sendMessage error:", err);
      }
    }
    if (payload.action === "LOOKUP_WORD" && payload.word) {
      return lookupWord(payload.word);
    }
    return { status: "error", errorMessage: "Extension runtime not available." };
  }
  async function handleDoubleClick(event) {
    if (!activeConfig.enabled) {
      const sandbox = document.querySelector(".test-sandbox");
      if (sandbox && (sandbox.contains(event.target) || event.target.closest(".test-area"))) {
        showHint("\u26A0\uFE0F Double-Click Lookup is currently disabled above.");
      }
      return;
    }
    if (!matchesModifier(event, activeConfig.modifierKey)) {
      const sandbox = document.querySelector(".test-sandbox");
      if (sandbox && (sandbox.contains(event.target) || event.target.closest(".test-area"))) {
        const keyName = activeConfig.modifierKey === "alt" ? "Alt / Option" : activeConfig.modifierKey === "ctrl" ? "Ctrl / Cmd" : activeConfig.modifierKey === "shift" ? "Shift" : "";
        showHint(`\u{1F4A1} Hold the [${keyName}] key while double-clicking to trigger lookup.`);
      }
      return;
    }
    let text = "";
    let anchorRect = null;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      text = selection.toString();
      const range = selection.getRangeAt(0);
      anchorRect = range.getBoundingClientRect();
    }
    if (!text.trim() && event.target && event.target.classList.contains("demo-word")) {
      text = event.target.textContent;
      anchorRect = event.target.getBoundingClientRect();
    }
    const { isValid, word } = sanitizeWord(text);
    if (!isValid || !word) {
      return;
    }
    if (!anchorRect || anchorRect.width === 0 && anchorRect.height === 0) {
      if (event.target && typeof event.target.getBoundingClientRect === "function") {
        anchorRect = event.target.getBoundingClientRect();
      } else {
        return;
      }
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
        const msg = response?.errorMessage || `No definitions found for "${word}".`;
        popupView.showError(msg, word, coords, activeConfig.theme);
        return;
      }
      popupView.showResult(response.entry, coords, activeConfig.theme);
    } catch (err) {
      popupView.showError("Unable to connect to dictionary service. Please check your internet connection.", word, coords, activeConfig.theme);
    }
  }
  async function initializeOptions() {
    const toggleEnabled = document.getElementById("toggleEnabled");
    const themeSelect = document.getElementById("themeSelect");
    const modifierRadios = document.querySelectorAll('input[name="modifierKey"]');
    try {
      activeConfig = await getSettings();
    } catch (err) {
      console.warn("[Dictionary Addon] Failed to load settings:", err);
    }
    if (toggleEnabled) {
      toggleEnabled.checked = activeConfig.enabled;
    }
    if (themeSelect) {
      themeSelect.value = activeConfig.theme;
    }
    for (const radio of modifierRadios) {
      if (radio.value === activeConfig.modifierKey) {
        radio.checked = true;
      }
    }
    if (toggleEnabled) {
      toggleEnabled.addEventListener("change", async () => {
        activeConfig.enabled = toggleEnabled.checked;
        await saveSettings({ enabled: toggleEnabled.checked });
        flashSavedBadge();
      });
    }
    for (const radio of modifierRadios) {
      radio.addEventListener("change", async () => {
        if (radio.checked) {
          activeConfig.modifierKey = radio.value;
          await saveSettings({ modifierKey: radio.value });
          flashSavedBadge();
        }
      });
    }
    if (themeSelect) {
      themeSelect.addEventListener("change", async () => {
        activeConfig.theme = themeSelect.value;
        await saveSettings({ theme: themeSelect.value });
        flashSavedBadge();
      });
    }
    document.addEventListener("dblclick", handleDoubleClick);
  }
  document.addEventListener("DOMContentLoaded", initializeOptions);
})();
