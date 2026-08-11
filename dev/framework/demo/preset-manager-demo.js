import { BrowserStorage } from '../core/storage.js';
import { PresetManager } from '../components/preset-manager.js';
import { PresetManagerView } from '../components/preset-manager-view.js';
import { createCoreIconRegistry } from '../icons/icon-registry.js';

const $ = (selector) => document.querySelector(selector);
const storage = new BrowserStorage(localStorage, { prefix:'nlab-demo:' });
const icons = createCoreIconRegistry();

const manager = new PresetManager({
  namespace:'demo-style',
  storage,
  canonical:[
    { id:'demo-style.light', label:'Clair', settings:{ background:'#eef4ff', foreground:'#171717', size:18 } },
    { id:'demo-style.dark', label:'Sombre', settings:{ background:'#111827', foreground:'#f9fafb', size:18 } },
    { id:'demo-style.compact', label:'Compact', settings:{ background:'#f8fafc', foreground:'#1f2937', size:14 } },
  ],
});

function readSettings() {
  return {
    background: $('#preset-bg').value,
    foreground: $('#preset-fg').value,
    size: Number($('#preset-size').value),
  };
}

function applySettings(settings = {}) {
  if (settings.background) $('#preset-bg').value = settings.background;
  if (settings.foreground) $('#preset-fg').value = settings.foreground;
  if (settings.size) $('#preset-size').value = String(settings.size);
  renderPreview();
}

function renderPreview() {
  const settings = readSettings();
  $('#preset-size-value').textContent = `${settings.size} px`;
  $('#preset-preview').style.setProperty('--preset-bg', settings.background);
  $('#preset-preview').style.setProperty('--preset-fg', settings.foreground);
  $('#preset-preview').style.setProperty('--preset-size', `${settings.size}px`);
}

if (!manager.getActive()) manager.setActive('demo-style.light');
applySettings(manager.getActive()?.settings);

new PresetManagerView({
  manager,
  root:document,
  iconRegistry:icons,
  getSettings:readSettings,
  applySettings,
  onChange:()=>renderPreview(),
}).mount($('#preset-manager'));

for (const control of [$('#preset-bg'), $('#preset-fg'), $('#preset-size')]) {
  control.addEventListener('input', renderPreview);
}
