(()=>{
  const delegate=()=>window.NLabPaletteDeriver;
  const missing=()=>{throw new Error('NLabPaletteDeriver must be loaded before the Shadow Sage compatibility adapter');};
  window.NLabShadowSagePalette={
    deprecated:true,
    replaced_by:'NLabPaletteDeriver',
    derive:(value)=>delegate()?.derive?.(value)||missing(),
    apply:(value,target)=>delegate()?.apply?.(value,target)||missing(),
    resolve:(value)=>value
  };
})();
