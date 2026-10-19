(() => {
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
    let isAcronym = false;
    let acronymExpansion = null;
    const domainMeaningsMap = /* @__PURE__ */ new Map();
    const generalMeaningsMap = /* @__PURE__ */ new Map();
    for (const item of data.en) {
      const originalPos = item.partOfSpeech || "general";
      const rawPos = originalPos.toLowerCase();
      const isAbbrevPos = rawPos.includes("abbreviation") || rawPos.includes("initialism") || rawPos.includes("acronym");
      if (Array.isArray(item.definitions)) {
        for (const d of item.definitions) {
          const text = cleanHtml(d.definition);
          if (!text || text.length < 2) continue;
          const contextTags = extractContextTags(text);
          const domain = classifyDomain(text, [rawPos, ...contextTags]);
          const expansion = extractAcronymExpansion(word, text);
          if (expansion && !acronymExpansion) {
            acronymExpansion = expansion;
            isAcronym = true;
          } else if (isAbbrevPos || /\b(initialism|acronym|abbreviation)\b/i.test(text)) {
            isAcronym = true;
          }
          const example = Array.isArray(d.examples) && d.examples.length > 0 ? cleanHtml(d.examples[0]) : null;
          const defObj = {
            definition: text,
            example,
            synonyms: [],
            antonyms: []
          };
          const targetMap = domain !== DOMAINS.GENERAL || isAbbrevPos ? domainMeaningsMap : generalMeaningsMap;
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
      meanings: primaryMeanings,
      generalMeanings: secondaryMeanings,
      phonetic: null,
      audioUrl: null,
      encyclopedicSummary: null,
      referenceUrl: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
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
  async function lookupWord(word, fetchFn = globalThis.fetch) {
    if (!word || typeof word !== "string") {
      return {
        status: "error",
        entry: null,
        errorMessage: "Invalid word requested."
      };
    }
    const trimmed = word.trim();
    const isUpper = trimmed.length <= 6 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
    return lookupDomainTerm(
      {
        term: trimmed,
        rawText: word,
        isUppercase: isUpper,
        wordCount: trimmed.split(/\s+/).length
      },
      fetchFn
    );
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
    const [wikiSummaryRes, wiktionaryRes] = await Promise.allSettled([
      fetchFromWikipediaSummary(term, fetchFn),
      fetchFromWiktionary(term, fetchFn)
    ]);
    const wikiSummary = wikiSummaryRes.status === "fulfilled" ? wikiSummaryRes.value : null;
    const wiktionary = wiktionaryRes.status === "fulfilled" ? wiktionaryRes.value : null;
    if (wikiSummary && wikiSummary.status === "success" && wikiSummary.entry) {
      const entry = { ...wikiSummary.entry };
      if (wiktionary && wiktionary.status === "success" && wiktionary.entry) {
        entry.meanings.push(...wiktionary.entry.meanings);
      }
      return { status: "success", entry, errorMessage: null };
    }
    if (wiktionary && wiktionary.status === "success" && wiktionary.entry) {
      return wiktionary;
    }
    return {
      status: "not_found",
      entry: null,
      errorMessage: `No definitions found for "${term}". Check spelling.`
    };
  }
  async function handleStandardWordLookup(term, fetchFn) {
    const cleanWord = term.toLowerCase();
    const primaryResult = await fetchFromFreeDictionary(cleanWord, fetchFn);
    if (primaryResult.status === "success" && primaryResult.entry) {
      return primaryResult;
    }
    const wiktionaryResult = await fetchFromWiktionary(term, fetchFn);
    if (wiktionaryResult.status === "success" && wiktionaryResult.entry) {
      return wiktionaryResult;
    }
    const wikiResult = await fetchFromWikipediaSummary(term, fetchFn);
    if (wikiResult.status === "success" && wikiResult.entry) {
      return wikiResult;
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
    const url = `${WIKTIONARY_API_BASE}/${encodeURIComponent(term)}`;
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

  // src/background/background.js
  async function handleMessage(message, sender) {
    if (!message || typeof message !== "object") {
      return { status: "error", errorMessage: "Invalid message payload" };
    }
    switch (message.action) {
      case "LOOKUP_DOMAIN_TERM": {
        const payload = message.payload || message;
        const res = await lookupDomainTerm(payload);
        if (res && res.entry && !res.data) {
          res.data = res.entry;
        }
        return res;
      }
      case "LOOKUP_WORD": {
        const { word } = message;
        return await lookupWord(word);
      }
      case "GET_SETTINGS":
      case "GET_CONFIG": {
        const data = await getSettings();
        return { status: "success", data };
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
  console.log("[Simple English Dictionary] Background service initialized.");
})();
