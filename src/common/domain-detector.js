/**
 * Domain Classifier & Context Tag Extractor.
 * Classifies terms and definitions into academic/industry categories:
 * - Computing (Software, Hardware, AI, Networking, Security)
 * - Science (Biology, Chemistry, Physics, Medicine, Earth Sciences)
 * - Mathematics (Algebra, Calculus, Geometry, Statistics, Logic)
 * - Business (Finance, Economics, Accounting, Corporate, Management)
 * - History (Historical eras, events, civilizations, archaeology)
 * - General (Everyday English vocabulary)
 */

export const DOMAINS = Object.freeze({
  COMPUTING: 'Computing',
  SCIENCE: 'Science',
  MATHEMATICS: 'Mathematics',
  BUSINESS: 'Business',
  HISTORY: 'History',
  GENERAL: 'General'
});

const COMPUTING_KEYWORDS = [
  'computing', 'computer', 'software', 'hardware', 'programming', 'internet', 'network',
  'cybersecurity', 'algorithm', 'artificial intelligence', 'machine learning', 'database',
  'cryptography', 'web', 'operating system', 'compiler', 'code', 'data structure', 'cpu',
  'cloud', 'devops', 'server', 'protocol', 'telecommunication', 'telecommunications',
  'polymorphism', 'hypervisor', 'microservices', 'object-oriented'
];

const SCIENCE_KEYWORDS = [
  'science', 'scientific', 'biology', 'biological', 'chemistry', 'chemical', 'physics',
  'physical', 'medicine', 'medical', 'astronomy', 'genetics', 'genetic', 'geology',
  'neuroscience', 'physiology', 'physiological', 'homeostasis', 'photosynthesis', 'cellular',
  'ecology', 'botany', 'zoology', 'biochemistry', 'pathology', 'pharmacology', 'anatomy',
  'microbiology', 'organism', 'cell', 'quantum', 'crispr', 'mitochondria'
];

const MATHEMATICS_KEYWORDS = [
  'mathematics', 'mathematical', 'math', 'algebra', 'algebraic', 'geometry', 'geometric',
  'calculus', 'statistics', 'statistical', 'topology', 'topological', 'trigonometry',
  'arithmetic', 'probability', 'graph theory', 'combinatorics', 'discrete math',
  'number theory', 'matrix', 'vector', 'differential', 'integral', 'linear algebra',
  'eigenvalue', 'eigenvector', 'asymptote'
];

const BUSINESS_KEYWORDS = [
  'business', 'finance', 'financial', 'economics', 'economic', 'accounting', 'commerce',
  'commercial', 'banking', 'marketing', 'corporate', 'management', 'investment',
  'insurance', 'trade', 'fiscal', 'monetary', 'revenue', 'equity', 'asset', 'liability',
  'macroeconomics', 'microeconomics', 'audit', 'taxation', 'amortization', 'liquidity',
  'ebitda', 'compound interest'
];

const HISTORY_KEYWORDS = [
  'history', 'historical', 'ancient', 'medieval', 'renaissance', 'civilization', 'empire',
  'warfare', 'military', 'archaeology', 'revolution', 'monarchy', 'feudalism',
  'reformation', 'enlightenment', 'dynasty', 'era', 'antiquity', 'middle ages'
];

/**
 * Extracts context tags enclosed in parentheses or brackets from definition text.
 * e.g., "(computing) Artificial intelligence." -> ["computing"]
 * @param {string} text
 * @returns {string[]}
 */
export function extractContextTags(text) {
  if (!text || typeof text !== 'string') return [];

  const tags = [];
  const matches = text.match(/\(([^)]+)\)|\[([^\]]+)\]/g);
  if (matches) {
    for (const m of matches) {
      const inner = m.replace(/[()[\]]/g, '').trim().toLowerCase();
      // Split comma-separated tags, e.g. (computing, internet)
      const parts = inner.split(/[,;/]+/).map((p) => p.trim()).filter(Boolean);
      tags.push(...parts);
    }
  }
  return tags;
}

/**
 * Classifies a definition or term into one of the canonical domain categories.
 * @param {string} text - Definition text or encyclopedic summary
 * @param {string[]} [extraTags=[]] - Pre-extracted tags or part-of-speech labels
 * @returns {'Computing' | 'Science' | 'Mathematics' | 'Business' | 'History' | 'General'}
 */
export function classifyDomain(text = '', extraTags = []) {
  const combinedText = [
    ...(Array.isArray(extraTags) ? extraTags : []),
    extractContextTags(text).join(' '),
    text
  ].join(' ').toLowerCase();

  const countMatches = (keywords) => {
    let score = 0;
    for (const kw of keywords) {
      if (kw.includes(' ')) {
        if (combinedText.includes(kw)) score += 2;
      } else {
        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
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

/**
 * Detects whether a definition provides an acronym/initialism expansion and extracts it.
 * Examples:
 * - "(computing) Initialism of artificial intelligence." -> "Artificial intelligence"
 * - "Abbreviation of Random Access Memory." -> "Random Access Memory"
 * - "(computing) Acronym of application programming interface." -> "Application programming interface"
 * - "(computing) Artificial intelligence." (for uppercase queries matching AI)
 * @param {string} term - The queried term (e.g. "AI")
 * @param {string} rawDefinition - Cleaned definition string
 * @returns {string|null}
 */
export function extractAcronymExpansion(term, rawDefinition) {
  if (!rawDefinition || typeof rawDefinition !== 'string') return null;

  const text = rawDefinition
    .replace(/^(\([^)]+\)|\[[^\]]+\])\s*/, '') // remove leading tags
    .trim();

  // Pattern 1: Explicit pattern: (Initialism|Acronym|Abbreviation) of <Expansion> anywhere
  const explicitPattern = /\b(?:initialism|acronym|abbreviation)\s+of\s+([^.;\n]+)/i;
  const match1 = text.match(explicitPattern);
  if (match1 && match1[1]) {
    const cleaned = match1[1].replace(/<[^>]+>/g, '').trim();
    if (cleaned.length > 2) {
      return capitalizeWords(cleaned);
    }
  }

  const letters = (term || '').replace(/[^A-Za-z]/g, '');

  if (letters.length >= 2 && letters.length <= 6) {
    // Pattern 2: Query letters matching lead words
    // e.g. term = "AI", text = "Artificial intelligence."
    const words = text.split(/[ ,;:]+/).filter(Boolean);
    if (words.length >= letters.length) {
      const candidateInitials = words.slice(0, letters.length).map((w) => w[0]?.toUpperCase()).join('');
      if (candidateInitials === letters.toUpperCase()) {
        const expansionCandidate = words.slice(0, letters.length).join(' ').replace(/[.;,]+$/, '');
        return capitalizeWords(expansionCandidate);
      }
    }

    // Pattern 3: Parenthesized expansion matching the initials
    // e.g. "Alternative form of AI (Artificial intelligence)."
    const parenMatches = rawDefinition.matchAll(/\(([^)]+)\)/g);
    for (const pMatch of parenMatches) {
      const insideParen = pMatch[1].trim();
      const parenWords = insideParen.split(/[ ,;:]+/).filter(Boolean);
      if (parenWords.length >= letters.length) {
        const candidateInitials = parenWords.slice(0, letters.length).map((w) => w[0]?.toUpperCase()).join('');
        if (candidateInitials === letters.toUpperCase()) {
          const expansionCandidate = parenWords.slice(0, letters.length).join(' ').replace(/[.;,]+$/, '');
          return capitalizeWords(expansionCandidate);
        }
      }
    }
  }

  return null;
}

/**
 * Capitalizes first letter of each major word.
 * @param {string} str
 * @returns {string}
 */
function capitalizeWords(str) {
  if (!str) return '';
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}
