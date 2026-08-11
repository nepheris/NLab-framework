export class PresetManagerView {
  constructor({ manager, root = document, iconRegistry = null, getSettings = null, applySettings = null, onChange = null } = {}) {
    if (!manager) throw new Error('PresetManagerView requires a manager');
    this.manager = manager;
    this.root = root;
    this.iconRegistry = iconRegistry;
    this.getSettings = getSettings;
    this.applySettings = applySettings;
    this.onChange = onChange;
    this.container = null;
  }

  mount(container) {
    if (!container) return this;
    this.container = container;
    this.render();
    return this;
  }

  render() {
    if (!this.container) return this;
    const active = this.manager.getActive();
    const presets = this.manager.list();
    this.container.classList.add('nlab-preset-manager');
    this.container.innerHTML = `
      <div class="nlab-preset-manager__row">
        <label>Preset
          <select data-preset-select>
            ${presets.map((preset)=>`<option value="${this.#escape(preset.id)}" ${preset.id===active?.id?'selected':''}>${this.#escape(preset.label)}${preset.validated?' ✓':''}${preset.canonical?' · défaut':''}</option>`).join('')}
          </select>
        </label>
        <button type="button" data-preset-action="new" title="Créer un preset">${this.#icon('add','+') }<span>Nouveau</span></button>
        <button type="button" data-preset-action="duplicate" title="Dupliquer le preset">${this.#icon('copy','⧉')}<span>Dupliquer</span></button>
        <button type="button" data-preset-action="save" title="Enregistrer les réglages courants">${this.#icon('save','✓')}<span>Enregistrer</span></button>
        <button type="button" data-preset-action="validate" title="Valider le preset">${this.#icon('success','✓')}<span>Valider</span></button>
      </div>
      <div class="nlab-preset-manager__row nlab-preset-manager__secondary">
        <button type="button" data-preset-action="rename">Renommer</button>
        <button type="button" data-preset-action="reset">${this.#icon('reset','↺')}<span>Reset</span></button>
        <button type="button" data-preset-action="delete">${this.#icon('delete','×')}<span>Supprimer</span></button>
        <button type="button" data-preset-action="export">${this.#icon('export','⇩')}<span>Exporter JSON</span></button>
        <label class="nlab-preset-manager__import">Importer JSON<input type="file" accept="application/json,.json" data-preset-import hidden></label>
        <button type="button" data-preset-action="import">${this.#icon('upload','⇧')}<span>Importer</span></button>
        <output data-preset-status aria-live="polite"></output>
      </div>`;

    this.#bind();
    return this;
  }

  #bind() {
    const select = this.container.querySelector('[data-preset-select]');
    select?.addEventListener('change',()=>{
      const preset = this.manager.setActive(select.value);
      this.applySettings?.(preset.settings, preset);
      this.#status(`Preset actif : ${preset.label}`);
      this.onChange?.({ type:'active', preset });
      this.render();
    });

    for (const button of this.container.querySelectorAll('[data-preset-action]')) {
      button.addEventListener('click', async()=>{
        try { await this.#action(button.dataset.presetAction); }
        catch (error) { this.#status(error.message, true); }
      });
    }
  }

  async #action(action) {
    const active = this.manager.getActive();
    if (action === 'new') {
      const label = globalThis.prompt?.('Nom du nouveau preset', 'Nouveau preset');
      if (!label) return;
      const preset = this.manager.create({ label, settings: this.getSettings?.() ?? {} });
      this.applySettings?.(preset.settings, preset);
      this.onChange?.({ type:'create', preset });
      this.render();
      return;
    }
    if (!active && !['import'].includes(action)) throw new Error('Sélectionnez un preset');

    if (action === 'duplicate') {
      const preset = this.manager.duplicate(active.id);
      this.applySettings?.(preset.settings, preset);
      this.onChange?.({ type:'duplicate', preset });
      this.render();
    } else if (action === 'save') {
      const preset = this.manager.update(active.id, this.getSettings?.() ?? {}, { replace:true });
      this.#status(`Réglages enregistrés : ${preset.label}`);
      this.onChange?.({ type:'save', preset });
      this.render();
    } else if (action === 'validate') {
      const preset = this.manager.validate(active.id, true);
      this.#status(`Preset validé : ${preset.label}`);
      this.onChange?.({ type:'validate', preset });
      this.render();
    } else if (action === 'rename') {
      const label = globalThis.prompt?.('Nouveau nom', active.label);
      if (!label) return;
      const preset = this.manager.rename(active.id, label);
      this.onChange?.({ type:'rename', preset });
      this.render();
    } else if (action === 'reset') {
      const preset = this.manager.reset(active.id);
      this.applySettings?.(preset.settings, preset);
      this.#status(`Preset réinitialisé : ${preset.label}`);
      this.onChange?.({ type:'reset', preset });
      this.render();
    } else if (action === 'delete') {
      if (!globalThis.confirm?.(`Supprimer « ${active.label} » ?`)) return;
      this.manager.remove(active.id);
      this.onChange?.({ type:'delete', preset:active });
      this.render();
    } else if (action === 'export') {
      const blob = new Blob([this.manager.exportJSON()], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${this.manager.namespace}-presets.json`; link.click();
      setTimeout(()=>URL.revokeObjectURL(url),0);
      this.#status('Collection de presets exportée');
    } else if (action === 'import') {
      const input = this.container.querySelector('[data-preset-import]');
      input.onchange = async()=>{
        const file = input.files?.[0]; if (!file) return;
        this.manager.importJSON(await file.text());
        const preset = this.manager.getActive();
        if (preset) this.applySettings?.(preset.settings, preset);
        this.#status('Collection de presets importée');
        this.onChange?.({ type:'import', preset });
        this.render();
      };
      input.click();
    }
  }

  #status(message, error = false) {
    const output = this.container?.querySelector('[data-preset-status]');
    if (!output) return;
    output.textContent = message;
    output.dataset.kind = error ? 'error' : 'success';
  }

  #icon(id, fallback) {
    try { return this.iconRegistry?.render?.(id) ?? fallback; }
    catch { return fallback; }
  }

  #escape(value) {
    return String(value ?? '').replace(/[&<>"']/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  }
}
