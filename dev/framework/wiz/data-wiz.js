export class DataWiz {
  describe(items = [], fields = null) {
    const selected = fields?.length ? fields : [...new Set(items.flatMap((item)=>Object.keys(item??{})))];
    const result = {};
    for (const field of selected) {
      const values = items.map((item)=>item?.[field]).filter((value)=>value !== undefined && value !== null && value !== '');
      const numeric = values.map(Number).filter(Number.isFinite);
      const counts = new Map();
      for (const value of values) counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
      result[field] = {
        count: values.length,
        missing: items.length - values.length,
        unique: counts.size,
        top: [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([value,count])=>({ value, count })),
        numeric: numeric.length ? {
          min: Math.min(...numeric),
          max: Math.max(...numeric),
          mean: numeric.reduce((sum,value)=>sum+value,0)/numeric.length,
          sum: numeric.reduce((sum,value)=>sum+value,0)
        } : null
      };
    }
    return { rows:items.length, fields:result };
  }

  groupBy(items, field) {
    const groups = new Map();
    for (const item of items) {
      const values = Array.isArray(item?.[field]) ? item[field] : [item?.[field]];
      for (const value of values) {
        const key = value ?? '(vide)';
        const bucket = groups.get(key) ?? []; bucket.push(item); groups.set(key,bucket);
      }
    }
    return [...groups.entries()].map(([value, rows])=>({ value, count:rows.length, rows }));
  }

  histogram(items, field, { bins = 10 } = {}) {
    const values=items.map((item)=>Number(item?.[field])).filter(Number.isFinite);
    if (!values.length) return [];
    const min=Math.min(...values), max=Math.max(...values); const width=(max-min||1)/bins;
    return Array.from({length:bins},(_,index)=>({ min:min+index*width, max:index===bins-1?max:min+(index+1)*width, count:0 })).map((bin,index,array)=>{ bin.count=values.filter((value)=>value>=bin.min&&(index===array.length-1?value<=bin.max:value<bin.max)).length; return bin; });
  }
}
