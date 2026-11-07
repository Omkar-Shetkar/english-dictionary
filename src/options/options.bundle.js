(() => {
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
      console.warn("[Simple English Dictionary] Failed to load settings from storage:", err);
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
        console.error("[Simple English Dictionary] Failed to save settings to storage:", err);
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
  var LEADING_BOUNDARY_REGEX = /^[\s"'“‘(\[{<«]+/u;
  var TRAILING_BOUNDARY_REGEX = /[\s"'”’)\]}>».,:;!?-]+$/u;
  var HAS_LETTER_REGEX = /\p{L}/u;
  var MAX_WORD_LENGTH = 45;
  var MAX_PHRASE_WORDS = 8;
  var MAX_PHRASE_LENGTH = 180;
  function preCleanPdfArtifacts(text) {
    if (typeof text !== "string") return "";
    return text.replace(/\u00AD/g, "").replace(/(\p{L})[-‐‑‒–—]\s*[\r\n]+\s*(\p{L})/gu, "$1$2");
  }
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
    const raw = preCleanPdfArtifacts(rawText).trim();
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
    if (anchorRect.width === 0 && anchorRect.height === 0) {
      const centeredLeft = Math.max(VIEWPORT_MARGIN, Math.round((viewportWidth - popupWidth) / 2));
      const fallbackTop = Math.min(80, Math.max(VIEWPORT_MARGIN, Math.round((viewportHeight - popupHeight) / 3)));
      return { top: fallbackTop, left: centeredLeft, placement: "bottom" };
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
  var HOST_ELEMENT_ID = "eng-dict-host-root";
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
      this.lastCoords = null;
      this.lastAnchorRect = null;
      this.onRelatedPhraseClick = null;
      this.onSuggestWordClick = null;
      this._handleOutsideClick = this._handleOutsideClick.bind(this);
      this._handleKeydown = this._handleKeydown.bind(this);
      this._handleScroll = this._handleScroll.bind(this);
    }
    setStyles(css) {
      this.cssText = css;
    }
    setOnRelatedPhraseClick(cb) {
      this.onRelatedPhraseClick = cb;
    }
    setOnSuggestWordClick(cb) {
      this.onSuggestWordClick = cb;
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
      this.lastCoords = coords;
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
      } else if (extra && extra.expressionType && extra.expressionType !== "general") {
        const exprBadge = document.createElement("span");
        const exprType = extra.expressionType;
        const label = exprType === "phrasal_verb" ? "Phrasal Verb" : exprType === "proverb" ? "Proverb" : "Idiom";
        exprBadge.className = `dict-domain-badge dict-domain-${exprType.replace(/[^a-z0-9]/g, "")}`;
        exprBadge.textContent = label;
        titleRow.appendChild(exprBadge);
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
      if (extra && extra.matchedSurfaceForm && extra.canonicalForm && extra.matchedSurfaceForm.toLowerCase() !== extra.canonicalForm.toLowerCase()) {
        const matchedSubtitle = document.createElement("div");
        matchedSubtitle.className = "dict-matched-subtitle";
        matchedSubtitle.textContent = `Matched from: "${extra.matchedSurfaceForm}"`;
        titleGroup.appendChild(matchedSubtitle);
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
          acronymExpansion: entry.acronymExpansion,
          expressionType: entry.expressionType,
          matchedSurfaceForm: entry.matchedSurfaceForm,
          canonicalForm: entry.canonicalForm
        }
      ));
      const body = document.createElement("div");
      body.className = "dict-body";
      if (entry.origin) {
        const originBlock = document.createElement("div");
        originBlock.className = "dict-origin-block";
        const originTitle = document.createElement("div");
        originTitle.className = "dict-origin-title";
        originTitle.textContent = "Origin & Background";
        originBlock.appendChild(originTitle);
        const originText = document.createElement("p");
        originText.className = "dict-origin-text";
        originText.textContent = entry.origin;
        originBlock.appendChild(originText);
        body.appendChild(originBlock);
      }
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
          if (d.grammarNotes && typeof d.grammarNotes === "object") {
            const notesSpan = document.createElement("span");
            notesSpan.className = "dict-grammar-notes";
            if (d.grammarNotes.transitivity) {
              const tTag = document.createElement("span");
              tTag.className = "dict-grammar-tag";
              tTag.textContent = d.grammarNotes.transitivity;
              notesSpan.appendChild(tTag);
            }
            if (d.grammarNotes.separability) {
              const sTag = document.createElement("span");
              sTag.className = "dict-grammar-tag";
              sTag.textContent = d.grammarNotes.separability;
              notesSpan.appendChild(sTag);
            }
            if (notesSpan.childNodes.length > 0) {
              defText.appendChild(notesSpan);
            }
          }
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
      if (entry.literalMeanings && entry.literalMeanings.length > 0) {
        const divider = document.createElement("div");
        divider.className = "dict-stacked-divider";
        const line1 = document.createElement("span");
        line1.className = "dict-divider-line";
        divider.appendChild(line1);
        const label = document.createElement("span");
        label.className = "dict-divider-label";
        label.textContent = "Literal Meaning";
        divider.appendChild(label);
        const line2 = document.createElement("span");
        line2.className = "dict-divider-line";
        divider.appendChild(line2);
        body.appendChild(divider);
        for (const group of entry.literalMeanings) {
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
      if (entry.relatedIdioms && Array.isArray(entry.relatedIdioms) && entry.relatedIdioms.length > 0) {
        const relatedSection = document.createElement("div");
        relatedSection.className = "dict-related-section";
        const relatedHeader = document.createElement("div");
        relatedHeader.className = "dict-related-header";
        relatedHeader.textContent = "Related Idioms & Phrases";
        relatedSection.appendChild(relatedHeader);
        const chipsContainer = document.createElement("div");
        chipsContainer.className = "dict-related-chips";
        for (const item of entry.relatedIdioms) {
          const chip = document.createElement("button");
          chip.className = "dict-related-chip";
          chip.type = "button";
          chip.title = item.summary || item.phrase;
          const chipText = document.createElement("span");
          chipText.className = "dict-chip-text";
          chipText.textContent = item.phrase;
          chip.appendChild(chipText);
          if (item.badge) {
            const chipBadge = document.createElement("span");
            const badgeClass = item.badge.toLowerCase().replace(/[^a-z0-9]/g, "");
            chipBadge.className = `dict-chip-badge dict-badge-${badgeClass}`;
            chipBadge.textContent = item.badge;
            chip.appendChild(chipBadge);
          }
          chip.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (typeof this.onRelatedPhraseClick === "function") {
              this.onRelatedPhraseClick(item.phrase);
            }
          });
          chipsContainer.appendChild(chip);
        }
        relatedSection.appendChild(chipsContainer);
        body.appendChild(relatedSection);
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
      const tokens = (word || "").trim().split(/\s+/).filter(Boolean);
      if (!isNetwork && tokens.length > 1) {
        const suggestContainer = document.createElement("div");
        suggestContainer.className = "dict-suggest-words";
        for (const token of tokens) {
          const clean = token.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
          if (clean.length > 2) {
            const btn = document.createElement("button");
            btn.className = "dict-suggest-btn";
            btn.type = "button";
            btn.textContent = `Look up "${clean}"`;
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              e.preventDefault();
              if (typeof this.onSuggestWordClick === "function") {
                this.onSuggestWordClick(clean);
              }
            });
            suggestContainer.appendChild(btn);
          }
        }
        if (suggestContainer.childNodes.length > 0) {
          errorView.appendChild(suggestContainer);
        }
      }
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
            console.warn("[Simple English Dictionary] Natural speech synthesis failed:", synthErr);
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
      btn.title = "Look up in Simple English Dictionary";
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
  var POPUP_STYLES = '/* ==========================================================================\n   Simple English Dictionary Extension - Shadow DOM Popup Styles\n   Glassmorphic, Modern, Responsive & Dynamic Card\n   ========================================================================== */\n\n:host {\n  all: initial;\n  position: fixed;\n  z-index: 2147483647;\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;\n  font-size: 14px;\n  line-height: 1.5;\n  color: #1e293b;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n*, *::before, *::after {\n  box-sizing: border-box;\n}\n\n/* Light Theme Variables (Default) */\n.dict-card {\n  --bg-primary: rgba(255, 255, 255, 0.94);\n  --bg-surface: #f8fafc;\n  --bg-hover: #f1f5f9;\n  --text-primary: #0f172a;\n  --text-secondary: #475569;\n  --text-muted: #64748b;\n  --accent-color: #4f46e5;\n  --accent-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);\n  --accent-light: #e0e7ff;\n  --border-color: rgba(226, 232, 240, 0.9);\n  --shadow-lg: 0 14px 34px -4px rgba(15, 23, 42, 0.12), 0 8px 16px -6px rgba(15, 23, 42, 0.08);\n  --pill-bg: #eef2ff;\n  --pill-color: #4338ca;\n  --example-border: #6366f1;\n}\n\n/* Dark Theme Support */\n@media (prefers-color-scheme: dark) {\n  .dict-card {\n    --bg-primary: rgba(15, 23, 42, 0.94);\n    --bg-surface: #1e293b;\n    --bg-hover: #334155;\n    --text-primary: #f8fafc;\n    --text-secondary: #cbd5e1;\n    --text-muted: #94a3b8;\n    --accent-color: #818cf8;\n    --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);\n    --accent-light: rgba(99, 102, 241, 0.2);\n    --border-color: rgba(51, 65, 85, 0.85);\n    --shadow-lg: 0 16px 36px -4px rgba(0, 0, 0, 0.45), 0 8px 16px -6px rgba(0, 0, 0, 0.35);\n    --pill-bg: rgba(99, 102, 241, 0.18);\n    --pill-color: #a5b4fc;\n    --example-border: #818cf8;\n  }\n}\n\n/* Explicit class theme overrides */\n.dict-card.theme-dark {\n  --bg-primary: rgba(15, 23, 42, 0.94);\n  --bg-surface: #1e293b;\n  --bg-hover: #334155;\n  --text-primary: #f8fafc;\n  --text-secondary: #cbd5e1;\n  --text-muted: #94a3b8;\n  --accent-color: #818cf8;\n  --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);\n  --accent-light: rgba(99, 102, 241, 0.2);\n  --border-color: rgba(51, 65, 85, 0.85);\n  --shadow-lg: 0 16px 36px -4px rgba(0, 0, 0, 0.45);\n  --pill-bg: rgba(99, 102, 241, 0.18);\n  --pill-color: #a5b4fc;\n  --example-border: #818cf8;\n}\n\n.dict-card.theme-light {\n  --bg-primary: rgba(255, 255, 255, 0.94);\n  --bg-surface: #f8fafc;\n  --bg-hover: #f1f5f9;\n  --text-primary: #0f172a;\n  --text-secondary: #475569;\n  --text-muted: #64748b;\n  --accent-color: #4f46e5;\n  --accent-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);\n  --accent-light: #e0e7ff;\n  --border-color: rgba(226, 232, 240, 0.9);\n  --shadow-lg: 0 14px 34px -4px rgba(15, 23, 42, 0.12);\n  --pill-bg: #eef2ff;\n  --pill-color: #4338ca;\n  --example-border: #6366f1;\n}\n\n/* Card Container */\n.dict-card {\n  width: 340px;\n  max-width: calc(100vw - 24px);\n  max-height: 420px;\n  background: var(--bg-primary);\n  backdrop-filter: blur(18px);\n  -webkit-backdrop-filter: blur(18px);\n  border: 1px solid var(--border-color);\n  border-radius: 16px;\n  box-shadow: var(--shadow-lg);\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  animation: dictFadeInScale 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n  transform-origin: top left;\n  user-select: text;\n  overscroll-behavior: contain;\n}\n\n@keyframes dictFadeInScale {\n  from {\n    opacity: 0;\n    transform: translateY(6px) scale(0.97);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n  }\n}\n\n/* Header */\n.dict-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 12px 14px 10px 16px;\n  border-bottom: 1px solid var(--border-color);\n  background: var(--bg-surface);\n}\n\n.dict-title-group {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  overflow: hidden;\n  flex: 1;\n}\n\n.dict-title-row {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  overflow: hidden;\n}\n\n.dict-word {\n  font-size: 18px;\n  font-weight: 700;\n  color: var(--text-primary);\n  letter-spacing: -0.01em;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.dict-acronym-badge {\n  display: inline-block;\n  font-size: 10px;\n  font-weight: 700;\n  text-transform: uppercase;\n  letter-spacing: 0.06em;\n  padding: 1.5px 6px;\n  border-radius: 4px;\n  background: var(--accent-light);\n  color: var(--accent-color);\n  line-height: 1.2;\n  flex-shrink: 0;\n}\n\n.dict-acronym-expansion {\n  font-size: 12.5px;\n  font-weight: 600;\n  color: var(--accent-color);\n  letter-spacing: -0.01em;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.dict-phonetic {\n  font-size: 12.5px;\n  color: var(--text-muted);\n  font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;\n}\n\n.dict-header-actions {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  flex-shrink: 0;\n}\n\n/* Buttons */\n.dict-btn {\n  background: transparent;\n  border: none;\n  border-radius: 8px;\n  cursor: pointer;\n  padding: 0;\n  margin: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  color: var(--text-secondary);\n  transition: all 0.15s ease;\n  box-sizing: border-box;\n}\n\n.dict-btn svg {\n  display: block;\n  pointer-events: none;\n  flex-shrink: 0;\n}\n\n.dict-btn:hover {\n  background: var(--bg-hover);\n  color: var(--text-primary);\n}\n\n.dict-btn:active {\n  transform: scale(0.93);\n}\n\n/* Audio Speaker Button */\n.dict-audio-btn {\n  width: 28px;\n  height: 28px;\n  min-width: 28px;\n  min-height: 28px;\n  border-radius: 50%;\n  color: var(--accent-color);\n  background: var(--accent-light);\n  transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease;\n  padding: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.dict-audio-btn svg {\n  width: 15px;\n  height: 15px;\n}\n\n.dict-audio-btn:hover {\n  background: var(--accent-color);\n  color: #ffffff;\n  transform: scale(1.08);\n}\n\n.dict-audio-btn.playing {\n  animation: dictPulse 0.9s infinite alternate;\n}\n\n@keyframes dictPulse {\n  from { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }\n  to { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }\n}\n\n/* Close Button */\n.dict-close-btn {\n  width: 26px;\n  height: 26px;\n  min-width: 26px;\n  min-height: 26px;\n  border-radius: 50%;\n  color: var(--text-muted);\n  padding: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.dict-close-btn svg {\n  width: 14px;\n  height: 14px;\n}\n\n.dict-close-btn:hover {\n  background: rgba(239, 68, 68, 0.12);\n  color: #ef4444;\n}\n\n/* Body / Scrollable Content */\n.dict-body {\n  padding: 14px 16px;\n  overflow-y: auto;\n  flex: 1;\n  scrollbar-width: thin;\n  scrollbar-color: var(--border-color) transparent;\n  overscroll-behavior: contain;\n}\n\n.dict-body::-webkit-scrollbar {\n  width: 5px;\n}\n\n.dict-body::-webkit-scrollbar-thumb {\n  background-color: var(--border-color);\n  border-radius: 10px;\n}\n\n/* Meaning Group */\n.dict-meaning-group {\n  margin-bottom: 14px;\n}\n\n.dict-meaning-group:last-child {\n  margin-bottom: 0;\n}\n\n/* Badges Row */\n.dict-badges-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  margin-bottom: 8px;\n  flex-wrap: wrap;\n}\n\n.dict-pos-badge {\n  display: inline-block;\n  font-size: 11px;\n  font-weight: 700;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  padding: 2px 8px;\n  border-radius: 20px;\n  background: var(--pill-bg);\n  color: var(--pill-color);\n}\n\n.dict-domain-badge {\n  display: inline-block;\n  font-size: 10.5px;\n  font-weight: 600;\n  letter-spacing: 0.02em;\n  padding: 2px 7px;\n  border-radius: 12px;\n  border: 1px solid transparent;\n}\n\n/* Curated domain badge color palettes */\n.dict-domain-badge.dict-domain-computing {\n  background: rgba(99, 102, 241, 0.12);\n  color: #4f46e5;\n  border-color: rgba(99, 102, 241, 0.25);\n}\n\n.dict-domain-badge.dict-domain-science {\n  background: rgba(16, 185, 129, 0.12);\n  color: #059669;\n  border-color: rgba(16, 185, 129, 0.25);\n}\n\n.dict-domain-badge.dict-domain-mathematics {\n  background: rgba(168, 85, 247, 0.12);\n  color: #7c3aed;\n  border-color: rgba(168, 85, 247, 0.25);\n}\n\n.dict-domain-badge.dict-domain-business {\n  background: rgba(245, 158, 11, 0.12);\n  color: #d97706;\n  border-color: rgba(245, 158, 11, 0.25);\n}\n\n.dict-domain-badge.dict-domain-history {\n  background: rgba(244, 63, 94, 0.12);\n  color: #e11d48;\n  border-color: rgba(244, 63, 94, 0.25);\n}\n\n.dict-domain-badge.dict-domain-general {\n  background: rgba(100, 116, 139, 0.12);\n  color: #475569;\n  border-color: rgba(100, 116, 139, 0.25);\n}\n\n@media (prefers-color-scheme: dark) {\n  .dict-domain-badge.dict-domain-computing {\n    background: rgba(99, 102, 241, 0.22);\n    color: #a5b4fc;\n    border-color: rgba(99, 102, 241, 0.35);\n  }\n  .dict-domain-badge.dict-domain-science {\n    background: rgba(16, 185, 129, 0.22);\n    color: #6ee7b7;\n    border-color: rgba(16, 185, 129, 0.35);\n  }\n  .dict-domain-badge.dict-domain-mathematics {\n    background: rgba(168, 85, 247, 0.22);\n    color: #c084fc;\n    border-color: rgba(168, 85, 247, 0.35);\n  }\n  .dict-domain-badge.dict-domain-business {\n    background: rgba(245, 158, 11, 0.22);\n    color: #fcd34d;\n    border-color: rgba(245, 158, 11, 0.35);\n  }\n  .dict-domain-badge.dict-domain-history {\n    background: rgba(244, 63, 94, 0.22);\n    color: #fda4af;\n    border-color: rgba(244, 63, 94, 0.35);\n  }\n  .dict-domain-badge.dict-domain-general {\n    background: rgba(148, 163, 184, 0.2);\n    color: #cbd5e1;\n    border-color: rgba(148, 163, 184, 0.35);\n  }\n}\n\n.dict-card.theme-dark .dict-domain-badge.dict-domain-computing {\n  background: rgba(99, 102, 241, 0.22);\n  color: #a5b4fc;\n  border-color: rgba(99, 102, 241, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-science {\n  background: rgba(16, 185, 129, 0.22);\n  color: #6ee7b7;\n  border-color: rgba(16, 185, 129, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-mathematics {\n  background: rgba(168, 85, 247, 0.22);\n  color: #c084fc;\n  border-color: rgba(168, 85, 247, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-business {\n  background: rgba(245, 158, 11, 0.22);\n  color: #fcd34d;\n  border-color: rgba(245, 158, 11, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-history {\n  background: rgba(244, 63, 94, 0.22);\n  color: #fda4af;\n  border-color: rgba(244, 63, 94, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-general {\n  background: rgba(148, 163, 184, 0.2);\n  color: #cbd5e1;\n  border-color: rgba(148, 163, 184, 0.35);\n}\n\n.dict-definitions-list {\n  margin: 0;\n  padding-left: 18px;\n}\n\n.dict-def-item {\n  font-size: 13.5px;\n  color: var(--text-primary);\n  margin-bottom: 8px;\n  line-height: 1.45;\n}\n\n.dict-def-item:last-child {\n  margin-bottom: 0;\n}\n\n.dict-example {\n  margin-top: 4px;\n  padding-left: 8px;\n  border-left: 2px solid var(--example-border);\n  font-size: 12.5px;\n  color: var(--text-muted);\n  font-style: italic;\n  line-height: 1.4;\n}\n\n.dict-synonyms {\n  margin-top: 6px;\n  font-size: 11.5px;\n  color: var(--text-muted);\n}\n\n.dict-synonyms span {\n  color: var(--accent-color);\n  font-weight: 500;\n}\n\n/* Loading State */\n.dict-loading-view {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  padding: 28px 16px;\n  gap: 12px;\n  color: var(--text-muted);\n}\n\n.dict-spinner {\n  width: 24px;\n  height: 24px;\n  border: 2.5px solid var(--border-color);\n  border-top-color: var(--accent-color);\n  border-radius: 50%;\n  animation: dictSpin 0.7s linear infinite;\n}\n\n@keyframes dictSpin {\n  to { transform: rotate(360deg); }\n}\n\n/* Empty & Error State */\n.dict-error-view {\n  padding: 24px 18px;\n  text-align: center;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n}\n\n.dict-error-icon {\n  width: 32px;\n  height: 32px;\n  color: #f59e0b;\n  margin-bottom: 2px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.dict-error-icon svg {\n  width: 32px;\n  height: 32px;\n  display: block;\n}\n\n.dict-error-title {\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--text-primary);\n}\n\n.dict-error-desc {\n  font-size: 12.5px;\n  color: var(--text-muted);\n  line-height: 1.4;\n  margin: 0;\n}\n\n/* Encyclopedic Summary Block */\n.dict-encyclopedic-block {\n  margin-bottom: 14px;\n  padding: 10px 12px;\n  background: var(--bg-surface);\n  border-radius: 8px;\n  border-left: 3px solid var(--accent-color);\n}\n\n.dict-encyclopedic-text {\n  font-size: 13px;\n  color: var(--text-primary);\n  line-height: 1.45;\n  margin: 0 0 6px 0;\n}\n\n.dict-reference-link {\n  font-size: 11.5px;\n  color: var(--accent-color);\n  text-decoration: none;\n  font-weight: 500;\n  display: inline-flex;\n  align-items: center;\n  gap: 3px;\n  transition: opacity 0.15s ease;\n}\n\n.dict-reference-link:hover {\n  text-decoration: underline;\n  opacity: 0.85;\n}\n\n/* Stacked Disambiguation Section Divider */\n.dict-stacked-divider {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin: 16px 0 12px 0;\n}\n\n.dict-divider-line {\n  flex: 1;\n  height: 1px;\n  background: var(--border-color);\n}\n\n.dict-divider-label {\n  font-size: 11px;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--text-muted);\n  white-space: nowrap;\n}\n\n/* Floating Dictionary Trigger Icon */\n.dict-floating-icon-host {\n  all: initial;\n  position: fixed;\n  z-index: 2147483646;\n  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n  pointer-events: auto;\n}\n\n.dict-floating-btn {\n  width: 28px;\n  height: 28px;\n  border-radius: 50%;\n  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);\n  color: #ffffff;\n  border: none;\n  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  padding: 0;\n  margin: 0;\n  animation: dictFloatingPop 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n  transition: transform 0.15s ease, box-shadow 0.15s ease;\n}\n\n.dict-floating-btn:hover {\n  transform: scale(1.12);\n  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.5);\n}\n\n.dict-floating-btn:active {\n  transform: scale(0.95);\n}\n\n.dict-floating-btn svg {\n  width: 15px;\n  height: 15px;\n  pointer-events: none;\n}\n\n@keyframes dictFloatingPop {\n  from {\n    opacity: 0;\n    transform: scale(0.7);\n  }\n  to {\n    opacity: 1;\n    transform: scale(1);\n  }\n}\n\n/* ==========================================================================\n   Idioms, Proverbs, and Phrasal Verbs Styles\n   ========================================================================== */\n\n/* Expression Badges */\n.dict-domain-badge.dict-domain-idiom {\n  background: rgba(147, 51, 234, 0.12);\n  color: #9333ea;\n  border-color: rgba(147, 51, 234, 0.25);\n}\n\n.dict-domain-badge.dict-domain-proverb {\n  background: rgba(217, 119, 6, 0.12);\n  color: #d97706;\n  border-color: rgba(217, 119, 6, 0.25);\n}\n\n.dict-domain-badge.dict-domain-phrasalverb {\n  background: rgba(13, 148, 136, 0.12);\n  color: #0d9488;\n  border-color: rgba(13, 148, 136, 0.25);\n}\n\n@media (prefers-color-scheme: dark) {\n  .dict-domain-badge.dict-domain-idiom {\n    background: rgba(168, 85, 247, 0.22);\n    color: #c084fc;\n    border-color: rgba(168, 85, 247, 0.35);\n  }\n  .dict-domain-badge.dict-domain-proverb {\n    background: rgba(245, 158, 11, 0.22);\n    color: #fcd34d;\n    border-color: rgba(245, 158, 11, 0.35);\n  }\n  .dict-domain-badge.dict-domain-phrasalverb {\n    background: rgba(45, 212, 191, 0.22);\n    color: #5eead4;\n    border-color: rgba(45, 212, 191, 0.35);\n  }\n}\n\n.dict-card.theme-dark .dict-domain-badge.dict-domain-idiom {\n  background: rgba(168, 85, 247, 0.22);\n  color: #c084fc;\n  border-color: rgba(168, 85, 247, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-proverb {\n  background: rgba(245, 158, 11, 0.22);\n  color: #fcd34d;\n  border-color: rgba(245, 158, 11, 0.35);\n}\n.dict-card.theme-dark .dict-domain-badge.dict-domain-phrasalverb {\n  background: rgba(45, 212, 191, 0.22);\n  color: #5eead4;\n  border-color: rgba(45, 212, 191, 0.35);\n}\n\n/* Surface Match Subtitle */\n.dict-matched-subtitle {\n  font-size: 11px;\n  color: var(--text-muted);\n  font-style: italic;\n  margin-top: 1px;\n}\n\n/* Grammatical notes for phrasal verbs */\n.dict-grammar-notes {\n  display: inline-flex;\n  gap: 4px;\n  margin-left: 4px;\n}\n\n.dict-grammar-tag {\n  display: inline-block;\n  font-size: 10px;\n  font-weight: 600;\n  padding: 1px 5px;\n  border-radius: 4px;\n  background: rgba(100, 116, 139, 0.1);\n  color: var(--text-secondary);\n}\n\n/* Origin & Lore Block */\n.dict-origin-block {\n  margin-bottom: 14px;\n  padding: 10px 12px;\n  background: var(--bg-surface);\n  border-radius: 8px;\n  border-left: 3px solid #9333ea;\n}\n\n.dict-origin-title {\n  font-size: 10.5px;\n  font-weight: 700;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: #9333ea;\n  margin-bottom: 4px;\n}\n\n.dict-origin-text {\n  font-size: 12.5px;\n  color: var(--text-primary);\n  line-height: 1.4;\n  margin: 0;\n}\n\n/* Related Idioms & Phrases Section */\n.dict-related-section {\n  margin-top: 14px;\n  padding-top: 12px;\n  border-top: 1px dashed var(--border-color);\n}\n\n.dict-related-header {\n  font-size: 11px;\n  font-weight: 700;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  color: var(--text-muted);\n  margin-bottom: 8px;\n}\n\n.dict-related-chips {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n}\n\n.dict-related-chip {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  padding: 4px 9px;\n  border-radius: 14px;\n  border: 1px solid var(--border-color);\n  background: var(--bg-surface);\n  color: var(--text-primary);\n  font-size: 12px;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.15s ease;\n  user-select: none;\n}\n\n.dict-related-chip:hover {\n  background: var(--accent-light);\n  color: var(--accent-color);\n  border-color: var(--accent-color);\n  transform: translateY(-1px);\n}\n\n.dict-related-chip:active {\n  transform: translateY(0);\n}\n\n.dict-chip-badge {\n  font-size: 9.5px;\n  font-weight: 700;\n  padding: 1px 4px;\n  border-radius: 6px;\n  background: rgba(147, 51, 234, 0.12);\n  color: #9333ea;\n}\n\n.dict-chip-badge.dict-badge-phrasalverb {\n  background: rgba(13, 148, 136, 0.12);\n  color: #0d9488;\n}\n\n.dict-chip-badge.dict-badge-proverb {\n  background: rgba(217, 119, 6, 0.12);\n  color: #d97706;\n}\n\n/* Not Found Word Suggestion Chips */\n.dict-suggest-words {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  margin-top: 10px;\n  justify-content: center;\n}\n\n.dict-suggest-btn {\n  padding: 3px 8px;\n  border-radius: 6px;\n  border: 1px solid var(--border-color);\n  background: var(--bg-surface);\n  color: var(--accent-color);\n  font-size: 12px;\n  cursor: pointer;\n  transition: all 0.15s ease;\n}\n\n.dict-suggest-btn:hover {\n  background: var(--accent-light);\n  border-color: var(--accent-color);\n}\n\n\n';

  // src/common/domain-detector.js
  var DOMAINS = Object.freeze({
    COMPUTING: "Computing",
    SCIENCE: "Science",
    MATHEMATICS: "Mathematics",
    BUSINESS: "Business",
    HISTORY: "History",
    GENERAL: "General"
  });
  var COMPUTING_KEYWORDS = [
    "computing",
    "computer",
    "software",
    "hardware",
    "programming",
    "internet",
    "network",
    "cybersecurity",
    "algorithm",
    "artificial intelligence",
    "machine learning",
    "database",
    "cryptography",
    "web",
    "operating system",
    "compiler",
    "code",
    "data structure",
    "cpu",
    "cloud",
    "devops",
    "server",
    "protocol",
    "telecommunication",
    "telecommunications",
    "polymorphism",
    "hypervisor",
    "microservices",
    "object-oriented"
  ];
  var SCIENCE_KEYWORDS = [
    "science",
    "scientific",
    "biology",
    "biological",
    "chemistry",
    "chemical",
    "physics",
    "physical",
    "medicine",
    "medical",
    "astronomy",
    "genetics",
    "genetic",
    "geology",
    "neuroscience",
    "physiology",
    "physiological",
    "homeostasis",
    "photosynthesis",
    "cellular",
    "ecology",
    "botany",
    "zoology",
    "biochemistry",
    "pathology",
    "pharmacology",
    "anatomy",
    "microbiology",
    "organism",
    "cell",
    "quantum",
    "crispr",
    "mitochondria"
  ];
  var MATHEMATICS_KEYWORDS = [
    "mathematics",
    "mathematical",
    "math",
    "algebra",
    "algebraic",
    "geometry",
    "geometric",
    "calculus",
    "statistics",
    "statistical",
    "topology",
    "topological",
    "trigonometry",
    "arithmetic",
    "probability",
    "graph theory",
    "combinatorics",
    "discrete math",
    "number theory",
    "matrix",
    "vector",
    "differential",
    "integral",
    "linear algebra",
    "eigenvalue",
    "eigenvector",
    "asymptote"
  ];
  var BUSINESS_KEYWORDS = [
    "business",
    "finance",
    "financial",
    "economics",
    "economic",
    "accounting",
    "commerce",
    "commercial",
    "banking",
    "marketing",
    "corporate",
    "management",
    "investment",
    "insurance",
    "trade",
    "fiscal",
    "monetary",
    "revenue",
    "equity",
    "asset",
    "liability",
    "macroeconomics",
    "microeconomics",
    "audit",
    "taxation",
    "amortization",
    "liquidity",
    "ebitda",
    "compound interest"
  ];
  var HISTORY_KEYWORDS = [
    "history",
    "historical",
    "ancient",
    "medieval",
    "renaissance",
    "civilization",
    "empire",
    "warfare",
    "military",
    "archaeology",
    "revolution",
    "monarchy",
    "feudalism",
    "reformation",
    "enlightenment",
    "dynasty",
    "era",
    "antiquity",
    "middle ages"
  ];
  function extractContextTags(text) {
    if (!text || typeof text !== "string") return [];
    const tags = [];
    const matches = text.match(/\(([^)]+)\)|\[([^\]]+)\]/g);
    if (matches) {
      for (const m of matches) {
        const inner = m.replace(/[()[\]]/g, "").trim().toLowerCase();
        const parts = inner.split(/[,;/]+/).map((p) => p.trim()).filter(Boolean);
        tags.push(...parts);
      }
    }
    return tags;
  }
  function classifyDomain(text = "", extraTags = []) {
    const combinedText = [
      ...Array.isArray(extraTags) ? extraTags : [],
      extractContextTags(text).join(" "),
      text
    ].join(" ").toLowerCase();
    const countMatches = (keywords) => {
      let score = 0;
      for (const kw of keywords) {
        if (kw.includes(" ")) {
          if (combinedText.includes(kw)) score += 2;
        } else {
          const regex = new RegExp(`\\b${kw}\\b`, "gi");
          const matches = combinedText.match(regex);
          if (matches) score += matches.length;
        }
      }
      return score;
    };
    const domainScores = [
      { domain: DOMAINS.COMPUTING, score: countMatches(COMPUTING_KEYWORDS) },
      { domain: DOMAINS.MATHEMATICS, score: countMatches(MATHEMATICS_KEYWORDS) },
      { domain: DOMAINS.SCIENCE, score: countMatches(SCIENCE_KEYWORDS) },
      { domain: DOMAINS.HISTORY, score: countMatches(HISTORY_KEYWORDS) },
      { domain: DOMAINS.BUSINESS, score: countMatches(BUSINESS_KEYWORDS) }
    ];
    let bestDomain = DOMAINS.GENERAL;
    let maxScore = 0;
    for (const item of domainScores) {
      if (item.score > maxScore) {
        maxScore = item.score;
        bestDomain = item.domain;
      }
    }
    return bestDomain;
  }
  function extractAcronymExpansion(term, rawDefinition) {
    if (!rawDefinition || typeof rawDefinition !== "string") return null;
    const text = rawDefinition.replace(/^(\([^)]+\)|\[[^\]]+\])\s*/, "").trim();
    const explicitPattern = /\b(?:initialism|acronym|abbreviation)\s+of\s+([^.;\n]+)/i;
    const match1 = text.match(explicitPattern);
    if (match1 && match1[1]) {
      const cleaned = match1[1].replace(/<[^>]+>/g, "").trim();
      if (cleaned.length > 2) {
        return capitalizeWords(cleaned);
      }
    }
    const letters = (term || "").replace(/[^A-Za-z]/g, "");
    if (letters.length >= 2 && letters.length <= 6) {
      const words = text.split(/[ ,;:]+/).filter(Boolean);
      if (words.length >= letters.length) {
        const candidateInitials = words.slice(0, letters.length).map((w) => w[0]?.toUpperCase()).join("");
        if (candidateInitials === letters.toUpperCase()) {
          const expansionCandidate = words.slice(0, letters.length).join(" ").replace(/[.;,]+$/, "");
          return capitalizeWords(expansionCandidate);
        }
      }
      const parenMatches = rawDefinition.matchAll(/\(([^)]+)\)/g);
      for (const pMatch of parenMatches) {
        const insideParen = pMatch[1].trim();
        const parenWords = insideParen.split(/[ ,;:]+/).filter(Boolean);
        if (parenWords.length >= letters.length) {
          const candidateInitials = parenWords.slice(0, letters.length).map((w) => w[0]?.toUpperCase()).join("");
          if (candidateInitials === letters.toUpperCase()) {
            const expansionCandidate = parenWords.slice(0, letters.length).join(" ").replace(/[.;,]+$/, "");
            return capitalizeWords(expansionCandidate);
          }
        }
      }
    }
    return null;
  }
  function capitalizeWords(str) {
    if (!str) return "";
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // src/background/normalizers/wiktionary.js
  function cleanHtml(html) {
    if (!html || typeof html !== "string") return "";
    return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
  }
  function normalizeWiktionaryPayload(data, queriedTerm) {
    if (!data || !data.en || !Array.isArray(data.en)) {
      return null;
    }
    const word = queriedTerm || "unknown";
    const isMultiWord = word.trim().split(/\s+/).length > 1;
    let isAcronym = false;
    let acronymExpansion = null;
    let expressionType = "general";
    let origin = null;
    const domainMeaningsMap = /* @__PURE__ */ new Map();
    const generalMeaningsMap = /* @__PURE__ */ new Map();
    for (const item of data.en) {
      const originalPos = item.partOfSpeech || "general";
      const rawPos = originalPos.toLowerCase();
      const isAbbrevPos = rawPos.includes("abbreviation") || rawPos.includes("initialism") || rawPos.includes("acronym");
      const isProverbPos = rawPos.includes("proverb");
      const isIdiomPos = rawPos.includes("idiom") || rawPos.includes("phrase");
      const isPhrasalVerbPos = isMultiWord && (rawPos.includes("verb") || rawPos.includes("phrasal"));
      if (item.etymology && typeof item.etymology === "string" && !origin) {
        origin = cleanHtml(item.etymology);
      }
      if (Array.isArray(item.definitions)) {
        for (const d of item.definitions) {
          const text = cleanHtml(d.definition);
          if (!text || text.length < 2) continue;
          const contextTags = extractContextTags(text);
          let domain = classifyDomain(text, [rawPos, ...contextTags]);
          let isIdiomatic = false;
          if (isProverbPos || /\b(proverb|saying)\b/i.test(text)) {
            domain = "Proverb";
            expressionType = "proverb";
            isIdiomatic = true;
          } else if (isPhrasalVerbPos) {
            domain = "Phrasal Verb";
            expressionType = "phrasal_verb";
            isIdiomatic = true;
          } else if (isIdiomPos || isMultiWord || /\b(idiomatic|figurative)\b/i.test(text)) {
            domain = "Idiom";
            if (expressionType === "general") {
              expressionType = "idiom";
            }
            isIdiomatic = true;
          }
          const expansion = extractAcronymExpansion(word, text);
          if (expansion && !acronymExpansion) {
            acronymExpansion = expansion;
            isAcronym = true;
          } else if (isAbbrevPos || /\b(initialism|acronym|abbreviation)\b/i.test(text)) {
            isAcronym = true;
          }
          const example = Array.isArray(d.examples) && d.examples.length > 0 ? cleanHtml(d.examples[0]) : null;
          const grammarNotes = {};
          if (/\btransitive\b/i.test(text) || contextTags.includes("transitive")) {
            grammarNotes.transitivity = "transitive";
          } else if (/\bintransitive\b/i.test(text) || contextTags.includes("intransitive")) {
            grammarNotes.transitivity = "intransitive";
          }
          if (/\binseparable\b/i.test(text)) {
            grammarNotes.separability = "inseparable";
          } else if (/\bseparable\b/i.test(text)) {
            grammarNotes.separability = "separable";
          }
          const defObj = {
            definition: text,
            example,
            grammarNotes: Object.keys(grammarNotes).length > 0 ? grammarNotes : void 0,
            synonyms: [],
            antonyms: []
          };
          const targetMap = domain !== DOMAINS.GENERAL || isAbbrevPos || isIdiomatic ? domainMeaningsMap : generalMeaningsMap;
          const key = `${domain}::${rawPos}`;
          if (!targetMap.has(key)) {
            targetMap.set(key, {
              domain,
              partOfSpeech: originalPos,
              definitions: []
            });
          }
          targetMap.get(key).definitions.push(defObj);
        }
      }
    }
    const meanings = Array.from(domainMeaningsMap.values());
    const generalMeanings = Array.from(generalMeaningsMap.values());
    if (meanings.length === 0 && generalMeanings.length === 0) {
      return null;
    }
    const primaryMeanings = meanings.length > 0 ? meanings : generalMeanings;
    const secondaryMeanings = meanings.length > 0 ? generalMeanings : [];
    return {
      word,
      isAcronym,
      acronymExpansion,
      expressionType,
      origin,
      meanings: primaryMeanings,
      generalMeanings: secondaryMeanings,
      phonetic: null,
      audioUrl: null,
      encyclopedicSummary: null,
      referenceUrl: `https://en.wiktionary.org/wiki/${encodeURIComponent(word.replace(/\s+/g, "_"))}`,
      source: "wiktionary"
    };
  }

  // src/background/normalizers/wikipedia.js
  function normalizeWikipediaSummary(data, queriedTerm) {
    if (!data || typeof data !== "object") {
      return null;
    }
    if (data.type === "disambiguation" || !data.extract || data.extract.trim().length < 10) {
      return null;
    }
    const word = data.title || queriedTerm || "unknown";
    const extract = data.extract.trim();
    const description = data.description ? data.description.trim() : "";
    const domain = classifyDomain(extract, [description]);
    let acronymExpansion = null;
    let isAcronym = false;
    if (queriedTerm && queriedTerm === queriedTerm.toUpperCase() && queriedTerm.length >= 2 && queriedTerm.length <= 6) {
      isAcronym = true;
      if (data.title && !data.title.includes("(")) {
        acronymExpansion = data.title;
      }
    }
    if (!acronymExpansion) {
      acronymExpansion = extractAcronymExpansion(queriedTerm, extract);
      if (acronymExpansion) isAcronym = true;
    }
    const referenceUrl = data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page ? data.content_urls.desktop.page : `https://en.wikipedia.org/wiki/${encodeURIComponent(word.replace(/\s+/g, "_"))}`;
    const meanings = [
      {
        domain,
        partOfSpeech: description ? description.toLowerCase() : "concept",
        definitions: [
          {
            definition: extract,
            example: null,
            synonyms: [],
            antonyms: []
          }
        ]
      }
    ];
    return {
      word,
      isAcronym,
      acronymExpansion,
      meanings,
      generalMeanings: [],
      phonetic: null,
      audioUrl: null,
      encyclopedicSummary: extract,
      referenceUrl,
      source: "wikipedia"
    };
  }

  // src/background/phrase-normalizer.js
  var IRREGULAR_VERB_MAP = /* @__PURE__ */ new Map([
    // bite
    ["bit", "bite"],
    ["bitten", "bite"],
    ["biting", "bite"],
    ["bites", "bite"],
    // break
    ["broke", "break"],
    ["broken", "break"],
    ["breaking", "break"],
    ["breaks", "break"],
    // spill
    ["spilled", "spill"],
    ["spilt", "spill"],
    ["spilling", "spill"],
    ["spills", "spill"],
    // kick
    ["kicked", "kick"],
    ["kicking", "kick"],
    ["kicks", "kick"],
    // pull
    ["pulled", "pull"],
    ["pulling", "pull"],
    ["pulls", "pull"],
    // blow
    ["blew", "blow"],
    ["blown", "blow"],
    ["blowing", "blow"],
    ["blows", "blow"],
    // burn
    ["burned", "burn"],
    ["burnt", "burn"],
    ["burning", "burn"],
    ["burns", "burn"],
    // draw
    ["drew", "draw"],
    ["drawn", "draw"],
    ["drawing", "draw"],
    ["draws", "draw"],
    // drive
    ["drove", "drive"],
    ["driven", "drive"],
    ["driving", "drive"],
    ["drives", "drive"],
    // fall
    ["fell", "fall"],
    ["fallen", "fall"],
    ["falling", "fall"],
    ["falls", "fall"],
    // feel
    ["felt", "feel"],
    ["feeling", "feel"],
    ["feels", "feel"],
    // get
    ["got", "get"],
    ["gotten", "get"],
    ["getting", "get"],
    ["gets", "get"],
    // give
    ["gave", "give"],
    ["given", "give"],
    ["giving", "give"],
    ["gives", "give"],
    // go
    ["went", "go"],
    ["gone", "go"],
    ["going", "go"],
    ["goes", "go"],
    // have
    ["had", "have"],
    ["having", "have"],
    ["has", "have"],
    // hold
    ["held", "hold"],
    ["holding", "hold"],
    ["holds", "hold"],
    // keep
    ["kept", "keep"],
    ["keeping", "keep"],
    ["keeps", "keep"],
    // leave
    ["left", "leave"],
    ["leaving", "leave"],
    ["leaves", "leave"],
    // lose
    ["lost", "lose"],
    ["losing", "lose"],
    ["loses", "lose"],
    // make
    ["made", "make"],
    ["making", "make"],
    ["makes", "make"],
    // run
    ["ran", "run"],
    ["running", "run"],
    ["runs", "run"],
    // see
    ["saw", "see"],
    ["seen", "see"],
    ["seeing", "see"],
    ["sees", "see"],
    // shoot
    ["shot", "shoot"],
    ["shooting", "shoot"],
    ["shoots", "shoot"],
    // speak
    ["spoke", "speak"],
    ["spoken", "speak"],
    ["speaking", "speak"],
    ["speaks", "speak"],
    // stand
    ["stood", "stand"],
    ["standing", "stand"],
    ["stands", "stand"],
    // strike
    ["struck", "strike"],
    ["stricken", "strike"],
    ["striking", "strike"],
    ["strikes", "strike"],
    // take
    ["took", "take"],
    ["taken", "take"],
    ["taking", "take"],
    ["takes", "take"],
    // throw
    ["threw", "throw"],
    ["thrown", "throw"],
    ["throwing", "throw"],
    ["throws", "throw"],
    // wear
    ["wore", "wear"],
    ["worn", "wear"],
    ["wearing", "wear"],
    ["wears", "wear"],
    // win
    ["won", "win"],
    ["winning", "win"],
    ["wins", "win"]
  ]);
  var POSSESSIVE_PRONOUNS = /* @__PURE__ */ new Set(["my", "your", "his", "her", "our", "their"]);
  var OBJECT_PRONOUNS = /* @__PURE__ */ new Set(["me", "you", "him", "her", "us", "them"]);
  function lemmatizeVerb(word) {
    if (!word || typeof word !== "string") return [];
    const lower = word.toLowerCase();
    if (IRREGULAR_VERB_MAP.has(lower)) {
      return [IRREGULAR_VERB_MAP.get(lower)];
    }
    const results = /* @__PURE__ */ new Set();
    if (lower.endsWith("ied") && lower.length > 4) {
      results.add(lower.slice(0, -3) + "y");
    } else if (lower.endsWith("ed") && lower.length > 3) {
      if (/(.)\1ed$/.test(lower) && lower.length > 4) {
        results.add(lower.slice(0, -3));
      }
      results.add(lower.slice(0, -2));
      results.add(lower.slice(0, -1));
    }
    if (lower.endsWith("ing") && lower.length > 4) {
      if (/(.)\1ing$/.test(lower) && lower.length > 5) {
        results.add(lower.slice(0, -4));
      }
      results.add(lower.slice(0, -3));
      results.add(lower.slice(0, -3) + "e");
    }
    if (lower.endsWith("es") && lower.length > 3) {
      results.add(lower.slice(0, -2));
      results.add(lower.slice(0, -1));
    } else if (lower.endsWith("s") && !lower.endsWith("ss") && lower.length > 2) {
      results.add(lower.slice(0, -1));
    }
    return Array.from(results);
  }
  function generateCandidatePhrases(phrase) {
    if (!phrase || typeof phrase !== "string") return [];
    const trimmed = phrase.trim();
    if (!trimmed) return [];
    const candidates = /* @__PURE__ */ new Set();
    const lower = trimmed.toLowerCase();
    candidates.add(lower);
    const tokens = lower.split(/\s+/);
    if (tokens.length < 2) {
      return [lower];
    }
    const hasPossessive = tokens.some((t) => POSSESSIVE_PRONOUNS.has(t));
    const hasObject = tokens.some((t) => OBJECT_PRONOUNS.has(t));
    const pronounVariants = [];
    if (hasPossessive) {
      const withSomeones = tokens.map((t) => POSSESSIVE_PRONOUNS.has(t) ? "someone's" : t).join(" ");
      const withOnes = tokens.map((t) => POSSESSIVE_PRONOUNS.has(t) ? "one's" : t).join(" ");
      pronounVariants.push(withSomeones, withOnes);
    }
    if (hasObject) {
      const withSomeone = tokens.map((t) => OBJECT_PRONOUNS.has(t) ? "someone" : t).join(" ");
      pronounVariants.push(withSomeone);
    }
    for (const pv of pronounVariants) {
      candidates.add(pv);
    }
    const verbLemmas = lemmatizeVerb(tokens[0]);
    for (const vLemma of verbLemmas) {
      if (vLemma !== tokens[0]) {
        const lemmatizedTokens = [vLemma, ...tokens.slice(1)];
        const lemmatizedPhrase = lemmatizedTokens.join(" ");
        candidates.add(lemmatizedPhrase);
        if (hasPossessive) {
          const someones = lemmatizedTokens.map((t) => POSSESSIVE_PRONOUNS.has(t) ? "someone's" : t).join(" ");
          const ones = lemmatizedTokens.map((t) => POSSESSIVE_PRONOUNS.has(t) ? "one's" : t).join(" ");
          candidates.add(someones);
          candidates.add(ones);
        }
        if (hasObject) {
          const someone = lemmatizedTokens.map((t) => OBJECT_PRONOUNS.has(t) ? "someone" : t).join(" ");
          candidates.add(someone);
        }
      }
    }
    return Array.from(candidates);
  }

  // src/background/idiom-index.js
  var IDIOM_INDEX = /* @__PURE__ */ new Map([
    ["weather", [
      { phrase: "under the weather", summary: "Feeling slightly unwell, sick, or indisposed", badge: "Idiom" },
      { phrase: "weather the storm", summary: "To successfully endure a very difficult period", badge: "Idiom" },
      { phrase: "fair-weather friend", summary: "A person who is only dependable in good times", badge: "Idiom" }
    ]],
    ["ice", [
      { phrase: "break the ice", summary: "To relieve social tension and get conversation started", badge: "Idiom" },
      { phrase: "skating on thin ice", summary: "Taking huge risks that could easily lead to danger", badge: "Idiom" },
      { phrase: "tip of the iceberg", summary: "Only a small visible fraction of a much larger problem", badge: "Idiom" }
    ]],
    ["bullet", [
      { phrase: "bite the bullet", summary: "To face a difficult or unpleasant situation with courage", badge: "Idiom" },
      { phrase: "dodge a bullet", summary: "To narrowly avoid a disastrous or unwelcome situation", badge: "Idiom" },
      { phrase: "silver bullet", summary: "A simple, seemingly magical solution to a complex problem", badge: "Idiom" }
    ]],
    ["bean", [
      { phrase: "spill the beans", summary: "To divulge a secret prematurely or inadvertently", badge: "Idiom" },
      { phrase: "full of beans", summary: "Lively, energetic, or in high spirits", badge: "Idiom" }
    ]],
    ["beans", [
      { phrase: "spill the beans", summary: "To divulge a secret prematurely or inadvertently", badge: "Idiom" },
      { phrase: "full of beans", summary: "Lively, energetic, or in high spirits", badge: "Idiom" }
    ]],
    ["cake", [
      { phrase: "piece of cake", summary: "Something very easy and straightforward to accomplish", badge: "Idiom" },
      { phrase: "have one's cake and eat it too", summary: "To seek having the advantages of two conflicting things", badge: "Proverb" },
      { phrase: "icing on the cake", summary: "An additional benefit that makes a good situation even better", badge: "Idiom" }
    ]],
    ["leg", [
      { phrase: "pull someone's leg", summary: "To playfully tease or deceive someone in good humor", badge: "Idiom" },
      { phrase: "break a leg", summary: "Good luck (especially in theatrical performance)", badge: "Idiom" },
      { phrase: "cost an arm and a leg", summary: "To be excessively or outrageously expensive", badge: "Idiom" }
    ]],
    ["stone", [
      { phrase: "leave no stone unturned", summary: "To try every possible course of action in order to achieve something", badge: "Idiom" },
      { phrase: "kill two birds with one stone", summary: "To accomplish two different things with a single action", badge: "Idiom" },
      { phrase: "a rolling stone gathers no moss", summary: "People who are always moving avoid attachments or responsibilities", badge: "Proverb" }
    ]],
    ["word", [
      { phrase: "actions speak louder than words", summary: "What you do is more significant than what you say", badge: "Proverb" },
      { phrase: "take someone's word for it", summary: "To believe what someone says without independent proof", badge: "Idiom" }
    ]],
    ["words", [
      { phrase: "actions speak louder than words", summary: "What you do is more significant than what you say", badge: "Proverb" },
      { phrase: "eat your words", summary: "To admit that what you previously said was wrong", badge: "Idiom" }
    ]],
    ["blue", [
      { phrase: "once in a blue moon", summary: "Happening extremely rarely or almost never", badge: "Idiom" },
      { phrase: "out of the blue", summary: "Completely unexpectedly and without warning", badge: "Idiom" }
    ]],
    ["cloud", [
      { phrase: "every cloud has a silver lining", summary: "Every difficult situation has a hopeful aspect", badge: "Proverb" },
      { phrase: "on cloud nine", summary: "Experiencing extreme happiness and euphoria", badge: "Idiom" }
    ]],
    ["water", [
      { phrase: "water under the bridge", summary: "Past events that are no longer considered important", badge: "Idiom" },
      { phrase: "in hot water", summary: "In trouble or in a difficult predicament", badge: "Idiom" },
      { phrase: "test the waters", summary: "To check how people will react before taking action", badge: "Idiom" }
    ]],
    ["give", [
      { phrase: "give up", summary: "To surrender, abandon effort, or cease doing something", badge: "Phrasal Verb" },
      { phrase: "give in", summary: "To succumb or submit to pressure or demands", badge: "Phrasal Verb" },
      { phrase: "give away", summary: "To reveal a secret or give something for free", badge: "Phrasal Verb" }
    ]],
    ["look", [
      { phrase: "look forward to", summary: "To await something with eager anticipation and pleasure", badge: "Phrasal Verb" },
      { phrase: "look into", summary: "To investigate or examine something carefully", badge: "Phrasal Verb" },
      { phrase: "look after", summary: "To take care of or attend to someone or something", badge: "Phrasal Verb" }
    ]],
    ["run", [
      { phrase: "run out of", summary: "To exhaust the available supply of something", badge: "Phrasal Verb" },
      { phrase: "run into", summary: "To encounter someone unexpectedly", badge: "Phrasal Verb" },
      { phrase: "run over", summary: "To collide with or exceed a limit", badge: "Phrasal Verb" }
    ]],
    ["take", [
      { phrase: "take after", summary: "To resemble a parent or ancestor in appearance or character", badge: "Phrasal Verb" },
      { phrase: "take with a grain of salt", summary: "To view something with skepticism or reservation", badge: "Idiom" },
      { phrase: "take off", summary: "To depart rapidly, remove clothing, or become suddenly successful", badge: "Phrasal Verb" }
    ]],
    ["hand", [
      { phrase: "bite the hand that feeds you", summary: "To harm someone who has helped or supported you", badge: "Proverb" },
      { phrase: "get out of hand", summary: "To become impossible to control or manage", badge: "Idiom" }
    ]],
    ["boat", [
      { phrase: "in the same boat", summary: "Sharing the same difficult or unpleasant situation", badge: "Idiom" },
      { phrase: "rock the boat", summary: "To disrupt a calm situation or challenge the status quo", badge: "Idiom" }
    ]],
    ["bark", [
      { phrase: "barking up the wrong tree", summary: "Pursuing a mistaken line of thought or accusing the wrong person", badge: "Idiom" },
      { phrase: "his bark is worse than his bite", summary: "Someone sounds much more fierce or aggressive than they actually are", badge: "Proverb" }
    ]],
    ["needle", [
      { phrase: "a needle in a haystack", summary: "Something that is extraordinarily difficult or impossible to locate", badge: "Idiom" }
    ]],
    ["hat", [
      { phrase: "at the drop of a hat", summary: "Immediately and without hesitation", badge: "Idiom" }
    ]],
    ["light", [
      { phrase: "see the light at the end of the tunnel", summary: "A sign of hope or resolution at the end of a long struggle", badge: "Idiom" }
    ]]
  ]);
  function getRelatedIdioms(word) {
    if (!word || typeof word !== "string") return [];
    const lower = word.toLowerCase().trim();
    const list = IDIOM_INDEX.get(lower);
    return Array.isArray(list) ? list.slice(0, 4) : [];
  }

  // src/background/dictionary-service.js
  var DICTIONARY_API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
  var WIKTIONARY_API_BASE = "https://en.wiktionary.org/api/rest_v1/page/definition";
  var WIKIPEDIA_SUMMARY_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";
  var FETCH_TIMEOUT_MS = 2500;
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
                domain: "General",
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
      isAcronym: false,
      acronymExpansion: null,
      phonetic,
      audioUrl,
      meanings,
      generalMeanings: [],
      encyclopedicSummary: null,
      referenceUrl: null,
      source: "freedictionary"
    };
  }
  async function lookupDomainTerm(request, fetchFn = globalThis.fetch) {
    if (!request || !request.term || typeof request.term !== "string") {
      return {
        status: "error",
        entry: null,
        errorMessage: "Invalid word or term requested."
      };
    }
    const term = request.term.trim();
    const cacheKey = term;
    if (lookupCache.has(cacheKey)) {
      return lookupCache.get(cacheKey);
    }
    const isUppercase = request.isUppercase ?? (term === term.toUpperCase() && /[A-Z]/.test(term));
    const wordCount = request.wordCount ?? term.split(/\s+/).length;
    let result = null;
    if (isUppercase && wordCount === 1) {
      result = await handleAcronymLookup(term, fetchFn);
    } else if (wordCount > 1) {
      result = await handleMultiWordLookup(term, fetchFn);
    } else {
      result = await handleStandardWordLookup(term, fetchFn);
    }
    if (result.status === "success" || result.status === "not_found") {
      cacheResult(cacheKey, result);
    }
    return result;
  }
  async function handleAcronymLookup(term, fetchFn) {
    const [wiktionaryRes, wikiSummaryRes, freeDictRes] = await Promise.allSettled([
      fetchFromWiktionary(term, fetchFn),
      fetchFromWikipediaSummary(term, fetchFn),
      fetchFromFreeDictionary(term.toLowerCase(), fetchFn)
    ]);
    const wiktionary = wiktionaryRes.status === "fulfilled" ? wiktionaryRes.value : null;
    const wikiSummary = wikiSummaryRes.status === "fulfilled" ? wikiSummaryRes.value : null;
    const freeDict = freeDictRes.status === "fulfilled" ? freeDictRes.value : null;
    if (wiktionary && wiktionary.status === "success" && wiktionary.entry) {
      const entry = { ...wiktionary.entry };
      if (freeDict && freeDict.status === "success" && freeDict.entry) {
        if (!entry.audioUrl && freeDict.entry.audioUrl) {
          entry.audioUrl = freeDict.entry.audioUrl;
        }
        if (!entry.phonetic && freeDict.entry.phonetic) {
          entry.phonetic = freeDict.entry.phonetic;
        }
        if ((!entry.generalMeanings || entry.generalMeanings.length === 0) && freeDict.entry.meanings.length > 0) {
          entry.generalMeanings = freeDict.entry.meanings;
        }
      }
      if (wikiSummary && wikiSummary.status === "success" && wikiSummary.entry) {
        if (!entry.acronymExpansion && wikiSummary.entry.acronymExpansion) {
          entry.acronymExpansion = wikiSummary.entry.acronymExpansion;
          entry.isAcronym = true;
        }
        entry.encyclopedicSummary = wikiSummary.entry.encyclopedicSummary;
      }
      return { status: "success", entry, errorMessage: null };
    }
    if (wikiSummary && wikiSummary.status === "success" && wikiSummary.entry) {
      const entry = { ...wikiSummary.entry };
      if (freeDict && freeDict.status === "success" && freeDict.entry) {
        entry.audioUrl = freeDict.entry.audioUrl;
        entry.phonetic = freeDict.entry.phonetic;
        entry.generalMeanings = freeDict.entry.meanings;
      }
      return { status: "success", entry, errorMessage: null };
    }
    if (freeDict && freeDict.status === "success" && freeDict.entry) {
      return freeDict;
    }
    return {
      status: "not_found",
      entry: null,
      errorMessage: `No definitions found for "${term}". Check spelling.`
    };
  }
  async function handleMultiWordLookup(term, fetchFn) {
    const candidates = generateCandidatePhrases(term);
    if (!candidates.includes(term.toLowerCase())) {
      candidates.unshift(term.toLowerCase());
    }
    for (const candidate of candidates) {
      const isTransformed = candidate.toLowerCase() !== term.toLowerCase();
      const [wiktionaryRes, wikiSummaryRes] = await Promise.allSettled([
        fetchFromWiktionary(candidate, fetchFn),
        fetchFromWikipediaSummary(candidate, fetchFn)
      ]);
      const wiktionary = wiktionaryRes.status === "fulfilled" ? wiktionaryRes.value : null;
      const wikiSummary = wikiSummaryRes.status === "fulfilled" ? wikiSummaryRes.value : null;
      if (wiktionary && wiktionary.status === "success" && wiktionary.entry) {
        const entry = { ...wiktionary.entry };
        if (isTransformed) {
          entry.canonicalForm = candidate;
          entry.matchedSurfaceForm = term;
        }
        if (wikiSummary && wikiSummary.status === "success" && wikiSummary.entry) {
          if (!entry.encyclopedicSummary && wikiSummary.entry.encyclopedicSummary) {
            entry.encyclopedicSummary = wikiSummary.entry.encyclopedicSummary;
          }
          if (!entry.origin && wikiSummary.entry.origin) {
            entry.origin = wikiSummary.entry.origin;
          }
        }
        return { status: "success", entry, errorMessage: null };
      }
      if (wikiSummary && wikiSummary.status === "success" && wikiSummary.entry) {
        const entry = { ...wikiSummary.entry };
        if (isTransformed) {
          entry.canonicalForm = candidate;
          entry.matchedSurfaceForm = term;
        }
        return { status: "success", entry, errorMessage: null };
      }
      const freeDictRes = await fetchFromFreeDictionary(candidate, fetchFn);
      if (freeDictRes && freeDictRes.status === "success" && freeDictRes.entry) {
        const entry = { ...freeDictRes.entry };
        entry.expressionType = "phrasal_verb";
        for (const m of entry.meanings) {
          if (!m.domain || m.domain === "General") {
            m.domain = "Phrasal Verb";
          }
        }
        if (isTransformed) {
          entry.canonicalForm = candidate;
          entry.matchedSurfaceForm = term;
        }
        return { status: "success", entry, errorMessage: null };
      }
    }
    return {
      status: "not_found",
      entry: null,
      errorMessage: `No definitions found for "${term}". Check spelling.`
    };
  }
  async function handleStandardWordLookup(term, fetchFn) {
    const cleanWord = term.toLowerCase();
    let result = null;
    const primaryResult = await fetchFromFreeDictionary(cleanWord, fetchFn);
    if (primaryResult.status === "success" && primaryResult.entry) {
      result = primaryResult;
    } else {
      const wiktionaryResult = await fetchFromWiktionary(term, fetchFn);
      if (wiktionaryResult.status === "success" && wiktionaryResult.entry) {
        result = wiktionaryResult;
      } else {
        const wikiResult = await fetchFromWikipediaSummary(term, fetchFn);
        if (wikiResult.status === "success" && wikiResult.entry) {
          result = wikiResult;
        }
      }
    }
    if (result && result.entry) {
      const related = getRelatedIdioms(cleanWord);
      if (related && related.length > 0) {
        result.entry.relatedIdioms = related;
      }
      return result;
    }
    return {
      status: "not_found",
      entry: null,
      errorMessage: `No definitions found for "${term}". Check spelling.`
    };
  }
  function cacheResult(key, result) {
    if (lookupCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = lookupCache.keys().next().value;
      lookupCache.delete(oldestKey);
    }
    lookupCache.set(key, result);
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
        return { status: "not_found", entry: null, errorMessage: "Word not found" };
      }
      return { status: "error", entry: null, errorMessage: "Service error" };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      return { status: "network_error", entry: null, errorMessage: "Network error" };
    }
  }
  async function fetchFromWiktionary(term, fetchFn) {
    const normalizedTerm = term.trim().replace(/\s+/g, "_");
    const url = `${WIKTIONARY_API_BASE}/${encodeURIComponent(normalizedTerm)}`;
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
        const entry = normalizeWiktionaryPayload(data, term);
        if (entry && (entry.meanings.length > 0 || entry.generalMeanings.length > 0)) {
          return { status: "success", entry, errorMessage: null };
        }
      }
      return { status: "not_found", entry: null, errorMessage: "Term not found in Wiktionary" };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      return { status: "network_error", entry: null, errorMessage: "Network error" };
    }
  }
  async function fetchFromWikipediaSummary(title, fetchFn) {
    const url = `${WIKIPEDIA_SUMMARY_BASE}/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
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
        const entry = normalizeWikipediaSummary(data, title);
        if (entry && entry.meanings.length > 0) {
          return { status: "success", entry, errorMessage: null };
        }
      }
      return { status: "not_found", entry: null, errorMessage: "Topic not found in Wikipedia" };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      return { status: "network_error", entry: null, errorMessage: "Network error" };
    }
  }

  // src/options/options.js
  var popupView = new PopupView();
  popupView.setStyles(POPUP_STYLES);
  var floatingIcon = new FloatingIcon();
  floatingIcon.setStyles(POPUP_STYLES);
  var saveTimeout = null;
  var hintTimeout = null;
  var activeConfig = {
    modifierKey: "none",
    enabled: true,
    theme: "auto",
    multiWordEnabled: true,
    domainBadgesEnabled: true
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
        console.warn("[Simple English Dictionary] browser.runtime.sendMessage error:", err);
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
        console.warn("[Simple English Dictionary] chrome.runtime.sendMessage error:", err);
      }
    }
    if (payload.action === "LOOKUP_DOMAIN_TERM" && payload.payload) {
      return lookupDomainTerm(payload.payload);
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
        const msg = response?.errorMessage || `No definitions found for "${word}".`;
        popupView.showError(msg, word, coords, activeConfig.theme);
        return;
      }
      const entry = response.entry || response.data;
      popupView.showResult(entry, coords, activeConfig.theme, activeConfig);
    } catch (err) {
      popupView.showError("Unable to connect to dictionary service. Please check your internet connection.", word, coords, activeConfig.theme);
    }
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
    const sanitized = sanitizeDomainTerm(text);
    if (!sanitized.isValid || !sanitized.cleanTerm) {
      return;
    }
    if (!anchorRect || anchorRect.width === 0 && anchorRect.height === 0) {
      if (event.target && typeof event.target.getBoundingClientRect === "function") {
        anchorRect = event.target.getBoundingClientRect();
      } else {
        return;
      }
    }
    floatingIcon.dismiss();
    await performLookup(sanitized, anchorRect);
  }
  function handleMouseUp(event) {
    if (!activeConfig.enabled || !activeConfig.multiWordEnabled) {
      return;
    }
    const sandbox = document.querySelector(".test-sandbox");
    if (!sandbox || !sandbox.contains(event.target) && !event.target.closest(".test-area")) {
      return;
    }
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        floatingIcon.dismiss();
        return;
      }
      const text = selection.toString();
      const sanitized = sanitizeDomainTerm(text);
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
      if (top < 10) top = anchorRect.bottom + 6;
      let left = Math.min(anchorRect.right + 4, window.innerWidth - 36);
      top = Math.max(8, Math.min(top, window.innerHeight - 36));
      left = Math.max(8, Math.min(left, window.innerWidth - 36));
      floatingIcon.show({ top, left }, () => {
        performLookup(sanitized, anchorRect);
      });
    }, 10);
  }
  async function initializeOptions() {
    const toggleEnabled = document.getElementById("toggleEnabled");
    const toggleMultiWord = document.getElementById("toggleMultiWord");
    const toggleDomainBadges = document.getElementById("toggleDomainBadges");
    const themeSelect = document.getElementById("themeSelect");
    const modifierRadios = document.querySelectorAll('input[name="modifierKey"]');
    try {
      activeConfig = await getSettings();
    } catch (err) {
      console.warn("[Simple English Dictionary] Failed to load settings:", err);
    }
    const footerEl = document.getElementById("footerExtensionInfo");
    if (footerEl) {
      try {
        const manifest = typeof chrome !== "undefined" && chrome.runtime?.getManifest ? chrome.runtime.getManifest() : typeof browser !== "undefined" && browser.runtime?.getManifest ? browser.runtime.getManifest() : null;
        if (manifest?.version) {
          footerEl.textContent = `Simple English Dictionary Extension v${manifest.version}`;
        }
      } catch {
      }
    }
    if (toggleEnabled) {
      toggleEnabled.checked = activeConfig.enabled;
    }
    if (toggleMultiWord) {
      toggleMultiWord.checked = activeConfig.multiWordEnabled;
    }
    if (toggleDomainBadges) {
      toggleDomainBadges.checked = activeConfig.domainBadgesEnabled;
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
    if (toggleMultiWord) {
      toggleMultiWord.addEventListener("change", async () => {
        activeConfig.multiWordEnabled = toggleMultiWord.checked;
        await saveSettings({ multiWordEnabled: toggleMultiWord.checked });
        flashSavedBadge();
      });
    }
    if (toggleDomainBadges) {
      toggleDomainBadges.addEventListener("change", async () => {
        activeConfig.domainBadgesEnabled = toggleDomainBadges.checked;
        await saveSettings({ domainBadgesEnabled: toggleDomainBadges.checked });
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
    await updateFileAccessStatus();
    document.addEventListener("dblclick", handleDoubleClick);
    document.addEventListener("mouseup", handleMouseUp);
  }
  async function checkFileSchemeAccess() {
    const extensionApi = typeof browser !== "undefined" ? browser.extension : typeof chrome !== "undefined" ? chrome.extension : null;
    if (!extensionApi || !extensionApi.isAllowedFileSchemeAccess) {
      return false;
    }
    return new Promise((resolve) => {
      try {
        extensionApi.isAllowedFileSchemeAccess((isAllowed) => {
          resolve(Boolean(isAllowed));
        });
      } catch {
        resolve(false);
      }
    });
  }
  async function updateFileAccessStatus() {
    const badgeEl = document.getElementById("fileAccessBadge");
    const detailsEl = document.getElementById("fileAccessDetails");
    if (!badgeEl) return;
    const isAllowed = await checkFileSchemeAccess();
    if (isAllowed) {
      badgeEl.className = "status-pill status-enabled";
      badgeEl.textContent = "Enabled";
      if (detailsEl) {
        detailsEl.textContent = "Local file access is active. Double-click and context menu dictionary lookups work on local PDFs opened from your computer.";
      }
    } else {
      badgeEl.className = "status-pill status-disabled";
      badgeEl.textContent = "Disabled";
      if (detailsEl) {
        detailsEl.textContent = "Local file access is not enabled. Follow the steps below in your browser extension manager to enable lookups on local PDF files.";
      }
    }
  }
  document.addEventListener("DOMContentLoaded", initializeOptions);
})();
