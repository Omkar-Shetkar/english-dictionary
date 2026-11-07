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
  var activeLookupWindowId = null;
  var CONTEXT_MENU_ID = "simple-dict-lookup";
  function isPrivilegedOrPdfUrl(url) {
    if (!url || typeof url !== "string") return false;
    const lower = url.toLowerCase();
    return lower.endsWith(".pdf") || lower.includes(".pdf?") || lower.includes(".pdf#") || lower.startsWith("resource://") || lower.startsWith("about:") || lower.startsWith("chrome:") || lower.startsWith("view-source:");
  }
  async function openLookupTab(url) {
    const tabsApi = typeof browser !== "undefined" && browser.tabs ? browser.tabs : typeof chrome !== "undefined" && chrome.tabs ? chrome.tabs : null;
    if (tabsApi && typeof tabsApi.create === "function") {
      return new Promise((resolve) => {
        const res = tabsApi.create({ url, active: true }, resolve);
        if (res instanceof Promise) res.then(resolve);
      });
    }
  }
  async function openLookupWindow(term) {
    const cleanTerm = (term || "").trim();
    const path = `options/lookup.html?term=${encodeURIComponent(cleanTerm)}`;
    const url = typeof browser !== "undefined" && browser.runtime?.getURL ? browser.runtime.getURL(path) : typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : path;
    const windowsApi2 = typeof browser !== "undefined" && browser.windows ? browser.windows : typeof chrome !== "undefined" && chrome.windows ? chrome.windows : null;
    if (windowsApi2 && typeof windowsApi2.create === "function") {
      if (activeLookupWindowId !== null) {
        try {
          await new Promise((resolve, reject) => {
            const res = windowsApi2.update(activeLookupWindowId, { focused: true }, (win) => {
              if (chrome?.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve(win);
            });
            if (res instanceof Promise) res.then(resolve).catch(reject);
          });
          const tabsApi = typeof browser !== "undefined" && browser.tabs ? browser.tabs : typeof chrome !== "undefined" && chrome.tabs ? chrome.tabs : null;
          if (tabsApi && typeof tabsApi.query === "function") {
            const tabs = await new Promise((resolve) => {
              const res = tabsApi.query({ windowId: activeLookupWindowId }, resolve);
              if (res instanceof Promise) res.then(resolve);
            });
            if (Array.isArray(tabs) && tabs[0]?.id) {
              await new Promise((resolve) => {
                const res = tabsApi.update(tabs[0].id, { url }, resolve);
                if (res instanceof Promise) res.then(resolve);
              });
              return;
            }
          }
        } catch (e) {
          activeLookupWindowId = null;
        }
      }
      try {
        const win = await new Promise((resolve, reject) => {
          const createData = {
            url,
            type: "popup",
            width: 390,
            height: 520,
            focused: true
          };
          const res = windowsApi2.create(createData, (created) => {
            if (chrome?.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(created);
          });
          if (res instanceof Promise) res.then(resolve).catch(reject);
        });
        if (win?.id) {
          activeLookupWindowId = win.id;
        }
        return win;
      } catch (err) {
        return openLookupTab(url);
      }
    }
    return openLookupTab(url);
  }
  function setupContextMenu() {
    const menusApi2 = typeof browser !== "undefined" && browser.contextMenus ? browser.contextMenus : typeof chrome !== "undefined" && chrome.contextMenus ? chrome.contextMenus : null;
    if (!menusApi2) return;
    const createItem = () => {
      try {
        menusApi2.create({
          id: CONTEXT_MENU_ID,
          title: 'Look up "%s" in Simple English Dictionary',
          contexts: ["selection"]
        }, () => {
          const lastErr = typeof chrome !== "undefined" && chrome.runtime?.lastError;
          if (lastErr && !lastErr.message?.includes("duplicate")) {
          }
        });
      } catch (e) {
      }
    };
    if (typeof menusApi2.removeAll === "function") {
      menusApi2.removeAll(() => {
        createItem();
      });
    } else {
      createItem();
    }
  }
  async function handleContextMenuClick(info, tab) {
    if (!info || info.menuItemId !== CONTEXT_MENU_ID || !info.selectionText || !tab?.id) {
      return;
    }
    const selectionText = info.selectionText.trim();
    if (!selectionText) return;
    if (isPrivilegedOrPdfUrl(tab.url)) {
      return await openLookupWindow(selectionText);
    }
    const payload = {
      action: "TRIGGER_SELECTION_LOOKUP",
      payload: {
        term: selectionText
      }
    };
    const tabsApi = typeof browser !== "undefined" && browser.tabs ? browser.tabs : typeof chrome !== "undefined" ? chrome.tabs : null;
    if (!tabsApi) {
      return await openLookupWindow(selectionText);
    }
    if (typeof browser !== "undefined" && browser.tabs?.sendMessage) {
      try {
        await browser.tabs.sendMessage(tab.id, payload);
      } catch (err) {
        return await openLookupWindow(selectionText);
      }
    } else if (typeof chrome !== "undefined" && chrome.tabs?.sendMessage) {
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, payload, (response) => {
          if (chrome.runtime?.lastError) {
            openLookupWindow(selectionText).then(resolve);
          } else {
            resolve(response);
          }
        });
      });
    }
  }
  var menusApi = typeof browser !== "undefined" && browser.contextMenus ? browser.contextMenus : typeof chrome !== "undefined" && chrome.contextMenus ? chrome.contextMenus : null;
  if (menusApi && menusApi.onClicked) {
    menusApi.onClicked.addListener((info, tab) => {
      handleContextMenuClick(info, tab);
    });
  }
  var windowsApi = typeof browser !== "undefined" && browser.windows ? browser.windows : typeof chrome !== "undefined" && chrome.windows ? chrome.windows : null;
  if (windowsApi && windowsApi.onRemoved) {
    try {
      windowsApi.onRemoved.addListener((windowId) => {
        if (windowId === activeLookupWindowId) {
          activeLookupWindowId = null;
        }
      });
    } catch (e) {
    }
  }
  setupContextMenu();
  var runtimeApi = typeof browser !== "undefined" ? browser.runtime : typeof chrome !== "undefined" ? chrome.runtime : null;
  if (runtimeApi && runtimeApi.onInstalled) {
    runtimeApi.onInstalled.addListener(() => {
      setupContextMenu();
    });
  }
  console.log("[Simple English Dictionary] Background service initialized.");
})();
