/**
 * PopupView: Manages rendering of the dictionary popup inside an isolated Shadow DOM.
 * Guarantees zero CSS clash with host web pages (FR-013) and uses safe DOM node
 * construction to comply with strict Mozilla Add-ons (AMO) security guidelines.
 */

const HOST_ELEMENT_ID = 'eng-dict-firefox-host-root';

/**
 * Creates SVG element from markup safely without innerHTML on host documents.
 */
function createSvg(markup) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(markup.trim(), 'image/svg+xml');
  const svg = doc.documentElement;
  return document.importNode(svg, true);
}

const SVG_SPEAKER = `
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
</svg>
`;

const SVG_CLOSE = `
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>
`;

const SVG_ALERT = `
<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <line x1="12" y1="8" x2="12" y2="12"></line>
  <line x1="12" y1="16" x2="12.01" y2="16"></line>
</svg>
`;

export class PopupView {
  constructor() {
    this.host = null;
    this.shadowRoot = null;
    this.activeAudio = null;
    this.cssText = '';

    // Bound listeners for cleanup
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

    this.host = document.createElement('div');
    this.host.id = HOST_ELEMENT_ID;
    this.shadowRoot = this.host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = this.cssText;
    this.shadowRoot.appendChild(styleEl);

    document.documentElement.appendChild(this.host);

    // Stop wheel events inside popup from bubbling to window or triggering page scroll
    this.host.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: true });

    document.addEventListener('mousedown', this._handleOutsideClick, true);
    window.addEventListener('keydown', this._handleKeydown, true);
    window.addEventListener('scroll', this._handleScroll, { passive: true });
  }

  _updatePosition(coords) {
    if (!this.host || !coords) return;
    this.host.style.top = `${coords.top}px`;
    this.host.style.left = `${coords.left}px`;
  }

  _createHeader(word, phoneticText = '', audioUrl = null, showAudio = false) {
    const header = document.createElement('div');
    header.className = 'dict-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'dict-title-group';

    const wordEl = document.createElement('span');
    wordEl.className = 'dict-word';
    wordEl.textContent = word;
    titleGroup.appendChild(wordEl);

    if (phoneticText) {
      const phoneticEl = document.createElement('span');
      phoneticEl.className = 'dict-phonetic';
      phoneticEl.textContent = phoneticText;
      titleGroup.appendChild(phoneticEl);
    }

    const actions = document.createElement('div');
    actions.className = 'dict-header-actions';

    if (showAudio) {
      const audioBtn = document.createElement('button');
      audioBtn.className = 'dict-btn dict-audio-btn';
      audioBtn.title = 'Listen to pronunciation';
      audioBtn.setAttribute('aria-label', 'Listen to pronunciation');
      audioBtn.appendChild(createSvg(SVG_SPEAKER));
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playAudio(word, audioUrl, audioBtn);
      });
      actions.appendChild(audioBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'dict-btn dict-close-btn';
    closeBtn.title = 'Close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.appendChild(createSvg(SVG_CLOSE));
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss();
    });
    actions.appendChild(closeBtn);

    header.appendChild(titleGroup);
    header.appendChild(actions);
    return header;
  }

  showLoading(word, coords, theme = 'auto') {
    this._ensureMounted();
    this._updatePosition(coords);

    const card = document.createElement('div');
    card.className = `dict-card ${this._getThemeClass(theme)}`;

    card.appendChild(this._createHeader(word, '', null, false));

    const loadingView = document.createElement('div');
    loadingView.className = 'dict-loading-view';

    const spinner = document.createElement('div');
    spinner.className = 'dict-spinner';
    loadingView.appendChild(spinner);

    const text = document.createElement('span');
    text.textContent = 'Searching dictionary...';
    loadingView.appendChild(text);

    card.appendChild(loadingView);
    this._renderCard(card);
  }

  showResult(entry, coords, theme = 'auto') {
    this._ensureMounted();
    this._updatePosition(coords);

    const card = document.createElement('div');
    card.className = `dict-card ${this._getThemeClass(theme)}`;

    card.appendChild(this._createHeader(entry.word, entry.phonetic, entry.audioUrl, true));

    const body = document.createElement('div');
    body.className = 'dict-body';

    for (const group of entry.meanings) {
      const groupEl = document.createElement('div');
      groupEl.className = 'dict-meaning-group';

      const badge = document.createElement('span');
      badge.className = 'dict-pos-badge';
      badge.textContent = group.partOfSpeech;
      groupEl.appendChild(badge);

      const list = document.createElement('ol');
      list.className = 'dict-definitions-list';

      for (const d of group.definitions.slice(0, 3)) {
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

        if (d.synonyms && d.synonyms.length > 0) {
          const syn = document.createElement('div');
          syn.className = 'dict-synonyms';
          syn.textContent = 'Similar: ';
          const synSpan = document.createElement('span');
          synSpan.textContent = d.synonyms.join(', ');
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

  showError(message, word, coords, theme = 'auto') {
    this._ensureMounted();
    this._updatePosition(coords);

    const card = document.createElement('div');
    card.className = `dict-card ${this._getThemeClass(theme)}`;

    card.appendChild(this._createHeader(word || 'Lookup', '', null, false));

    const errorView = document.createElement('div');
    errorView.className = 'dict-error-view';

    const icon = document.createElement('div');
    icon.className = 'dict-error-icon';
    icon.appendChild(createSvg(SVG_ALERT));
    errorView.appendChild(icon);

    const title = document.createElement('div');
    title.className = 'dict-error-title';
    const isNetwork = message && (message.includes('internet') || message.includes('connect') || message.includes('timed out'));
    title.textContent = isNetwork ? 'Connection Issue' : 'No Definitions Found';
    errorView.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'dict-error-desc';
    desc.textContent = message || 'Unable to retrieve definition.';
    errorView.appendChild(desc);

    card.appendChild(errorView);
    this._renderCard(card);
  }

  _getThemeClass(theme) {
    if (theme === 'dark') return 'theme-dark';
    if (theme === 'light') return 'theme-light';
    return '';
  }

  _renderCard(cardElement) {
    const existing = this.shadowRoot.querySelector('.dict-card');
    if (existing) existing.remove();
    this.shadowRoot.appendChild(cardElement);
  }

  playAudio(word, url, buttonEl) {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (buttonEl) buttonEl.classList.add('playing');

    const stopButtonState = () => {
      if (buttonEl) buttonEl.classList.remove('playing');
    };

    const speakFallback = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && word) {
        try {
          const utterance = new SpeechSynthesisUtterance(word);
          utterance.lang = 'en-US';
          utterance.rate = 0.9;
          utterance.onend = stopButtonState;
          utterance.onerror = stopButtonState;
          window.speechSynthesis.speak(utterance);
        } catch (synthErr) {
          console.warn('[Dictionary Addon] Speech synthesis failed:', synthErr);
          stopButtonState();
        }
      } else {
        stopButtonState();
      }
    };

    if (url && typeof url === 'string') {
      let audioUrl = url.trim();
      if (audioUrl.startsWith('//')) {
        audioUrl = 'https:' + audioUrl;
      }

      try {
        const audio = new Audio(audioUrl);
        this.activeAudio = audio;

        let fallbackTriggered = false;
        const triggerFallback = () => {
          if (fallbackTriggered) return;
          fallbackTriggered = true;
          this.activeAudio = null;
          speakFallback();
        };

        audio.onended = () => {
          stopButtonState();
          this.activeAudio = null;
        };

        audio.onerror = () => {
          triggerFallback();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[Dictionary Addon] Audio playback failed, falling back to speech synthesis:', err);
            triggerFallback();
          });
        }
      } catch (err) {
        console.warn('[Dictionary Addon] Audio initialization failed, falling back to speech synthesis:', err);
        speakFallback();
      }
    } else {
      speakFallback();
    }
  }

  dismiss() {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (this.host && document.contains(this.host)) {
      this.host.remove();
    }
    this.host = null;
    this.shadowRoot = null;

    document.removeEventListener('mousedown', this._handleOutsideClick, true);
    window.removeEventListener('keydown', this._handleKeydown, true);
    window.removeEventListener('scroll', this._handleScroll);
  }

  _handleOutsideClick(event) {
    if (this.host && !this.host.contains(event.target)) {
      this.dismiss();
    }
  }

  _handleKeydown(event) {
    if (event.key === 'Escape') {
      this.dismiss();
    }
  }

  _handleScroll(event) {
    // If scroll occurred inside the popup card or shadow DOM, do not dismiss
    if (this.host) {
      if (event.target === this.host) return;
      if (this.host.contains(event.target)) return;
      const path = event.composedPath ? event.composedPath() : [];
      if (path.includes(this.host) || (this.shadowRoot && path.includes(this.shadowRoot))) {
        return;
      }
    }
    this.dismiss();
  }
}
