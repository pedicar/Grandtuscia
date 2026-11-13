/* A GUERRA DE E NOCCHIE — tutto il mondo è spartito in celle esagonali (300 m di raggio, ≈23 ettari). Ogni cella ha un
   padrone: il comune che ci ha fatto più punti negli ultimi 7 giorni. Si conquista stando lì e giocando lì: 1 punto ogni 5 s
   in movimento (speed game), più tutto quello che vale punti pe' o paese (nocchie, nocchia d'oro, lavoro, primo minuto, gare) nella cella
   dove sei. In casa d'altri vale doppio. Le 18 «contrade» con il nome servono per parlare delle celle (messaggi, post, derby).
   Nel 3D: confini tra padroni diversi (linee a terra entro 1,5 km) e bandierine col colore del comune; celle colorate su
   minimappa e mappa grande; barra di conquista + «Chiama 'n amico» quando sei in terra altrui.
   Server: tg_zona_punto(p_zona = id cella «h<q>_<r>») e tg_zone() (padroni). Esterno: TG.debug, TG.PrimoMinuto, TG.Stats, TG.msg. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const cfg = window.TG_STATS_CONFIG || {};
const ev = (t, c, v, x) => { try { TG.Stats && TG.Stats.ev(t, c, v, x); } catch(e){} };
const $ = id => document.getElementById(id);
// secondi di movimento per 1 punto: è uno speed game, e il mezzo conta. Il contadino che vende di più si compra mezzi migliori e conquista più veloce.
const PASSI = { piedi: 8, vespa: 5, ape: 4, trattore: 3, semovente: 2, aereo: 6 };
const ICONE = { piedi: '🚶', vespa: '🛵', ape: '🛺', trattore: '🚜', semovente: '🌰', aereo: '✈' };
const mezzo = () => { try { return TG.debug.VEH.cur.id; } catch(e){ return 'vespa'; } };
const passo = () => { const b = PASSI[mezzo()] || 5; return TG.Zone && TG.Zone.squadra ? Math.max(2, b - 2) : b; };
// nel garage: ogni mezzo dice quanto vale in guerra
(function guerraNelGarage(n){ const M = TG.Contadino && TG.Contadino.MEZZI; if (!M) { if (n < 20) setTimeout(() => guerraNelGarage(n + 1), 1000); return; }
  for (const k in M) if (PASSI[k] && !/In guerra/.test(M[k].cosa)) M[k].cosa += ` ⚔ In guerra: +1 ogni ${PASSI[k]} s.`; })(0);
const R = 300, SQ3 = Math.sqrt(3), BOUNDS = { x0: -3300, x1: 8000, z0: -4700, z1: 3200 };
const ETTARI = Math.round(2.598 * R * R / 10000);
// Le contrade: nomi per le celle. Stessa lista in strumenti/zone.py.
const CONTRADE = [
  { id: 'noccioleti', nome: 'I noccioleti', x: 2800, z: -250, r: 450 }, { id: 'caprarola', nome: 'Caprarola e o Palazzo', x: 2330, z: -170, r: 330 },
  { id: 'carbognano', nome: 'Carbognano', x: 3240, z: -520, r: 330 }, { id: 'fabrica', nome: 'Fabrica e i carrettini', x: 4000, z: -620, r: 450 },
  { id: 'forre', nome: 'E forre de tufo', x: 4300, z: 330, r: 350 }, { id: 'falerii', nome: 'Falerii', x: 5250, z: 970, r: 420 },
  { id: 'soratte', nome: 'O Soratte', x: 6300, z: 1450, r: 900 }, { id: 'ronciglione', nome: 'Ronciglione', x: 1480, z: 1580, r: 420 },
  { id: 'lago', nome: 'O lago', x: 252, z: 800, r: 600 }, { id: 'riva', nome: 'A riva de Vico', x: -854, z: 250, r: 420 },
  { id: 'riserva', nome: 'A Riserva', x: -480, z: -1000, r: 520 }, { id: 'venere', nome: 'Monte Venere', x: 250, z: -1300, r: 420 },
  { id: 'caldera', nome: 'A caldera', x: -1030, z: -1750, r: 420 }, { id: 'fogliano', nome: 'Monte Fogliano', x: -1440, z: 555, r: 450 },
  { id: 'cimino', nome: 'O Cimino', x: 1200, z: -2900, r: 560 }, { id: 'viterbo', nome: 'Viterbo', x: -750, z: -3300, r: 520 },
  { id: 'cinghiale', nome: 'O bosco de o cinghiale', x: 1250, z: -1550, r: 420 }, { id: 'airone', nome: 'I campi de l\'airone', x: 900, z: 250, r: 360 },
];
const COLORI = { caprarola: '#d8432a', fabrica: '#2f7fd1', carbognano: '#2e9e5b', ronciglione: '#e0a21b', canepina: '#8e44ad', vallerano: '#16a085', soriano: '#c0392b', 'civita-castellana': '#7f8c8d', viterbo: '#f39c12', nepi: '#1abc9c', vignanello: '#9b59b6', corchiano: '#e67e22', sutri: '#3498db', vetralla: '#27ae60', 'bassano-romano': '#d35400', fuori: '#95a5a6' };
const colore = p => { if (!p) return '#6b6f6a'; if (COLORI[p]) return COLORI[p]; let h = 0; for (const c of p) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 55% 50%)`; };
const paese = () => (TG.PrimoMinuto && TG.PrimoMinuto.paese) || ls.get('tg-paese-dev');
const conPaese = () => { const p = paese(); return p && p !== 'nessuno' ? p : null; };
const nomeP = p => { try { return (TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p; } catch(e){ return p; } };
const corto = p => nomeP(p).replace(/ (di|in|sul|al) .*$/i, '').split(' ')[0];

/* ---------- esagoni (flat-top, raggio R) ---------- */
function cellaDi(x, z){
  const q = (2 / 3 * x) / R, r = (-1 / 3 * x + SQ3 / 3 * z) / R;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q - r); const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs + q + r);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  return { id: 'h' + rq + '_' + rr, q: rq, r: rr, x: R * 1.5 * rq, z: R * SQ3 * (rr + rq / 2) };
}
function cellaDaId(id){ const m = /^h(-?\d+)_(-?\d+)$/.exec(id || ''); if (!m) return null; const q = +m[1], r = +m[2]; return { id, q, r, x: R * 1.5 * q, z: R * SQ3 * (r + q / 2) }; }
const angoli = c => [0, 1, 2, 3, 4, 5].map(i => { const a = Math.PI / 3 * i; return [c.x + R * Math.cos(a), c.z + R * Math.sin(a)]; });
// vicino i sta oltre il lato tra l'angolo i e l'angolo i+1 (direzione 30°+60°·i)
const VIC = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const vicini = c => VIC.map(([dq, dr]) => cellaDaId('h' + (c.q + dq) + '_' + (c.r + dr)));
const dentro = c => c.x > BOUNDS.x0 && c.x < BOUNDS.x1 && c.z > BOUNDS.z0 && c.z < BOUNDS.z1;
function contrada(x, z){ let best = null, bd = 1e12; for (const zo of CONTRADE) { const d = (x - zo.x) ** 2 + (z - zo.z) ** 2; if (d < zo.r * zo.r * 2.2 && d < bd) { bd = d; best = zo; } } return best; }
const nomeCella = c => { const k = contrada(c.x, c.z); return k ? k.nome : 'a campagna'; };
let _tutte = null;
function tutteLeCelle(){ if (_tutte) return _tutte; const out = []; for (let q = -8; q < 20; q++) for (let r = -19; r < 12; r++) { const c = cellaDaId('h' + q + '_' + r); if (dentro(c)) out.push(c); } return _tutte = out; }
function celleVicine(x, z, raggio){ const c0 = cellaDi(x, z), n = Math.ceil(raggio / (R * 1.5)) + 1, out = []; for (let dq = -n; dq <= n; dq++) for (let dr = -n; dr <= n; dr++) { const c = cellaDaId('h' + (c0.q + dq) + '_' + (c0.r + dr)); if (dentro(c) && Math.hypot(c.x - x, c.z - z) < raggio + R) out.push(c); } return out; }

/* ---------- server ---------- */
const dev = () => { try { return TG.Stats && TG.Stats.dispositivo; } catch(e){ return null; } };
async function rpc(nome, body){
  if (!cfg.url) throw new Error('server non configurato');
  const r = await fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/' + nome, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: 'Bearer ' + cfg.key }, body: JSON.stringify(body || {}) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}
let padroni = {}, locali = {}, caricato = false, tPlay = 0, cella = null, daMandare = {}, secondi = 0, ultimoInvio = 0, versione = 0;
// punti di un paese in una cella: quelli del server + quelli miei accettati da allora (così il colore cambia subito)
function punti(id, p){ const l = padroni[id] || []; const r = l.find(x => x.paese === p); return (r ? r.punti : 0) + ((locali[id] || {})[p] || 0); }
function padrone(id){
  const l = padroni[id] || []; let best = l[0] ? { paese: l[0].paese, punti: l[0].punti } : null;
  const p = conPaese(); if (p) { const mio = punti(id, p); if (mio > 0 && (!best || mio > best.punti)) best = { paese: p, punti: mio }; }
  return best ? best.paese : null;
}
const padronePunti = id => { const p = padrone(id); return p ? punti(id, p) : 0; };
async function aggiornaPadroni(){ try { const n = await rpc('tg_zone'); if (n && typeof n === 'object') { padroni = n; locali = {}; versione++; } } catch(e){} caricato = true; }
function accumula(c, n){ if (!c || !conPaese() || !n) return; daMandare[c.id] = (daMandare[c.id] || 0) + n; }
async function invia(forza){
  const p = conPaese(), d = dev(); if (!p || !d) return;
  const ids = Object.keys(daMandare).filter(k => daMandare[k] >= (forza ? 1 : 3)); if (!ids.length) return;
  for (const id of ids) {
    const n = Math.round(daMandare[id]); daMandare[id] = 0; if (!n) continue;
    const prima = padrone(id);
    try {
      const r = await rpc('tg_zona_punto', { p_dev: d, p_zona: id, p_paese: p, p_punti: n });
      if (r && r.aggiunti) {
        locali[id] = locali[id] || {}; locali[id][p] = (locali[id][p] || 0) + r.aggiunti; versione++;
        const c = cellaDaId(id); ev('zona_punti', id, r.aggiunti, { doppio: !!r.doppio, contrada: c && (contrada(c.x, c.z) || {}).id });
        const dopo = padrone(id);
        if (dopo === p && prima !== p && c) { try { TG.msg(`⚔ ${nomeCella(c)}: presa!`, prima ? `L'avete rubata a ${nomeP(prima)}` : `Era terra de nessuno: mo' è de ${nomeP(p)}`, 5); } catch(e){} ev('zona_rubata', id, null, { a: prima }); }
      }
    } catch(e){ daMandare[id] = (daMandare[id] || 0) + n; }
  }
  aggiornaBarra();
}

/* ---------- il giro: presenza + cambio cella ---------- */
function tick(){
  if (!document.body.classList.contains('playing')) return;
  if (!tPlay) tPlay = Date.now();
  let c; try { c = TG.debug.car; } catch(e){ return; } if (!c) return;
  const z = cellaDi(c.x, c.z);
  if (!cella || z.id !== cella.id) { const prima = cella; cella = z; secondi = 0; annuncia(z, prima); }
  if (Math.abs(c.speed || 0) > 2) { secondi++; if (secondi >= passo()) { secondi = 0; accumula(z, 1); aggiornaBarra(); } }
  if (Date.now() - ultimoInvio > 15000) { ultimoInvio = Date.now(); invia(false); }
}
let ultimoAnnuncio = 0;
function annuncia(z, prima){
  const p = conPaese(), pad = padrone(z.id), padPrima = prima ? padrone(prima.id) : undefined;
  if (prima && pad === padPrima) return;  // stessa terra: niente
  if (Date.now() - ultimoAnnuncio < 6000) return; ultimoAnnuncio = Date.now();
  const n = nomeCella(z); let t, s;
  if (!pad) { t = `${n} · terra de nessuno`; s = p ? `A prima nocchia qui è de ${nomeP(p)}` : ''; }
  else if (pad === p) { t = `${n} · terra de ${nomeP(pad)}`; s = 'Casa vostra'; }
  else { t = `${n} · terra de ${nomeP(pad)}`; s = p ? `Qui ogni punto vale doppio pe' ${nomeP(p)}` : ''; }
  try { TG.msg(t, s, 3); } catch(e){}
  ev('zona_entrata', z.id, null, { padrone: pad });
}

/* ---------- chip + barra di conquista: un blocco solo, agganciato sotto la minimappa (non in mezzo alla visuale) ---------- */
let chip = null, barra = null;
function ui(){
  if (chip) return;
  const st = document.createElement('style'); st.textContent = `
#znChip{position:fixed;z-index:30;right:10px;width:min(196px,52vw);padding:4px 8px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:rgba(16,22,21,.8);color:#f3e7cb;font:800 11px/1.25 Figtree,"Segoe UI",system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);text-align:left}
#znChip .c{display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#znChip .c i{flex:none;width:8px;height:8px;border-radius:50%}
#znBar{display:none;margin-top:3px;font-weight:600;color:#c9bfa8}#znBar .t{display:flex;justify-content:space-between;gap:6px;white-space:nowrap;overflow:hidden;color:#f3e7cb}#znBar .t b{color:#f2c74e}
#znBar .b{height:4px;border-radius:2px;background:rgba(255,255,255,.14);margin:3px 0;overflow:hidden}#znBar .b i{display:block;height:100%;background:#f2c74e;width:0;transition:width .4s}
#znBar .m{display:flex;justify-content:space-between;align-items:center;gap:4px;white-space:nowrap}#znBar .m>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}#znBar .m b{color:#f3e7cb}
#znBar button{all:unset;cursor:pointer;flex:none;padding:2px 7px;border-radius:7px;background:#d8432a;color:#fff;font:800 11px Figtree,system-ui,sans-serif}
body:has(#mapOv:not([hidden])) #znChip,body:has(#pmOv:not([hidden])) #znChip,body:has(#lvOv:not([hidden])) #znChip,body:has(#rtOv:not([hidden])) #znChip,body:has(#znOv:not([hidden])) #znChip,body:not(.playing) #znChip{display:none!important}
#znMini{position:fixed;pointer-events:none;border-radius:50%;z-index:11}
body:not(.playing) #znHow,body:has(#mapOv:not([hidden])) #znHow,body:has(#lvOv:not([hidden])) #znHow,body:has(#rtOv:not([hidden])) #znHow{display:none!important}`;
  document.head.appendChild(st);
  chip = document.createElement('div'); chip.id = 'znChip';
  chip.innerHTML = '<div class="c" id="znTesta"></div><div id="znBar"><div class="t"><span id="znMio"></span><span id="znLoro"></span></div><div class="b"><i id="znFill"></i></div><div class="m"><span id="znManca"></span><button type="button" id="znAmico" title="Chiama \'n amico">📣</button></div></div>';
  document.body.appendChild(chip); barra = $('znBar');
  chip.onclick = e => { if (e.target.id === 'znAmico') return; aggiornaPadroni().then(pannello); };
  $('znAmico').onclick = e => { e.stopPropagation(); chiamaAmico(); };
}
function posiziona(){
  const m = $('mini'); if (!m) { chip.style.top = 'calc(232px + env(safe-area-inset-top,0px))'; return; }
  const r = m.getBoundingClientRect(); chip.style.top = (r.bottom + 6) + 'px'; chip.style.right = Math.max(10, innerWidth - r.right) + 'px';
}
function aggiornaChip(){
  ui(); if (!document.body.classList.contains('playing') || !cella) { chip.style.display = 'none'; return; }
  const pad = padrone(cella.id), p = conPaese(), mia = pad && pad === p;
  chip.style.display = 'block'; posiziona(); chip.style.borderColor = mia ? '#f2c74e' : pad ? colore(pad) : 'rgba(255,255,255,.3)';
  $('znTesta').innerHTML = `<i style="background:${colore(pad)}"></i><span>⚔ ${pad ? corto(pad) : 'terra de nessuno'}</span>`;
  chip.title = nomeCella(cella);
  aggiornaBarra();
}
function aggiornaBarra(){
  if (!barra || !cella) return;
  const p = conPaese(); if (!p) { barra.style.display = 'none'; return; }
  const pad = padrone(cella.id);
  if (pad === p) { barra.style.display = 'none'; return; }
  const mio = punti(cella.id, p) + (daMandare[cella.id] || 0), loro = pad ? padronePunti(cella.id) : 0, manca = Math.max(1, loro - mio + 1);
  barra.style.display = 'block';
  $('znMio').innerHTML = `<b>${corto(p)}</b> ${mio}`; $('znLoro').textContent = pad ? `${corto(pad)} ${loro}` : 'nessuno 0';
  $('znFill').style.width = (loro ? Math.min(100, mio / (loro + 1) * 100) : Math.min(100, mio * 100)) + '%';
  const fra = Math.max(0, passo() - secondi);
  $('znManca').innerHTML = (pad ? `Mancano <b>${manca}</b> · ` : '') + (TG.Zone.squadra ? '👥' : '') + (ICONE[mezzo()] || '') + ` +1 fra ${fra}s`;
  if (pad !== p) spiega(pad);
}
// la prima volta in terra altrui (o libera): come si ruba, in tre righe
let how = null, spiegato = false;
function spiega(pad){
  if (spiegato || !caricato || !tPlay || Date.now() - tPlay < 40000 || ls.get('tg-zone-spiegato') || !conPaese()) return;  // non nel primo mezzo minuto: prima si guida
  spiegato = true; ls.set('tg-zone-spiegato', '1');
  how = document.createElement('div'); how.id = 'znHow';
  how.setAttribute('style', 'position:fixed;left:50%;bottom:calc(140px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:31;width:min(300px,86vw);padding:10px 12px;border-radius:14px;background:rgba(16,22,21,.92);border:1px solid #f2c74e;color:#f3e7cb;font:600 12.5px/1.3 Figtree,"Segoe UI",system-ui,sans-serif;backdrop-filter:blur(4px)');
  how.innerHTML = `<b style="color:#f2c74e;font-size:14px">⚔ Come se ruba 'na terra</b><br>1. <b>Gira qui</b>: +1 ogni ${PASSI[mezzo()] || 5} s pe' ${corto(conPaese())} (co' i mezzi più grossi, più veloce).<br>2. <b>Raccogli nocchie qui</b>: valgono doppio.<br>3. Superi i punti ${pad ? 'de ' + corto(pad) : 'de chi ce sta'} → è vostra.<div style="text-align:right;margin-top:4px"><button type="button" style="all:unset;cursor:pointer;padding:5px 12px;border-radius:9px;background:#f2c74e;color:#17201f;font-weight:800">Ho capito</button></div>`;
  how.querySelector('button').onclick = () => { how.remove(); how = null; };
  document.body.appendChild(how); setTimeout(() => { if (how) { how.remove(); how = null; } }, 25000);
  ev('zone_spiegate', pad || 'nessuno');
}
async function chiamaAmico(){
  const p = conPaese(); if (!p || !cella) return;
  const pad = padrone(cella.id), n = nomeCella(cella);
  const url = `https://grandtuscia.netlify.app/?utm_source=sfida&utm_campaign=aiuto&cella=${cella.id}&da=${encodeURIComponent(p)}&nome=${encodeURIComponent(n)}${pad ? '&contro=' + encodeURIComponent(pad) : ''}`;
  const testo = pad ? `Sto a pijà ${n} a ${nomeP(pad)} pe' ${nomeP(p)}, ma da solo nun ce la faccio. Vieni a damme 'na mano (cinque minuti, dal telefono): ${url}` : `${n} è terra de nessuno: se famo in due stasera è de ${nomeP(p)}. Vieni: ${url}`;
  ev('condividi', 'aiuto', null, { cella: cella.id, contro: pad });
  try { if (navigator.share) { await navigator.share({ title: 'A guerra de e nocchie', text: testo }); return; } } catch(e){ if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(testo); TG.msg('Copiato: incollalo su WhatsApp'); } catch(e){ try { prompt('Copia e manda', testo); } catch(e2){} }
}
// chi arriva chiamato da un amico
function arrivoAiuto(){
  let q; try { q = new URLSearchParams(location.search); } catch(e){ return; }
  if (q.get('utm_campaign') !== 'aiuto') return;
  const id = q.get('cella') || '', da = q.get('da') || '', nome = q.get('nome') || 'una terra', contro = q.get('contro') || '';
  ev('arrivo', 'aiuto', null, { cella: id, da, contro });
  const c = cellaDaId(id);
  const metti = () => { const el = document.querySelector('#menu .intro') || document.querySelector('#menu p'); if (!el) return false; if (el.dataset.aiuto) return true; el.dataset.aiuto = '1'; el.textContent = `Uno de ${nomeP(da)} t'ha chiamato: sta a pijà ${nome}${contro ? ' a ' + nomeP(contro) : ''} e da solo nun ce la fa. Scegli ${nomeP(da)} e vai.`; return true; };
  if (!metti()) { let n = 0; const t = setInterval(() => { if (metti() || ++n > 20) clearInterval(t); }, 500); }
  if (!c) return;
  let fatto = false;
  const vai = () => { if (fatto || !document.body.classList.contains('playing')) return; fatto = true; setTimeout(() => { try { TG.debug.setDest({ x: c.x, z: c.z, name: nome, id: 'aiuto' }); TG.msg(`Segui a freccia: ${nome}`, `L'amico tuo t'aspetta là · ogni punto vale doppio`, 4); } catch(e){} }, 4000); };
  new MutationObserver(vai).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

/* ---------- pannello: la mappa delle celle ---------- */
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
#znOv .znLeg{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:10px;font-size:13px}#znOv .znLeg i{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:4px;vertical-align:middle}
#znOv .znList{display:grid;gap:4px;margin-top:10px}
#znOv .znRow{display:grid;grid-template-columns:12px 1fr auto;gap:10px;align-items:center;padding:7px 8px;border-radius:10px;cursor:pointer}#znOv .znRow:hover{background:rgba(255,255,255,.06)}
#znOv .znRow i{width:12px;height:12px;border-radius:50%;display:inline-block}#znOv .znRow b{display:block;font-size:14px}#znOv .znRow small{color:#9aa39c;font-size:11.5px}#znOv .znRow em{font-style:normal;font-family:ui-monospace,monospace;font-size:12px;color:#e2b765;white-space:nowrap}`;
    document.head.appendChild(st); document.body.appendChild(pan);
    pan.addEventListener('click', e => { if (e.target === pan) pan.hidden = true; });
  }
  const p = conPaese(), celle = tutteLeCelle();
  const W = 1000, H = Math.round(W * (BOUNDS.z1 - BOUNDS.z0) / (BOUNDS.x1 - BOUNDS.x0)), sx = v => (v - BOUNDS.x0) / (BOUNDS.x1 - BOUNDS.x0) * W, sz = v => (v - BOUNDS.z0) / (BOUNDS.z1 - BOUNDS.z0) * H;
  let car = null; try { car = TG.debug.car; } catch(e){}
  const tot = {};
  const esagoni = celle.map(c => { const pad = padrone(c.id); if (pad) tot[pad] = (tot[pad] || 0) + 1; const mia = pad && pad === p; return `<polygon points="${angoli(c).map(a => sx(a[0]).toFixed(1) + ',' + sz(a[1]).toFixed(1)).join(' ')}" fill="${colore(pad)}" fill-opacity="${pad ? .62 : .07}" stroke="${mia ? '#f2c74e' : 'rgba(255,255,255,.18)'}" stroke-width="${mia ? 2 : .8}"/>`; }).join('');
  const nomi = CONTRADE.map(k => `<text x="${sx(k.x)}" y="${sz(k.z)}" text-anchor="middle" dominant-baseline="middle" font-size="15" font-weight="800" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${k.nome.replace(/^(O|A|E|I) /, '')}</text>`).join('');
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mappa delle celle">${esagoni}${nomi}${car ? `<circle cx="${sx(car.x)}" cy="${sz(car.z)}" r="8" fill="#f2c74e" stroke="#000" stroke-width="2"/>` : ''}</svg>`;
  const leg = Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span><i style="background:${colore(k)}"></i>${nomeP(k)} <b>${n * ETTARI} ha</b></span>`).join('') || '<span>Nessuna cella ha ancora un padrone: a prima è de chi ce va.</span>';
  const righe = CONTRADE.map(k => { const c = cellaDi(k.x, k.z); const pad = padrone(c.id); const d = car ? Math.hypot(car.x - k.x, car.z - k.z) : 0;
    const intorno = celle.filter(x => Math.hypot(x.x - k.x, x.z - k.z) < k.r + R / 2); const conta = {}; for (const x of intorno) { const q = padrone(x.id); if (q) conta[q] = (conta[q] || 0) + 1; }
    const det = Object.entries(conta).sort((a, b) => b[1] - a[1]).map(([q, n]) => `${nomeP(q)} ${n}`).join(' · ') || 'terra de nessuno';
    return { k, pad, d, det }; }).sort((a, b) => a.d - b.d);
  pan.innerHTML = `<div class="znCard"><div class="znHead"><h2>⚔ A guerra de e nocchie</h2><button class="znX" aria-label="Chiudi">×</button></div>
  <div class="znSub" style="line-height:1.45"><b>Come se gioca</b><br>⚔ <b>Gira in una cella</b>: ogni pochi secondi un punto pe' o paese tuo. Chi ha più punti negli ultimi 7 giorni la tiene. In casa d'altri vale doppio.<br>🌰 <b>Raccogli e vendi nocchie</b>: coi soldi compri mezzi più forti (🛵 5 s · 🛺 4 s · 🚜 3 s · semovente 2 s pe' punto).<br>🏁 <b>Fai i giochi</b> (pesca, carrettini…): oro 15, argento 10, bronzo 5 nocchie pe' o paese.<br>📣 <b>Chiama 'n amico</b>: in squadra se conquista più veloce. Una cella so' ${ETTARI} ettari.</div>
  ${svg}<div class="znLeg">${leg}</div>
  <div class="znList">${righe.map(r => `<div class="znRow" data-z="${r.k.id}"><i style="background:${colore(r.pad)}"></i><div><b>${r.k.nome}</b><small>${r.det}</small></div><em>${r.d < 950 ? Math.round(r.d / 10) * 10 + ' m' : (r.d / 1000).toFixed(1).replace('.', ',') + ' km'}</em></div>`).join('')}</div></div>`;
  pan.querySelector('.znX').onclick = () => { pan.hidden = true; };
  pan.querySelectorAll('.znRow').forEach(r => r.onclick = () => { const k = CONTRADE.find(x => x.id === r.dataset.z); pan.hidden = true; try { const m = document.querySelector('#mapOv [data-close]'); m && m.click(); TG.debug.setDest({ x: k.x, z: k.z, name: k.nome }); TG.msg(`Segui a freccia: ${k.nome}`); } catch(e){} ev('zona_vai', k.id); });
  pan.hidden = false; ev('zone_aperte', '');
}
function bottone(){
  const q = $('mapQuick'); if (!q || q.querySelector('[data-q="zone"]')) return;
  const b = document.createElement('button'); b.dataset.q = 'zone'; b.innerHTML = '<i style="background:#d8432a"></i><span>⚔ Zone</span>';
  b.onclick = e => { e.stopPropagation(); aggiornaPadroni().then(pannello); };
  const luoghi = q.querySelector('[data-q="luoghi"]'); luoghi ? q.insertBefore(b, luoghi) : q.appendChild(b);
}

/* ---------- celle colorate sulla mappa grande ---------- */
let ov = null;
function overlayMappa(){
  const big = $('bigMap'), ovl = $('mapOv'); if (!big || !ovl || ovl.hidden) return;
  if (!ov) { ov = document.createElement('canvas'); ov.id = 'znMap'; ov.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1'); big.insertAdjacentElement('afterend', ov); }
  let hits = []; try { hits = TG.debug.mapHits() || []; } catch(e){}
  const pts = hits.filter(h => h.kind === 'place' && h.o && h.o.x != null && Math.abs(h.o.z) < 50000);
  const r = big.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  if (ov.width !== Math.round(r.width * dpr) || ov.height !== Math.round(r.height * dpr)) { ov.width = Math.round(r.width * dpr); ov.height = Math.round(r.height * dpr); }
  const c = ov.getContext('2d'); c.clearRect(0, 0, ov.width, ov.height);
  let a = null, b = null, bd = 0; for (const h of pts) for (const k of pts) { const d = Math.abs(h.o.x - k.o.x) + Math.abs(h.o.z - k.o.z); if (d > bd) { bd = d; a = h; b = k; } }
  if (!a || !b || Math.abs(a.o.x - b.o.x) < 1) return;
  const s = (a.x - b.x) / (a.o.x - b.o.x); if (!isFinite(s) || s === 0) return;
  const px = wx => (a.x + (wx - a.o.x) * s) * dpr, pz = wz => (a.y + (wz - a.o.z) * s) * dpr, m = R * s * dpr;
  const p = conPaese();
  for (const ce of tutteLeCelle()) {
    const pad = padrone(ce.id); if (!pad) continue;
    const X = px(ce.x), Z = pz(ce.z); if (X < -m || Z < -m || X > ov.width + m || Z > ov.height + m) continue;
    c.beginPath(); angoli(ce).forEach((q, i) => i ? c.lineTo(px(q[0]), pz(q[1])) : c.moveTo(px(q[0]), pz(q[1]))); c.closePath();
    c.fillStyle = colore(pad); c.globalAlpha = .34; c.fill(); c.globalAlpha = 1;
    c.lineWidth = (pad === p ? 2 : 1) * dpr; c.strokeStyle = pad === p ? '#f2c74e' : 'rgba(255,255,255,.35)'; c.stroke();
  }
}

/* ---------- celle colorate sulla minimappa (stessa rotazione del gioco: avanti = su) ---------- */
let mini = null;
function overlayMini(){
  const m = $('mini'), mo = $('mapOv');
  if (!m || !document.body.classList.contains('playing') || (mo && !mo.hidden)) { if (mini) mini.style.display = 'none'; return; }
  const r = m.getBoundingClientRect(); if (!r.width) { if (mini) mini.style.display = 'none'; return; }
  if (!mini) { mini = document.createElement('canvas'); mini.id = 'znMini'; document.body.appendChild(mini); }
  mini.style.display = 'block'; mini.style.left = r.left + 'px'; mini.style.top = r.top + 'px'; mini.style.width = r.width + 'px'; mini.style.height = r.height + 'px';
  const W = 168; if (mini.width !== W) { mini.width = W; mini.height = W; }
  let d; try { d = TG.debug.car; } catch(e){ return; } if (!d) return;
  const c = mini.getContext('2d'), a = W / 2, s = a / 820, rot = -Math.atan2(Math.cos(d.yaw), Math.sin(d.yaw)) - Math.PI / 2;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, W);
  c.beginPath(); c.arc(a, a, a - 1, 0, Math.PI * 2); c.clip();
  c.translate(a, a); c.rotate(rot); c.scale(s, s);
  const p = conPaese();
  for (const ce of celleVicine(d.x, d.z, 900)) {
    const pad = padrone(ce.id); if (!pad) continue;
    c.beginPath(); angoli(ce).forEach((q, i) => i ? c.lineTo(q[0] - d.x, q[1] - d.z) : c.moveTo(q[0] - d.x, q[1] - d.z)); c.closePath();
    c.fillStyle = colore(pad); c.globalAlpha = .38; c.fill(); c.globalAlpha = 1;
    c.lineWidth = (pad === p ? 2.4 : 1.2) / s; c.strokeStyle = pad === p ? '#f2c74e' : 'rgba(255,255,255,.5)'; c.stroke();
  }
}

/* ---------- confini e bandierine nel 3D ---------- */
const T3 = { gruppo: null, muri: {}, bandiere: [], ultimo: null, versione: -1, bgeo: null, pgeo: null, pmat: null };
// muretto trasparente lungo un lato (a→b), in 6 pezzi per seguire il terreno: da 1 m sotto a 6 m sopra l'erba
function nastro(pos, a, b, g){
  const N = 6, dx = b[0] - a[0], dz = b[1] - a[1];
  let px = a[0], pz = a[1], py = g(px, pz);
  for (let i = 1; i <= N; i++) {
    const x = a[0] + dx * i / N, z = a[1] + dz * i / N, y = g(x, z);
    pos.push(px, py - 1, pz, x, y - 1, z, x, y + 6, z, px, py - 1, pz, x, y + 6, z, px, py + 6, pz);
    px = x; pz = z; py = y;
  }
}
function confini3D(){
  if (!document.body.classList.contains('playing')) { if (T3.gruppo) T3.gruppo.visible = false; return; }
  let d, scene, E; try { d = TG.debug.car; scene = TG.debug.scene; E = TG.debug.world; } catch(e){ return; } if (!d || !scene || !window.THREE || !E || !E.ground) return;
  if (T3.ultimo && T3.versione === versione && Math.hypot(d.x - T3.ultimo.x, d.z - T3.ultimo.z) < 160) { T3.gruppo.visible = true; return; }
  T3.ultimo = { x: d.x, z: d.z }; T3.versione = versione;
  if (!T3.gruppo) {
    T3.gruppo = new THREE.Group(); T3.gruppo.name = 'zoneConfini'; scene.add(T3.gruppo);
    T3.pgeo = new THREE.CylinderGeometry(.25, .3, 9, 6); T3.pmat = new THREE.MeshLambertMaterial({ color: 0xd9cfb4 });
    T3.bgeo = new THREE.BufferGeometry(); T3.bgeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 9, 0, 0, 6.6, 0, 3.6, 7.8, 0], 3)); T3.bgeo.computeVertexNormals();
  }
  T3.gruppo.visible = true;
  const p = conPaese(), g = (x, z) => E.ground(x, z), perColore = {};  // un muro per colore (i colori per vertice qui non rendono bene)
  const celle = celleVicine(d.x, d.z, 1500), ids = new Set(celle.map(c => c.id));
  for (const c of celle) {
    const pc = padrone(c.id), ang = angoli(c);
    vicini(c).forEach((v, i) => {
      if (!v) return; const pv = padrone(v.id); if (pc === pv) return;
      if (ids.has(v.id) && v.id < c.id) return;  // lato già disegnato dall'altra cella
      const chi = pc || pv, k = p && chi === p ? '#f2c74e' : colore(chi);
      nastro(perColore[k] = perColore[k] || [], ang[i], ang[(i + 1) % 6], g);
    });
  }
  for (const k in T3.muri) if (!perColore[k]) T3.muri[k].visible = false;
  for (const k in perColore) {
    let m = T3.muri[k];
    if (!m) { m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(k), transparent: true, opacity: .85, side: THREE.DoubleSide })); m.frustumCulled = false; m.renderOrder = 2; T3.gruppo.add(m); T3.muri[k] = m; }
    // geometria nuova ogni volta: in questo three.js un attributo sostituito dopo il primo render non si aggiorna
    try { m.geometry.dispose(); } catch(e){}
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(perColore[k], 3)); ge.computeBoundingSphere(); m.geometry = ge; m.visible = true;
  }
  // bandierine al centro delle celle con padrone (fino a 40)
  let n = 0;
  for (const c of celle) {
    const pc = padrone(c.id); if (!pc || n >= 40) continue;
    let b = T3.bandiere[n]; if (!b) { b = new THREE.Group(); const palo = new THREE.Mesh(T3.pgeo, T3.pmat); palo.position.y = 4.5; b.add(palo); b.add(new THREE.Mesh(T3.bgeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }))); T3.gruppo.add(b); T3.bandiere[n] = b; }
    b.visible = true; b.position.set(c.x, E.ground(c.x, c.z) + 1, c.z); b.children[1].material.color.set(colore(pc)); b.children[1].material.emissive && b.children[1].material.emissive.set(pc === p ? 0x332800 : 0x000000); n++;
  }
  for (let i = n; i < T3.bandiere.length; i++) T3.bandiere[i].visible = false;
}

/* ---------- aggancio ai punti del paese ---------- */
function aggancia(){
  const PM = TG.PrimoMinuto; if (!PM || !PM.mandaPunti || PM.mandaPunti._zone) return;
  const o = PM.mandaPunti;
  const n = function(k){ try { if (TG.Zone.salta) TG.Zone.salta = 0; else if (cella && k > 0) { accumula(cella, Math.min(30, Math.round(k))); invia(true); } } catch(e){} return o.apply(this, arguments); };
  n._zone = 1; PM.mandaPunti = n;
}
function giro(){ try { overlayMappa(); overlayMini(); } catch(e){} requestAnimationFrame(giro); }
// prima volta: se parti in terra d'altri, la freccia ti porta alla terra de nessuno più vicina (una cella si prende subito, 95 punti no)
function primaTerra(){
  if (ls.get('tg-zone-prima-terra') || !caricato || !conPaese()) return false;
  if (!document.body.classList.contains('playing')) return false;
  let c, E; try { c = TG.debug.car; E = TG.debug.world; } catch(e){ return false; } if (!c || !cella) return false;
  ls.set('tg-zone-prima-terra', '1');
  const p = conPaese(), qui = padrone(cella.id);
  if (!qui || qui === p) return true;  // già in terra libera o tua: niente da fare
  const acqua = (x, z) => { try { return E.isWater && E.isWater(x, z); } catch(e){ return false; } };
  const libere = celleVicine(c.x, c.z, 1800).filter(x => !padrone(x.id) && !acqua(x.x, x.z)).sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z));
  const t = libere[0]; if (!t) return true;
  const d = Math.hypot(t.x - c.x, t.z - c.z), n = nomeCella(t);
  setTimeout(() => {
    try { TG.debug.setDest({ x: t.x, z: t.z, name: 'Terra de nessuno · ' + n }); } catch(e){}
    try { TG.msg(`Qui è terra de ${corto(qui)}`, `A ${d < 950 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km'} c'è terra de nessuno: segui a freccia e pijatela pe' ${corto(p)}`, 6); } catch(e){}
    ev('prima_terra', t.id, Math.round(d), { da: qui });
  }, 5000);
  return true;
}
function avvia(){
  if (!TG.debug || !TG.PrimoMinuto) return setTimeout(avvia, 1000);
  { const t = setInterval(() => { if (primaTerra() || ls.get('tg-zone-prima-terra')) clearInterval(t); }, 1500); }
  aggancia(); aggiornaPadroni(); setInterval(aggiornaPadroni, 90000);
  setInterval(tick, 1000); bottone(); setInterval(bottone, 5000);
  setInterval(aggiornaChip, 1000); setInterval(() => { try { confini3D(); } catch(e){} }, 700); giro();
  addEventListener('pagehide', () => invia(true));
}
TG.Zone = { R, CONTRADE, BOUNDS, cellaDi, cellaDaId, angoli, vicini, tutteLeCelle, celleVicine, contrada, nomeCella, padrone, punti, padroni: () => padroni, pannello, colore, salta: 0,
  accredita: (id, n) => { let c = cellaDaId(id); if (!c) { const k = CONTRADE.find(z => z.id === id); c = k && cellaDi(k.x, k.z); } if (c) { accumula(c, Math.min(30, Math.round(n))); invia(true); } },
  zonaDi: (x, z) => { const c = cellaDi(x, z); const k = contrada(x, z); return Object.assign({ nome: k ? k.nome : 'a campagna' }, c); },
  aggiorna: aggiornaPadroni, cella: () => cella, chiamaAmico, _dbg: () => ({ cella, daMandare, secondi, locali, versione }) };
if (document.readyState === 'complete') { setTimeout(avvia, 2000); arrivoAiuto(); } else addEventListener('load', () => { setTimeout(avvia, 2000); arrivoAiuto(); });
})();
