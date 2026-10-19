(() => {
  // src/common/sanitize.js
  var LEADING_BOUNDARY_REGEX = /^[\s"'“‘(\[{<«]+/u;
  var TRAILING_BOUNDARY_REGEX = /[\s"'”’)\]}>».,:;!?-]+$/u;
  var HAS_LETTER_REGEX = /\p{L}/u;
  var MAX_WORD_LENGTH = 45;
  var MAX_PHRASE_WORDS = 4;
  var MAX_PHRASE_LENGTH = 120;
  function sanitizeDomainTerm(rawText) {
    if (typeof rawText !== "string") {
      return {
        isValid: false,
        term: "",
        cleanTerm: "",
        raw: "",
        isUppercase: false,
        isMultiWord: false,
        wordCount: 0
      };
    }
    const raw = rawText.trim();
    if (!raw) {
      return {
        isValid: false,
        term: "",
        cleanTerm: "",
        raw,
        isUppercase: false,
        isMultiWord: false,
        wordCount: 0
      };
    }
    const normalizedSpaces = raw.replace(/\s+/g, " ");
    let cleaned = normalizedSpaces.replace(LEADING_BOUNDARY_REGEX, "").trim();
    const dottedAbbrevMatch = cleaned.match(/^([A-Za-z]\.(?:[A-Za-z]\.)+)(?:[\s"'”’)\]}>».,:;!?-]*)$/);
    if (dottedAbbrevMatch) {
      cleaned = dottedAbbrevMatch[1];
    } else {
      cleaned = cleaned.replace(TRAILING_BOUNDARY_REGEX, "").trim();
    }
    if (!cleaned || cleaned.length > MAX_PHRASE_LENGTH || !HAS_LETTER_REGEX.test(cleaned)) {
      return {
        isValid: false,
        term: "",
        cleanTerm: "",
        raw,
        isUppercase: false,
        isMultiWord: false,
        wordCount: 0
      };
    }
    const words = cleaned.split(" ").filter(Boolean);
    const wordCount = words.length;
    if (wordCount === 0 || wordCount > MAX_PHRASE_WORDS) {
      return {
        isValid: false,
        term: "",
        cleanTerm: "",
        raw,
        isUppercase: false,
        isMultiWord: false,
        wordCount
      };
    }
    const hasInvalidToken = words.some((w) => !HAS_LETTER_REGEX.test(w) || w.length > MAX_WORD_LENGTH);
    if (hasInvalidToken) {
      return {
        isValid: false,
        term: "",
        cleanTerm: "",
        raw,
        isUppercase: false,
        isMultiWord: false,
        wordCount
      };
    }
    const isMultiWord = wordCount > 1;
    const lettersOnly = cleaned.replace(/[^\p{L}]/gu, "");
    const isUppercase = lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();
    return {
      isValid: true,
      term: cleaned,
      cleanTerm: cleaned,
      raw,
      isUppercase,
      isMultiWord,
      wordCount
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
    theme: "auto",
    multiWordEnabled: true,
    domainBadgesEnabled: true,
    schemaVersion: 2
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
    const multiWordEnabled = typeof raw.multiWordEnabled === "boolean" ? raw.multiWordEnabled : DEFAULT_CONFIG.multiWordEnabled;
    const domainBadgesEnabled = typeof raw.domainBadgesEnabled === "boolean" ? raw.domainBadgesEnabled : DEFAULT_CONFIG.domainBadgesEnabled;
    const schemaVersion = typeof raw.schemaVersion === "number" ? raw.schemaVersion : DEFAULT_CONFIG.schemaVersion;
    return {
      modifierKey,
      enabled,
      theme,
      multiWordEnabled,
      domainBadgesEnabled,
      schemaVersion
    };
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
    _createHeader(word, phoneticText = "", audioUrl = null, showAudio = false, extra = {}) {
      const header = document.createElement("div");
      header.className = "dict-header";
      const titleGroup = document.createElement("div");
      titleGroup.className = "dict-title-group";
      const titleRow = document.createElement("div");
      titleRow.className = "dict-title-row";
      const wordEl = document.createElement("span");
      wordEl.className = "dict-word";
      wordEl.textContent = word;
      titleRow.appendChild(wordEl);
      if (extra && extra.isAcronym) {
        const acronymBadge = document.createElement("span");
        acronymBadge.className = "dict-acronym-badge";
        acronymBadge.textContent = "Acronym";
        titleRow.appendChild(acronymBadge);
      }
      if (phoneticText) {
        const phoneticEl = document.createElement("span");
        phoneticEl.className = "dict-phonetic";
        phoneticEl.textContent = phoneticText;
        titleRow.appendChild(phoneticEl);
      }
      titleGroup.appendChild(titleRow);
      if (extra && extra.isAcronym && extra.acronymExpansion) {
        const expansionEl = document.createElement("div");
        expansionEl.className = "dict-acronym-expansion";
        expansionEl.textContent = extra.acronymExpansion;
        titleGroup.appendChild(expansionEl);
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
    showResult(entry, coords, theme = "auto", config = {}) {
      this._ensureMounted();
      this._updatePosition(coords);
      const card = document.createElement("div");
      card.className = `dict-card ${this._getThemeClass(theme)}`;
      const showDomainBadges = config?.domainBadgesEnabled !== false;
      card.appendChild(this._createHeader(
        entry.word,
        entry.phonetic,
        entry.audioUrl,
        Boolean(entry.audioUrl || entry.word),
        {
          isAcronym: entry.isAcronym,
          acronymExpansion: entry.acronymExpansion
        }
      ));
      const body = document.createElement("div");
      body.className = "dict-body";
      if (entry.encyclopedicSummary) {
        const encycloBlock = document.createElement("div");
        encycloBlock.className = "dict-encyclopedic-block";
        const summaryText = document.createElement("p");
        summaryText.className = "dict-encyclopedic-text";
        summaryText.textContent = entry.encyclopedicSummary;
        encycloBlock.appendChild(summaryText);
        if (entry.referenceUrl) {
          const refLink = document.createElement("a");
          refLink.className = "dict-reference-link";
          refLink.href = entry.referenceUrl;
          refLink.target = "_blank";
          refLink.rel = "noopener noreferrer";
          refLink.textContent = "Learn more on Wikipedia \u2192";
          encycloBlock.appendChild(refLink);
        }
        body.appendChild(encycloBlock);
      }
      const renderMeaningGroup = (group) => {
        const groupEl = document.createElement("div");
        groupEl.className = "dict-meaning-group";
        const badgesRow = document.createElement("div");
        badgesRow.className = "dict-badges-row";
        if (group.partOfSpeech) {
          const badge = document.createElement("span");
          badge.className = "dict-pos-badge";
          badge.textContent = group.partOfSpeech;
          badgesRow.appendChild(badge);
        }
        if (showDomainBadges && group.domain && group.domain !== "General") {
          const domainBadge = document.createElement("span");
          const domainClass = group.domain.toLowerCase().replace(/[^a-z0-9]/g, "");
          domainBadge.className = `dict-domain-badge dict-domain-${domainClass}`;
          domainBadge.textContent = group.domain;
          badgesRow.appendChild(domainBadge);
        }
        if (badgesRow.childNodes.length > 0) {
          groupEl.appendChild(badgesRow);
        }
        const list = document.createElement("ol");
        list.className = "dict-definitions-list";
        const defs = (group.definitions || []).slice(0, 3);
        for (const d of defs) {
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
        return groupEl;
      };
      if (entry.meanings && entry.meanings.length > 0) {
        for (const group of entry.meanings) {
          body.appendChild(renderMeaningGroup(group));
        }
      }
      if (entry.generalMeanings && entry.generalMeanings.length > 0) {
        const divider = document.createElement("div");
        divider.className = "dict-stacked-divider";
        const line1 = document.createElement("span");
        line1.className = "dict-divider-line";
        divider.appendChild(line1);
        const label = document.createElement("span");
        label.className = "dict-divider-label";
        label.textContent = "General English Meanings";
        divider.appendChild(label);
        const line2 = document.createElement("span");
        line2.className = "dict-divider-line";
        divider.appendChild(line2);
        body.appendChild(divider);
        for (const group of entry.generalMeanings) {
          body.appendChild(renderMeaningGroup(group));
        }
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

  // src/content/floating-icon.js
  var SVG_NS2 = "http://www.w3.org/2000/svg";
  function createBookSvg() {
    const svg = document.createElementNS(SVG_NS2, "svg");
    svg.setAttribute("width", "15");
    svg.setAttribute("height", "15");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    const path1 = document.createElementNS(SVG_NS2, "path");
    path1.setAttribute("d", "M4 19.5A2.5 2.5 0 0 1 6.5 17H20");
    const path2 = document.createElementNS(SVG_NS2, "path");
    path2.setAttribute("d", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z");
    svg.appendChild(path1);
    svg.appendChild(path2);
    return svg;
  }
  var FloatingIcon = class {
    constructor() {
      this.host = null;
      this.shadowRoot = null;
      this.cssText = "";
      this.onClickHandler = null;
      this._handleOutsideClick = this._handleOutsideClick.bind(this);
      this._handleScroll = this._handleScroll.bind(this);
    }
    setStyles(css) {
      this.cssText = css;
    }
    show(coords, onClick) {
      this.dismiss();
      if (!coords) return;
      this.onClickHandler = onClick;
      this.host = document.createElement("div");
      this.host.id = "eng-dict-floating-host-root";
      this.host.className = "dict-floating-icon-host";
      this.host.style.top = `${coords.top}px`;
      this.host.style.left = `${coords.left}px`;
      this.shadowRoot = this.host.attachShadow({ mode: "open" });
      const styleEl = document.createElement("style");
      styleEl.textContent = this.cssText;
      this.shadowRoot.appendChild(styleEl);
      const btn = document.createElement("button");
      btn.className = "dict-floating-btn";
      btn.title = "Look up in English Dictionary";
      btn.setAttribute("aria-label", "Look up selection");
      btn.appendChild(createBookSvg());
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const cb = this.onClickHandler;
        this.dismiss();
        if (cb) cb();
      });
      this.shadowRoot.appendChild(btn);
      document.documentElement.appendChild(this.host);
      document.addEventListener("mousedown", this._handleOutsideClick, true);
      window.addEventListener("scroll", this._handleScroll, { passive: true });
    }
    dismiss() {
      if (typeof document !== "undefined") {
        if (this.host && document.contains(this.host)) {
          this.host.remove();
        }
        document.removeEventListener("mousedown", this._handleOutsideClick, true);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", this._handleScroll);
      }
      this.host = null;
      this.shadowRoot = null;
      this.onClickHandler = null;
    }
    _handleOutsideClick(event) {
      if (this.host && !this.host.contains(event.target)) {
        this.dismiss();
      }
    }
    _handleScroll() {
      this.dismiss();
    }
  };

  // src/content/popup-styles.js
  var POPUP_STYLES = '/* ==========================================================================\n   English Dictionary Firefox Addon - Shadow DOM Popup Styles\n   Glassmorphic, Modern, Responsive & Dynamic Card\n   ========================================================================== */\n\n:host {\n  all: initial;\n  position: fixed;\n  z-index: 2147483647;\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;\n  font-size: 14px;\n  line-height: 1.5;\n  color: #1e293b;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n*, *::before, *::after {\n  box-sizing: border-box;\n}\n\n/* Light Theme Variables (Default) */\n.dict-card {\n  --bg-primary: rgba(255, 255, 255, 0.94);\n  --bg-surface: #f8fafc;\n  --bg-hover: #f1f5f9;\n  --text-primary: #0f172a;\n  --text-secondary: #475569;\n  --text-muted: #64748b;\n  --accent-color: #4f46e5;\n  --accent-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);\n  --accent-light: #e0e7ff;\n  --border-color: rgba(226, 232, 240, 0.9);\n  --shadow-lg: 0 14px 34px -4px rgba(15, 23, 42, 0.12), 0 8px 16px -6px rgba(15, 23, 42, 0.08);\n  --pill-bg: #eef2ff;\n  --pill-color: #4338ca;\n  --example-border: #6366f1;\n}\n\n/* Dark Theme Support */\n@media (prefers-color-scheme: dark) {\n  .dict-card {\n    --bg-primary: rgba(15, 23, 42, 0.94);\n    --bg-surface: #1e293b;\n    --bg-hover: #334155;\n    --text-primary: #f8fafc;\n    --text-secondary: #cbd5e1;\n    --text-muted: #94a3b8;\n    --accent-color: #818cf8;\n    --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);\n    --accent-light: rgba(99, 102, 241, 0.2);\n    --border-color: rgba(51, 65, 85, 0.85);\n    --shadow-lg: 0 16px 36px -4px rgba(0, 0, 0, 0.45), 0 8px 16px -6px rgba(0, 0, 0, 0.35);\n    --pill-bg: rgba(99, 102, 241, 0.18);\n    --pill-color: #a5b4fc;\n    --example-border: #818cf8;\n  }\n}\n\n/* Explicit class theme overrides */\n.dict-card.theme-dark {\n  --bg-primary: rgba(15, 23, 42, 0.94);\n  --bg-surface: #1e293b;\n  --bg-hover: #334155;\n  --text-primary: #f8fafc;\n  --text-secondary: #cbd5e1;\n  --text-muted: #94a3b8;\n  --accent-color: #818cf8;\n  --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);\n  --accent-light: rgba(99, 102, 241, 0.2);\n  --border-color: rgba(51, 65, 85, 0.85);\n  --shadow-lg: 0 16px 36px -4px rgba(0, 0, 0, 0.45);\n  --pill-bg: rgba(99, 102, 241, 0.18);\n  --pill-color: #a5b4fc;\n  --example-border: #818cf8;\n}\n\n.dict-card.theme-light {\n  --bg-primary: rgba(255, 255, 255, 0.94);\n  --bg-surface: #f8fafc;\n  --bg-hover: #f1f5f9;\n  --text-primary: #0f172a;\n  --text-secondary: #475569;\n  --text-muted: #64748b;\n  --accent-color: #4f46e5;\n  --accent-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);\n  --accent-light: #e0e7ff;\n  --border-color: rgba(226, 232, 240, 0.9);\n  --shadow-lg: 0 14px 34px -4px rgba(15, 23, 42, 0.12);\n  --pill-bg: #eef2ff;\n  --pill-color: #4338ca;\n  --example-border: #6366f1;\n}\n\n/* Card Container */\n.dict-card {\n  width: 340px;\n  max-width: calc(100vw - 24px);\n  max-height: 420px;\n  background: var(--bg-primary);\n  backdrop-filter: blur(18px);\n  -webkit-backdrop-filter: blur(18px);\n  border: 1px solid var(--border-color);\n  border-radius: 16px;\n  box-shadow: var(--shadow-lg);\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  animation: dictFadeInScale 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n  transform-origin: top left;\n  user-select: text;\n  overscroll-behavior: contain;\n}\n\n@keyframes dictFadeInScale {\n  from {\n    opacity: 0;\n    transform: translateY(6px) scale(0.97);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n  }\n}\n\n/* Header */\n.dict-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 12px 14px 10px 16px;\n  border-bottom: 1px solid var(--border-color);\n  background: var(--bg-surface);\n}\n\n.dict-title-group {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  overflow: hidden;\n  flex: 1;\n}\n\n.dict-title-row {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  overflow: hidden;\n}\n\n.dict-word {\n  font-size: 18px;\n  font-weight: 700;\n  color: var(--text-primary);\n  letter-spacing: -0.01em;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.dict-acronym-badge {\n  display: inline-block;\n  font-size: 10px;\n  font-weight: 700;\n  text-transform: uppercase;\n  letter-spacing: 0.06em;\n  padding: 1.5px 6px;\n  border-radius: 4px;\n  background: var(--accent-light);\n  color: var(--accent-color);\n  line-height: 1.2;\n  flex-shrink: 0;\n}\n\n.dict-acronym-expansion {\n  font-size: 12.5px;\n  font-weight: 600;\n  color: var(--accent-color);\n  letter-spacing: -0.01em;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.dict-phonetic {\n  font-size: 12.5px;\n  color: var(--text-muted);\n  font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;\n}\n\n.dict-header-actions {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  flex-shrink: 0;\n}\n\n/* Buttons */\n.dict-btn {\n  background: transparent;\n  border: none;\n  border-radius: 8px;\n  cursor: pointer;\n  padding: 0;\n  margin: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  color: var(--text-secondary);\n  transition: all 0.15s ease;\n  box-sizing: border-box;\n}\n\n.dict-btn svg {\n  display: block;\n  pointer-events: none;\n  flex-shrink: 0;\n}\n\n.dict-btn:hover {\n  background: var(--bg-hover);\n  color: var(--text-primary);\n}\n\n.dict-btn:active {\n  transform: scale(0.93);\n}\n\n/* Audio Speaker Button */\n.dict-audio-btn {\n  width: 28px;\n  height: 28px;\n  min-width: 28px;\n  min-height: 28px;\n  border-radius: 50%;\n  color: var(--accent-color);\n  background: var(--accent-light);\n  transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease;\n  padding: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.dict-audio-btn svg {\n  width: 15px;\n  height: 15px;\n}\n\n.dict-audio-btn:hover {\n  background: var(--accent-color);\n  color: #ffffff;\n  transform: scale(1.08);\n}\n\n.dict-audio-btn.playing {\n  animation: dictPulse 0.9s infinite alternate;\n}\n\n@keyframes dictPulse {\n  from { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }\n  to { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }\n}\n\n/* Close Button */\n.dict-close-btn {\n  width: 26px;\n  height: 26px;\n  min-width: 26px;\n  min-height: 26px;\n  border-radius: 50%;\n  color: var(--text-muted);\n  padding: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.dict-close-btn svg {\n  width: 14px;\n  height: 14px;\n}\n\n.dict-close-btn:hover {\n  background: rgba(239, 68, 68, 0.12);\n  color: #ef4444;\n}\n\n/* Body / Scrollable Content */\n.dict-body {\n  padding: 14px 16px;\n  overflow-y: auto;\n  flex: 1;\n  scrollbar-width: thin;\n  scrollbar-color: var(--border-color) transparent;\n  overscroll-behavior: contain;\n}\n\n.dict-body::-webkit-scrollbar {\n  width: 5px;\n}\n\n.dict-body::-webkit-scrollbar-thumb {\n  background-color: var(--border-color);\n  border-radius: 10px;\n}\n\n/* Meaning Group */\n.dict-meaning-group {\n  margin-bottom: 14px;\n}\n\n.dict-meaning-group:last-child {\n  margin-bottom: 0;\n}\n\n/* Badges Row */\n.dict-badges-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  margin-bottom: 8px;\n  flex-wrap: wrap;\n}\n\n.dict-pos-badge {\n  display: inline-block;\n  font-size: 11px;\n  font-weight: 700;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  padding: 2px 8px;\n  border-radius: 20px;\n  background: var(--pill-bg);\n  color: var(--pill-color);\n}\n\n.dict-domain-badge {\n  display: inline-block;\n  font-size: 10.5px;\n  font-weight: 600;\n  letter-spacing: 0.02em;\n  padding: 2px 7px;\n  border-radius: 12px;\n  border: 1px solid transparent;\n}\n\n/* Curated domain badge color palettes */\n.dict-domain-badge.dict-domain-computing {\n  background: rgba(99, 102, 241, 0.12);\n  color: #4f46e5;\n  border-color: rgba(99, 102, 241, 0.25);\n}\n\n.dict-domain-badge.dict-domain-science {\n  background: rgba(16, 185, 129, 0.12);\n  color: #059669;\n  border-color: rgba(16, 185, 129, 0.25);\n}\n\n.dict-domain-badge.dict-domain-mathematics {\n  background: rgba(168, 85, 247, 0.12);\n  color: #7c3aed;\n  border-color: rgba(168, 85, 247, 0.25);\n}\n\n.dict-domain-badge.dict-domain-business {\n  background: rgba(245, 158, 11, 0.12);\n  color: #d97706;\n  border-color: rgba(245, 158, 11, 0.25);\n}\n\n.dict-domain-badge.dict-domain-history {\n  background: rgba(244, 63, 94, 0.12);\n  color: #e11d48;\n  border-color: rgba(244, 63, 94, 0.25);\n}\n\n.dict-domain-badge.dict-domain-general {\n  background: rgba(100, 116, 139, 0.12);\n  color: #475569;\n  border-color: rgba(100, 116, 139, 0.25);\n}\n\n@media (prefers-color-scheme: dark) {\n  .dict-domain-badge.dict-domain-computing {\n    background: rgba(99, 102, 241, 0.22);\n    color: #a5b4fc;\n    border-color: rgba(99, 102, 241, 0.35);\n  }\n  .dict-domain-badge.dict-domain-science {\n    background: rgba(16, 185, 129, 0.22);\n    color: #6ee7b7;\n    border-color: rgba(16, 185, 129, 0.35);\n  }\n  .dict-domain-badge.dict-domain-mathematics {\n    background: rgba(168, 85, 247, 0.22);\n    color: #c084fc;\n    border-color: rgba(168, 85, 247, 0.35);\n  }\n  .dict-domain-badge.dict-domain-business {\n    background: rgba(245, 158, 11, 0.22);\n    color: #fcd34d;\n    border-color: rgba(245, 158, 11, 0.35);\n  }\n  .dict-domain-badge.dict-domain-history {\n    background: rgba(244, 63, 94, 0.22);\n    color: #fda4af;\n    border-color: rgba(244, 63, 94, 0.35);\n  }\n  .dict-domain-badge.dict-domain-general {\n    background: rgba(148, 163, 184, 0.2);\n    color: #cbd5e1;\n    border-color: rgba(148, 163, 184, 0.35);\n  }\n}\n\n.dict-card.theme-dark .dict-domain-badge.dict-domain-computing {\n  background: rgba(99, 102, 241, 0.22);\n  color: #a5b4fc;\n  border-color: rgba(99, 102, 241, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-science {\n  background: rgba(16, 185, 129, 0.22);\n  color: #6ee7b7;\n  border-color: rgba(16, 185, 129, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-mathematics {\n  background: rgba(168, 85, 247, 0.22);\n  color: #c084fc;\n  border-color: rgba(168, 85, 247, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-business {\n  background: rgba(245, 158, 11, 0.22);\n  color: #fcd34d;\n  border-color: rgba(245, 158, 11, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-history {\n  background: rgba(244, 63, 94, 0.22);\n  color: #fda4af;\n  border-color: rgba(244, 63, 94, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-general {\n  background: rgba(148, 163, 184, 0.2);\n  color: #cbd5e1;\n  border-color: rgba(148, 163, 184, 0.35);\n}\n\n.dict-definitions-list {\n  margin: 0;\n  padding-left: 18px;\n}\n\n.dict-def-item {\n  font-size: 13.5px;\n  color: var(--text-primary);\n  margin-bottom: 8px;\n  line-height: 1.45;\n}\n\n.dict-def-item:last-child {\n  margin-bottom: 0;\n}\n\n.dict-example {\n  margin-top: 4px;\n  padding-left: 8px;\n  border-left: 2px solid var(--example-border);\n  font-size: 12.5px;\n  color: var(--text-muted);\n  font-style: italic;\n  line-height: 1.4;\n}\n\n.dict-synonyms {\n  margin-top: 6px;\n  font-size: 11.5px;\n  color: var(--text-muted);\n}\n\n.dict-synonyms span {\n  color: var(--accent-color);\n  font-weight: 500;\n}\n\n/* Loading State */\n.dict-loading-view {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  padding: 28px 16px;\n  gap: 12px;\n  color: var(--text-muted);\n}\n\n.dict-spinner {\n  width: 24px;\n  height: 24px;\n  border: 2.5px solid var(--border-color);\n  border-top-color: var(--accent-color);\n  border-radius: 50%;\n  animation: dictSpin 0.7s linear infinite;\n}\n\n@keyframes dictSpin {\n  to { transform: rotate(360deg); }\n}\n\n/* Empty & Error State */\n.dict-error-view {\n  padding: 24px 18px;\n  text-align: center;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n}\n\n.dict-error-icon {\n  width: 32px;\n  height: 32px;\n  color: #f59e0b;\n  margin-bottom: 2px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.dict-error-icon svg {\n  width: 32px;\n  height: 32px;\n  display: block;\n}\n\n.dict-error-title {\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--text-primary);\n}\n\n.dict-error-desc {\n  font-size: 12.5px;\n  color: var(--text-muted);\n  line-height: 1.4;\n  margin: 0;\n}\n\n/* Encyclopedic Summary Block */\n.dict-encyclopedic-block {\n  margin-bottom: 14px;\n  padding: 10px 12px;\n  background: var(--bg-surface);\n  border-radius: 8px;\n  border-left: 3px solid var(--accent-color);\n}\n\n.dict-encyclopedic-text {\n  font-size: 13px;\n  color: var(--text-primary);\n  line-height: 1.45;\n  margin: 0 0 6px 0;\n}\n\n.dict-reference-link {\n  font-size: 11.5px;\n  color: var(--accent-color);\n  text-decoration: none;\n  font-weight: 500;\n  display: inline-flex;\n  align-items: center;\n  gap: 3px;\n  transition: opacity 0.15s ease;\n}\n\n.dict-reference-link:hover {\n  text-decoration: underline;\n  opacity: 0.85;\n}\n\n/* Stacked Disambiguation Section Divider */\n.dict-stacked-divider {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin: 16px 0 12px 0;\n}\n\n.dict-divider-line {\n  flex: 1;\n  height: 1px;\n  background: var(--border-color);\n}\n\n.dict-divider-label {\n  font-size: 11px;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--text-muted);\n  white-space: nowrap;\n}\n\n/* Floating Dictionary Trigger Icon */\n.dict-floating-icon-host {\n  all: initial;\n  position: fixed;\n  z-index: 2147483646;\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n  pointer-events: auto;\n}\n\n.dict-floating-btn {\n  width: 28px;\n  height: 28px;\n  border-radius: 50%;\n  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);\n  color: #ffffff;\n  border: none;\n  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  padding: 0;\n  margin: 0;\n  animation: dictFloatingPop 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n  transition: transform 0.15s ease, box-shadow 0.15s ease;\n}\n\n.dict-floating-btn:hover {\n  transform: scale(1.12);\n  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.5);\n}\n\n.dict-floating-btn:active {\n  transform: scale(0.95);\n}\n\n.dict-floating-btn svg {\n  width: 15px;\n  height: 15px;\n  pointer-events: none;\n}\n\n@keyframes dictFloatingPop {\n  from {\n    opacity: 0;\n    transform: scale(0.7);\n  }\n  to {\n    opacity: 1;\n    transform: scale(1);\n  }\n}\n\n';

  // src/content/content.js
  var popupView = new PopupView();
  popupView.setStyles(POPUP_STYLES);
  var floatingIcon = new FloatingIcon();
  floatingIcon.setStyles(POPUP_STYLES);
  var activeConfig = {
    modifierKey: "none",
    enabled: true,
    theme: "auto",
    multiWordEnabled: true,
    domainBadgesEnabled: true
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
  async function performLookup(sanitized, anchorRect) {
    const word = sanitized.cleanTerm;
    const coords = calculatePopupPosition({
      anchorRect,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });
    popupView.showLoading(word, coords, activeConfig.theme);
    try {
      const response = await sendBackgroundMessage({
        action: "LOOKUP_DOMAIN_TERM",
        payload: {
          term: sanitized.cleanTerm,
          rawText: sanitized.raw,
          isUppercase: sanitized.isUppercase,
          wordCount: sanitized.wordCount
        }
      });
      if (!response || response.status !== "success") {
        const msg = response?.errorMessage || `No definitions found for "${word}". Check spelling.`;
        popupView.showError(msg, word, coords, activeConfig.theme);
        return;
      }
      const entry = response.entry || response.data;
      popupView.showResult(entry, coords, activeConfig.theme, activeConfig);
    } catch (err) {
      popupView.showError("Unable to connect to dictionary service. Please check your internet connection.", word, coords, activeConfig.theme);
    }
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
    const sanitized = sanitizeDomainTerm(rawText);
    if (!sanitized.isValid || !sanitized.cleanTerm) {
      return;
    }
    const range = selection.getRangeAt(0);
    const anchorRect = range.getBoundingClientRect();
    if (anchorRect.width === 0 && anchorRect.height === 0) {
      return;
    }
    floatingIcon.dismiss();
    await performLookup(sanitized, anchorRect);
  });
  document.addEventListener("mouseup", (event) => {
    if (!activeConfig.enabled || !activeConfig.multiWordEnabled) {
      return;
    }
    if (event.target && event.target.id && String(event.target.id).startsWith("eng-dict-")) {
      return;
    }
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        floatingIcon.dismiss();
        return;
      }
      const rawText = selection.toString();
      const sanitized = sanitizeDomainTerm(rawText);
      if (!sanitized.isValid || sanitized.wordCount < 2 || sanitized.wordCount > 4) {
        floatingIcon.dismiss();
        return;
      }
      const range = selection.getRangeAt(0);
      const anchorRect = range.getBoundingClientRect();
      if (anchorRect.width === 0 && anchorRect.height === 0) {
        floatingIcon.dismiss();
        return;
      }
      const hasModifier = activeConfig.modifierKey !== "none" && matchesModifier(event, activeConfig.modifierKey);
      if (hasModifier) {
        floatingIcon.dismiss();
        performLookup(sanitized, anchorRect);
        return;
      }
      let top = anchorRect.top - 34;
      if (top < 10) {
        top = anchorRect.bottom + 6;
      }
      let left = Math.min(anchorRect.right + 4, window.innerWidth - 36);
      top = Math.max(8, Math.min(top, window.innerHeight - 36));
      left = Math.max(8, Math.min(left, window.innerWidth - 36));
      floatingIcon.show({ top, left }, () => {
        performLookup(sanitized, anchorRect);
      });
    }, 10);
  });
})();
