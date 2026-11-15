/* A COOPERATIVA DE O PAESE — se dona andando de persona a o palazzo principale de o paese tuo.
   - Ogni paese co' i terreni de casa c'ha a cooperativa sua, davanti a o palazzo principale (Castello, Palazzo Farnese…).
     Se vede da lontano: palazzetto co' l'insegna e a colonna de luce de o colore de o paese; su a minimappa 🏛.
   - Ce porti e nocchie de o cassone e premi «DONA»: a cooperativa cresce PE' SEMPRE (nun se azzera o lunedì).
   - Ogni livello aiuta tutti i paesani: 1 Magazzino cassone +10% · 2 Essiccatoio terreni de casa a 30 · 3 Sgusciatrice
     affitto 1 su 4 · 4 Pasticceria mezzi −20% · 5 Fiera de a nocchia. Chi ha donato de più è o Presidente (nome su l'insegna).
   - Anche l'affitto de i terreni ancora de casa va a a cooperativa (server: tg_terra_affitto).
   Server: tg_coop_stato(), tg_coop_dona(p_dev, p_paese, p_nocchie, p_nome).
   Esterno: TG.debug (car, scene, world, setDest), TG.Cassone, TG.Terre (colore, paeseMio), TG.Fantasmi, TG.msg, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const cfg = window.TG_STATS_CONFIG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c, v, x) => { try { TG.Stats && TG.Stats.ev(t, c, v, x); } catch(e){} };
const msg = (a, b, s) => { try { TG.msg(a, b, s); } catch(e){} };
const $ = id => document.getElementById(id);
const dev = () => { try { return TG.Stats && TG.Stats.dispositivo; } catch(e){ return null; } };
const paese = () => { try { return TG.Terre.paeseMio(); } catch(e){ return null; } };
const colore = p => { try { return TG.Terre.colore(p); } catch(e){ return '#ff8a3c'; } };
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
async function rpc(f, body){
  if (!cfg.url) throw new Error('niente server');
  const r = await fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/' + f, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: 'Bearer ' + cfg.key }, body: JSON.stringify(body || {}) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}

const SOGLIE = [0, 500, 1500, 4000, 10000, 25000];
const NOMI = ['Baracca', 'Magazzino', 'Essiccatoio', 'Sgusciatrice', 'Pasticceria', 'Fiera de a nocchia'];
const DA = ['', 'Cassone +10% pe\' tutti i paesani', 'I terreni de casa costano 30 a chi invade', 'Affitto: 1 nocchia su 4', 'Mezzi scontati del 20%', 'A cooperativa più grande de a Tuscia'];
const livDi = n => { let l = 0; for (let i = 1; i < SOGLIE.length; i++) if (n >= SOGLIE[i]) l = i; return l; };
// dove sta: davanti a o palazzo principale (pe' i paesi fori da o mondo, in mezzo a i terreni de casa loro)
const LUOGHI = [
  { p: 'fabrica', nome: 'Fabrica', luogo: 'l\'ingresso de o paese, verso Falerii', anello: 210, verso: [4900, 600], x: 4080, z: -640 },
  { p: 'carbognano', nome: 'Carbognano', luogo: 'a piazza, sotto o Castello Farnese', sito: 'carbognano', x: 3230, z: -470 },
  { p: 'caprarola', nome: 'Caprarola', luogo: 'Piazza Farnese, sotto o Palazzo', sito: 'caprarola', x: 2280, z: -340 },
  { p: 'ronciglione', nome: 'Ronciglione', luogo: 'l\'ingresso de o paese, verso o lago', anello: 240, verso: [1090, 1900], x: 1560, z: 1620 },
  { p: 'viterbo', nome: 'Viterbo', luogo: 'Piazza del Plebiscito', sito: 'viterbo', x: -750, z: -3350 },
  { p: 'civita-castellana', nome: 'Civita Castellana', luogo: 'a strada pe\' o Forte Sangallo', x: 6160, z: 1000 },
  { p: 'nepi', nome: 'Nepi', luogo: 'a strada pe\' o Forte de i Borgia', x: 5960, z: 1760 },
  { p: 'vignanello', nome: 'Vignanello', luogo: 'a strada pe\' o Castello Ruspoli', x: 3900, z: -1000 },
  { p: 'canepina', nome: 'Canepina', luogo: 'a strada pe\' Canepina', x: 815, z: -3210 }
];
let COOP = [], stato = {}, guida = false, occupato = false;
const info = p => { const s = stato[p] || {}; const tot = +s.tot || 0; return { tot, liv: livDi(tot), pres: s.pres || null }; };

/* ---------- dove metterle: su a strada più vicina a o palazzo, un po' de lato ---------- */
function piazza(L){
  const W = TG.debug.world; let x = L.x, z = L.z;
  // in paese: in piazza (spazio libero), un po' de lato rispetto a a fontana e a a strada che ce entra
  let P = null; try { P = L.sito && TG.debug.SITI && TG.debug.SITI[L.sito]; } catch(e){}
  if (P) { x = P.x; z = P.z; }
  let best = null, bd = 1e9, dir = [1, 0], bw = 5;
  for (const r of W.roads || []) { if (!r.samples || r.w < 2) continue; const S = r.samples;
    for (let i = 0; i < S.length; i++) { let d = Math.hypot(S[i][0] - x, S[i][1] - z);
      if (L.anello) { if (d < L.anello + 25 || d > L.anello + 90) continue; d = Math.hypot(S[i][0] - L.verso[0], S[i][1] - L.verso[1]); }   // fori da e case, su a strada verso i terreni de casa
      try { if (TG.Terre.terraIn(S[i][0], S[i][1])) continue; } catch(e){}
      if (d < bd) { bd = d; best = S[i]; bw = r.w; const j = S[Math.min(i + 1, S.length - 1)], k = S[Math.max(i - 1, 0)]; dir = [j[0] - k[0], j[1] - k[1]]; } } }
  if (!best || (bd > 600 && !L.anello)) return { x, z, ang: 0 };
  if (P) { const vx = best[0] - x, vz = best[1] - z, l = Math.hypot(vx, vz) || 1, px = -vz / l, pz = vx / l;
    const cx = x + px * 15, cz = z + pz * 15; return { x: cx, z: cz, ang: Math.atan2(x - cx, z - cz), rx: x + vx / l * 6, rz: z + vz / l * 6 }; }
  const l = Math.hypot(dir[0], dir[1]) || 1, nx = -dir[1] / l, nz = dir[0] / l, off = bw / 2 + 8;
  return { x: best[0] + nx * off, z: best[1] + nz * off, ang: Math.atan2(nx, nz), rx: best[0], rz: best[1] };
}

/* ---------- o palazzetto: cresce co' o livello ---------- */
const MAT = {};
const mat = c => MAT[c] || (MAT[c] = new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
function insegna(C){
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 176; const c = cv.getContext('2d'), I = info(C.p);
  c.fillStyle = 'rgba(16,22,21,.9)'; c.beginPath(); c.roundRect ? c.roundRect(6, 6, 500, 164, 26) : c.rect(6, 6, 500, 164); c.fill();
  c.lineWidth = 8; c.strokeStyle = colore(C.p); c.stroke();
  c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = '900 40px Figtree, system-ui, sans-serif'; c.fillText('🏛 COOPERATIVA', 256, 56);
  c.fillStyle = colore(C.p); c.font = '900 38px Figtree, system-ui, sans-serif'; c.fillText(C.nome.toUpperCase(), 256, 100);
  c.fillStyle = '#f3e7cb'; c.font = '800 28px Figtree, system-ui, sans-serif';
  c.fillText(`Liv ${I.liv} · ${NOMI[I.liv]}${I.pres && I.pres.nome ? ' · 👑 ' + String(I.pres.nome).slice(0, 14) : ''}`, 256, 146);
  const t = new THREE.CanvasTexture(cv); return t;
}
function costruisci(C){
  const D = TG.debug, g = new THREE.Group(), I = info(C.p), col = colore(C.p);
  const y0 = D.world.ground(C.x, C.z); g.position.set(C.x, y0, C.z); g.rotation.y = C.ang; g.scale.setScalar(1.5);
  const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y + h / 2, z); g.add(m); return m; };
  const h = I.liv >= 1 ? 5 : 3.2, w = I.liv >= 1 ? 9 : 5;
  box(w + 1, .4, 7, '#cfc4a8', 0, 0, 0);                     // basamento
  box(w, h, 6, '#efe3c4', 0, .4, 0);                          // muri
  const tetto = new THREE.Mesh(new THREE.CylinderGeometry(.01, 4.4, 2.2, 4, 1), mat('#b5552f')); tetto.scale.set(w / 6, 1, 1); tetto.rotation.y = Math.PI / 4; tetto.position.set(0, .4 + h + 1.1, 0); g.add(tetto);
  box(2, 2.8, .2, '#6b4a2e', 0, .4, 3.05);                    // portone
  box(w, .6, .25, col, 0, .4 + h - 1.1, 3.1);                 // fascia co' o colore de o paese
  if (I.liv >= 2) box(1.2, 4.5, 1.2, '#9a8f7f', -w / 2 + .9, .4 + h, -1.6);                       // essiccatoio: camino
  if (I.liv >= 3) { const s = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 9, 10), mat('#c9c9c2')); s.position.set(w / 2 + 2.2, 4.9, -1); g.add(s); const k = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.4, 10), mat('#8d9aa1')); k.position.set(w / 2 + 2.2, 10.1, -1); g.add(k); }
  if (I.liv >= 4) { box(5, 3.4, 5, '#f6d7b0', -w / 2 - 3.2, .4, .4); box(5.4, .3, 1.6, col, -w / 2 - 3.2, 3.4, 3.4); }   // pasticceria co' a tenda
  if (I.liv >= 5) for (let i = -2; i <= 2; i++) { box(.15, 7, .15, '#5a4a3a', i * 2.6, .4, 4.6); box(1.3, .8, .05, i % 2 ? col : '#f2c74e', i * 2.6 + .7, 6.2, 4.6); }   // a fiera: bandiere
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: insegna(C), depthWrite: false, depthTest: false })); sp.scale.set(12, 4.1, 1); sp.position.set(0, .4 + h + 5, 0); sp.renderOrder = 5; g.add(sp);
  const mio = C.p === paese();
  const fa = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 120, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: mio ? .32 : .16, depthWrite: false, side: THREE.DoubleSide }));
  fa.position.set(0, 60, 0); g.add(fa);
  C.fascio = fa; return g;
}
function ridisegna(C){
  const D = TG.debug; if (C.g) { D.scene.remove(C.g); C.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); }); }
  C.g = costruisci(C); C.firma = info(C.p).liv + '|' + ((info(C.p).pres || {}).nome || '') + '|' + paese(); D.scene.add(C.g);
}

/* ---------- vicino a a cooperativa: o bottone DONA (stesso posto de COMPRA: mai tutti e due) ---------- */
const st = document.createElement('style'); st.textContent = `
#coBtn{position:fixed;z-index:33;right:calc(14px + env(safe-area-inset-right,0px));bottom:calc(118px + env(safe-area-inset-bottom,0px));display:none;flex-direction:column;align-items:center;justify-content:center;min-width:148px;padding:12px 18px 10px;border:0;border-radius:22px;background:#2e9e5b;color:#fff;font:900 20px/1.05 Figtree,"Segoe UI",system-ui,sans-serif;box-shadow:0 5px 0 #1d6b3d,0 10px 24px rgba(0,0,0,.35);cursor:pointer;touch-action:manipulation}
#coBtn *{pointer-events:none}#coBtn small{display:block;margin-top:3px;font:800 12px/1.2 Figtree,sans-serif;opacity:.95}
#coBtn:active{transform:translateY(3px);box-shadow:0 2px 0 #1d6b3d}#coBtn.no{background:#4a524e;box-shadow:0 5px 0 #2c322f,0 10px 24px rgba(0,0,0,.35)}
body:not(.playing) #coBtn,body:has(#mapOv:not([hidden])) #coBtn,body:has(#vehOv:not([hidden])) #coBtn{display:none!important}
html.tg-coop #prompt{display:none!important}`;
document.head.appendChild(st);
let btn = null;
const vicina = (r) => { const c = TG.debug && TG.debug.car; if (!c) return null; let b = null, bd = r; for (const C of COOP) { const d = Math.hypot(C.x - c.x, C.z - c.z); if (d < bd) { bd = d; b = C; } } return b; };
function bottone(){
  if (!btn) { btn = document.createElement('button'); btn.id = 'coBtn'; btn.type = 'button'; btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); dona(); }); document.body.appendChild(btn); }
  const C = vicina(22), p = paese(), sc = $('scBtn'), comprando = sc && sc.style.display === 'flex';
  const ok = C && C.p === p && !comprando;
  document.documentElement.classList.toggle('tg-coop', !!ok);
  if (!ok) { btn.style.display = occupato ? 'flex' : 'none'; return; }
  btn.style.display = 'flex';
  const n = (TG.Cassone && TG.Cassone.n) || 0, I = info(p), prox = SOGLIE[I.liv + 1];
  const h = n >= 10 ? `🏛 DONA ${n} 🌰<small>${prox ? `${fmt(I.tot)}/${fmt(prox)} pe' ${NOMI[I.liv + 1]}` : 'Livello massimo!'}${matchMedia('(pointer:fine)').matches ? ' · tasto E' : ''}</small>` : `🏛 Cassone vòto<small>raccoji nocchie e riportale qui</small>`;
  btn.classList.toggle('no', n < 10); if (btn._h !== h) { btn._h = h; btn.innerHTML = h; }
  if (guida) { guida = false; try { TG.debug.setDest(null); } catch(e){} }
}
async function dona(){
  const p = paese(), d = dev(), C = TG.Cassone; if (occupato || !p || !d || !C) return;
  const n = C.n; if (n < 10) { msg('🏛 Cassone vòto', 'Raccoji almeno 10 nocchie e riportale a a cooperativa', 3); return; }
  occupato = true; btn._h = '…'; btn.innerHTML = '…';
  let nome = ''; try { nome = (TG.Fantasmi && TG.Fantasmi.soprannome()) || ''; } catch(e){}
  try {
    const r = await rpc('tg_coop_dona', { p_dev: d, p_paese: p, p_nocchie: n, p_nome: nome || null });
    if (r && r.ok) {
      C.togli(r.dato); stato[p] = { tot: r.tot, liv: r.liv, pres: r.pres }; ev('coop_dona', p, r.dato, { liv: r.liv, tot: r.tot });
      const I = info(p), prox = SOGLIE[I.liv + 1], pres = r.pres && r.mio >= r.pres.nocchie;
      if (r.liv > r.prima_liv) msg(`🎉 A cooperativa è salita: ${NOMI[r.liv]}!`, `${DA[r.liv]}. Grazie a te e a tutti i paesani`, 6);
      else msg(`🏛 Grazie! +${r.dato} a a cooperativa`, `${prox ? `${fmt(r.tot)}/${fmt(prox)} pe' ${NOMI[I.liv + 1]}` : 'Livello massimo'}${pres ? ' · 👑 O Presidente sei tu!' : r.pres ? ` · 👑 ${r.pres.nome} ${fmt(r.pres.nocchie)}` : ''}`, 4.5);
      const P = COOP.find(x => x.p === p); if (P) ridisegna(P);
    } else if (r && r.tetto) msg('Pe\' oggi basta', 'Hai donato tanto: riprova domani', 3);
    else msg('Nun è riuscito', 'Controlla a connessione e riprova', 3);
  } catch(e){ msg('Nun è riuscito', 'Controlla a connessione e riprova', 3); }
  occupato = false; bottone();
}

/* ---------- pe' o riquadro in alto (tg-semplice): vicino a una cooperativa o mentre ce vai ---------- */
function box(){
  const c = TG.debug && TG.debug.car, p = paese(); if (!c || !p) return null;
  const C = vicina(60);
  if (C) { const I = info(C.p), prox = SOGLIE[I.liv + 1], pct = prox ? Math.round((I.tot - SOGLIE[I.liv]) / (prox - SOGLIE[I.liv]) * 100) : 100;
    const barra = `<div class="b"><i style="width:${Math.max(3, pct)}%;background:${colore(C.p)}"></i></div>`;
    if (C.p !== p) return { col: colore(C.p), html: `<div class="t">🏛 Cooperativa de ${C.nome}</div><div class="s">Liv ${I.liv} · ${NOMI[I.liv]}${I.pres ? ' · 👑 ' + I.pres.nome : ''}<br>Qui dona solo chi è de ${C.nome}</div>${barra}` };
    return { col: colore(p), html: `<div class="t">🏛 A cooperativa vostra</div><div class="s">Liv ${I.liv} ${NOMI[I.liv]} · ${prox ? `${fmt(I.tot)}/${fmt(prox)} pe' ${NOMI[I.liv + 1]}` : 'al massimo'}${I.pres ? '<br>👑 ' + I.pres.nome + ' ' + fmt(I.pres.nocchie) : ''}</div>${barra}` }; }
  if (guida) { const M = COOP.find(x => x.p === p); if (M) { const d = Math.hypot(M.x - c.x, M.z - c.z), dist = d < 950 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km'; return { col: colore(p), html: `<div class="t">🏛 ➜ Cooperativa</div><div class="s">${M.luogo} · ${dist}</div>` }; } }
  return null;
}
function vai(){
  const p = paese(), M = COOP.find(x => x.p === p);
  if (!M) { msg('🏛 O paese tuo nun c\'ha ancora a cooperativa', 'Pe\' ora ce l\'hanno i paesi co\' i terreni de casa', 3.5); return; }
  guida = true; try { TG.debug.setDest({ x: M.x, z: M.z, name: 'Cooperativa de ' + M.nome }); } catch(e){}
  const I = info(p); msg(`🏛 Cooperativa de ${M.nome}`, `Sta a ${M.luogo}. Portace e nocchie: Liv ${I.liv} ${NOMI[I.liv]}${SOGLIE[I.liv + 1] ? ', ne mancano ' + fmt(SOGLIE[I.liv + 1] - I.tot) + ' pe\' o prossimo' : ''}`, 4);
  ev('coop_vai', p);
}

/* ---------- su a minimappa: 🏛 (a tua sempre, anche lontana, sul bordo) ---------- */
let mc = null;
function mini(){
  requestAnimationFrame(mini);
  const m = $('mini'), mo = $('mapOv');
  if (!m || !COOP.length || !document.body.classList.contains('playing') || (mo && !mo.hidden)) { if (mc) mc.style.display = 'none'; return; }
  const r = m.getBoundingClientRect(); if (!r.width) return;
  if (!mc) { mc = document.createElement('canvas'); mc.setAttribute('style', 'position:fixed;pointer-events:none;border-radius:50%;z-index:12'); mc.width = mc.height = 168; document.body.appendChild(mc); }
  Object.assign(mc.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  const d = TG.debug.car; if (!d) return;
  const c = mc.getContext('2d'), W = 168, a = W / 2, s = a / 820, rot = -Math.atan2(Math.cos(d.yaw), Math.sin(d.yaw)) - Math.PI / 2, p = paese();
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, W);
  for (const C of COOP) {
    let dx = C.x - d.x, dz = C.z - d.z; const dist = Math.hypot(dx, dz), mio = C.p === p;
    if (dist > 820 && !mio) continue;
    const ca = Math.cos(rot), sa = Math.sin(rot); let x = (dx * ca - dz * sa) * s, y = (dx * sa + dz * ca) * s;
    const R = Math.hypot(x, y), mx = a - 12; if (R > mx) { x *= mx / R; y *= mx / R; }
    c.beginPath(); c.arc(a + x, a + y, mio ? 10 : 8, 0, Math.PI * 2); c.fillStyle = 'rgba(16,22,21,.85)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = colore(C.p); c.stroke();
    c.font = (mio ? 12 : 10) + 'px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🏛', a + x, a + y + 1);
  }
}

async function aggiorna(){
  try { const s = await rpc('tg_coop_stato'); if (s && typeof s === 'object') stato = s; } catch(e){ return; }
  for (const C of COOP) { const f = info(C.p).liv + '|' + ((info(C.p).pres || {}).nome || '') + '|' + paese(); if (f !== C.firma) ridisegna(C); }
}
function intro(){
  const p = paese(), M = COOP.find(x => x.p === p); if (!M || ls.get('tg-coop-intro') || !document.body.classList.contains('playing')) return;
  ls.set('tg-coop-intro', '1'); msg(`🏛 A cooperativa de ${M.nome} sta a ${M.luogo}`, 'Portace e nocchie: cresce pe\' sempre e aiuta tutti i paesani. Tocca 🏛 ne o riquadro pe\' a freccia', 7);
}
function avvia(){
  const D = TG.debug; if (!window.THREE || !D || !D.car || !D.scene || !D.world || !D.world.roads || !TG.Terre || !TG.Cassone) return setTimeout(avvia, 1000);
  COOP = LUOGHI.map(L => Object.assign({}, L, piazza(L)));
  try { const V = D.COOP; if (V && V.g) { V.g.visible = false; V.trig = 0; } } catch(e){}   // o vecchio magazzino de a cooperativa (economia vecchia): via, sennò se confonde
  for (const C of COOP) ridisegna(C);
  aggiorna(); setInterval(aggiorna, 60000); setInterval(bottone, 300); requestAnimationFrame(mini);
  setTimeout(intro, 25000);
  addEventListener('keydown', e => { if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && btn && btn.style.display === 'flex' && !occupato && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) { e.preventDefault(); dona(); } });
}
TG.Coop = { box, vai, liv: p => info(p).liv, mio: () => info(paese()).liv, info, lista: () => COOP, aggiorna, SOGLIE, NOMI, guida: () => guida };
if (document.readyState === 'complete') setTimeout(avvia, 2000); else addEventListener('load', () => setTimeout(avvia, 2000));
})();
