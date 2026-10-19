/**
 * FloatingIcon: Lightweight trigger button that appears when user highlights 2-4 words.
 * Injected into Shadow DOM to prevent host page style contamination.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function createBookSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '15');
  svg.setAttribute('height', '15');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const path1 = document.createElementNS(SVG_NS, 'path');
  path1.setAttribute('d', 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20');
  const path2 = document.createElementNS(SVG_NS, 'path');
  path2.setAttribute('d', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z');

  svg.appendChild(path1);
  svg.appendChild(path2);
  return svg;
}

export class FloatingIcon {
  constructor() {
    this.host = null;
    this.shadowRoot = null;
    this.cssText = '';
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
    this.host = document.createElement('div');
    this.host.id = 'eng-dict-floating-host-root';
    this.host.className = 'dict-floating-icon-host';
    this.host.style.top = `${coords.top}px`;
    this.host.style.left = `${coords.left}px`;

    this.shadowRoot = this.host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = this.cssText;
    this.shadowRoot.appendChild(styleEl);

    const btn = document.createElement('button');
    btn.className = 'dict-floating-btn';
    btn.title = 'Look up in English Dictionary';
    btn.setAttribute('aria-label', 'Look up selection');
    btn.appendChild(createBookSvg());

    btn.addEventListener('mousedown', (e) => {
      // Prevent losing text selection
      e.preventDefault();
      e.stopPropagation();
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const cb = this.onClickHandler;
      this.dismiss();
      if (cb) cb();
    });

    this.shadowRoot.appendChild(btn);
    document.documentElement.appendChild(this.host);

    document.addEventListener('mousedown', this._handleOutsideClick, true);
    window.addEventListener('scroll', this._handleScroll, { passive: true });
  }

  dismiss() {
    if (typeof document !== 'undefined') {
      if (this.host && document.contains(this.host)) {
        this.host.remove();
      }
      document.removeEventListener('mousedown', this._handleOutsideClick, true);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this._handleScroll);
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
}
