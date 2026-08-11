const LANGUAGE_PRESETS = Object.freeze({
  text: { extension: 'txt', mime: 'text/plain;charset=utf-8', aliases: ['txt', 'plain', 'plaintext'] },
  json: { extension: 'json', mime: 'application/json;charset=utf-8', aliases: [] },
  javascript: { extension: 'js', mime: 'text/javascript;charset=utf-8', aliases: ['js', 'mjs', 'cjs'] },
  python: { extension: 'py', mime: 'text/x-python;charset=utf-8', aliases: ['py'] },
  bash: { extension: 'sh', mime: 'text/x-shellscript;charset=utf-8', aliases: ['sh', 'shell', 'zsh'] },
  html: { extension: 'html', mime: 'text/html;charset=utf-8', aliases: ['htm'] },
  css: { extension: 'css', mime: 'text/css;charset=utf-8', aliases: [] },
  markdown: { extension: 'md', mime: 'text/markdown;charset=utf-8', aliases: ['md'] }
});

const LANGUAGE_ALIAS_MAP = Object.freeze(Object.entries(LANGUAGE_PRESETS).reduce((map, [name, preset]) => {
  map[name] = name;
  for (const alias of preset.aliases) map[alias] = name;
  return map;
}, {}));

const SCRIPT_PATTERNS = Object.freeze({
  javascript: /(?<comment>\/\*[\s\S]*?\*\/|\/\/[^\n]*)|(?<string>`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(?<keyword>\b(?:const|let|var|function|return|if|else|for|while|class|new|import|from|export|async|await|true|false|null)\b)|(?<number>\b\d+(?:\.\d+)?\b)/g,
  python: /(?<comment>#[^\n]*)|(?<string>"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(?<keyword>\b(?:def|return|if|elif|else|for|while|class|import|from|as|True|False|None|with|lambda|in|not|and|or)\b)|(?<number>\b\d+(?:\.\d+)?\b)/g,
  bash: /(?<comment>#[^\n]*)|(?<string>"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(?<keyword>\b(?:if|then|else|fi|for|do|done|case|esac|function|echo|export|local|readonly|in)\b)|(?<number>\b\d+(?:\.\d+)?\b)/g
});

const JSON_PATTERN = /(?<key>"(?:\\.|[^"\\])*"\s*:)|(?<string>"(?:\\.|[^"\\])*")|(?<literal>\b(?:true|false|null)\b)|(?<number>-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function normalizeLanguage(value = 'text') {
  const key = String(value ?? 'text').trim().toLowerCase();
  return LANGUAGE_ALIAS_MAP[key] ?? 'text';
}

function presetFor(language) {
  return LANGUAGE_PRESETS[normalizeLanguage(language)];
}

function defaultFilename(language, base = 'export') {
  const safeBase = String(base || 'export').trim() || 'export';
  return `${safeBase}.${presetFor(language).extension}`;
}

function highlightTokens(source, pattern, classPrefix = 'nlab-codeblock__') {
  const text = String(source ?? '');
  pattern.lastIndex = 0;
  let output = '';
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    output += escapeHtml(text.slice(lastIndex, match.index));
    const kind = Object.keys(match.groups ?? {}).find((name) => match.groups[name] !== undefined);
    output += kind
      ? `<span class="${classPrefix}${kind}">${escapeHtml(match[0])}</span>`
      : escapeHtml(match[0]);
    lastIndex = match.index + match[0].length;
  }

  output += escapeHtml(text.slice(lastIndex));
  return output;
}

function highlightJson(source) {
  return highlightTokens(source, JSON_PATTERN);
}

function highlightScript(source, language) {
  const pattern = SCRIPT_PATTERNS[language];
  return pattern ? highlightTokens(source, pattern) : escapeHtml(source);
}

export class CodeBlock {
  static languagePresets() {
    return Object.fromEntries(Object.entries(LANGUAGE_PRESETS).map(([name, preset]) => [name, { ...preset, aliases: [...preset.aliases] }]));
  }

  static normalizeLanguage(value) {
    return normalizeLanguage(value);
  }

  constructor({
    value = '',
    language = 'text',
    filename = null,
    theme = 'light',
    highlighted = false,
    editable = false,
    fontScale = 100,
    clipboard = null,
    documentRef = globalThis.document ?? null,
    urlRef = globalThis.URL ?? null,
    BlobRef = globalThis.Blob ?? null
  } = {}) {
    this.value = String(value ?? '');
    this.language = normalizeLanguage(language);
    this.autoFilename = filename == null || String(filename).trim() === '';
    this.filename = this.autoFilename ? defaultFilename(this.language) : String(filename);
    this.theme = theme === 'dark' ? 'dark' : 'light';
    this.highlighted = Boolean(highlighted);
    this.editable = Boolean(editable);
    this.editing = false;
    this.fontScale = Math.max(70, Math.min(160, Number(fontScale) || 100));
    this.clipboard = clipboard;
    this.document = documentRef;
    this.url = urlRef;
    this.Blob = BlobRef;
    this.element = null;
    this.feedbackTimer = null;
  }

  get preset() {
    return { ...presetFor(this.language), aliases: [...presetFor(this.language).aliases] };
  }

  setValue(value) {
    this.value = String(value ?? '');
    this.render();
    return this;
  }

  setTheme(value) {
    this.theme = value === 'dark' ? 'dark' : 'light';
    this.render();
    return this;
  }

  setHighlighted(value) {
    this.highlighted = Boolean(value);
    this.render();
    return this;
  }

  setLanguage(value) {
    this.language = normalizeLanguage(value);
    if (this.autoFilename) this.filename = defaultFilename(this.language);
    this.render();
    return this;
  }

  setFilename(value) {
    const normalized = String(value ?? '').trim();
    this.autoFilename = normalized === '';
    this.filename = this.autoFilename ? defaultFilename(this.language) : normalized;
    this.render();
    return this;
  }

  useLanguageFilename(base = 'export') {
    this.autoFilename = true;
    this.filename = defaultFilename(this.language, base);
    this.render();
    return this;
  }

  setEditable(value = true) {
    this.editable = Boolean(value);
    if (!this.editable) this.editing = false;
    this.render();
    return this;
  }

  setEditing(value = true) {
    if (!this.editable) return this;
    this.editing = Boolean(value);
    this.render();
    return this;
  }

  setFontScale(value) {
    this.fontScale = Math.max(70, Math.min(160, Number(value) || 100));
    this.render();
    return this;
  }

  exportText() {
    return {
      value: this.value,
      language: this.language,
      filename: this.filename || defaultFilename(this.language),
      mime: presetFor(this.language).mime
    };
  }

  formatJson({ indent = 2, apply = true } = {}) {
    if (this.language !== 'json') {
      return { formatted: false, reason: 'not-json', value: this.value };
    }

    const safeIndent = Math.max(0, Math.min(8, Math.floor(Number(indent) || 0)));
    try {
      const value = JSON.stringify(JSON.parse(this.value), null, safeIndent);
      if (apply) this.setValue(value);
      return { formatted: true, value };
    } catch (error) {
      return { formatted: false, reason: 'invalid-json', value: this.value, error };
    }
  }

  async copy() {
    const clipboard = this.clipboard ?? globalThis.navigator?.clipboard ?? null;
    if (!clipboard || typeof clipboard.writeText !== 'function') return false;
    await clipboard.writeText(this.value);
    return true;
  }

  download() {
    const documentRef = this.document ?? globalThis.document ?? null;
    const urlRef = this.url ?? globalThis.URL ?? null;
    const BlobRef = this.Blob ?? globalThis.Blob ?? null;
    if (!documentRef?.createElement || !documentRef?.body?.append || !urlRef?.createObjectURL || !BlobRef) return false;

    const payload = this.exportText();
    const blob = new BlobRef([payload.value], { type: payload.mime });
    const objectUrl = urlRef.createObjectURL(blob);
    const link = documentRef.createElement('a');
    link.href = objectUrl;
    link.download = payload.filename;
    documentRef.body.append(link);
    link.click?.();
    link.remove?.();
    setTimeout(() => urlRef.revokeObjectURL?.(objectUrl), 0);
    return true;
  }

  mount(element) {
    this.element = element ?? null;
    this.render();
    return this;
  }

  formatted() {
    if (!this.highlighted) return escapeHtml(this.value);
    if (this.language === 'json') return highlightJson(this.value);
    if (['javascript', 'python', 'bash'].includes(this.language)) return highlightScript(this.value, this.language);
    return escapeHtml(this.value);
  }

  feedback(message, kind = 'ok') {
    const node = this.element?.querySelector?.('.nlab-codeblock__feedback');
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
    node.hidden = false;
    clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => {
      if (node) {
        node.hidden = true;
        node.textContent = '';
      }
    }, 1800);
  }

  render() {
    if (!this.element) return;
    this.element.classList?.add?.('nlab-codeblock');
    if (this.element.dataset) this.element.dataset.theme = this.theme;
    this.element.style?.setProperty?.('--nlab-code-font-scale', String(this.fontScale / 100));
    this.element.innerHTML = `<div class="nlab-codeblock__toolbar"><span class="nlab-codeblock__meta">${escapeHtml(this.filename)} · ${escapeHtml(this.language)}</span><label title="Taille du texte">Aa <input type="range" min="70" max="160" step="5" value="${this.fontScale}" data-code-font><output>${this.fontScale}%</output></label><button type="button" data-code-theme title="Basculer thème local">${this.theme === 'dark' ? '☀' : '◐'} <span>${this.theme === 'dark' ? 'Thème sombre' : 'Thème clair'}</span></button><button type="button" data-code-highlight title="Visualisation brute / colorisée" aria-pressed="${this.highlighted}">${this.highlighted ? '◈' : '◇'} <span>${this.highlighted ? 'Colorisé' : 'Brut'}</span></button>${this.editable ? `<button type="button" data-code-edit title="Modifier le contenu">✎ <span>${this.editing ? 'Valider' : 'Modifier'}</span></button>` : ''}<button type="button" data-code-copy title="Copier tout">⧉ <span>Copier tout</span></button><button type="button" data-code-download title="Télécharger">⇩ <span>Télécharger</span></button></div>${this.editing ? `<textarea class="nlab-codeblock__editor" spellcheck="false" style="font-size:calc(13px * var(--nlab-code-font-scale))">${escapeHtml(this.value)}</textarea>` : `<pre class="nlab-codeblock__pre" style="font-size:calc(13px * var(--nlab-code-font-scale))"><code>${this.formatted()}</code></pre>`}<div class="nlab-codeblock__feedback" role="status" aria-live="polite" hidden></div>`;

    this.element.querySelector?.('[data-code-font]')?.addEventListener?.('input', (event) => {
      this.fontScale = Number(event.target.value);
      if (event.target.nextElementSibling) event.target.nextElementSibling.textContent = `${this.fontScale}%`;
      this.element.style?.setProperty?.('--nlab-code-font-scale', String(this.fontScale / 100));
      for (const node of this.element.querySelectorAll?.('.nlab-codeblock__pre,.nlab-codeblock__editor') ?? []) {
        node.style.fontSize = 'calc(13px * var(--nlab-code-font-scale))';
      }
    });

    this.element.querySelector?.('[data-code-theme]')?.addEventListener?.('click', () => {
      const next = this.theme === 'dark' ? 'light' : 'dark';
      this.setTheme(next);
      this.feedback(`Thème ${next === 'dark' ? 'sombre' : 'clair'} activé ✓`);
    });

    this.element.querySelector?.('[data-code-highlight]')?.addEventListener?.('click', () => {
      const next = !this.highlighted;
      this.setHighlighted(next);
      this.feedback(`${next ? 'Colorisation' : 'Vue brute'} activée ✓`);
    });

    this.element.querySelector?.('[data-code-edit]')?.addEventListener?.('click', () => {
      if (this.editing) {
        const editor = this.element.querySelector?.('.nlab-codeblock__editor');
        if (editor) this.value = editor.value;
        this.setEditing(false);
        this.feedback('Modifications appliquées ✓');
      } else {
        this.setEditing(true);
        this.feedback('Mode édition : la coloration revient après validation');
      }
    });

    this.element.querySelector?.('[data-code-copy]')?.addEventListener?.('click', async () => {
      try {
        const copied = await this.copy();
        this.feedback(copied ? 'Copié dans le presse-papiers ✓' : 'Copie indisponible', copied ? 'ok' : 'error');
      } catch {
        this.feedback('Copie indisponible', 'error');
      }
    });

    this.element.querySelector?.('[data-code-download]')?.addEventListener?.('click', () => {
      const downloaded = this.download();
      this.feedback(downloaded ? 'Téléchargement lancé ✓' : 'Téléchargement indisponible', downloaded ? 'ok' : 'error');
    });
  }
}
