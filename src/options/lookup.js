/**
 * Standalone Lookup Controller:
 * Handles floating dictionary popup window for PDF documents, browser privileged tabs,
 * and direct search queries.
 */

import { getSettings } from '../common/storage.js';
import { sanitizeDomainTerm } from '../common/sanitize.js';
import { lookupDomainTerm } from '../background/dictionary-service.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, val] of Object.entries(attrs)) {
    el.setAttribute(key, val);
  }
  return el;
}

function createSpeakerSvg() {
  const svg = createSvgElement('svg', {
    width: '15',
    height: '15',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  });
  const polygon = createSvgElement('polygon', {
    points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5',
    fill: 'currentColor'
  });
  const path1 = createSvgElement('path', {
    d: 'M15.54 8.46a5 5 0 0 1 0 7.07',
    fill: 'none'
  });
  const path2 = createSvgElement('path', {
    d: 'M19.07 4.93a10 10 0 0 1 0 14.14',
    fill: 'none'
  });
  svg.appendChild(polygon);
  svg.appendChild(path1);
  svg.appendChild(path2);
  return svg;
}

let activeAudio = null;
let searchDebounceTimeout = null;
let currentConfig = {
  theme: 'auto',
  domainBadgesEnabled: true
};

function applyTheme(theme) {
  document.body.classList.remove('theme-light', 'theme-dark');
  if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else if (theme === 'dark') {
    document.body.classList.add('theme-dark');
  }
}

async function sendBackgroundMessage(payload) {
  if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
    try {
      const res = await browser.runtime.sendMessage(payload);
      if (res !== undefined) return res;
    } catch (err) {
      // Background message error; will fall back to local service
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(payload, (res) => {
        if (chrome.runtime?.lastError) {
          resolve({ status: 'error', errorMessage: chrome.runtime.lastError.message });
        } else {
          resolve(res || { status: 'error', errorMessage: 'Empty response' });
        }
      });
    });
  }

  return { status: 'error', errorMessage: 'No extension runtime' };
}

function stopAudio(buttonEl) {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (buttonEl) {
    buttonEl.classList.remove('playing');
  }
}

function playPronunciation(word, audioUrl, buttonEl) {
  stopAudio(buttonEl);

  if (buttonEl) {
    buttonEl.classList.add('playing');
  }

  const onComplete = () => {
    if (buttonEl) buttonEl.classList.remove('playing');
  };

  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl);
      activeAudio = audio;
      audio.onended = onComplete;
      audio.onerror = () => {
        // Fall back to SpeechSynthesis
        fallbackSpeech(word, onComplete);
      };
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => fallbackSpeech(word, onComplete));
      }
      return;
    } catch (err) {
      // Continue to speech synthesis
    }
  }

  fallbackSpeech(word, onComplete);
}

function fallbackSpeech(word, callback) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && word) {
    try {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
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
  const container = document.getElementById('lookupContent');
  if (!container) return;

  container.textContent = '';
  const view = document.createElement('div');
  view.className = 'state-view loading-view';

  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  view.appendChild(spinner);

  const text = document.createElement('span');
  text.className = 'state-text';
  text.textContent = `Looking up "${term}"...`;
  view.appendChild(text);

  container.appendChild(view);
}

function renderEmptyState(prompt = 'Type any English word above to look up definitions.') {
  const container = document.getElementById('lookupContent');
  if (!container) return;

  container.textContent = '';
  const view = document.createElement('div');
  view.className = 'state-view';

  const text = document.createElement('span');
  text.className = 'state-text';
  text.textContent = prompt;
  view.appendChild(text);

  container.appendChild(view);
}

function renderError(term, message = 'We could not find definitions for this term.') {
  const container = document.getElementById('lookupContent');
  if (!container) return;

  container.textContent = '';
  const view = document.createElement('div');
  view.className = 'state-view';

  const title = document.createElement('div');
  title.className = 'error-title';
  title.textContent = 'No Definition Found';
  view.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'error-desc';
  desc.textContent = `${message} (Word: "${term}")`;
  view.appendChild(desc);

  container.appendChild(view);
}

function renderResult(entry) {
  const container = document.getElementById('lookupContent');
  if (!container) return;

  container.textContent = '';

  // 1. Header
  const header = document.createElement('div');
  header.className = 'dict-header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'dict-title-group';

  const titleRow = document.createElement('div');
  titleRow.className = 'dict-title-row';

  const wordEl = document.createElement('span');
  wordEl.className = 'dict-word';
  wordEl.textContent = entry.word || '';
  titleRow.appendChild(wordEl);

  if (entry.phonetic) {
    const phoneticEl = document.createElement('span');
    phoneticEl.className = 'dict-phonetic';
    phoneticEl.textContent = entry.phonetic;
    titleRow.appendChild(phoneticEl);
  }

  if (entry.isAcronym) {
    const badge = document.createElement('span');
    badge.className = 'dict-acronym-badge';
    badge.textContent = 'Acronym';
    titleRow.appendChild(badge);
  }

  titleGroup.appendChild(titleRow);

  if (entry.isAcronym && entry.acronymExpansion) {
    const expansionEl = document.createElement('div');
    expansionEl.className = 'dict-acronym-expansion';
    expansionEl.textContent = entry.acronymExpansion;
    titleGroup.appendChild(expansionEl);
  }

  header.appendChild(titleGroup);

  const audioBtn = document.createElement('button');
  audioBtn.className = 'dict-audio-btn';
  audioBtn.title = 'Listen to pronunciation';
  audioBtn.setAttribute('aria-label', 'Listen to pronunciation');
  audioBtn.appendChild(createSpeakerSvg());
  audioBtn.addEventListener('click', () => {
    playPronunciation(entry.word, entry.audioUrl, audioBtn);
  });
  header.appendChild(audioBtn);

  container.appendChild(header);

  // 2. Encyclopedic Summary if present
  if (entry.encyclopedicSummary) {
    const block = document.createElement('div');
    block.className = 'dict-encyclopedic-block';

    const text = document.createElement('p');
    text.className = 'dict-encyclopedic-text';
    text.textContent = entry.encyclopedicSummary;
    block.appendChild(text);

    if (entry.referenceUrl) {
      const link = document.createElement('a');
      link.className = 'dict-reference-link';
      link.href = entry.referenceUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Learn more on Wikipedia →';
      block.appendChild(link);
    }

    container.appendChild(block);
  }

  // 3. Meaning Groups
  const renderGroup = (group) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'dict-meaning-group';

    const badgesRow = document.createElement('div');
    badgesRow.className = 'dict-badges-row';

    if (group.partOfSpeech) {
      const posBadge = document.createElement('span');
      posBadge.className = 'dict-pos-badge';
      posBadge.textContent = group.partOfSpeech;
      badgesRow.appendChild(posBadge);
    }

    if (currentConfig.domainBadgesEnabled !== false && group.domain && group.domain !== 'General') {
      const domainBadge = document.createElement('span');
      domainBadge.className = 'dict-domain-badge';
      domainBadge.textContent = group.domain;
      badgesRow.appendChild(domainBadge);
    }

    if (badgesRow.childNodes.length > 0) {
      groupEl.appendChild(badgesRow);
    }

    const list = document.createElement('ol');
    list.className = 'dict-definitions-list';

    const defs = (group.definitions || []).slice(0, 4);
    for (const d of defs) {
      const item = document.createElement('li');
      item.className = 'dict-def-item';

      const defText = document.createElement('div');
      defText.textContent = d.definition;
      item.appendChild(defText);

      if (d.example) {
        const ex = document.createElement('div');
        ex.className = 'dict-example';
        ex.textContent = `“${d.example}”`;
        item.appendChild(ex);
      }

      if (Array.isArray(d.synonyms) && d.synonyms.length > 0) {
        const syn = document.createElement('div');
        syn.className = 'dict-synonyms';
        syn.textContent = 'Synonyms: ';
        const span = document.createElement('span');
        span.textContent = d.synonyms.join(', ');
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
}

async function executeLookup(rawQuery) {
  const sanitized = sanitizeDomainTerm(rawQuery);
  if (!sanitized.isValid || !sanitized.cleanTerm) {
    renderEmptyState('Please enter a valid English word or term.');
    return;
  }

  const term = sanitized.cleanTerm;
  renderLoading(term);

  // Try background worker message first to leverage warm cache
  const bgRes = await sendBackgroundMessage({
    action: 'LOOKUP_DOMAIN_TERM',
    payload: {
      term: sanitized.cleanTerm,
      rawText: sanitized.raw,
      wordCount: sanitized.wordCount,
      isUppercase: sanitized.isUppercase
    }
  });

  if (bgRes && bgRes.status === 'success' && (bgRes.entry || bgRes.data)) {
    renderResult(bgRes.entry || bgRes.data);
    return;
  }

  // Fallback directly to in-bundle service if background is unreachable
  try {
    const directRes = await lookupDomainTerm({
      term: sanitized.cleanTerm,
      rawText: sanitized.raw,
      wordCount: sanitized.wordCount,
      isUppercase: sanitized.isUppercase
    });

    if (directRes && directRes.status === 'success' && (directRes.entry || directRes.data)) {
      renderResult(directRes.entry || directRes.data);
      return;
    }
  } catch (err) {
    console.warn('[Dictionary Addon] Direct lookup error:', err);
  }

  renderError(term, bgRes?.errorMessage || 'No definitions found for this term.');
}

async function init() {
  // 1. Sync config & Theme
  try {
    currentConfig = await getSettings();
    applyTheme(currentConfig.theme);
  } catch (e) {
    // Default theme applied
  }

  const storageApi = typeof browser !== 'undefined' ? browser.storage : (typeof chrome !== 'undefined' ? chrome.storage : null);
  if (storageApi && storageApi.onChanged) {
    storageApi.onChanged.addListener((changes) => {
      if (changes.settings?.newValue) {
        currentConfig = changes.settings.newValue;
        applyTheme(currentConfig.theme);
      }
    });
  }

  // 2. Elements
  const inputEl = document.getElementById('lookupInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const closeBtn = document.getElementById('closeWindowBtn');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.close();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.close();
    }
  });

  if (clearBtn && inputEl) {
    clearBtn.addEventListener('click', () => {
      inputEl.value = '';
      clearBtn.style.display = 'none';
      inputEl.focus();
      renderEmptyState();
    });
  }

  if (inputEl) {
    inputEl.addEventListener('input', () => {
      const val = inputEl.value.trim();
      if (clearBtn) {
        clearBtn.style.display = val ? 'flex' : 'none';
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

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
        const val = inputEl.value.trim();
        if (val) {
          executeLookup(val);
        }
      }
    });
  }

  // 3. Check URL query params for initial term
  const params = new URLSearchParams(window.location.search);
  const initialTerm = (params.get('term') || '').trim();

  if (initialTerm && inputEl) {
    inputEl.value = initialTerm;
    if (clearBtn) clearBtn.style.display = 'flex';
    executeLookup(initialTerm);
  } else {
    renderEmptyState();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
