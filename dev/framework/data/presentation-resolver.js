export class PresentationResolver {
  constructor({ registry = null } = {}) { this.registry = registry; }
  format(value, resolved = null, { mode = 'label', labelField = 'label', imageField = 'image', iconField = 'icon', urlField = 'url' } = {}) {
    const object = resolved ?? value;
    const id = typeof value === 'object' ? value?.id : value;
    const label = object && typeof object === 'object' ? object[labelField] ?? object.name ?? object.id ?? id : String(object ?? id ?? '');
    const image = object && typeof object === 'object' ? object[imageField] ?? object.image_url ?? null : null;
    const icon = object && typeof object === 'object' ? object[iconField] ?? null : null;
    const url = object && typeof object === 'object' ? object[urlField] ?? null : null;
    if (mode === 'id') return { text:String(id ?? ''), id, label, image, icon, url };
    if (mode === 'id+label') return { text:[id,label].filter(Boolean).join(' — '), id, label, image, icon, url };
    if (mode === 'image') return { text:'', id, label, image, icon, url };
    if (mode === 'image+label') return { text:label, id, label, image, icon, url };
    if (mode === 'icon') return { text:'', id, label, image, icon, url };
    return { text:label, id, label, image, icon, url };
  }
  formatMany(values = [], resolved = [], options = {}) { return values.map((value,index)=>this.format(value,resolved?.[index],options)); }
}
