/* MAPPA PLUS — scorciatoie e lista dei luoghi nella mappa grande.
   - Scorciatoie in più: ✈ Soratte (il bunker con l'aereo), 🌰 la nocchia d'oro di oggi.
   - «Luoghi»: elenco di tutti i posti e giochi, filtrabile per categoria, ordinato per distanza;
     un tocco imposta la missione (freccia), «Vai» ti porta lì subito (non a piedi).
   Modulo esterno: usa TG.debug (places, acts, car, VEH, setDest, goTo, showToast), TG.Profile.has, TG.CATS. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const D = () => TG.debug;
const EXTRA = [
  { q: 'soratte', label: 'Soratte', col: '#b53a2a', ico: '✈', trova: () => (D().places || []).find(p => p.id === 'bunker'), toast: ['Monte Soratte', "All'aeroporto del bunker c'è l'aereo: sali e vola su tutta la Tuscia"] },
  { q: 'nocchia', label: 'Nocchia', col: '#f2b134', ico: '🌰', trova: () => { try { if (TG.NocchiaGiorno.trovata()) return null; const s = TG.NocchiaGiorno.scelta(); return s && { name: "A nocchia d'oro", x: s.x, z: s.z, nocchia: true }; } catch(e){ return null; } }, toast: ["A nocchia d'oro", 'Cerca il fascio di luce: +10 nocchie per il tuo paese'] }
];
function aPiedi(){ try { return D().VEH.cur.id === 'piedi'; } catch(e){ return false; } }
function chiudiMappa(){ const b = document.querySelector('#mapOv [data-close]'); if (b) b.click(); }
function vai(p, subito){
  const d = D(); if (!p) return;
  try { TG.Stats && TG.Stats.ev('mappa_rapida', p.id || p.name); } catch(e){}
  if (!subito || aPiedi()) { chiudiMappa(); d.setDest(p); if (aPiedi() && subito) TG.msg('A piedi non si vola', 'Missione impostata: segui la freccia. Con la Vespa la Tuscia si accorcia', 3); return; }
  if (p.nocchia) { chiudiMappa(); d.setDest(p); TG.msg("Segui a freccia: a nocchia d'oro sta là"); return; }  // la nocchia si va a cercare, non si teletrasporta
  chiudiMappa(); d.goTo(p);
}
function scorciatoie(){
  const q = document.getElementById('mapQuick'); if (!q || q.dataset.plus) return; q.dataset.plus = '1';
  for (const e of EXTRA) {
    const b = document.createElement('button'); b.dataset.q = e.q; b.innerHTML = '<i style="background:' + e.col + '"></i><span>' + e.ico + ' ' + e.label + '</span>';
    b.onclick = ev => { ev.stopPropagation(); const p = e.trova(); if (!p) { TG.msg(e.q === 'nocchia' ? "A nocchia de oggi l'hai già presa · domani ce n'è n'altra" : 'Non ancora'); return; } vai(p, true); setTimeout(() => TG.msg(e.toast[0], e.toast[1], 4), 1400); };
    q.appendChild(b);
  }
  const l = document.createElement('button'); l.dataset.q = 'luoghi'; l.innerHTML = '<i style="background:#5fb7c4"></i><span>📍 Luoghi</span>'; l.onclick = ev => { ev.stopPropagation(); toggle(); }; q.appendChild(l);
}
let pan = null, filtro = 'tutti';
const CATS = () => TG.CATS || {};
function toggle(){ if (!pan) costruisci(); const ap = pan.hidden; pan.hidden = !ap; if (ap) { aggiorna(); try { TG.Stats && TG.Stats.ev('mappa_luoghi', ''); } catch(e){} } }
function costruisci(){
  const w = document.getElementById('bigMapWrap'); if (!w) return;
  pan = document.createElement('div'); pan.id = 'mapLuoghi'; pan.className = 'tg-glass'; pan.hidden = true;
  const st = document.createElement('style'); st.textContent = `
#mapLuoghi{position:absolute;right:12px;top:12px;bottom:12px;width:min(360px,calc(100% - 24px));z-index:3;display:grid;grid-template-rows:auto auto 1fr;gap:8px;padding:12px;overflow:hidden}
#mapLuoghi .mlHead{display:flex;align-items:center;justify-content:space-between}#mapLuoghi h3{margin:0;font-family:var(--tg-display);font-weight:800;font-size:17px;text-transform:uppercase}
#mapLuoghi .mlX{all:unset;cursor:pointer;font-size:22px;line-height:1;padding:0 6px;color:#f3e7cb}
#mapLuoghi .mlCats{display:flex;gap:6px;flex-wrap:wrap}#mapLuoghi .mlCats button{all:unset;cursor:pointer;padding:5px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.22);font:700 12px Figtree,sans-serif;color:#ddd4bf}#mapLuoghi .mlCats button[aria-pressed=true]{background:#f3e7cb;color:#17201f;border-color:#f3e7cb}
#mapLuoghi .mlList{overflow:auto;display:grid;gap:4px;align-content:start;-webkit-overflow-scrolling:touch}
#mapLuoghi .mlRow{display:grid;grid-template-columns:12px 1fr auto auto;gap:9px;align-items:center;padding:7px 8px;border-radius:10px;cursor:pointer;color:#f3e7cb}#mapLuoghi .mlRow:hover{background:rgba(255,255,255,.07)}
#mapLuoghi .mlRow i{width:10px;height:10px;border-radius:3px;display:inline-block}#mapLuoghi .mlRow b{font-size:13.5px;font-weight:700;display:block}#mapLuoghi .mlRow small{font-size:11px;color:var(--tg-muted)}
#mapLuoghi .mlRow em{font-style:normal;font-family:var(--tg-mono);font-size:12px;color:#e2b765;white-space:nowrap}#mapLuoghi .mlRow .ok{color:#8cbf52;font-weight:900}
#mapLuoghi .mlRow button{all:unset;cursor:pointer;padding:5px 9px;border-radius:999px;background:#d8432a;color:#fff;font:800 11px Figtree,sans-serif}
@media (max-width:700px){#mapLuoghi{left:12px;right:12px;top:auto;bottom:12px;width:auto;max-height:52%;padding:10px}}`;
  document.head.appendChild(st);
  const cats = [['tutti', 'Tutti']].concat(Object.keys(CATS()).map(k => [k, CATS()[k].label])).concat([['giochi', 'Giochi']]);
  pan.innerHTML = '<div class="mlHead"><h3>Luoghi</h3><button class="mlX" aria-label="Chiudi">×</button></div><div class="mlCats">' + cats.map(c => '<button data-c="' + c[0] + '" aria-pressed="' + (c[0] === filtro) + '">' + c[1] + '</button>').join('') + '</div><div class="mlList"></div>';
  pan.querySelector('.mlX').onclick = () => { pan.hidden = true; };
  pan.querySelectorAll('.mlCats button').forEach(b => b.onclick = () => { filtro = b.dataset.c; pan.querySelectorAll('.mlCats button').forEach(x => x.setAttribute('aria-pressed', x === b)); aggiorna(); });
  pan.addEventListener('pointerdown', e => e.stopPropagation());
  w.appendChild(pan);
}
function aggiorna(){
  const d = D(), c = d.car || { x: 0, z: 0 }, has = id => { try { return TG.Profile.has(id); } catch(e){ return false; } };
  const righe = [];
  if (filtro !== 'giochi') for (const p of d.places || []) { if (!p.cat || Math.abs(p.z) > 50000) continue; if (filtro !== 'tutti' && p.cat !== filtro) continue; righe.push({ p, sc: has(p.id), cat: (CATS()[p.cat] || {}).label || p.cat, col: (CATS()[p.cat] || {}).hex || '#e2b765', dist: Math.hypot(p.x - c.x, p.z - c.z) }); }
  if (filtro === 'tutti' || filtro === 'giochi') for (const a of d.acts || []) { if (a.x == null) continue; righe.push({ p: a, sc: true, cat: 'Gioco', col: a.color || '#5fb7c4', dist: Math.hypot(a.x - c.x, a.z - c.z), gioco: true }); }
  righe.sort((a, b) => a.dist - b.dist);
  const km = m => m < 950 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
  const L = pan.querySelector('.mlList'); L.innerHTML = '';
  for (const r of righe) {
    const row = document.createElement('div'); row.className = 'mlRow';
    const nome = r.p.name;  // mappa turistica: i nomi si vedono sempre, la scoperta (la scheda) si guadagna arrivandoci
    row.innerHTML = '<i style="background:' + r.col + '"></i><div><b>' + nome + '</b><small>' + r.cat + (r.gioco ? '' : r.sc ? ' <span class="ok">✓ scoperto</span>' : ' · da scoprire') + '</small></div><em>' + km(r.dist) + '</em><button type="button">Vai</button>';
    row.onclick = () => vai(r.p, false);
    row.querySelector('button').onclick = e => { e.stopPropagation(); vai(r.p, true); };
    L.appendChild(row);
  }
}
function avvia(){ if (!D() || !document.getElementById('mapQuick')) return setTimeout(avvia, 1500); scorciatoie(); const m = document.getElementById('bMap'); if (m) m.addEventListener('click', () => { if (pan && !pan.hidden) aggiorna(); }); }
TG.MappaPlus = { toggle, aggiorna, vai };
if (document.readyState === 'complete') setTimeout(avvia, 1500); else addEventListener('load', () => setTimeout(avvia, 1500));
})();
