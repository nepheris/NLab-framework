(()=>{
  const svg=(body,viewBox='0 0 24 24')=>`<svg class="nlab-icon" viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
  const path=d=>`<path d="${d}" fill="currentColor"/>`;
  const line=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1} ${x2} ${y2}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
  const icons={
    anchor:svg(path('M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-1 7v2H7v2h4v6.05A7.01 7.01 0 0 1 5.08 14H3a9 9 0 0 0 18 0h-2.08A7.01 7.01 0 0 1 13 19.05V13h4v-2h-4V9h-2Z')),
    help:svg(`<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.8 9a2.4 2.4 0 1 1 3.3 2.2c-.8.4-1.1.8-1.1 1.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/>`),
    lock:svg(path('M7 10V7a5 5 0 0 1 10 0v3h1.2A1.8 1.8 0 0 1 20 11.8v8.4A1.8 1.8 0 0 1 18.2 22H5.8A1.8 1.8 0 0 1 4 20.2v-8.4A1.8 1.8 0 0 1 5.8 10H7Zm2 0h6V7a3 3 0 0 0-6 0v3Z')),
    unlock:svg(path('M17 10h1.2A1.8 1.8 0 0 1 20 11.8v8.4A1.8 1.8 0 0 1 18.2 22H5.8A1.8 1.8 0 0 1 4 20.2v-8.4A1.8 1.8 0 0 1 5.8 10H15V7a3 3 0 0 0-5.7-1.3L7.5 4.8A5 5 0 0 1 17 7v3Z')),
    expand:svg(path('M12 3 6 9h4v8h4V9h4l-6-6Z')),
    collapse:svg(path('m12 21 6-6h-4V7h-4v8H6l6 6Z')),
    reset:svg(`<path d="M5 8a8 8 0 1 1-1 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 3v6h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
    close:svg(`${line(6,6,18,18)}${line(18,6,6,18)}`),
    external_link:svg(`<path d="M13 5h6v6M19 5l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2"/>`),
    menu:svg(`${line(4,7,20,7)}${line(4,12,20,12)}${line(4,17,20,17)}`),
    home:svg(path('M3 11.5 12 4l9 7.5-1.3 1.6L18 11.7V20h-5v-5h-2v5H6v-8.3l-1.7 1.4L3 11.5Z')),
    scroll_top:svg(path('M12 4 5 11h4v9h6v-9h4l-7-7Z')),
    refresh:svg(`<path d="M20 7v5h-5M4 17v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 10A7 7 0 0 0 6 7.5M5.5 14A7 7 0 0 0 18 16.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
    more:svg(`<circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/>`)
  };
  icons.default_state=svg('<path d="M4 4h16L4 20Z" fill="currentColor" opacity=".95"/><path d="M20 4v16H4Z" fill="currentColor" opacity=".35"/><rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke="currentColor"/>');
  window.NLabIcons={get:name=>icons[name]||'',has:name=>Object.hasOwn(icons,name),all:()=>({...icons})};
})();
