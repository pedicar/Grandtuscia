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

/* ---------- aggancio ai punti del paese ---------- */
function aggancia(){
  const PM = TG.PrimoMinuto; if (!PM || !PM.mandaPunti || PM.mandaPunti._zone) return;
  const o = PM.mandaPunti;
  const n = function(k){ try { if (zonaCorrente && k > 0) { accumula(zonaCorrente, Math.min(30, Math.round(k))); invia(true); } } catch(e){} return o.apply(this, arguments); };
  n._zone = 1; PM.mandaPunti = n;
}
function avvia(){
  if (!TG.debug || !TG.PrimoMinuto) return setTimeout(avvia, 1000);
  aggancia(); aggiornaPadroni(); setInterval(aggiornaPadroni, 120000);
  setInterval(tick, 1000); bottone(); setInterval(bottone, 5000);
  addEventListener('pagehide', () => invia(true));
}
TG.Zone = { ZONE, zonaDi, padroni: () => padroni, pannello, colore, _dbg: () => ({ zonaCorrente, daMandare, secondi }) };
if (document.readyState === 'complete') setTimeout(avvia, 2000); else addEventListener('load', () => setTimeout(avvia, 2000));
})();
