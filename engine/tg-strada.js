/* BONUS E MALUS SU E STRADE — pe' rende o viaggio meno noioso.
   Intorno a te (entro ~700 m) ce stanno sempre una decina de cose su e strade; ce passi sopra e:
   💨 Vento in poppa: +50% de velocità pe' 6 s · 🌰 Sacchetto: +15 nocchie ne o cassone ·
   🕳️ Buca: −50% pe' 3 s · 🐑 Gregge: −60% pe' 4 s. I bonus so' de più (circa 2 su 3).
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
  { id: 'pecore', ico: '🐑', peso: 2, molt: 0.4, dur: 4, t: 'Gregge in mezzo a a strada!', s: 'Piano piano pe\' 4 secondi' }
];
const TOT = TIPI.reduce((a, b) => a + b.peso, 0);
const sceglie = () => { let r = Math.random() * TOT; for (const T of TIPI) { r -= T.peso; if (r <= 0) return T; } return TIPI[0]; };
const N = 10, RAGGIO = 700, VIA = 950, PRESA = 5;
let pezzi = [], effetto = null, mat = {}, base = new WeakMap();

function materiale(T){
  if (mat[T.id]) return mat[T.id];
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  c.beginPath(); c.arc(64, 64, 56, 0, Math.PI * 2); c.fillStyle = T.bonus ? 'rgba(255,214,90,.92)' : 'rgba(225,70,50,.9)'; c.fill();
  c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
  c.font = '64px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(T.ico, 64, 70);
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
    const T = sceglie(), s = new THREE.Sprite(materiale(T)); s.scale.set(3.4, 3.4, 1);
    const y = D.world.ground(q[0], q[1]) + 2.2; s.position.set(q[0], y, q[1]); D.scene.add(s);
    pezzi.push({ T, s, x: q[0], z: q[1], y, f: Math.random() * 6 });
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
  if (T.nocchie) { const k = TG.Cassone ? TG.Cassone.aggiungi(T.nocchie) : 0; msg(`${T.ico} ${T.t}`, k ? `+${k} ne o cassone` : 'O cassone è pieno: vai a comprà!', 2.5); }
  else { let cur = null; try { cur = TG.debug.VEH.cur; } catch(e){} effetto = { molt: T.molt, fine: performance.now() + T.dur * 1000, cur }; msg(`${T.ico} ${T.t}`, T.s, 2.5); try { if (navigator.vibrate) navigator.vibrate(T.bonus ? 40 : [60, 40, 60]); } catch(e){} }
}
let ultimo = 0;
function giro(t){
  requestAnimationFrame(giro);
  const D = TG.debug; if (!D || !D.car || !D.scene || !document.body.classList.contains('playing')) return;
  velocita();
  let id = 'vespa'; try { id = D.VEH.cur.id; } catch(e){}
  const c = D.car, attivo = id !== 'piedi' && id !== 'aereo';
  for (const p of pezzi) p.s.visible = attivo;
  if (!attivo) return;
  if (t - ultimo > 1500) { ultimo = t; pezzi = pezzi.filter(p => { if (Math.hypot(p.x - c.x, p.z - c.z) > VIA) { togli(p); return false; } return true; }); riempi(c); }
  for (const p of pezzi) { p.s.position.y = p.y + Math.sin(t / 400 + p.f) * .35; }
  for (let i = pezzi.length - 1; i >= 0; i--) { const p = pezzi[i]; if (Math.hypot(p.x - c.x, p.z - c.z) < PRESA) { togli(p); pezzi.splice(i, 1); prendi(p); } }
}
function avvia(){ if (!window.THREE || !TG.debug || !TG.debug.car || !TG.debug.world) return setTimeout(avvia, 1000); requestAnimationFrame(giro); }
TG.Strada = { pezzi: () => pezzi, effetto: () => effetto };
if (document.readyState === 'complete') setTimeout(avvia, 2500); else addEventListener('load', () => setTimeout(avvia, 2500));
})();
