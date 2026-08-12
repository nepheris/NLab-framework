const FIELD_TYPES = new Set(['color','checkbox','select','number','text','asset']);
const PRESET_IDS = new Set(['standard','transparent','colored-background','with-logo','theme-monochrome','custom']);

const clone = (value) => value === undefined ? undefined : structuredClone(value);
const text = (value, fallback = '') => {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
};

export class QRStudioSchemaError extends Error {
  constructor(message, code = 'QR_STUDIO_SCHEMA_ERROR', details = null) {
    super(message);
    this.name = 'QRStudioSchemaError';
    this.code = code;
    this.details = details;
  }
}

const ERROR_LEVELS = Object.freeze([
  Object.freeze({ value:'L', label:'Faible (L)', recovery:'≈ 7 %', help:'Capacité de correction minimale. À privilégier quand le QR reste propre et que l’on veut conserver une densité faible.' }),
  Object.freeze({ value:'M', label:'Moyenne (M)', recovery:'≈ 15 %', help:'Compromis recommandé par défaut entre densité du QR code et tolérance aux défauts.' }),
  Object.freeze({ value:'Q', label:'Élevée (Q)', recovery:'≈ 25 %', help:'Tolérance renforcée aux altérations. Utile si le QR peut être imprimé petit ou partiellement dégradé.' }),
  Object.freeze({ value:'H', label:'Très élevée (H)', recovery:'≈ 30 %', help:'Tolérance maximale. À utiliser notamment avec un logo central ou lorsque le QR risque d’être partiellement masqué.' })
]);

const FIELDS = Object.freeze([
  Object.freeze({ id:'dark', path:'dark', label:'Couleur QR code', type:'color', group:'appearance', default:'#000000', help:'Couleur des modules sombres du QR code.' }),
  Object.freeze({ id:'light', path:'light', label:'Couleur arrière-plan', type:'color', group:'appearance', default:'#ffffff', help:'Couleur du fond lorsque le mode transparent est désactivé.' }),
  Object.freeze({ id:'transparent', path:'transparent', label:'Arrière-plan transparent', type:'checkbox', group:'appearance', default:false, help:'Rend réellement le fond du QR code transparent. La couleur arrière-plan reste conservée comme valeur de repli.' }),
  Object.freeze({ id:'errorCorrectionLevel', path:'errorCorrectionLevel', label:"Correction d'erreur", type:'select', group:'quality', default:'M', options:ERROR_LEVELS, help:'Détermine la quantité de données redondantes permettant au QR code de rester lisible malgré une dégradation.' }),
  Object.freeze({ id:'width', path:'width', label:'Taille', type:'number', group:'geometry', default:256, min:64, max:4096, step:1, unit:'px', help:'Largeur de sortie du QR code.' }),
  Object.freeze({ id:'margin', path:'margin', label:'Marge', type:'number', group:'geometry', default:2, min:0, max:64, step:1, help:'Zone calme autour du QR code.' }),
  Object.freeze({ id:'format', path:'format', label:'Format', type:'select', group:'output', default:'svg', options:Object.freeze([
    Object.freeze({value:'svg',label:'SVG',help:'Format vectoriel recommandé pour le web et l’impression.'}),
    Object.freeze({value:'png',label:'PNG',help:'Format bitmap utile pour certains exports ou logiciels.'})
  ]) }),
  Object.freeze({ id:'logo', path:'logo', label:'Logo', type:'asset', group:'logo', default:null, help:'Image facultative placée au centre du QR code.' }),
  Object.freeze({ id:'logoSize', path:'logoSize', label:'Taille du logo', type:'number', group:'logo', default:0.22, min:0.10, max:0.32, step:0.01, visibleWhen:Object.freeze({field:'logo',operator:'truthy'}), help:'Part relative de la largeur occupée par le logo.' }),
  Object.freeze({ id:'logoBackground', path:'logoBackground', label:'Fond du logo', type:'color', group:'logo', default:'#ffffff', visibleWhen:Object.freeze({field:'logo',operator:'truthy'}), help:'Fond de protection derrière le logo central.' }),
  Object.freeze({ id:'logoRadius', path:'logoRadius', label:'Arrondi du fond du logo', type:'number', group:'logo', default:12, min:0, max:256, step:1, unit:'px', visibleWhen:Object.freeze({field:'logo',operator:'truthy'}), help:'Rayon des coins du fond de protection du logo.' })
]);

const BASE_CONFIG = Object.freeze({
  type:'url',
  width:256,
  margin:2,
  errorCorrectionLevel:'M',
  dark:'#000000',
  light:'#ffffff',
  transparent:false,
  logo:null,
  logoSize:0.22,
  logoBackground:'#ffffff',
  logoRadius:12,
  format:'svg'
});

const PRESETS = Object.freeze([
  Object.freeze({
    id:'standard', label:'Standard', description:'QR noir sur fond blanc, configuration générale de référence.',
    config:Object.freeze({...BASE_CONFIG}),
    meta:Object.freeze({system:true, category:'base'})
  }),
  Object.freeze({
    id:'transparent', label:'Transparent', description:'QR noir avec arrière-plan réellement transparent.',
    config:Object.freeze({...BASE_CONFIG, transparent:true}),
    meta:Object.freeze({system:true, category:'background'})
  }),
  Object.freeze({
    id:'colored-background', label:'Fond coloré', description:'Exemple de QR avec une couleur de fond distincte.',
    config:Object.freeze({...BASE_CONFIG, dark:'#1f2937', light:'#fef3c7'}),
    meta:Object.freeze({system:true, category:'background'})
  }),
  Object.freeze({
    id:'with-logo', label:'Avec logo', description:'Preset prévu pour un logo central ; le logo doit être fourni par l’utilisateur ou le thème.',
    config:Object.freeze({...BASE_CONFIG, errorCorrectionLevel:'H', logo:null}),
    meta:Object.freeze({system:true, category:'branding', requires:Object.freeze(['logo']), recommendedErrorCorrectionLevel:'H'})
  }),
  Object.freeze({
    id:'theme-monochrome', label:'Monochrome thème', description:'Preset monochrome dont les couleurs peuvent être remplacées par les couleurs résolues du thème.',
    config:Object.freeze({...BASE_CONFIG, dark:'#111827', light:'#ffffff'}),
    meta:Object.freeze({system:true, category:'theme', themeBindings:Object.freeze({dark:'text',light:'surface'})})
  }),
  Object.freeze({
    id:'custom', label:'Personnalisé', description:'Point de départ neutre pour une configuration entièrement éditable.',
    config:Object.freeze({...BASE_CONFIG}),
    meta:Object.freeze({system:true, category:'custom', editable:true})
  })
]);

function validateField(field) {
  if (!field || typeof field !== 'object' || Array.isArray(field)) throw new QRStudioSchemaError('Field descriptor must be an object','INVALID_FIELD');
  if (!text(field.id)) throw new QRStudioSchemaError('Field id is required','INVALID_FIELD');
  if (!FIELD_TYPES.has(field.type)) throw new QRStudioSchemaError('Unsupported field type','INVALID_FIELD_TYPE',{field:field.id,type:field.type});
  return field;
}

function validatePreset(preset) {
  if (!preset || typeof preset !== 'object' || Array.isArray(preset)) throw new QRStudioSchemaError('Preset descriptor must be an object','INVALID_PRESET');
  if (!PRESET_IDS.has(preset.id)) throw new QRStudioSchemaError('Unknown system preset id','INVALID_PRESET_ID',{id:preset.id});
  return preset;
}

export class QRStudioSchema {
  constructor({ fields = FIELDS, presets = PRESETS } = {}) {
    if (!Array.isArray(fields) || !Array.isArray(presets)) throw new QRStudioSchemaError('fields and presets must be arrays','INVALID_SCHEMA');
    this._fields = fields.map((field) => clone(validateField(field)));
    this._presets = presets.map((preset) => clone(validatePreset(preset)));
    this.#assertUnique(this._fields, 'field');
    this.#assertUnique(this._presets, 'preset');
  }

  fields({ group = null } = {}) {
    const normalizedGroup = group == null ? null : text(group);
    return this._fields.filter((field) => normalizedGroup == null || field.group === normalizedGroup).map(clone);
  }

  field(id) {
    const key = text(id);
    const found = this._fields.find((field) => field.id === key);
    return found ? clone(found) : null;
  }

  errorCorrectionLevels() { return clone(ERROR_LEVELS); }

  presets() { return this._presets.map(clone); }

  preset(id) {
    const key = text(id);
    const found = this._presets.find((preset) => preset.id === key);
    return found ? clone(found) : null;
  }

  draftFromPreset(id, patch = {}) {
    const preset = this.preset(id);
    if (!preset) throw new QRStudioSchemaError('Unknown QR Studio preset','UNKNOWN_PRESET',{id});
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new QRStudioSchemaError('Preset patch must be an object','INVALID_PATCH');
    return { id:preset.id, label:preset.label, config:{...clone(preset.config),...clone(patch)}, meta:clone(preset.meta) };
  }

  controlPanel({ presetId = 'standard' } = {}) {
    const preset = this.preset(presetId);
    if (!preset) throw new QRStudioSchemaError('Unknown QR Studio preset','UNKNOWN_PRESET',{presetId});
    return {
      presetId:preset.id,
      presetLabel:preset.label,
      fields:this.fields(),
      config:clone(preset.config),
      actions:[
        {id:'edit',label:'Modifier'},
        {id:'regenerate',label:'Régénérer'},
        {id:'validate',label:'Valider / OK'},
        {id:'reset',label:'Reset'}
      ]
    };
  }

  snapshot() {
    return { fields:this.fields(), errorCorrectionLevels:this.errorCorrectionLevels(), presets:this.presets() };
  }

  #assertUnique(entries, kind) {
    const seen = new Set();
    for (const entry of entries) {
      if (seen.has(entry.id)) throw new QRStudioSchemaError(`Duplicate ${kind} id`,'DUPLICATE_ID',{kind,id:entry.id});
      seen.add(entry.id);
    }
  }
}
