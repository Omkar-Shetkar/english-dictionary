(() => {
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
        const audioItem = entry.phonetics.find((p) => {
          if (!p || typeof p.audio !== "string") return false;
          const cleaned = p.audio.trim();
          return cleaned.length > 0 && (cleaned.startsWith("http://") || cleaned.startsWith("https://"));
        });
        if (audioItem) {
          audioUrl = audioItem.audio.trim();
          break;
        }
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

  // src/background/background.js
  async function handleMessage(message, sender) {
    if (!message || typeof message !== "object") {
      return { status: "error", errorMessage: "Invalid message payload" };
    }
    switch (message.action) {
      case "LOOKUP_WORD": {
        const { word } = message;
        return await lookupWord(word);
      }
      case "GET_CONFIG": {
        return await getSettings();
      }
      default:
        return { status: "error", errorMessage: `Unknown action: ${message.action}` };
    }
  }
  var isFirefox = typeof browser !== "undefined" && Boolean(browser.runtime?.id);
  if (isFirefox) {
    browser.runtime.onMessage.addListener((message, sender) => {
      return handleMessage(message, sender);
    });
  } else if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleMessage(message, sender).then((res) => sendResponse(res)).catch((err) => sendResponse({ status: "error", errorMessage: err.message || "Internal background error" }));
      return true;
    });
  }
  console.log("[English Dictionary] Background service initialized.");
})();
