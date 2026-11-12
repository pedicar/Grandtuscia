/* NIENTE ZOOM DEL BROWSER mentre si gioca: su iPhone un doppio tocco o due dita (joystick + altro dito)
   ingrandivano la pagina e non si tornava indietro. Qui blocco il gesto e, se lo zoom scappa lo stesso,
   lo riporto a 1 rimettendo il viewport. La mappa grande ha il suo pinch via pointer events e continua a funzionare. */
(function(){
'use strict';
const meta = document.querySelector('meta[name="viewport"]');
const base = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
if (meta) meta.setAttribute('content', base);
const stop = e => { e.preventDefault(); };
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, stop, { passive: false }));
document.addEventListener('touchmove', e => { if (e.touches.length > 1 && !e.target.closest('#bigMapWrap')) e.preventDefault(); }, { passive: false });
document.addEventListener('dblclick', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); }, { passive: false });
let ultimo = 0;
document.addEventListener('touchend', e => { const t = Date.now(); if (t - ultimo < 320 && !e.target.closest('button,a,input,textarea,select,label')) e.preventDefault(); ultimo = t; }, { passive: false });
function raddrizza(){
  const vv = window.visualViewport; if (!vv || !meta || vv.scale <= 1.02) return;
  meta.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no');
  setTimeout(() => meta.setAttribute('content', base), 60);
  try { window.TG && TG.Stats && TG.Stats.ev('zoom_raddrizzato', '', Math.round(vv.scale * 100)); } catch(e){}
}
if (window.visualViewport) { window.visualViewport.addEventListener('resize', () => setTimeout(raddrizza, 150)); setTimeout(raddrizza, 1500); }
})();
