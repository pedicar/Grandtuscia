/* BONUS E MALUS SU E STRADE — pe' rende o viaggio meno noioso.
   Intorno a te (entro ~700 m) ce stanno sempre una decina de cose su e strade; ce passi sopra e:
   💨 Vento in poppa: +50% de velocità pe' 6 s · 🌰 Sacchetto: +15 nocchie ne o cassone ·
   🕳️ Buca: −50% pe' 3 s · 🐑 Gregge: −60% pe' 4 s. I bonus so' de più (circa 2 su 3).
   20/11 sera — MOLTIPLICATORI: ×5 · ×10 · ×20 · ×100 (sempre più rari): pe' quarche secondo ogni nocchia raccolta vale tanto de più
   (o conto lo fa tg-terre.js co' TG.Strada.molt()); in alto a striscia «×10 · 9 s». Durano 15/10/8/5 s, e su a strada
   restano poco (40/30/25/20 s, poi lampeggiano e spariscono): se o vedi, corri.
   A velocità se cambia sul mezzo in uso (VEH.cur.vmax) e se rimette com'era a a fine.
   Esterno: TG.debug (car, scene, world.roads[].samples, world.ground, VEH), TG.Cassone, TG.msg, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ev = (t, c, v) => { try { TG.Stats && TG.Stats.ev(t, c, v); } catch(e){} };
const msg = (a, b, s) => { try { TG.msg(a, b, s); } catch(e){} };
const TIPI = [
  { id: 'turbo', ico: '💨', peso: 4, bonus: true, molt: 1.5, dur: 6, t: 'Vento in poppa!', s: '+50% de velocità pe\' 6 secondi' },
  { id: 'sacco', ico: '🌰', peso: 3, bonus: true, nocchie: 15, t: 'Sacchetto de nocchie!', s: '+15 ne o cassone' },
  { id: 'buca', ico: '🕳️', peso: 2, molt: 0.5, dur: 3, t: 'Buca!', s: 'Rallenti pe\' 3 secondi' },
  { id: 'pecore', ico: '🐑', peso: 2, molt: 0.4, dur: 4, t: 'Gregge in mezzo a a strada!', s: 'Piano piano pe\' 4 secondi' },
  // a tempo (20/11 sera): più è grosso, meno dura; e su a strada restano solo VITA secondi (l'urtimi 5 lampeggiano)
  { id: 'x5', x: 5, peso: 1.6, dur: 15, vita: 40, bonus: true },
  { id: 'x10', x: 10, peso: .8, dur: 10, vita: 30, bonus: true },
  { id: 'x20', x: 20, peso: .35, dur: 8, vita: 25, bonus: true },
  { id: 'x100', x: 100, peso: .08, dur: 5, vita: 20, bonus: true }
];
for (const T of TIPI) if (T.x) { T.ico = '×' + T.x; T.t = `Nocchie ×${T.x}!`; T.s = `Pe' ${T.dur} secondi ogni nocchia vale ${T.x} vorte tanto`; }
let per = null;   // moltiplicatore attivo { x, fine }
const molt = () => per && performance.now() < per.fine ? per.x : 1;
const css = document.createElement('style'); css.textContent = `#moltPill{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 104px);z-index:41;padding:6px 18px;border-radius:999px;background:linear-gradient(#ffd75a,#f0a020);color:#3a1d00;font:900 22px/1.2 Figtree,system-ui,sans-serif;white-space:nowrap;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.35)}#moltPill small{font-size:15px;font-weight:800}#moltPill[hidden],body:not(.playing) #moltPill{display:none!important}body:has(#moltPill:not([hidden])) #campoPill{display:none!important}body:has(#crossPill:not([hidden])) #moltPill,body:has(#dhPill:not([hidden])) #moltPill{top:calc(env(safe-area-inset-top,0px) + 150px)}`;
document.head.appendChild(css);
const pill = document.createElement('div'); pill.id = 'moltPill'; pill.hidden = true; document.body.appendChild(pill);
const TOT = TIPI.reduce((a, b) => a + b.peso, 0);
const sceglie = () => { let r = Math.random() * TOT; for (const T of TIPI) { r -= T.peso; if (r <= 0) return T; } return TIPI[0]; };
const N = 10, RAGGIO = 700, VIA = 950, PRESA = 5;
let pezzi = [], effetto = null, mat = {}, base = new WeakMap();

function materiale(T){
  if (mat[T.id]) return mat[T.id];
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  c.beginPath(); c.arc(64, 64, 56, 0, Math.PI * 2); c.fillStyle = T.bonus ? 'rgba(255,214,90,.92)' : 'rgba(225,70,50,.9)'; c.fill();
  if (T.x) { const g = c.createRadialGradient(50, 44, 8, 64, 64, 60); g.addColorStop(0, '#fff3b0'); g.addColorStop(1, T.x >= 100 ? '#e0402a' : T.x >= 20 ? '#a24be0' : T.x >= 10 ? '#2a9be0' : '#f0a020'); c.fillStyle = g; c.fill(); }
  c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (T.x) { c.font = `900 ${T.x >= 100 ? 44 : 54}px Figtree, system-ui, sans-serif`; c.lineWidth = 7; c.strokeStyle = '#3a1d00'; c.strokeText(T.ico, 64, 68); c.fillStyle = '#fff'; c.fillText(T.ico, 64, 68); }
  else { c.font = '64px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.fillText(T.ico, 64, 70); }
  return (mat[T.id] = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false }));
}
function campioni(c){
  const out = []; let E; try { E = TG.debug.world; } catch(e){ return out; }
  for (const r of E.roads || []) { if (!r.samples || r.w < 2) continue; const S = r.samples;
    for (let i = 0; i < S.length; i += 6) { const d = Math.hypot(S[i][0] - c.x, S[i][1] - c.z); if (d > 120 && d < RAGGIO) out.push(S[i]); } }
  return out;
}
function riempi(c){
  const D = TG.debug; if (pezzi.length >= N) return;
  const S = campioni(c); if (!S.length) return;
  while (pezzi.length < N) {
    const q = S[(Math.random() * S.length) | 0]; if (pezzi.some(p => Math.hypot(p.x - q[0], p.z - q[1]) < 80)) { if (Math.random() < .3) break; continue; }
    const T = sceglie(), s = new THREE.Sprite(materiale(T)), sc = T.x ? 3.4 + Math.log10(T.x) * .9 : 3.4; s.scale.set(sc, sc, 1);
    const y = D.world.ground(q[0], q[1]) + 2.2; s.position.set(q[0], y, q[1]); D.scene.add(s);
    pezzi.push({ T, s, x: q[0], z: q[1], y, f: Math.random() * 6, nato: performance.now() });
  }
}
function togli(p){ try { TG.debug.scene.remove(p.s); } catch(e){} }
function velocita(){
  let cur; try { cur = TG.debug.VEH.cur; } catch(e){ return; } if (!cur || !cur.vmax) return;
  if (!base.has(cur)) base.set(cur, cur.vmax.slice());
  const b = base.get(cur), m = effetto && performance.now() < effetto.fine && effetto.cur === cur ? effetto.molt : 1;
  if (effetto && (performance.now() >= effetto.fine || effetto.cur !== cur)) { if (effetto.cur && base.has(effetto.cur)) effetto.cur.vmax = base.get(effetto.cur).slice(); effetto = null; }
  cur.vmax = b.map(v => v * m);
}
function prendi(p){
  const T = p.T; ev('strada_' + (T.bonus ? 'bonus' : 'malus'), T.id);
  if (T.x) { if (!per || molt() <= T.x) per = { x: T.x, fine: performance.now() + T.dur * 1000 }; msg(`🌰 ${T.t}`, T.s, 3); try { if (navigator.vibrate) navigator.vibrate([40, 30, 40, 30, 120]); } catch(e){} return; }
  if (T.nocchie) { const k = TG.Cassone ? TG.Cassone.aggiungi(T.nocchie) : 0; msg(`${T.ico} ${T.t}`, k ? `+${k} ne o cassone` : 'O cassone è pieno: vai a comprà!', 2.5); }
  else { let cur = null; try { cur = TG.debug.VEH.cur; } catch(e){} effetto = { molt: T.molt, fine: performance.now() + T.dur * 1000, cur }; msg(`${T.ico} ${T.t}`, T.s, 2.5); try { if (navigator.vibrate) navigator.vibrate(T.bonus ? 40 : [60, 40, 60]); } catch(e){} }
}
let ultimo = 0;
function giro(t){
  requestAnimationFrame(giro);
  const D = TG.debug; if (!D || !D.car || !D.scene || !document.body.classList.contains('playing')) return;
  velocita();
  { const m = molt(); if (m > 1) { const h = `🌰 ×${m} <small>· ${Math.ceil((per.fine - performance.now()) / 1000)} s</small>`; if (pill._h !== h) { pill._h = h; pill.innerHTML = h; } pill.hidden = false; } else if (!pill.hidden) { pill.hidden = true; per = null; } }
  let id = 'vespa'; try { id = D.VEH.cur.id; } catch(e){}
  const c = D.car, attivo = id !== 'piedi' && id !== 'aereo';
  for (const p of pezzi) p.s.visible = attivo;
  if (!attivo) return;
  if (t - ultimo > 1500) { ultimo = t; pezzi = pezzi.filter(p => { if (Math.hypot(p.x - c.x, p.z - c.z) > VIA) { togli(p); return false; } return true; }); riempi(c); }
  const ora = performance.now();
  pezzi = pezzi.filter(p => { if (!p.T.vita || !p.nato) return true; const r = p.T.vita * 1000 - (ora - p.nato); if (r <= 0) { togli(p); return false; } if (r < 5000) p.s.visible = Math.floor(ora / (r < 2000 ? 120 : 250)) % 2 === 0; return true; });
  for (const p of pezzi) { p.s.position.y = p.y + Math.sin(t / 400 + p.f) * .35; }
  for (let i = pezzi.length - 1; i >= 0; i--) { const p = pezzi[i]; if (Math.hypot(p.x - c.x, p.z - c.z) < PRESA) { togli(p); pezzi.splice(i, 1); prendi(p); } }
}
function avvia(){ if (!window.THREE || !TG.debug || !TG.debug.car || !TG.debug.world) return setTimeout(avvia, 1000); requestAnimationFrame(giro); }
TG.Strada = { pezzi: () => pezzi, effetto: () => effetto, molt, TIPI };
if (document.readyState === 'complete') setTimeout(avvia, 2500); else addEventListener('load', () => setTimeout(avvia, 2500));
})();
