/* A GUERRA DE I TERRENI — la regola è una: ogni terreno con le nocchie è del paese che ci ha raccolto di più questa settimana.
   - Tutti i terreni (11 + il podere) sono aperti a tutti: non si comprano più, si contendono.
   - Ogni nocchia (o castagna) raccolta dentro un terreno è un punto per il tuo paese in quel terreno (server: tg_terra_punto).
   - Sopra ogni terreno c'è il cartello col nome e il colore del paese che lo tiene; dentro, il blocco sotto la minimappa dice solo
     «Fabrica 340 · Carbognano 290». Quando superi: «Presa!». Se al rientro ve l'hanno fregato, te lo dice e ti dà la freccia.
   - La settimana riparte il lunedì; domenica vince chi tiene più terreni.
   Esterno: TG.debug (car, scene, world, campi, campoIn, setDest, mapHits), TG.Profile.harvestAdd, TG.Contadino, TG.PrimoMinuto, TG.msg. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const cfg = window.TG_STATS_CONFIG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c, v, x) => { try { TG.Stats && TG.Stats.ev(t, c, v, x); } catch(e){} };
const msg = (a, b, s) => { try { TG.msg(a, b, s); } catch(e){} };
const $ = id => document.getElementById(id);
const COLORI = { caprarola: '#d8432a', fabrica: '#2f7fd1', carbognano: '#2e9e5b', ronciglione: '#e0a21b', canepina: '#8e44ad', vallerano: '#16a085', soriano: '#c0392b', 'civita-castellana': '#7f8c8d', viterbo: '#f39c12', nepi: '#1abc9c', vignanello: '#9b59b6', corchiano: '#e67e22', sutri: '#3498db', vetralla: '#27ae60', 'bassano-romano': '#d35400', gallese: '#2c3e50', fuori: '#95a5a6' };
const colore = p => { if (!p) return '#8a8f88'; if (COLORI[p]) return COLORI[p]; let h = 0; for (const c of p) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 55% 50%)`; };
const paese = () => { const p = (TG.PrimoMinuto && TG.PrimoMinuto.paese) || ls.get('tg-paese-dev'); return p && p !== 'nessuno' ? p : null; };
const nomeP = p => { try { return (TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p; } catch(e){ return p; } };
const corto = p => (nomeP(p) || '').replace(/ (di|in|sul|al|nel) .*$/i, '');
const dev = () => { try { return TG.Stats && TG.Stats.dispositivo; } catch(e){ return null; } };
async function rpc(f, body){
  if (!cfg.url) throw new Error('niente server');
  const r = await fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/' + f, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: 'Bearer ' + cfg.key }, body: JSON.stringify(body || {}) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}

/* ---------- i terreni ---------- */
let TERRE = [];   // {id:'t:...', nome, x, z, rad, campo}
const breve = n => n.replace(/^(Il|I|La|Le|Lo) /, '').replace(/^noccioleto /i, 'Noccioleto ').replace(/^castagneto /i, 'Castagneto ');
function costruisci(){
  const out = [];
  let campi = []; try { campi = TG.debug.campi() || []; } catch(e){}
  for (const o of campi) { if (!o || !o.T || !o.campo) continue; out.push({ id: 't:' + o.T.id, nome: o.T.nome, x: o.campo.cx, z: o.campo.cz, rad: o.campo.rad, frutto: o.T.frutto, o }); }
  try { const P = TG.GEO.PODERE; out.unshift({ id: 't:podere', nome: 'Il Podere', x: P.x, z: P.z, rad: P.r, frutto: 'n', podere: true }); } catch(e){}
  return out;
}
function terraIn(x, z){
  try { const o = TG.debug.campoIn(x, z); if (o) return TERRE.find(t => t.o === o) || null; } catch(e){}
  const p = TERRE.find(t => t.podere); if (p && Math.hypot(x - p.x, z - p.z) < p.rad) return p;
  return null;
}
function vicina(x, z, max){ let best = null, bd = max; for (const t of TERRE) { const d = Math.hypot(x - t.x, z - t.z) - t.rad; if (d < bd) { bd = d; best = t; } } return best; }
// tutti i terreni aperti a tutti: per il gioco del contadino risultano «tuoi» (così si raccoglie dappertutto)
function apriTutti(){
  try { const L = TG.Contadino.stato(TG.Profile.data); for (const T of TG.Contadino.TERRENI) L.terreni[T.id] = L.terreni[T.id] || Date.now(); } catch(e){}
}

/* ---------- punteggi ---------- */
let classifica = {}, locali = {}, daMandare = {}, versione = 0, caricato = false;
function punti(id, p){ const l = classifica[id] || []; const r = l.find(x => x.paese === p); return (r ? r.punti : 0) + ((locali[id] || {})[p] || 0); }
function righe(id){
  const m = {}; for (const r of (classifica[id] || [])) m[r.paese] = r.punti;
  for (const p in (locali[id] || {})) m[p] = (m[p] || 0) + locali[id][p];
  return Object.entries(m).map(([paese, punti]) => ({ paese, punti })).sort((a, b) => b.punti - a.punti);
}
const padrone = id => { const r = righe(id)[0]; return r && r.punti > 0 ? r.paese : null; };
async function aggiorna(){ try { const n = await rpc('tg_terre'); if (n && typeof n === 'object') { classifica = n; locali = {}; versione++; } } catch(e){} caricato = true; }
async function invia(){
  const p = paese(), d = dev(); if (!p || !d) return;
  for (const id of Object.keys(daMandare)) {
    const n = daMandare[id]; if (!n) continue; daMandare[id] = 0;
    const prima = padrone(id);
    try {
      const r = await rpc('tg_terra_punto', { p_dev: d, p_terra: id, p_paese: p, p_punti: n });
      if (r && r.aggiunti) {
        locali[id] = locali[id] || {}; locali[id][p] = (locali[id][p] || 0) + r.aggiunti; versione++;
        if (padrone(id) === p && prima !== p) { const t = TERRE.find(x => x.id === id); msg(`🌰 Presa! ${t ? breve(t.nome) : ''}`, prima ? `L'avete fregato a ${corto(prima)}: mo' è de ${corto(p)}` : `Mo' è de ${corto(p)}`, 5); ev('terra_presa', id, null, { a: prima }); }
      }
    } catch(e){ daMandare[id] = (daMandare[id] || 0) + n; }
  }
}
// ogni nocchia raccolta dentro un terreno conta pe' o paese tuo
function aggancia(){
  const P = TG.Profile; if (!P || !P.harvestAdd || P.harvestAdd._terre) return;
  const o = P.harvestAdd.bind(P);
  const n = function(t, a){ try { if ((t === 'n' || t === 'c') && a > 0 && paese()) { const c = TG.debug.car, T = c && terraIn(c.x, c.z); if (T) { daMandare[T.id] = (daMandare[T.id] || 0) + a; locali[T.id] = locali[T.id] || {}; } } } catch(e){} return o(t, a); };
  n._terre = 1; P.harvestAdd = n;
}

/* ---------- il blocco sotto la minimappa: solo quando sei dentro o vicino a un terreno ---------- */
let box = null;
function ui(){
  if (box) return;
  const st = document.createElement('style'); st.textContent = `
#trBox{position:fixed;z-index:30;right:10px;width:min(196px,52vw);padding:5px 8px 6px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:rgba(16,22,21,.82);color:#f3e7cb;font:700 11px/1.3 Figtree,"Segoe UI",system-ui,sans-serif;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);cursor:pointer}
#trBox .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:800}
#trBox .r{display:flex;justify-content:space-between;gap:6px;white-space:nowrap;margin-top:2px}#trBox .r i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
#trBox .b{height:4px;border-radius:2px;background:rgba(255,255,255,.14);margin-top:4px;overflow:hidden}#trBox .b i{display:block;height:100%;width:0;transition:width .4s}
#trBox .m{margin-top:3px;color:#c9bfa8;font-weight:600}
body:not(.playing) #trBox,body:has(#mapOv:not([hidden])) #trBox,body:has(#pmOv:not([hidden])) #trBox,body:has(#trOv:not([hidden])) #trBox{display:none!important}`;
  document.head.appendChild(st);
  box = document.createElement('div'); box.id = 'trBox'; box.style.display = 'none'; box.onclick = () => aggiorna().then(pannello);
  document.body.appendChild(box);
}
function aggiornaBox(){
  ui();
  if (!document.body.classList.contains('playing')) { box.style.display = 'none'; return; }
  let c; try { c = TG.debug.car; } catch(e){ return; } if (!c) return;
  const dentro = terraIn(c.x, c.z), T = dentro || vicina(c.x, c.z, 60);
  if (!T) { box.style.display = 'none'; const pr = $('primi'); if (pr) pr.style.visibility = ''; return; }
  const m = TG.debug.mini || $('mini'); if (m) { const r = m.getBoundingClientRect(); box.style.top = (r.bottom + 6) + 'px'; box.style.right = Math.max(10, innerWidth - r.right) + 'px'; } else box.style.top = 'calc(232px + env(safe-area-inset-top,0px))';
  const p = paese(), l = righe(T.id), pad = l[0] && l[0].punti > 0 ? l[0] : null, mio = punti(T.id, p) + (daMandare[T.id] || 0);
  const altro = pad && pad.paese !== p ? pad : (l.find(x => x.paese !== p) || null);
  box.style.display = 'block'; box.style.borderColor = pad ? colore(pad.paese) : 'rgba(255,255,255,.3)';
  const riga = (pp, n) => `<span><i style="background:${colore(pp)}"></i>${pp === p ? '<b>' : ''}${corto(pp)} ${n}${pp === p ? '</b>' : ''}</span>`;
  const consiglio = !dentro ? 'entra e raccoi' : (!pad ? 'raccoi: è libero' : pad.paese === p ? 'è vostro' : `ne mancano ${altro.punti - mio + 1}`);
  box.innerHTML = `<div class="n">🌰 ${breve(T.nome)} · <span style="color:#c9bfa8;font-weight:600">${consiglio}</span></div><div class="r">${p ? riga(p, mio) : ''}${altro ? riga(altro.paese, altro.punti) : '<span>nessuno</span>'}</div>`;
  // il compito iniziale («Raccogli 10 nocciole») dice la stessa cosa: quando c'è il blocco, il compito si toglie
  const pr = $('primi'); if (pr) pr.style.visibility = 'hidden';
}

/* ---------- cartelli sopra i terreni ---------- */
const cartelli = {};
function cartello(T){
  const p = padrone(T.id), testo = (p ? corto(p) : 'Libero'), col = colore(p);
  const k = testo + col; const old = cartelli[T.id];
  if (old && old.k === k) return;
  if (old) { try { TG.debug.scene.remove(old.s); old.s.material.map.dispose(); } catch(e){} }
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = 'rgba(16,22,21,.82)'; c.beginPath(); c.roundRect(6, 6, 500, 116, 28); c.fill();
  c.fillStyle = col; c.beginPath(); c.roundRect(6, 6, 30, 116, [28, 0, 0, 28]); c.fill();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#f3e7cb'; c.font = '700 30px Figtree, system-ui, sans-serif'; c.fillText(breve(T.nome).slice(0, 30), 270, 40);
  c.fillStyle = p ? col : '#c9bfa8'; c.font = '800 46px Figtree, system-ui, sans-serif'; c.fillText(testo.slice(0, 18), 270, 88);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  s.scale.set(22, 5.5, 1); let y = 0; try { y = TG.debug.world.ground(T.x, T.z); } catch(e){}
  s.position.set(T.x, y + 30, T.z); s.renderOrder = 3;
  TG.debug.scene.add(s); cartelli[T.id] = { s, k };
}
function nascondiVicini(){ let c; try { c = TG.debug.car; } catch(e){ return; } if (!c) return; for (const T of TERRE) { const k = cartelli[T.id]; if (k) k.s.visible = Math.hypot(c.x - T.x, c.z - T.z) > T.rad + 90; } }
let vCart = -1;
function aggiornaCartelli(){ if (vCart === versione || !window.THREE) return; vCart = versione; for (const T of TERRE) try { cartello(T); } catch(e){} }

/* ---------- pannello: tutti i terreni ---------- */
let pan = null;
function pannello(){
  if (!pan) {
    pan = document.createElement('div'); pan.id = 'trOv'; pan.hidden = true;
    const st = document.createElement('style'); st.textContent = `
#trOv{position:fixed;inset:0;z-index:96;background:rgba(10,14,12,.86);display:flex;align-items:center;justify-content:center;padding:14px;font-family:Figtree,"Segoe UI",system-ui,sans-serif;color:#f3e7cb}#trOv[hidden]{display:none}
#trOv .c{width:min(460px,100%);max-height:100%;overflow:auto;background:#17201f;border:1px solid rgba(242,199,78,.5);border-radius:18px;padding:14px}
#trOv h2{margin:0 0 2px;font-size:20px;display:flex;justify-content:space-between}#trOv h2 button{all:unset;cursor:pointer;font-size:24px;padding:0 6px}
#trOv p{margin:0 0 10px;color:#c9bfa8;font-size:13px}
#trOv .row{display:grid;grid-template-columns:12px 1fr auto;gap:10px;align-items:center;padding:8px;border-radius:10px;cursor:pointer}#trOv .row:hover{background:rgba(255,255,255,.06)}
#trOv .row i{width:12px;height:12px;border-radius:50%}#trOv .row b{display:block;font-size:14px}#trOv .row small{color:#9aa39c;font-size:12px}#trOv .row em{font-style:normal;color:#e2b765;font:600 12px ui-monospace,monospace}`;
    document.head.appendChild(st); document.body.appendChild(pan);
    pan.addEventListener('click', e => { if (e.target === pan) pan.hidden = true; });
  }
  let c = { x: 0, z: 0 }; try { c = TG.debug.car; } catch(e){}
  const tot = {}; for (const T of TERRE) { const p = padrone(T.id); if (p) tot[p] = (tot[p] || 0) + 1; }
  const testa = Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([p, n]) => `<b style="color:${colore(p)}">${corto(p)} ${n}</b>`).join(' · ') || 'Ancora tutti liberi';
  const lista = TERRE.map(T => ({ T, d: Math.hypot(T.x - c.x, T.z - c.z), l: righe(T.id) })).sort((a, b) => a.d - b.d);
  pan.innerHTML = `<div class="c"><h2>🌰 I terreni <button aria-label="Chiudi">×</button></h2><p>Ogni terreno è del paese che c'ha raccolto de più questa settimana. Domenica vince chi ne tiene de più. ${testa}</p>`
    + lista.map(({ T, d, l }) => `<div class="row" data-t="${T.id}"><i style="background:${colore(l[0] && l[0].paese)}"></i><div><b>${breve(T.nome)}</b><small>${l.length ? l.slice(0, 2).map(r => corto(r.paese) + ' ' + r.punti).join(' · ') : 'libero'}</small></div><em>${d < 950 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km'}</em></div>`).join('') + '</div>';
  pan.querySelector('h2 button').onclick = () => { pan.hidden = true; };
  pan.querySelectorAll('.row').forEach(r => r.onclick = () => { const T = TERRE.find(x => x.id === r.dataset.t); pan.hidden = true; try { const m = document.querySelector('#mapOv [data-close]'); m && m.click(); TG.debug.setDest({ x: T.x, z: T.z, name: breve(T.nome) }); msg('Segui a freccia: ' + breve(T.nome)); } catch(e){} ev('terra_vai', T.id); });
  pan.hidden = false; ev('terre_aperte', '');
}
function bottone(){
  const q = $('mapQuick'); if (!q || q.querySelector('[data-q="terre"]')) return;
  const b = document.createElement('button'); b.dataset.q = 'terre'; b.innerHTML = '<i style="background:#f2b134"></i><span>🌰 Terreni</span>';
  b.onclick = e => { e.stopPropagation(); aggiorna().then(pannello); };
  q.insertBefore(b, q.firstChild);
}

/* ---------- al rientro: v'hanno fregato un terreno? ---------- */
function controllaPerse(){
  const p = paese(); if (!p || !caricato) return;
  let prima = {}; try { prima = JSON.parse(ls.get('tg-terre-mie') || '{}'); } catch(e){}
  const ora = {}; for (const T of TERRE) if (padrone(T.id) === p) ora[T.id] = 1;
  const perse = Object.keys(prima).filter(id => !ora[id] && padrone(id));
  ls.set('tg-terre-mie', JSON.stringify(ora));
  if (!perse.length) return;
  const T = TERRE.find(x => x.id === perse[0]); if (!T) return;
  const chi = padrone(T.id);
  const via = () => setTimeout(() => { msg(`🌰 ${corto(chi)} v'ha fregato ${T.nome.charAt(0).toLowerCase() + T.nome.slice(1)}`, `Segui a freccia e ripijatelo${perse.length > 1 ? ` (e n'avete persi altri ${perse.length - 1})` : ''}`, 7); try { TG.debug.setDest({ x: T.x, z: T.z, name: 'Ripijate ' + breve(T.nome) }); } catch(e){} ev('terre_perse', T.id, perse.length); }, 5000);
  if (document.body.classList.contains('playing')) via(); else new MutationObserver((x, o) => { if (document.body.classList.contains('playing')) { o.disconnect(); via(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

/* ---------- minimappa: i terreni colorati ---------- */
let mc = null;
function mini(){
  requestAnimationFrame(mini);
  const m = $('mini'), mo = $('mapOv');
  if (!m || !document.body.classList.contains('playing') || (mo && !mo.hidden)) { if (mc) mc.style.display = 'none'; return; }
  const r = m.getBoundingClientRect(); if (!r.width) return;
  if (!mc) { mc = document.createElement('canvas'); mc.setAttribute('style', 'position:fixed;pointer-events:none;border-radius:50%;z-index:11'); mc.width = mc.height = 168; document.body.appendChild(mc); }
  Object.assign(mc.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  let d; try { d = TG.debug.car; } catch(e){ return; } if (!d) return;
  const c = mc.getContext('2d'), W = 168, a = W / 2, s = a / 820, rot = -Math.atan2(Math.cos(d.yaw), Math.sin(d.yaw)) - Math.PI / 2;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, W); c.beginPath(); c.arc(a, a, a - 1, 0, Math.PI * 2); c.clip();
  c.translate(a, a); c.rotate(rot); c.scale(s, s);
  for (const T of TERRE) { const dx = T.x - d.x, dz = T.z - d.z; if (Math.hypot(dx, dz) > 1000) continue; const p = padrone(T.id);
    c.beginPath(); c.arc(dx, dz, Math.max(T.rad, 6 / s), 0, Math.PI * 2); c.fillStyle = colore(p); c.globalAlpha = p ? .45 : .2; c.fill(); c.globalAlpha = 1; c.lineWidth = 2 / s; c.strokeStyle = p === paese() ? '#f2c74e' : 'rgba(255,255,255,.7)'; c.stroke(); }
}

TG.Terre = { colore, padrone, righe, terraIn, aggiorna, pannello, lista: () => TERRE, _dbg: () => ({ classifica, locali, daMandare }) };
// per i moduli che usavano le zone (presenza: colore del paese)
TG.Zone = TG.Zone || { colore, squadra: false };
function avvia(){
  if (!TG.debug || !TG.debug.campi || !TG.Profile || !TG.Contadino) return setTimeout(avvia, 1000);
  TERRE = costruisci(); if (TERRE.length < 2) return setTimeout(avvia, 1500);
  apriTutti(); aggancia();
  aggiorna().then(controllaPerse); setInterval(aggiorna, 60000);
  setInterval(() => { aggiornaBox(); aggiornaCartelli(); nascondiVicini(); bottone(); }, 700);
  setInterval(invia, 5000); addEventListener('pagehide', invia);
  requestAnimationFrame(mini);
}
if (document.readyState === 'complete') setTimeout(avvia, 1500); else addEventListener('load', () => setTimeout(avvia, 1500));
})();
