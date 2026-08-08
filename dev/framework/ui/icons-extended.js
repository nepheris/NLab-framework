(()=>{
  if(!window.NLabIcons)return;
  const base=window.NLabIcons.all();
  const svg=(body)=>`<svg class="nlab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
  const p=d=>`<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const f=d=>`<path d="${d}" fill="currentColor"/>`;
  const extra={
    arrow_left:svg(p('M15 5l-7 7 7 7')),
    arrow_right:svg(p('M9 5l7 7-7 7')),
    scroll_bottom:svg(f('m12 20 7-7h-4V4H9v9H5l7 7Z')),
    search:svg(`${p('M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z')}${p('m16 16 4 4')}`),
    filter:svg(p('M4 5h16l-6 7v5l-4 2v-7L4 5Z')),
    share:svg(`${p('M8 12l8-5M8 12l8 5')}<circle cx="6" cy="12" r="2" fill="currentColor"/><circle cx="18" cy="6" r="2" fill="currentColor"/><circle cx="18" cy="18" r="2" fill="currentColor"/>`),
    print:svg(`${p('M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2')}<path d="M7 14h10v6H7z" fill="none" stroke="currentColor" stroke-width="2"/>`),
    download:svg(`${p('M12 4v11M8 11l4 4 4-4M5 20h14')}`),
    upload:svg(`${p('M12 20V9M8 13l4-4 4 4M5 4h14')}`),
    edit:svg(`${p('M4 20l4-.8L19 8.2 15.8 5 4.8 16 4 20ZM14.5 6.3l3.2 3.2')}`),
    save:svg(`${p('M5 4h12l2 2v14H5V4Z')}<path d="M8 4h7v5H8zM8 14h8v6H8z" fill="none" stroke="currentColor" stroke-width="2"/>`),
    fullscreen:svg(`${p('M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5')}`),
    settings:svg(`${p('M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z')}<path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
    info:svg(`<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7" r="1.2" fill="currentColor"/>`),
    dock_left:svg(`<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 4v16" stroke="currentColor" stroke-width="2"/>`),
    dock_right:svg(`<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 4v16" stroke="currentColor" stroke-width="2"/>`),
    dock_top:svg(`<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18" stroke="currentColor" stroke-width="2"/>`),
    dock_bottom:svg(`<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 14h18" stroke="currentColor" stroke-width="2"/>`),
    pin:svg(`${p('M9 4h6l-1 5 3 3H7l3-3-1-5ZM12 12v8')}`),
    unpin:svg(`${p('M5 5l14 14M9 4h6l-.7 3.7M7 12h6M12 12v8')}`),
    drag:svg(`<circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/>`),
    copy:svg(`${p('M9 8h10v12H9zM5 4h10v4M5 4v12h4')}`),
    link:svg(`${p('M10 13l4-4M8.5 16H7a4 4 0 0 1 0-8h3M15.5 8H17a4 4 0 0 1 0 8h-3')}`),
    eye:svg(`${p('M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z')}<circle cx="12" cy="12" r="2.5" fill="currentColor"/>`),
    eye_off:svg(`${p('M4 4l16 16M3 12s3.5-6 9-6c2 0 3.7.8 5.1 1.8M21 12s-3.5 6-9 6c-2 0-3.7-.8-5.1-1.8')}`),
    calendar:svg(`<rect x="4" y="6" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3v6M16 3v6M4 10h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`)
  };
  const all={...base,...extra};
  window.NLabIcons={get:name=>all[name]||'',has:name=>Object.hasOwn(all,name),all:()=>({...all})};
})();
