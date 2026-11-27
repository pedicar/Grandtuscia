/* MISSIONI COME GTA — storie corte co' un personaggio, na meta, er tempo e un premio grosso (27/11: «oltre a raccoje nocchie nun so che fà»).
   Tre missioni in fila (se sblocca a prossima quanno finisci quella prima):
     🎪 A Sagra de a Nocciola (Carbognano) · 📮 O Postino de o Lago · 🚚 O Carico pe' Viterbo
   Come funziona:
   - Ner riquadro in alto (tg-semplice.js) compare «🎪 Missione: …» → tocchi → cartolina co' a storia → «Accetta».
   - Ogni passo: freccia e colonna gialla su a meta (TG.debug.setDest), striscia in alto co' cosa fà e, si c'è, er tempo.
   - Passi: «vai» (arriva entro r metri, a vorte co' tempo), «raccoji» (n nocchie novo ner cassone). Si scade o tempo
     o te cappotti mentre porti er carico → «MISSIONE FALLITA» e riprovi da quer pezzo.
   - A a fine: fochi d'artificio, «MISSIONE COMPIUTA», nocchie e na medaja.
   Stato su telefono: tg-missioni { fatte: {id: ts}, attiva: {id, passo} }. Eventi: missione_via / missione_passo / missione_fallita / missione_fatta.
   Usa TG.debug (car, scene, world, setDest, CAP), TG.GEO, TG.Cassone, TG.msg, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c, n) => { try { TG.Stats && TG.Stats.ev(t, c || '', n); } catch(e){} };
const G = k => (TG.GEO && TG.GEO[k]) || null;

const MISSIONI = [
  { id: 'sagra', ico: '🎪', titolo: 'A Sagra de a Nocciola', chi: '👴', nome: 'Sor Peppe de a Pro Loco', dove: 'CARBOGNANO', premio: 500, medaja: '🏅 Amico de a Sagra',
    storia: 'Sabato c\'è a Sagra de a Nocciola a Carbognano e nun è pronto gnente! Mancano e nocchie pe\' e paste, e tavole e pure a banda. Me dai na mano?',
    passi: [
      { vai: 'CARBOGNANO', r: 45, t: 'Va\' in piazza a Carbognano', dice: 'Bravo! Prima de tutto e nocchie: senza quelle, niente paste.' },
      { raccoji: 50, t: 'Raccoji 50 nocchie pe\' e paste' },
      { vai: 'CONSORZIO', r: 35, t: 'Va\' a o Consorzio a pijà e tavole', chiF: '👵', nomeF: 'Zi\' Angela', dice: 'Ecco e tavole! Corri, ma nun te cappottà, che so\' tante!' },
      { vai: 'CARBOGNANO', r: 45, tempo: 120, carico: '🪑 e tavole', t: 'Porta e tavole in piazza', dice: 'Perfetto! Mo\' manca solo a banda: sta a Fabrica.' },
      { vai: 'FABRICA', r: 45, t: 'Va\' a pijà a banda a Fabrica', chiF: '🎺', nomeF: 'O maestro de a banda', dice: 'Semo pronti! Portace a Carbognano, che famo tardi!' },
      { vai: 'CARBOGNANO', r: 45, tempo: 140, carico: '🎺 a banda', t: 'Porta a banda a Carbognano', dice: 'Evviva! A sagra po\' comincià! Guarda che fochi!' }
    ] },
  { id: 'postino', ico: '📮', titolo: 'O Postino de o Lago', chi: '👨‍✈️', nome: 'O postino Gigetto', dove: 'PALAZZO', premio: 400, medaja: '🏅 Postino d\'oro',
    storia: 'So\' rimasto a piedi co\' tre lettere urgenti! Una pe\' o Palazzo Farnese, una pe\' Ronciglione e una pe\' o pontile su o lago. Ce pensi tu? Ma de corsa!',
    passi: [
      { vai: 'PALAZZO', r: 50, t: 'Va\' a o Palazzo Farnese a Caprarola', dice: 'Ecco e lettere. Ogni consegna c\'ha er tempo suo: daje!' },
      { vai: 'RONCIGLIONE', r: 55, tempo: 150, carico: '✉️ a lettera', t: 'Consegna a lettera a Ronciglione' },
      { vai: 'PONTILE', r: 40, tempo: 150, carico: '✉️ l\'urtima lettera', t: 'Consegna l\'urtima lettera a o pontile', dice: 'Tutte consegnate! Mejo de me!' }
    ] },
  { id: 'carico', ico: '🚚', titolo: 'O Carico pe\' Viterbo', chi: '👩‍🌾', nome: 'A presidente de o Consorzio', dove: 'CONSORZIO', premio: 900, medaja: '🏅 Camionista de a Tuscia',
    storia: 'O mercato de Viterbo vò e nocchie nostre, ma o camion s\'è rotto! Te tocca portà o carico fino a Viterbo, passando sotto o Cimino. È lunga: nun perde tempo e nun te cappottà!',
    passi: [
      { vai: 'CONSORZIO', r: 35, t: 'Va\' a o Consorzio a caricà', dice: 'Carico pronto! Viterbo te aspetta: segui a freccia.' },
      { vai: 'VITERBO', r: 70, tempo: 480, carico: '🌰 o carico', t: 'Porta o carico a Viterbo', dice: 'O mercato è salvo! Viterbo ringrazia a Tuscia de e nocchie!' }
    ] }
];

let st = { fatte: {}, attiva: null }; try { st = Object.assign(st, JSON.parse(ls.get('tg-missioni') || '{}')); } catch(e){}
const salva = () => ls.set('tg-missioni', JSON.stringify(st));
const M = id => MISSIONI.find(m => m.id === id);
const prossima = () => MISSIONI.find(m => !st.fatte[m.id]) || null;
const attiva = () => st.attiva ? M(st.attiva.id) : null;
const playing = () => document.body.classList.contains('playing') && !document.body.classList.contains('flying');

/* ---------- grafica ---------- */
const css = document.createElement('style'); css.textContent = `
#misPill{position:fixed;z-index:31;left:calc(10px + env(safe-area-inset-left,0px));top:var(--obiTop,112px);width:min(220px,50vw);padding:8px 11px 9px;border-radius:13px;background:rgba(16,22,21,.9);border:2px solid #f2c74e;color:#f3e7cb;font:700 13px/1.25 Figtree,system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.3);pointer-events:auto;cursor:pointer}
#misPill .k{font:900 11px Figtree,sans-serif;letter-spacing:.08em;color:#f2c74e}#misPill .t{font:900 15px/1.2 Figtree,sans-serif;color:#fff;margin-top:2px}#misPill .s{margin-top:3px;color:#d9cfb6}
#misPill .tm{font:900 22px Figtree,sans-serif;color:#fff;margin-top:4px}#misPill .tm.poco{color:#ff6b4a}
#misPill[hidden],body:not(.playing) #misPill,body.flying #misPill{display:none!important}
body.tg-missione #obi,body.tg-missione #iscrBtn,body.tg-missione #tfCons,body.tg-missione #tfVai,body:has(.misCard) #tfCons,body:has(.misCard) #tfVai,body:has(.misCard) #iscrBtn{display:none!important}
.misCard{position:fixed;inset:0;z-index:62;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);padding:16px;animation:misFi .25s}
.misCard .c{width:min(360px,100%);background:#1b2423;border:3px solid #f2c74e;border-radius:20px;padding:18px 18px 16px;color:#f3e7cb;font-family:Figtree,system-ui,sans-serif;text-align:center;box-shadow:0 14px 40px rgba(0,0,0,.5);animation:misPop .4s cubic-bezier(.2,1.5,.4,1)}
.misCard .k{font:900 13px Figtree,sans-serif;letter-spacing:.14em;color:#f2c74e}.misCard h2{margin:6px 0 4px;font:900 26px/1.15 Figtree,sans-serif;color:#fff}
.misCard .chi{display:flex;gap:10px;align-items:flex-start;text-align:left;margin:12px 0 4px;background:rgba(255,255,255,.06);border-radius:14px;padding:10px}.misCard .chi b{font-size:38px;line-height:1}.misCard .chi p{margin:0;font:600 16px/1.35 Figtree,sans-serif}.misCard .chi small{display:block;color:#f2c74e;font-weight:800;font-size:13px;margin-bottom:2px}
.misCard .pr{margin:10px 0 2px;font:800 15px Figtree,sans-serif;color:#ddd4bf}
.misCard button{display:block;width:100%;margin-top:12px;border:0;border-radius:999px;background:#f2c74e;color:#1b2423;font:900 19px Figtree,sans-serif;padding:13px}.misCard button.no{background:none;color:#c9bfa8;font-size:16px;margin-top:4px;padding:8px}
.misCard.fatta .c{border-color:#7fd36b}.misCard.fatta .k{color:#7fd36b}.misCard.fallita .c{border-color:#ff6b4a}.misCard.fallita .k{color:#ff6b4a}
#misDice{position:fixed;left:50%;bottom:calc(120px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:45;display:flex;gap:10px;align-items:center;width:min(380px,92vw);padding:10px 14px;border-radius:16px;background:rgba(14,18,16,.92);border:2px solid #f2c74e;color:#f3e7cb;font:600 16px/1.3 Figtree,system-ui,sans-serif;pointer-events:none;animation:misFi .3s}
#misDice b{font-size:34px;line-height:1}#misDice small{display:block;color:#f2c74e;font-weight:800;font-size:12px}
@keyframes misPop{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}@keyframes misFi{from{opacity:0}}`;
document.head.appendChild(css);
const pill = document.createElement('div'); pill.id = 'misPill'; pill.hidden = true; document.body.appendChild(pill);
pill.addEventListener('click', () => { const m = attiva(); if (m) carta(m, 'info'); });

function carta(m, tipo, extra){
  document.querySelectorAll('.misCard').forEach(x => x.remove());
  const d = document.createElement('div'); d.className = 'misCard ' + (tipo === 'fatta' ? 'fatta' : tipo === 'fallita' ? 'fallita' : '');
  let h = '';
  if (tipo === 'offerta' || tipo === 'info') h = `<div class="k">${m.ico} MISSIONE</div><h2>${m.titolo}</h2><div class="chi"><b>${m.chi}</b><p><small>${m.nome}</small>${m.storia}</p></div><div class="pr">Premio: <b style="color:#fff">${m.premio} 🌰</b> e ${m.medaja}</div>` + (tipo === 'offerta' ? `<button data-si>Accetta!</button><button class="no" data-no>Dopo</button>` : `<button data-no>Continua</button><button class="no" data-lascia>Lascia a missione</button>`);
  else if (tipo === 'fatta') h = `<div class="k">✔ MISSIONE COMPIUTA</div><h2>${m.titolo}</h2><div class="pr" style="font-size:20px;color:#fff">+${m.premio} 🌰 · ${m.medaja}</div>${extra ? `<div class="pr">Prossima missione: <b style="color:#fff">${extra.ico} ${extra.titolo}</b></div>` : '<div class="pr">Hai finito tutte e missioni! Presto ne arrivano antre.</div>'}<button data-no>Evviva!</button>`;
  else if (tipo === 'fallita') h = `<div class="k">✖ MISSIONE FALLITA</div><h2>${extra || 'Tempo scaduto!'}</h2><div class="pr">Riprova: riparti da quer pezzo</div><button data-rip>Riprova</button><button class="no" data-lascia>Lascia stà</button>`;
  d.innerHTML = `<div class="c">${h}</div>`;
  d.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.si !== undefined) { d.remove(); accetta(m); }
    else if (b.dataset.rip !== undefined) { d.remove(); vaiPasso(st.attiva.passo, true); }
    else if (b.dataset.lascia !== undefined) { d.remove(); lascia(); }
    else d.remove();
  });
  document.body.appendChild(d);
}
let diceT = null;
function dice(chi, nome, testo){
  let d = document.getElementById('misDice'); if (!d) { d = document.createElement('div'); d.id = 'misDice'; document.body.appendChild(d); }
  d.innerHTML = `<b>${chi}</b><span><small>${nome}</small>${testo}</span>`; d.style.display = 'flex';
  clearTimeout(diceT); diceT = setTimeout(() => { d.style.display = 'none'; }, 5500);
}

/* ---------- a colonna gialla de chi te dà a missione ---------- */
let segno = null;
function segnale(){
  const D = TG.debug, m = attiva() ? null : prossima(), p = m && G(m.dove);
  if (!D || !D.scene || !window.THREE) return;
  if (!segno) {
    segno = new THREE.Group();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 70, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xf2c74e, transparent: true, opacity: .32, depthWrite: false, side: THREE.DoubleSide }));
    col.position.y = 35; segno.add(col);
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; segno.userData.cv = cv;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false })); sp.scale.set(9, 9, 1); sp.position.y = 12; segno.add(sp); segno.userData.sp = sp;
    D.scene.add(segno);
  }
  if (!p) { segno.visible = false; return; }
  if (segno.userData.id !== m.id) {
    const c = segno.userData.cv.getContext('2d'); c.clearRect(0, 0, 128, 128); c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fillStyle = '#f2c74e'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
    c.font = '70px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(m.ico, 64, 70);
    segno.userData.sp.material.map.needsUpdate = true; segno.userData.id = m.id;
    segno.position.set(p.x, D.world.ground(p.x, p.z), p.z);
  }
  segno.visible = true; segno.userData.sp.position.y = 12 + Math.sin(performance.now() / 400) * .8;
}

/* ---------- a missione ---------- */
let tempo = 0, fine = 0, base = 0, rac = 0, ultimoN = null, vicinoVisto = 0;
function accetta(m){ st.attiva = { id: m.id, passo: 0 }; salva(); ev('missione_via', m.id); vaiPasso(0); }
function lascia(){ const m = attiva(); if (m) ev('missione_lasciata', m.id, st.attiva.passo); st.attiva = null; salva(); try { TG.debug.setDest(null); } catch(e){} document.body.classList.remove('tg-missione'); pill.hidden = true; }
function vaiPasso(i, riprova){
  const m = attiva(); if (!m) return;
  // si riprovi un passo a tempo, riparti da quello prima (dove se carica)
  if (riprova && m.passi[i].tempo && i > 0) i--;
  st.attiva.passo = i; salva();
  const P = m.passi[i]; rac = 0; ultimoN = TG.Cassone ? TG.Cassone.n : 0;
  fine = P.tempo ? performance.now() + P.tempo * 1000 : 0;
  const q = P.vai && G(P.vai); try { TG.debug.setDest(q ? { x: q.x, z: q.z, name: P.t } : null); } catch(e){}
  ev('missione_passo', m.id, i);
}
function fatto(){
  const m = attiva(), P = m.passi[st.attiva.passo];
  if (P.dice) dice(P.chiF || m.chi, P.nomeF || m.nome, P.dice);
  if (st.attiva.passo + 1 < m.passi.length) { vaiPasso(st.attiva.passo + 1); try { TG.Sounds && TG.Sounds.play && TG.Sounds.play('ok'); } catch(e){} return; }
  // missione finita
  st.fatte[m.id] = Date.now(); st.attiva = null; salva();
  try { TG.debug.setDest(null); } catch(e){} document.body.classList.remove('tg-missione'); pill.hidden = true;
  try { TG.Cassone.aggiungi(m.premio, true); } catch(e){}
  ev('missione_fatta', m.id, m.premio);
  const p = G(m.passi[m.passi.length - 1].vai); if (p) fochi(p.x, p.z);
  setTimeout(() => carta(m, 'fatta', prossima()), 1800);
}
function fallita(perche){ const m = attiva(); ev('missione_fallita', m.id, st.attiva.passo); fine = 0; try { TG.debug.setDest(null); } catch(e){} carta(m, 'fallita', perche); }
const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function giro(){
  setTimeout(giro, 250);
  try { segnale(); } catch(e){}
  const m = attiva(), D = TG.debug; document.body.classList.toggle('tg-missione', !!m);
  if (!m || !D || !D.car || !playing()) { if (!m) pill.hidden = true; return; }
  if (document.querySelector('.misCard')) return;   // carta aperta: tutto fermo
  const P = m.passi[st.attiva.passo], c = D.car;
  let s = '', tm = '';
  if (P.raccoji) {
    const n = TG.Cassone ? TG.Cassone.n : 0; if (ultimoN != null && n > ultimoN) rac += n - ultimoN; ultimoN = n;
    s = `🌰 ${Math.min(rac, P.raccoji)} / ${P.raccoji}`; if (rac >= P.raccoji) return fatto();
  }
  if (P.vai) {
    const q = G(P.vai); if (!q) return fatto();
    const d = Math.hypot(c.x - q.x, c.z - q.z); s = (P.carico ? P.carico + ' · ' : '') + (d < 950 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km');
    if (d < P.r) return fatto();
    try { if (!D.NAV || !D.NAV.dest) D.setDest({ x: q.x, z: q.z, name: P.t }); } catch(e){}   // si quarcuno ha cambiato meta, rimettila
    if (P.carico && D.CAP && D.CAP.on) return fallita(`Te sei cappottato: ${P.carico.replace(/^\S+ /, '')} pe' tera!`);
  }
  if (fine) { const r = (fine - performance.now()) / 1000; if (r <= 0) return fallita('Tempo scaduto!'); tm = `<div class="tm${r < 20 ? ' poco' : ''}">⏱ ${mmss(r)}</div>`; }
  const h = `<div class="k">${m.ico} ${m.titolo.toUpperCase()} · ${st.attiva.passo + 1}/${m.passi.length}</div><div class="t">${P.t}</div><div class="s">${s}</div>${tm}`;
  if (pill._h !== h) { pill._h = h; pill.innerHTML = h; } pill.hidden = false;
}
/* ---------- fochi d'artificio ---------- */
function fochi(x, z){
  const D = TG.debug; if (!D || !D.scene || !window.THREE) return;
  const y0 = D.world.ground(x, z) + 60, colori = [0xffd75a, 0xff5a4a, 0x5ad1ff, 0x9cff6a, 0xff7ad9, 0xffffff];
  for (let k = 0; k < 9; k++) setTimeout(() => {
    const N = 90, pos = new Float32Array(N * 3), vel = [], cx = x + (Math.random() - .5) * 70, cy = y0 + Math.random() * 30, cz = z + (Math.random() - .5) * 70;
    for (let i = 0; i < N; i++) { pos[i * 3] = cx; pos[i * 3 + 1] = cy; pos[i * 3 + 2] = cz; const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), v = 14 + Math.random() * 6; vel.push([Math.sin(b) * Math.cos(a) * v, Math.cos(b) * v, Math.sin(b) * Math.sin(a) * v]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mt = new THREE.PointsMaterial({ color: colori[k % colori.length], size: 2.6, transparent: true, opacity: 1, depthWrite: false });
    const p = new THREE.Points(g, mt); D.scene.add(p); const t0 = performance.now();
    const anima = () => { const t = (performance.now() - t0) / 1000; if (t > 2.4) { D.scene.remove(p); g.dispose(); mt.dispose(); return; }
      for (let i = 0; i < N; i++) { pos[i * 3] = cx + vel[i][0] * t; pos[i * 3 + 1] = cy + vel[i][1] * t - 6 * t * t; pos[i * 3 + 2] = cz + vel[i][2] * t; }
      g.attributes.position.needsUpdate = true; mt.opacity = Math.max(0, 1 - t / 2.4); requestAnimationFrame(anima); };
    anima();
  }, k * 450);
}
/* ---------- quanno passi vicino a chi te dà a missione, te a propone ---------- */
setInterval(() => {
  const m = attiva() ? null : prossima(), D = TG.debug; if (!m || !D || !D.car || !playing() || document.querySelector('.misCard, .ov:not([hidden]), #accountOv:not([hidden]), #tgFesta')) return;
  const p = G(m.dove); if (!p) return;
  const d = Math.hypot(D.car.x - p.x, D.car.z - p.z);
  if (d < 30 && Date.now() - vicinoVisto > 120e3) { vicinoVisto = Date.now(); ev('missione_vista', m.id); carta(m, 'offerta'); }
}, 1000);

function avvia(){ if (!TG.debug || !TG.debug.car || !TG.GEO) return setTimeout(avvia, 1000); if (st.attiva) vaiPasso(st.attiva.passo, true); giro(); }
if (document.readyState === 'complete') setTimeout(avvia, 2500); else addEventListener('load', () => setTimeout(avvia, 2500));
TG.Missioni = { lista: MISSIONI, stato: () => st, attiva, prossima, apri: () => { const m = attiva() || prossima(); if (m) carta(m, attiva() ? 'info' : 'offerta'); }, accetta, lascia, fochi };
})();
