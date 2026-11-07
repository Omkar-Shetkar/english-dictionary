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

  // src/options/lookup.js
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
  var activeAudio = null;
  var searchDebounceTimeout = null;
  var currentConfig = {
    theme: "auto",
    domainBadgesEnabled: true
  };
  function applyTheme(theme) {
    document.body.classList.remove("theme-light", "theme-dark");
    if (theme === "light") {
      document.body.classList.add("theme-light");
    } else if (theme === "dark") {
      document.body.classList.add("theme-dark");
    }
  }
  async function sendBackgroundMessage(payload) {
    if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
      try {
        const res = await browser.runtime.sendMessage(payload);
        if (res !== void 0) return res;
      } catch (err) {
      }
    }
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(payload, (res) => {
          if (chrome.runtime?.lastError) {
            resolve({ status: "error", errorMessage: chrome.runtime.lastError.message });
          } else {
            resolve(res || { status: "error", errorMessage: "Empty response" });
          }
        });
      });
    }
    return { status: "error", errorMessage: "No extension runtime" };
  }
  function stopAudio(buttonEl) {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (buttonEl) {
      buttonEl.classList.remove("playing");
    }
  }
  function playPronunciation(word, audioUrl, buttonEl) {
    stopAudio(buttonEl);
    if (buttonEl) {
      buttonEl.classList.add("playing");
    }
    const onComplete = () => {
      if (buttonEl) buttonEl.classList.remove("playing");
    };
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        activeAudio = audio;
        audio.onended = onComplete;
        audio.onerror = () => {
          fallbackSpeech(word, onComplete);
        };
        const playPromise = audio.play();
        if (playPromise !== void 0) {
          playPromise.catch(() => fallbackSpeech(word, onComplete));
        }
        return;
      } catch (err) {
      }
    }
    fallbackSpeech(word, onComplete);
  }
  function fallbackSpeech(word, callback) {
    if (typeof window !== "undefined" && "speechSynthesis" in window && word) {
      try {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = "en-US";
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = callback;
        utterance.onerror = callback;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        if (callback) callback();
      }
    } else if (callback) {
      callback();
    }
  }
  function renderLoading(term) {
    const container = document.getElementById("lookupContent");
    if (!container) return;
    container.textContent = "";
    const view = document.createElement("div");
    view.className = "state-view loading-view";
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    view.appendChild(spinner);
    const text = document.createElement("span");
    text.className = "state-text";
    text.textContent = `Looking up "${term}"...`;
    view.appendChild(text);
    container.appendChild(view);
  }
  function renderEmptyState(prompt = "Type any English word above to look up definitions.") {
    const container = document.getElementById("lookupContent");
    if (!container) return;
    container.textContent = "";
    const view = document.createElement("div");
    view.className = "state-view";
    const text = document.createElement("span");
    text.className = "state-text";
    text.textContent = prompt;
    view.appendChild(text);
    container.appendChild(view);
  }
  function renderError(term, message = "We could not find definitions for this term.") {
    const container = document.getElementById("lookupContent");
    if (!container) return;
    container.textContent = "";
    const view = document.createElement("div");
    view.className = "state-view";
    const title = document.createElement("div");
    title.className = "error-title";
    title.textContent = "No Definition Found";
    view.appendChild(title);
    const desc = document.createElement("p");
    desc.className = "error-desc";
    desc.textContent = `${message} (Word: "${term}")`;
    view.appendChild(desc);
    container.appendChild(view);
  }
  function renderResult(entry) {
    const container = document.getElementById("lookupContent");
    if (!container) return;
    container.textContent = "";
    const header = document.createElement("div");
    header.className = "dict-header";
    const titleGroup = document.createElement("div");
    titleGroup.className = "dict-title-group";
    const titleRow = document.createElement("div");
    titleRow.className = "dict-title-row";
    const wordEl = document.createElement("span");
    wordEl.className = "dict-word";
    wordEl.textContent = entry.word || "";
    titleRow.appendChild(wordEl);
    if (entry.phonetic) {
      const phoneticEl = document.createElement("span");
      phoneticEl.className = "dict-phonetic";
      phoneticEl.textContent = entry.phonetic;
      titleRow.appendChild(phoneticEl);
    }
    if (entry.isAcronym) {
      const badge = document.createElement("span");
      badge.className = "dict-acronym-badge";
      badge.textContent = "Acronym";
      titleRow.appendChild(badge);
    } else if (entry.expressionType && entry.expressionType !== "general") {
      const exprBadge = document.createElement("span");
      const exprType = entry.expressionType;
      const label = exprType === "phrasal_verb" ? "Phrasal Verb" : exprType === "proverb" ? "Proverb" : "Idiom";
      exprBadge.className = `dict-domain-badge dict-domain-${exprType.replace(/[^a-z0-9]/g, "")}`;
      exprBadge.textContent = label;
      titleRow.appendChild(exprBadge);
    }
    titleGroup.appendChild(titleRow);
    if (entry.isAcronym && entry.acronymExpansion) {
      const expansionEl = document.createElement("div");
      expansionEl.className = "dict-acronym-expansion";
      expansionEl.textContent = entry.acronymExpansion;
      titleGroup.appendChild(expansionEl);
    }
    if (entry.matchedSurfaceForm && entry.canonicalForm && entry.matchedSurfaceForm.toLowerCase() !== entry.canonicalForm.toLowerCase()) {
      const sub = document.createElement("div");
      sub.className = "dict-matched-subtitle";
      sub.style.fontSize = "11px";
      sub.style.color = "var(--text-muted, #64748b)";
      sub.style.fontStyle = "italic";
      sub.style.marginTop = "2px";
      sub.textContent = `Matched from: "${entry.matchedSurfaceForm}"`;
      titleGroup.appendChild(sub);
    }
    header.appendChild(titleGroup);
    const audioBtn = document.createElement("button");
    audioBtn.className = "dict-audio-btn";
    audioBtn.title = "Listen to pronunciation";
    audioBtn.setAttribute("aria-label", "Listen to pronunciation");
    audioBtn.appendChild(createSpeakerSvg());
    audioBtn.addEventListener("click", () => {
      playPronunciation(entry.word, entry.audioUrl, audioBtn);
    });
    header.appendChild(audioBtn);
    container.appendChild(header);
    if (entry.origin) {
      const originBlock = document.createElement("div");
      originBlock.className = "dict-origin-block";
      originBlock.style.margin = "10px 0";
      originBlock.style.padding = "8px 12px";
      originBlock.style.background = "var(--bg-surface, #f8fafc)";
      originBlock.style.borderRadius = "8px";
      originBlock.style.borderLeft = "3px solid #9333ea";
      const originTitle = document.createElement("div");
      originTitle.style.fontSize = "10.5px";
      originTitle.style.fontWeight = "700";
      originTitle.style.textTransform = "uppercase";
      originTitle.style.color = "#9333ea";
      originTitle.style.marginBottom = "4px";
      originTitle.textContent = "Origin & Background";
      originBlock.appendChild(originTitle);
      const originText = document.createElement("p");
      originText.style.fontSize = "12.5px";
      originText.style.margin = "0";
      originText.style.lineHeight = "1.4";
      originText.textContent = entry.origin;
      originBlock.appendChild(originText);
      container.appendChild(originBlock);
    }
    if (entry.encyclopedicSummary) {
      const block = document.createElement("div");
      block.className = "dict-encyclopedic-block";
      const text = document.createElement("p");
      text.className = "dict-encyclopedic-text";
      text.textContent = entry.encyclopedicSummary;
      block.appendChild(text);
      if (entry.referenceUrl) {
        const link = document.createElement("a");
        link.className = "dict-reference-link";
        link.href = entry.referenceUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Learn more on Wikipedia \u2192";
        block.appendChild(link);
      }
      container.appendChild(block);
    }
    const renderGroup = (group) => {
      const groupEl = document.createElement("div");
      groupEl.className = "dict-meaning-group";
      const badgesRow = document.createElement("div");
      badgesRow.className = "dict-badges-row";
      if (group.partOfSpeech) {
        const posBadge = document.createElement("span");
        posBadge.className = "dict-pos-badge";
        posBadge.textContent = group.partOfSpeech;
        badgesRow.appendChild(posBadge);
      }
      if (currentConfig.domainBadgesEnabled !== false && group.domain && group.domain !== "General") {
        const domainBadge = document.createElement("span");
        domainBadge.className = "dict-domain-badge";
        domainBadge.textContent = group.domain;
        badgesRow.appendChild(domainBadge);
      }
      if (badgesRow.childNodes.length > 0) {
        groupEl.appendChild(badgesRow);
      }
      const list = document.createElement("ol");
      list.className = "dict-definitions-list";
      const defs = (group.definitions || []).slice(0, 4);
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
        if (Array.isArray(d.synonyms) && d.synonyms.length > 0) {
          const syn = document.createElement("div");
          syn.className = "dict-synonyms";
          syn.textContent = "Synonyms: ";
          const span = document.createElement("span");
          span.textContent = d.synonyms.join(", ");
          syn.appendChild(span);
          item.appendChild(syn);
        }
        list.appendChild(item);
      }
      groupEl.appendChild(list);
      return groupEl;
    };
    if (Array.isArray(entry.meanings) && entry.meanings.length > 0) {
      for (const group of entry.meanings) {
        container.appendChild(renderGroup(group));
      }
    }
    if (Array.isArray(entry.generalMeanings) && entry.generalMeanings.length > 0) {
      for (const group of entry.generalMeanings) {
        container.appendChild(renderGroup(group));
      }
    }
    if (entry.relatedIdioms && Array.isArray(entry.relatedIdioms) && entry.relatedIdioms.length > 0) {
      const relatedSection = document.createElement("div");
      relatedSection.className = "dict-related-section";
      relatedSection.style.marginTop = "14px";
      relatedSection.style.paddingTop = "10px";
      relatedSection.style.borderTop = "1px dashed var(--border-color, #e2e8f0)";
      const relatedHeader = document.createElement("div");
      relatedHeader.style.fontSize = "11px";
      relatedHeader.style.fontWeight = "700";
      relatedHeader.style.textTransform = "uppercase";
      relatedHeader.style.color = "var(--text-muted, #64748b)";
      relatedHeader.style.marginBottom = "8px";
      relatedHeader.textContent = "Related Idioms & Phrases";
      relatedSection.appendChild(relatedHeader);
      const chipsContainer = document.createElement("div");
      chipsContainer.style.display = "flex";
      chipsContainer.style.flexWrap = "wrap";
      chipsContainer.style.gap = "6px";
      for (const item of entry.relatedIdioms) {
        const chip = document.createElement("button");
        chip.className = "dict-related-chip";
        chip.type = "button";
        chip.title = item.summary || item.phrase;
        chip.style.display = "inline-flex";
        chip.style.alignItems = "center";
        chip.style.gap = "4px";
        chip.style.padding = "3px 8px";
        chip.style.borderRadius = "12px";
        chip.style.border = "1px solid var(--border-color, #cbd5e1)";
        chip.style.background = "var(--bg-surface, #f8fafc)";
        chip.style.fontSize = "12px";
        chip.style.cursor = "pointer";
        chip.textContent = item.phrase;
        chip.addEventListener("click", () => {
          const input = document.getElementById("lookupInput");
          if (input) input.value = item.phrase;
          executeLookup(item.phrase);
        });
        chipsContainer.appendChild(chip);
      }
      relatedSection.appendChild(chipsContainer);
      container.appendChild(relatedSection);
    }
  }
  async function executeLookup(rawQuery) {
    const sanitized = sanitizeDomainTerm(rawQuery);
    if (!sanitized.isValid || !sanitized.cleanTerm) {
      renderEmptyState("Please enter a valid English word or term.");
      return;
    }
    const term = sanitized.cleanTerm;
    renderLoading(term);
    const bgRes = await sendBackgroundMessage({
      action: "LOOKUP_DOMAIN_TERM",
      payload: {
        term: sanitized.cleanTerm,
        rawText: sanitized.raw,
        wordCount: sanitized.wordCount,
        isUppercase: sanitized.isUppercase
      }
    });
    if (bgRes && bgRes.status === "success" && (bgRes.entry || bgRes.data)) {
      renderResult(bgRes.entry || bgRes.data);
      return;
    }
    try {
      const directRes = await lookupDomainTerm({
        term: sanitized.cleanTerm,
        rawText: sanitized.raw,
        wordCount: sanitized.wordCount,
        isUppercase: sanitized.isUppercase
      });
      if (directRes && directRes.status === "success" && (directRes.entry || directRes.data)) {
        renderResult(directRes.entry || directRes.data);
        return;
      }
    } catch (err) {
      console.warn("[Simple English Dictionary] Direct lookup error:", err);
    }
    renderError(term, bgRes?.errorMessage || "No definitions found for this term.");
  }
  async function init() {
    try {
      currentConfig = await getSettings();
      applyTheme(currentConfig.theme);
    } catch (e) {
    }
    const storageApi = typeof browser !== "undefined" ? browser.storage : typeof chrome !== "undefined" ? chrome.storage : null;
    if (storageApi && storageApi.onChanged) {
      storageApi.onChanged.addListener((changes) => {
        if (changes.settings?.newValue) {
          currentConfig = changes.settings.newValue;
          applyTheme(currentConfig.theme);
        }
      });
    }
    const inputEl = document.getElementById("lookupInput");
    const clearBtn = document.getElementById("clearSearchBtn");
    const closeBtn = document.getElementById("closeWindowBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        window.close();
      });
    }
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        window.close();
      }
    });
    if (clearBtn && inputEl) {
      clearBtn.addEventListener("click", () => {
        inputEl.value = "";
        clearBtn.style.display = "none";
        inputEl.focus();
        renderEmptyState();
      });
    }
    if (inputEl) {
      inputEl.addEventListener("input", () => {
        const val = inputEl.value.trim();
        if (clearBtn) {
          clearBtn.style.display = val ? "flex" : "none";
        }
        if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
        if (!val) {
          renderEmptyState();
          return;
        }
        searchDebounceTimeout = setTimeout(() => {
          executeLookup(val);
        }, 450);
      });
      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
          const val = inputEl.value.trim();
          if (val) {
            executeLookup(val);
          }
        }
      });
    }
    const params = new URLSearchParams(window.location.search);
    const initialTerm = (params.get("term") || "").trim();
    if (initialTerm && inputEl) {
      inputEl.value = initialTerm;
      if (clearBtn) clearBtn.style.display = "flex";
      executeLookup(initialTerm);
    } else {
      renderEmptyState();
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
