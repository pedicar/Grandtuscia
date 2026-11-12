/* A GUERRA DE E NOCCHIE — il mondo è diviso in zone; ogni zona ha un padrone: il comune che ci ha fatto più punti
   negli ultimi 7 giorni. Si rubano le zone andandoci: ogni 20 s di presenza vale 1 punto, e tutto quello che vale punti
   pe' o paese (nocchie, nocchia d'oro, lavoro, primo minuto) vale anche per la zona dove sei. In casa d'altri vale doppio.
   Server: tg_zona_punto (tetto 30 al giorno per zona e telefono, 60 in casa d'altri), tg_zone() (i padroni).
   Modulo esterno: usa TG.debug (car, setDest), TG.PrimoMinuto (paese, mandaPunti), TG.Stats, TG.msg. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const cfg = window.TG_STATS_CONFIG || {};
const ev = (t, c, v, x) => { try { TG.Stats && TG.Stats.ev(t, c, v, x); } catch(e){} };
const $ = id => document.getElementById(id);
// Le zone: centro, raggio, nome. Stesse coordinate del mondo (TG.debug.places). Stessa lista in strumenti/zone.py.
const ZONE = [
  { id: 'noccioleti', nome: 'I noccioleti', x: 2800, z: -250, r: 450 },
  { id: 'caprarola', nome: 'Caprarola e o Palazzo', x: 2330, z: -170, r: 330 },
  { id: 'carbognano', nome: 'Carbognano', x: 3240, z: -520, r: 330 },
  { id: 'fabrica', nome: 'Fabrica e i carrettini', x: 4000, z: -620, r: 450 },
  { id: 'forre', nome: 'E forre de tufo', x: 4300, z: 330, r: 350 },
  { id: 'falerii', nome: 'Falerii', x: 5250, z: 970, r: 420 },
  { id: 'soratte', nome: 'O Soratte', x: 6300, z: 1450, r: 900 },
  { id: 'ronciglione', nome: 'Ronciglione', x: 1480, z: 1580, r: 420 },
  { id: 'lago', nome: 'O lago', x: 252, z: 800, r: 600 },
  { id: 'riva', nome: 'A riva de Vico', x: -854, z: 250, r: 420 },
  { id: 'riserva', nome: 'A Riserva', x: -480, z: -1000, r: 520 },
  { id: 'venere', nome: 'Monte Venere', x: 250, z: -1300, r: 420 },
  { id: 'caldera', nome: 'A caldera', x: -1030, z: -1750, r: 420 },
  { id: 'fogliano', nome: 'Monte Fogliano', x: -1440, z: 555, r: 450 },
  { id: 'cimino', nome: 'O Cimino', x: 1200, z: -2900, r: 560 },
  { id: 'viterbo', nome: 'Viterbo', x: -750, z: -3300, r: 520 },
  { id: 'cinghiale', nome: 'O bosco de o cinghiale', x: 1250, z: -1550, r: 420 },
  { id: 'airone', nome: 'I campi de l\'airone', x: 900, z: 250, r: 360 },
];
const COLORI = { caprarola: '#d8432a', fabrica: '#2f7fd1', carbognano: '#2e9e5b', ronciglione: '#e0a21b', canepina: '#8e44ad', vallerano: '#16a085', soriano: '#c0392b', 'civita-castellana': '#7f8c8d', viterbo: '#f39c12', nepi: '#1abc9c', vignanello: '#9b59b6', corchiano: '#e67e22', sutri: '#3498db', vetralla: '#27ae60', 'bassano-romano': '#d35400', fuori: '#95a5a6' };
const colore = p => { if (!p) return '#6b6f6a'; if (COLORI[p]) return COLORI[p]; let h = 0; for (const c of p) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 55% 50%)`; };
const paese = () => (TG.PrimoMinuto && TG.PrimoMinuto.paese) || ls.get('tg-paese-dev');
const conPaese = () => { const p = paese(); return p && p !== 'nessuno' ? p : null; };
const nomeP = p => { try { return (TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p; } catch(e){ return p; } };
function zonaDi(x, z){ let best = null, bd = 1e12; for (const zo of ZONE) { const d = (x - zo.x) ** 2 + (z - zo.z) ** 2; if (d < zo.r * zo.r && d < bd) { bd = d; best = zo; } } return best; }
const dev = () => { try { return TG.Stats && TG.Stats.dispositivo; } catch(e){ return null; } };
async function rpc(nome, body){
  if (!cfg.url) throw new Error('server non configurato');
  const r = await fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/' + nome, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: 'Bearer ' + cfg.key }, body: JSON.stringify(body || {}) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}

/* ---------- stato ---------- */
let padroni = {}, zonaCorrente = null, daMandare = {}, secondi = 0, ultimoInvio = 0;
const padrone = id => { const l = padroni[id]; return l && l[0] ? l[0].paese : null; };
async function aggiornaPadroni(){ try { padroni = await rpc('tg_zone') || {}; } catch(e){} }
function accumula(zona, n){ if (!zona || !conPaese() || !n) return; daMandare[zona.id] = (daMandare[zona.id] || 0) + n; }
async function invia(forza){
  const p = conPaese(), d = dev(); if (!p || !d) return;
  const ids = Object.keys(daMandare).filter(k => daMandare[k] >= (forza ? 1 : 3)); if (!ids.length) return;
  for (const id of ids) {
    const n = Math.round(daMandare[id]); daMandare[id] = 0;
    try {
      const r = await rpc('tg_zona_punto', { p_dev: d, p_zona: id, p_paese: p, p_punti: n });
      if (r && r.aggiunti) { ev('zona_punti', id, r.aggiunti, { doppio: !!r.doppio }); if (r.padrone && r.padrone !== p) controllaFurto(id, r); }
    } catch(e){ daMandare[id] = (daMandare[id] || 0) + n; }
  }
}
// quando i punti del mio paese superano il padrone: «rubata!»
let furti = {};
async function controllaFurto(id, r){
  await aggiornaPadroni();
  const nuovo = padrone(id);
  if (nuovo === conPaese() && !furti[id] && r.padrone !== nuovo) { furti[id] = 1; const z = ZONE.find(x => x.id === id); try { TG.msg(`⚔ ${z ? z.nome : id} è de ${nomeP(nuovo)}!`, `L'avete rubata a ${nomeP(r.padrone)}`, 5); } catch(e){} ev('zona_rubata', id, null, { a: r.padrone }); }
}

/* ---------- il giro: presenza + cambio zona ---------- */
function tick(){
  if (!document.body.classList.contains('playing')) return;
  let c; try { c = TG.debug.car; } catch(e){ return; } if (!c) return;
  const z = zonaDi(c.x, c.z);
  if (z !== zonaCorrente) { zonaCorrente = z; secondi = 0; if (z) annuncia(z); }
  if (z && Math.abs(c.speed || 0) > 2) { secondi++; if (secondi >= 20) { secondi = 0; accumula(z, 1); } }
  if (Date.now() - ultimoInvio > 30000) { ultimoInvio = Date.now(); invia(false); }
}
let ultimoAnnuncio = 0;
function annuncia(z){
  const p = conPaese(), pad = padrone(z.id);
  if (Date.now() - ultimoAnnuncio < 8000) return; ultimoAnnuncio = Date.now();
  let t, s;
  if (!pad) { t = `${z.nome} · terra de nessuno`; s = p ? `A prima nocchia qui è de ${nomeP(p)}` : ''; }
  else if (pad === p) { t = `${z.nome} · terra de ${nomeP(pad)}`; s = 'Casa vostra: tenetela'; }
  else { t = `${z.nome} · terra de ${nomeP(pad)}`; s = p ? `Qui ogni punto vale doppio pe' ${nomeP(p)}: rubatela` : ''; }
  try { TG.msg(t, s, 3.5); } catch(e){}
  ev('zona_entrata', z.id, null, { padrone: pad });
}

/* ---------- pannello: la mappa delle zone ---------- */
let pan = null;
function pannello(){
  if (!pan) {
    pan = document.createElement('div'); pan.id = 'znOv'; pan.hidden = true;
    const st = document.createElement('style'); st.textContent = `
#znOv{position:fixed;inset:0;z-index:96;background:rgba(10,14,12,.86);display:flex;align-items:center;justify-content:center;padding:14px;font-family:Figtree,"Segoe UI",system-ui,sans-serif;color:#f3e7cb}
#znOv[hidden]{display:none}
#znOv .znCard{width:min(560px,100%);max-height:100%;overflow:auto;background:#17201f;border:1px solid rgba(242,199,78,.5);border-radius:20px;padding:16px}
#znOv .znHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}#znOv h2{margin:0;font-size:22px}#znOv .znX{all:unset;cursor:pointer;font-size:24px;padding:0 8px}
#znOv .znSub{color:#c9bfa8;font-size:13px;margin:0 0 10px}
#znOv svg{width:100%;height:auto;display:block;border-radius:14px;background:#0f1514}
#znOv .znList{display:grid;gap:4px;margin-top:10px}
#znOv .znRow{display:grid;grid-template-columns:12px 1fr auto;gap:10px;align-items:center;padding:7px 8px;border-radius:10px;cursor:pointer}#znOv .znRow:hover{background:rgba(255,255,255,.06)}
#znOv .znRow i{width:12px;height:12px;border-radius:50%;display:inline-block}#znOv .znRow b{display:block;font-size:14px}#znOv .znRow small{color:#9aa39c;font-size:11.5px}#znOv .znRow em{font-style:normal;font-family:ui-monospace,monospace;font-size:12px;color:#e2b765;white-space:nowrap}
#znOv .znLeg{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;font-size:12px}#znOv .znLeg i{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:4px;vertical-align:middle}`;
    document.head.appendChild(st);
    document.body.appendChild(pan);
    pan.addEventListener('click', e => { if (e.target === pan) pan.hidden = true; });
  }
  const p = conPaese();
  const xs = ZONE.map(z => z.x), zs = ZONE.map(z => z.z);
  const minX = Math.min(...xs) - 700, maxX = Math.max(...xs) + 700, minZ = Math.min(...zs) - 700, maxZ = Math.max(...zs) + 700;
  const W = 1000, H = Math.round(W * (maxZ - minZ) / (maxX - minX)), sx = v => (v - minX) / (maxX - minX) * W, sz = v => (v - minZ) / (maxZ - minZ) * H, sr = r => r / (maxX - minX) * W;
  let car = null; try { car = TG.debug.car; } catch(e){}
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mappa delle zone">
    ${ZONE.map(z => { const pad = padrone(z.id); const mia = pad && pad === p; return `<circle cx="${sx(z.x)}" cy="${sz(z.z)}" r="${sr(z.r)}" fill="${colore(pad)}" fill-opacity="${pad ? .55 : .12}" stroke="${mia ? '#f2c74e' : 'rgba(255,255,255,.35)'}" stroke-width="${mia ? 4 : 1.5}"/><text x="${sx(z.x)}" y="${sz(z.z)}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(12, sr(z.r) / 5)}" font-weight="800" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${z.nome.replace(/^(O|A|E|I) /, '')}</text>`; }).join('')}
    ${car ? `<circle cx="${sx(car.x)}" cy="${sz(car.z)}" r="9" fill="#f2c74e" stroke="#000" stroke-width="2"/>` : ''}
  </svg>`;
  const tot = {}; for (const z of ZONE) { const pad = padrone(z.id); if (pad) tot[pad] = (tot[pad] || 0) + 1; }
  const leg = Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span><i style="background:${colore(k)}"></i>${nomeP(k)} ${n}</span>`).join('') || '<span>Nessuna zona ha ancora un padrone: a prima è de chi ce va.</span>';
  const righe = ZONE.map(z => { const l = padroni[z.id] || [], pad = l[0] || null; const d = car ? Math.hypot(car.x - z.x, car.z - z.z) : 0;
    const mia = pad && pad.paese === p, mio = l.find(x => x.paese === p);
    const det = !pad ? 'terra de nessuno' : mia ? `vostra · ${pad.punti} punti${l[1] ? ` · ${l[1].nome} a −${pad.punti - l[1].punti}` : ''}` : `de ${pad.nome} (${pad.punti})${p ? ` · pe' rubarla ne mancano ${pad.punti - (mio ? mio.punti : 0) + 1}` : ''}`;
    return { z, pad, d, det }; }).sort((a, b) => a.d - b.d);
  pan.innerHTML = `<div class="znCard"><div class="znHead"><h2>⚔ A guerra de e nocchie</h2><button class="znX" aria-label="Chiudi">×</button></div>
  <p class="znSub">Ogni zona è de o comune che c'ha fatto più punti negli ultimi 7 giorni. Vacce, resta, raccoi: in casa d'altri vale doppio.</p>
  ${svg}<div class="znLeg">${leg}</div>
  <div class="znList">${righe.map(r => `<div class="znRow" data-z="${r.z.id}"><i style="background:${colore(r.pad ? r.pad.paese : null)}"></i><div><b>${r.z.nome}</b><small>${r.det}</small></div><em>${r.d < 950 ? Math.round(r.d / 10) * 10 + ' m' : (r.d / 1000).toFixed(1).replace('.', ',') + ' km'}</em></div>`).join('')}</div></div>`;
  pan.querySelector('.znX').onclick = () => { pan.hidden = true; };
  pan.querySelectorAll('.znRow').forEach(r => r.onclick = () => { const z = ZONE.find(x => x.id === r.dataset.z); pan.hidden = true; try { const m = document.querySelector('#mapOv [data-close]'); m && m.click(); TG.debug.setDest({ x: z.x, z: z.z, name: z.nome }); TG.msg(`Segui a freccia: ${z.nome}`); } catch(e){} ev('zona_vai', z.id); });
  pan.hidden = false; ev('zone_aperte', '');
}
function bottone(){
  const q = $('mapQuick'); if (!q || q.querySelector('[data-q="zone"]')) return;
  const b = document.createElement('button'); b.dataset.q = 'zone'; b.innerHTML = '<i style="background:#d8432a"></i><span>⚔ Zone</span>';
  b.onclick = e => { e.stopPropagation(); aggiornaPadroni().then(pannello); };
  const luoghi = q.querySelector('[data-q="luoghi"]'); luoghi ? q.insertBefore(b, luoghi) : q.appendChild(b);
}

/* ---------- la terra si vede sempre: chip vicino alla minimappa + zone colorate sulla mappa grande ---------- */
let chip = null;
function aggiornaChip(){
  if (!document.body.classList.contains('playing')) { if (chip) chip.style.display = 'none'; return; }
  if (!chip) {
    chip = document.createElement('button'); chip.type = 'button'; chip.id = 'znChip';
    chip.setAttribute('style', 'position:fixed;z-index:30;right:10px;top:calc(232px + env(safe-area-inset-top,0px));max-width:46vw;padding:5px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(16,22,21,.82);color:#f3e7cb;font:800 12px Figtree,"Segoe UI",system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)');
    chip.onclick = () => aggiornaPadroni().then(pannello);
    document.body.appendChild(chip);
    const st = document.createElement('style'); st.textContent = 'body:has(#mapOv:not([hidden])) #znChip,body:has(#pmOv:not([hidden])) #znChip,body:has(#lvOv:not([hidden])) #znChip,body:has(#rtOv:not([hidden])) #znChip{display:none!important}body:not(.playing) #znChip{display:none!important}body:not(.touch) #znChip{top:calc(170px + env(safe-area-inset-top,0px))}'; document.head.appendChild(st);
  }
  const z = zonaCorrente; if (!z) { chip.style.display = 'none'; return; }
  const pad = padrone(z.id), p = conPaese(), mia = pad && pad === p;
  chip.style.display = 'block';
  chip.style.borderColor = mia ? '#f2c74e' : pad ? colore(pad) : 'rgba(255,255,255,.35)';
  chip.innerHTML = `<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${colore(pad)};margin-right:6px;vertical-align:middle"></i>⚔ ${pad ? nomeP(pad) : 'terra de nessuno'}`;
  chip.title = z.nome;
}
let ov = null;
function overlayMappa(){
  const wrap = $('bigMapWrap'), big = $('bigMap'), ovl = $('mapOv'); if (!wrap || !big || !ovl || ovl.hidden) return;
  if (!ov) { ov = document.createElement('canvas'); ov.id = 'znMap'; ov.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1'); big.insertAdjacentElement('afterend', ov); }
  let hits = []; try { hits = TG.debug.mapHits() || []; } catch(e){}
  const pts = hits.filter(h => h.kind === 'place' && h.o && h.o.x != null && Math.abs(h.o.z) < 50000);
  const r = big.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  if (ov.width !== Math.round(r.width * dpr) || ov.height !== Math.round(r.height * dpr)) { ov.width = Math.round(r.width * dpr); ov.height = Math.round(r.height * dpr); }
  const c = ov.getContext('2d'); c.clearRect(0, 0, ov.width, ov.height);
  // la scala della mappa la ricavo da due luoghi lontani tra loro (posizione in pixel ↔ coordinate del mondo)
  let a = null, b = null, bd = 0; for (const h of pts) for (const k of pts) { const d = Math.abs(h.o.x - k.o.x) + Math.abs(h.o.z - k.o.z); if (d > bd) { bd = d; a = h; b = k; } }
  if (!a || !b || Math.abs(a.o.x - b.o.x) < 1) return;
  const s = (a.x - b.x) / (a.o.x - b.o.x); if (!isFinite(s) || s === 0) return;
  const px = wx => (a.x + (wx - a.o.x) * s) * dpr, pz = wz => (a.y + (wz - a.o.z) * s) * dpr;
  const p = conPaese();
  for (const z of ZONE) {
    const pad = padrone(z.id); if (!pad) continue;
    const mia = pad === p;
    c.beginPath(); c.arc(px(z.x), pz(z.z), Math.abs(z.r * s) * dpr, 0, Math.PI * 2);
    c.fillStyle = colore(pad); c.globalAlpha = .28; c.fill(); c.globalAlpha = 1;
    c.lineWidth = (mia ? 3 : 1.5) * dpr; c.strokeStyle = mia ? '#f2c74e' : colore(pad); c.stroke();
    const f = Math.max(10, Math.min(16, Math.abs(z.r * s) / 4)) * dpr; c.font = `800 ${f}px Figtree, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 3 * dpr; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(nomeP(pad), px(z.x), pz(z.z) + Math.abs(z.r * s) * dpr * .55); c.fillStyle = '#fff'; c.fillText(nomeP(pad), px(z.x), pz(z.z) + Math.abs(z.r * s) * dpr * .55);
  }
}
function giroMappa(){ try { overlayMappa(); } catch(e){} requestAnimationFrame(giroMappa); }

/* ---------- aggancio ai punti del paese ---------- */
function aggancia(){
  const PM = TG.PrimoMinuto; if (!PM || !PM.mandaPunti || PM.mandaPunti._zone) return;
  const o = PM.mandaPunti;
  const n = function(k){ try { if (TG.Zone.salta) TG.Zone.salta = 0; else if (zonaCorrente && k > 0) { accumula(zonaCorrente, Math.min(30, Math.round(k))); invia(true); } } catch(e){} return o.apply(this, arguments); };
  n._zone = 1; PM.mandaPunti = n;
}
function avvia(){
  if (!TG.debug || !TG.PrimoMinuto) return setTimeout(avvia, 1000);
  aggancia(); aggiornaPadroni(); setInterval(aggiornaPadroni, 120000);
  setInterval(tick, 1000); bottone(); setInterval(bottone, 5000);
  setInterval(aggiornaChip, 1000); giroMappa();
  addEventListener('pagehide', () => invia(true));
}
TG.Zone = { ZONE, zonaDi, padroni: () => padroni, pannello, colore, salta: 0, accredita: (id, n) => { const z = ZONE.find(x => x.id === id); if (z) { accumula(z, Math.min(30, Math.round(n))); invia(true); } }, aggiorna: aggiornaPadroni, _dbg: () => ({ zonaCorrente, daMandare, secondi }) };
if (document.readyState === 'complete') setTimeout(avvia, 2000); else addEventListener('load', () => setTimeout(avvia, 2000));
})();
