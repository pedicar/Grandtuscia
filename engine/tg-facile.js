/* A PROVA DE TUTTI — pe' chi nun ha mai giocato (pubblico de 60 anni, telefono).
   1. TOCCA E VAI: tocchi un punto de a terra (o 'na nocchia) e a Vespa ce va da sola. O joystick resta: appena o tocchi, o pilota se spegne.
   2. PARTENZA CORTA: ne i primi due passi o giro de a camera all'inizio dura 3 secondi invece de 7,5.
   3. A SCIA (passo 1): e 10 nocchie più vicine brillano, una dopo l'altra; se nun fai gnente pe' 5 secondi compare a manina «Tocca a nocchia che brilla».
   4. PORTAME A O CAMPO (passo 2): un pulsante grande porta a Vespa a o terreno libero; dentro o campo: «Questo campo diventa de Fabrica? SÌ».
   Aggancio in mondo/app.js (Qn, lettura de i comandi): chiama TG.Pilota.tick(car, manuale) e, si risponde, usa gas e sterzo suoi.
   Usa TG.debug (car, camera, scene, world, items, intro, NAV, WALK, FLY), TG.Passi, TG.Cassone, TG.Terre. Eventi: tocca_vai, pilota_campo, compra_tocco. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ev = (t, c) => { try { TG.Stats && TG.Stats.ev(t, c || ''); } catch(e){} };
const passo = () => TG.Passi ? TG.Passi.n() : 5;
const D = () => TG.debug;
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------------------------------------------------------- stile */
const st = document.createElement('style'); st.textContent = `
#tfMano{position:fixed;z-index:34;pointer-events:none;transform:translate(-50%,-10%);display:none;text-align:center;font:900 16px/1.15 Figtree,system-ui,sans-serif;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.7)}
#tfMano b{display:block;font-size:44px;animation:tfTap 1s ease-in-out infinite}
#tfMano span{display:inline-block;margin-top:2px;padding:6px 12px;border-radius:14px;background:rgba(20,28,27,.82);white-space:nowrap}
@keyframes tfTap{50%{transform:translateY(-10px)}}
#tfVai{position:fixed;z-index:33;left:0;right:0;margin:0 auto;width:max-content;max-width:92vw;bottom:calc(190px + env(safe-area-inset-bottom,0px));display:none;padding:16px 26px;border:0;border-radius:24px;background:#ff8a3c;color:#fff;font:900 21px/1.1 Figtree,system-ui,sans-serif;box-shadow:0 5px 0 #b4561c,0 10px 24px rgba(0,0,0,.35);white-space:nowrap;touch-action:manipulation;animation:scPulse 1.1s ease-in-out infinite}
#tfCompra{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(10,14,13,.55)}
#tfCompra .c{width:min(330px,88vw);padding:22px 20px 18px;border-radius:24px;background:#1f2a2a;border:3px solid #ff8a3c;color:#fff;text-align:center;font-family:Figtree,system-ui,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.5)}
#tfCompra .t{font:900 23px/1.2 Figtree,sans-serif}#tfCompra .s{margin:8px 0 16px;font:700 16px/1.3 Figtree,sans-serif;opacity:.9}
#tfCompra button{display:block;width:100%;margin-top:10px;padding:16px;border:0;border-radius:18px;font:900 21px Figtree,sans-serif;touch-action:manipulation}
#tfCompra .si{background:#3fbf5f;color:#fff;box-shadow:0 5px 0 #23863c}#tfCompra .no{background:transparent;color:#cfd8d4;font-size:16px;padding:10px}
body:not(.playing) #tfVai,body:not(.playing) #tfMano,body:has(#mapOv:not([hidden])) #tfVai,body:has(#mapOv:not([hidden])) #tfMano{display:none!important}`;
document.head.appendChild(st);
const el = (tag, id, html) => { const e = document.createElement(tag); e.id = id; if (html) e.innerHTML = html; document.body.appendChild(e); return e; };
const mano = el('div', 'tfMano', '<b>👆</b><span>Tocca a nocchia che brilla</span>');
const vai = el('button', 'tfVai', '🛵 PORTAME A O CAMPO');
const compra = el('div', 'tfCompra', '<div class="c"><div class="t"></div><div class="s"></div><button class="si">SÌ, COMPRALO</button><button class="no">No, dopo</button></div>');

/* ---------------------------------------------------------------- pilota */
let meta = null;      // { x, z, item?, perche }
let fermo = 0, indietro = 0, tentativi = 0, ultimoT = 0, segno = null;
const Pilota = TG.Pilota = {
  vai(x, z, item, perche){
    meta = { x, z, item: item || null, perche: perche || 'tocco' }; fermo = 0; indietro = 0; tentativi = 0; segnaMeta();
  },
  ferma(){ meta = null; segnaMeta(); },
  get meta(){ return meta; },
  tick(c, manuale){
    if (!meta) return null;
    const T = D(); if (manuale || (T.WALK && T.WALK.on) || (T.FLY && T.FLY.on)) { Pilota.ferma(); return null; }
    const now = performance.now(), dt = Math.min(.1, (now - (ultimoT || now)) / 1000); ultimoT = now;
    if (meta.item && !meta.item.alive) { arrivato(); return { th: 0, st: 0, frena: true }; }
    const dx = meta.x - c.x, dz = meta.z - c.z, dist = Math.hypot(dx, dz);
    if (dist < (meta.item ? 1.2 : 2.5)) { arrivato(); return { th: 0, st: 0, frena: true }; }
    const o = wrap(Math.atan2(dx, dz) - c.yaw), sp = c.speed || 0;
    if (indietro > 0) { indietro -= dt; return { th: -.7, st: cl(o * 1.5, -1, 1), frena: false }; }
    // incastrato: gas dato ma nun se move → un po' a marcia indietro, poi riprova; a o terzo tentativo lascia perde
    if (Math.abs(sp) < .4) { fermo += dt; if (fermo > 1.6) { fermo = 0; tentativi++; if (tentativi > 3) { Pilota.ferma(); try { TG.msg('Da qui nun se passa', 'Tocca n\'antro punto', 3); } catch(e){} return null; } indietro = .9; } } else fermo = 0;
    const lento = dist < 10 || Math.abs(o) > .9;
    const vMax = dist < 6 ? 3 : dist < 15 ? 6 : 14;
    if (sp > vMax + 1.5) return { th: 0, st: cl(-o * 1.5, -1, 1), frena: true };
    return { th: sp > vMax ? 0 : (lento ? .45 : 1), st: cl(-o * 1.5, -1, 1), frena: false };
  }
};
function arrivato(){
  const m = meta; meta = null; segnaMeta();
  if (m && m.perche === 'campo') setTimeout(() => controllaCompra(true), 400);
}
function segnaMeta(){
  const T = D(); if (!T || !T.scene || !window.THREE) return;
  if (!segno) {
    segno = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.7, 28), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide }));
    segno.rotation.x = -Math.PI / 2; segno.renderOrder = 5; T.scene.add(segno);
  }
  segno.visible = !!meta;
  if (meta) segno.position.set(meta.x, (meta.item ? meta.item.y - .6 : T.world.ground(meta.x, meta.z)) + .25, meta.z);
}

/* ---------------------------------------------------------------- tocca e vai */
function puntoTocco(cx, cy){
  const T = D(), cam = T.camera, W = T.world; if (!cam || !W || !window.THREE) return null;
  const v = new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1), r = new THREE.Raycaster(); r.setFromCamera(v, cam);
  const o = r.ray.origin, d = r.ray.direction; let a = 0, s = 1.5;
  for (let k = 0; k < 400 && a < 1600; k++) {
    const b = a + s, x = o.x + d.x * b, y = o.y + d.y * b, z = o.z + d.z * b;
    if (y <= W.ground(x, z)) { let lo = a, hi = b; for (let j = 0; j < 12; j++) { const m = (lo + hi) / 2; (o.y + d.y * m <= W.ground(o.x + d.x * m, o.z + d.z * m)) ? hi = m : lo = m; } return { x: o.x + d.x * hi, z: o.z + d.z * hi, dist: hi }; }
    a = b; s = Math.min(12, s * 1.08);
  }
  return null;
}
function noccNear(x, z, r){
  let best = null, bd = r; for (const t of D().items()) { if (!t.alive || t.kind !== 'n') continue; const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; best = t; } } return best;
}
let giu = null;
addEventListener('pointerdown', e => {
  nascondiMano(); tocco = performance.now();
  const t = e.target; if (!t || !(t.id === 'joyZone' || t.tagName === 'CANVAS')) { giu = null; return; }
  giu = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
}, true);
addEventListener('pointerup', e => {
  const g = giu; giu = null; if (!g || g.id !== e.pointerId) return;
  if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 14 || performance.now() - g.t > 450) return;
  if (!document.body.classList.contains('playing')) return;
  const T = D(); if (!T || (T.WALK && T.WALK.on) || (T.FLY && T.FLY.on) || (T.S && T.S.paused)) return;
  // tocchi vicino a a manina: o pilota va dritto a a nocchia che brilla (pure si nun se vede)
  if (manoQui && Math.hypot(e.clientX - manoQui.x, e.clientY - manoQui.y) < 110 && manoQui.t.alive) { const t = manoQui.t; Pilota.vai(t.x, t.z, t, 'nocchia'); ev('tocca_vai', 'mano'); return; }
  const p = puntoTocco(e.clientX, e.clientY); if (!p || p.dist > 700) return;
  const c = T.car; if (Math.hypot(p.x - c.x, p.z - c.z) < 3) return;
  const it = noccNear(p.x, p.z, passo() <= 2 ? 9 : 5);
  if (it) Pilota.vai(it.x, it.z, it, 'nocchia'); else Pilota.vai(p.x, p.z, null, 'tocco');
  ev('tocca_vai', it ? 'nocchia' : 'terra');
}, true);

/* ---------------------------------------------------------------- partenza corta */
setInterval(() => { const T = D(); if (!T || !T.intro || passo() > 2) return; const I = T.intro; if (I.t > 3.2 && I.dur > 3) { I.t = Math.min(I.t, 3); I.dur = 3; } else if (I.t <= 0 && I.dur !== 7.5) I.dur = 7.5; }, 100);

/* ---------------------------------------------------------------- a scia (passo 1) */
let scia = [], luci = [], tex = null, tocco = performance.now();
function texLuce(){
  if (tex) return tex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,248,200,.95)'); gr.addColorStop(.45, 'rgba(255,170,40,.55)'); gr.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(32, 32, 24, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.strokeStyle = 'rgba(255,120,20,.95)'; g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.stroke();
  return tex = new THREE.CanvasTexture(c);
}
function faiScia(){
  const T = D(), c = T.car; scia = [];
  let px = c.x, pz = c.z; const prese = new Set();
  for (let k = 0; k < 10; k++) {
    let best = null, bd = 90; for (const t of T.items()) { if (!t.alive || t.kind !== 'n' || prese.has(t)) continue; const d = Math.hypot(t.x - px, t.z - pz); if (d < bd) { bd = d; best = t; } }
    if (!best) break; prese.add(best); scia.push(best); px = best.x; pz = best.z;
  }
  while (luci.length < scia.length) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texLuce(), transparent: true, depthWrite: false, depthTest: false })); s.renderOrder = 6; T.scene.add(s); luci.push(s); }
}
function prossima(){ return scia.find(t => t.alive) || null; }
let tLuce = 0, girata = false;
function luciTick(){
  const T = D(); if (!T || !T.scene || !window.THREE || !T.items) return;
  const on = passo() === 1 && document.body.classList.contains('playing') && !(T.intro && T.intro.t > 0);
  if (on && (!scia.length || scia.filter(t => t.alive).length < 3)) faiScia();
  // a prima vorta, a Vespa se gira verso a scia: e nocchie che brillano stanno davanti, no de lato
  if (on && !girata && scia.length > 2 && Math.abs(T.car.speed || 0) < .3) { girata = true; const c = T.car, m = scia[0]; c.yaw = Math.atan2(m.x - c.x, m.z - c.z); }
  tLuce += .05;
  luci.forEach((s, i) => { const t = scia[i]; const vis = on && t && t.alive; s.visible = !!vis; if (vis) { const p = t === prossima(); const k = p ? 4.2 + Math.sin(tLuce * 4) * .6 : 2.6; s.scale.set(k, k, 1); s.position.set(t.x, t.y + 1.3 + Math.sin(tLuce * 3 + i) * .25, t.z); } });
  if (!on) { nascondiMano(); manoQui = null; return; }
  // a manina: dopo 5 secondi senza toccà gnente, sopra a nocchia che brilla
  const p = prossima();
  if (p && !meta && performance.now() - tocco > 5000) mostraMano(p); else if (meta) nascondiMano();
}
let manoQui = null;
function mostraMano(t){
  const T = D(), v = new THREE.Vector3(t.x, t.y + 1, t.z).project(T.camera);
  if (v.z > 1 || Math.abs(v.x) > .92 || v.y < -.9 || v.y > .55) { mano.querySelector('span').textContent = 'Tocca qui'; mano.style.left = '50%'; mano.style.top = '62%'; }
  else { mano.querySelector('span').textContent = 'Tocca a nocchia che brilla'; mano.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; mano.style.top = ((1 - v.y) / 2 * innerHeight) + 'px'; }
  mano.style.display = 'block'; manoQui = { x: parseFloat(mano.style.left) / (mano.style.left.endsWith('%') ? 100 / innerWidth : 1), y: parseFloat(mano.style.top) / (mano.style.top.endsWith('%') ? 100 / innerHeight : 1), t };
}
function nascondiMano(){ mano.style.display = 'none'; }  // manoQui resta: o tocco arriva dopo che a manina s'è nascosta
setInterval(luciTick, 50);

/* ---------------------------------------------------------------- passo 2: portame a o campo, compra co' un tocco */
const no = new Set();
function inCampo(){
  const T = D(), W = TG.Terre; if (!T || !W) return null; const c = T.car, t = W.terraIn(c.x, c.z); if (!t) return null;
  const C = TG.Cassone; return W.stato(t.id) !== 'nostro' && C && C.n >= W.costo(t.id) ? t : null;
}
// o terreno libero più vicino che se pò comprà (si a freccia ancora nun ce l'ha)
function campoVicino(){
  const T = D(), W = TG.Terre, C = TG.Cassone; if (!T || !W || !W.lista || !C) return null; const c = T.car; let best = null, bd = 1e9;
  for (const t of W.lista()) { if (t.x == null || W.stato(t.id) === 'nostro' || W.costo(t.id) > C.n) continue; const d = Math.hypot(t.x - c.x, t.z - c.z); if (d < bd) { bd = d; best = t; } }
  return best && { x: best.x, z: best.z, name: best.nome };
}
const meta2 = () => (D().NAV && D().NAV.dest) || campoVicino();
function vaiTick(){
  if (compra.style.display === 'flex') { const t = inCampo(); if (!t || t.id !== compra.dataset.t) compra.style.display = 'none'; }
  const T = D(); const ok = passo() === 2 && T && document.body.classList.contains('playing') && !inCampo() && compra.style.display !== 'flex' && meta2();
  vai.style.display = ok ? 'block' : 'none';
  vai.textContent = meta && meta.perche === 'campo' ? '🛵 Te ce porto…' : '🛵 PORTAME A O CAMPO';
  if (passo() === 2 && !meta) controllaCompra();
}
vai.onclick = () => { const d = meta2(); if (!d) return; porta(d.x, d.z, d.name); ev('pilota_campo', d.name || ''); };
/* PORTAMECE: a guida da sola verso un campo lontano se incastrava tra case e muri; mo' è un viaggio:
   schermo scuro mezzo secondo, a Vespa riappare dentro o campo e esce subito «Questo campo diventa vostro? SÌ». */
function porta(x, z, nome){
  Pilota.ferma(); const T = D(); if (!T || !T.placeCar) return;
  const v = document.createElement('div'); v.style.cssText = 'position:fixed;inset:0;z-index:58;background:#17201f;opacity:0;transition:opacity .3s;display:flex;align-items:center;justify-content:center;color:#f3e7cb;font:900 22px Figtree,system-ui,sans-serif;pointer-events:none';
  v.textContent = '🛵 Te ce porto' + (nome ? ': ' + nome : '') + '…'; document.body.appendChild(v); requestAnimationFrame(() => v.style.opacity = '1');
  setTimeout(() => {
    const c = T.car, yaw = Math.atan2(x - c.x, z - c.z);
    try { T.placeCar(x, z, yaw); T.world && T.world.prewarm && T.world.prewarm(x, z, 14); } catch(e){}
    setTimeout(() => { v.style.opacity = '0'; setTimeout(() => v.remove(), 350); controllaCompra(true); }, 450);
  }, 340);
  ev('portamece', nome || '');
}
function controllaCompra(forza){
  if ((passo() !== 2 && !forza) || compra.style.display === 'flex') return;
  const t = inCampo(); if (!t || (no.has(t.id) && !forza)) return;
  const W = TG.Terre, pa = (W.paeseMio && W.paeseMio()) || '';
  let nome = 'o paese tuo'; try { nome = ((TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(pa)) || nome).replace(/ (di|in|sul|al|nel) .*$/i, ''); } catch(e){}
  compra.querySelector('.t').textContent = '🌳 Questo campo diventa de ' + nome + '?';
  compra.querySelector('.s').textContent = 'Costa ' + W.costo(t.id) + ' nocchie. Ce l\'hai!';
  compra.style.display = 'flex'; compra.dataset.t = t.id;
}
compra.querySelector('.si').onclick = () => { compra.style.display = 'none'; ev('compra_tocco', compra.dataset.t); try { TG.Cassone.compraQui(); } catch(e){} };
compra.querySelector('.no').onclick = () => { compra.style.display = 'none'; no.add(compra.dataset.t); };
setInterval(vaiTick, 400);

/* ---------------------------------------------------------------- 5. I CONSIGLI (da o passo 3): tutto guidato
   Una carta sola alla vorta, in basso: «se pò fa' questo, lo famo?» co' SÌ grande e «Dopo». Ogni SÌ fa a cosa da solo.
   In ordine: riprendi un terreno de casa (metà prezzo) → mezzo novo → cassone pieno → campo libero qui vicino.
   «Dopo» = nun se ripropone pe' 4 minuti (o mezzo pe' 6). */
const cons = el('div', 'tfCons', '<div class="i"></div><div class="tx"><div class="t"></div><div class="s"></div></div><div class="bb"><button class="si"></button><button class="no">Dopo</button></div>');
const st2 = document.createElement('style'); st2.textContent = `
#tfCons{position:fixed;z-index:55;left:0;right:0;margin:0 auto;bottom:calc(16px + env(safe-area-inset-bottom,0px));width:min(430px,calc(100vw - 24px));display:none;grid-template-columns:auto 1fr;gap:6px 12px;align-items:center;padding:14px 14px 12px;border-radius:22px;background:#1f2a2a;border:3px solid #ff8a3c;color:#fff;font-family:Figtree,system-ui,sans-serif;box-shadow:0 14px 36px rgba(0,0,0,.45);animation:tfSu .35s ease-out}
#tfCons .i{font-size:40px;line-height:1}#tfCons .t{font:900 19px/1.15 Figtree,sans-serif}#tfCons .s{margin-top:3px;font:700 15px/1.3 Figtree,sans-serif;opacity:.9}
#tfCons .bb{grid-column:1/-1;display:flex;gap:10px;margin-top:6px}#tfCons button{border:0;border-radius:16px;font:900 18px Figtree,sans-serif;padding:14px 10px;touch-action:manipulation}
#tfCons .si{flex:1;background:#3fbf5f;color:#fff;box-shadow:0 4px 0 #23863c}#tfCons .no{flex:none;width:96px;background:rgba(255,255,255,.12);color:#dfe7e3}
@keyframes tfSu{from{transform:translateY(30px);opacity:0}}
body:not(.playing) #tfCons,body:has(#mapOv:not([hidden])) #tfCons{display:none!important}`;
document.head.appendChild(st2);
const zitti = {}; let cAperta = null, cChiusa = 0, cInizio = 0;
const nomeP = p => { try { return ((TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p).replace(/ (di|in|sul|al|nel) .*$/i, ''); } catch(e){ return p; } };
const breve = t => String(t || 'o campo').replace(/^(noccioleto|castagneto|campo|podere)\s+(di|de|del|della)\s+/i, (m, a) => a.toLowerCase() + ' de ');
function mostraCons(c){
  cAperta = c; cons.querySelector('.i').textContent = c.ico; cons.querySelector('.t').textContent = c.t; cons.querySelector('.s').textContent = c.s;
  cons.querySelector('.si').textContent = c.si; cons.style.display = 'grid'; ev('consiglio', c.k.split(':')[0]);
}
function chiudiCons(dopo){
  if (!cAperta) return; if (dopo) zitti[cAperta.k] = Date.now() + (cAperta.k.startsWith('mezzo') ? 360e3 : 240e3);
  else zitti[cAperta.k] = Date.now() + 60e3;
  cons.style.display = 'none'; cAperta = null; cChiusa = Date.now();
}
cons.querySelector('.si').onclick = () => { const c = cAperta; chiudiCons(false); if (c) { ev('consiglio_si', c.k.split(':')[0]); try { c.fai(); } catch(e){} } };
cons.querySelector('.no').onclick = () => { if (cAperta) ev('consiglio_dopo', cAperta.k.split(':')[0]); chiudiCons(true); };
const libero = k => !(zitti[k] > Date.now());
function vaiCampo(t){ porta(t.x, t.z, breve(t.nome)); }
function trovaConsiglio(){
  const T = D(), W = TG.Terre, C = TG.Cassone; if (!T || !W || !W.lista || !C) return null;
  const c = T.car, n = C.n, p = passo();
  const vicini = W.lista().filter(t => t.x != null).map(t => ({ t, d: Math.hypot(t.x - c.x, t.z - c.z) })).sort((a, b) => a.d - b.d);
  // 1. un terreno de casa tua in mano a n'antro paese: a metà prezzo
  for (const { t, d } of vicini) { if (d > 900) break; if (W.riconquista && W.riconquista(t.id) && W.costo(t.id) <= n && libero('ric:' + t.id))
    return { k: 'ric:' + t.id, ico: '🏠', t: `${breve(t.nome)} è de casa tua`, s: `Mo' ce sta ${nomeP(W.padrone(t.id))}. Ripijatelo a metà: ${W.costo(t.id)} nocchie.`, si: '🛵 PORTAMECE', fai: () => vaiCampo(t) }; }
  // 2. o mezzo novo
  const m = p >= 4 && C.prossimoMezzo && C.prossimoMezzo();
  if (m && n >= m.costo && libero('mezzo:' + m.id))
    return { k: 'mezzo:' + m.id, ico: m.ico, t: `Te pòi comprà ${m.id === 'ape' ? "l'Ape" : m.id === 'trattore' ? 'o trattore' : 'a semovente'}!`, s: `Ce entrano ${m.capienza} nocchie invece de ${C.cap()}${m.id !== 'ape' ? '. ' + m.cosa : ''}. Costa ${m.costo}.`, si: '🌰 SÌ, COMPRA', fai: () => C.compraMezzo(m.id) };
  // 3. cassone pieno → o campo più vicino che te pòi comprà
  const buono = vicini.find(({ t }) => W.stato(t.id) !== 'nostro' && W.costo(t.id) <= n);
  if (C.pieno() && buono && libero('pieno'))
    return { k: 'pieno', ico: '🌰', t: 'Cassone pieno!', s: `Compra un terreno: ${breve(buono.t.nome)} costa ${W.costo(buono.t.id)}. Te ce porto?`, si: '🛵 PORTAMECE', fai: () => vaiCampo(buono.t) };
  // 4. un campo qui vicino che te pòi comprà
  if (buono && buono.d < 220 && !inCampo() && libero('vicino:' + buono.t.id)) {
    const pd = W.padrone(buono.t.id);
    return { k: 'vicino:' + buono.t.id, ico: '🚩', t: pd ? `Pòi pijà ${breve(buono.t.nome)}` : 'Campo libero qui vicino', s: `${pd ? 'Mo\' è de ' + nomeP(pd) + '. ' : ''}Costa ${W.costo(buono.t.id)} nocchie: ce l'hai. Ce annamo?`, si: '🛵 PORTAMECE', fai: () => vaiCampo(buono.t) };
  }
  return null;
}
setInterval(() => {
  const T = D(); if (!T || passo() < 3 || !document.body.classList.contains('playing')) { if (cAperta && !document.body.classList.contains('playing')) cons.style.display = 'none'; return; }
  if (!cInizio) cInizio = Date.now();
  if (cAperta) { if (cons.style.display !== 'grid') cons.style.display = 'grid'; return; }
  if (meta || compra.style.display === 'flex' || Date.now() - cInizio < 15000 || Date.now() - cChiusa < 8000) return;
  if (T.S && T.S.paused) return;
  const c = trovaConsiglio(); if (c) mostraCons(c);
}, 1200);
TG.Consigli = { trova: trovaConsiglio, chiudi: () => chiudiCons(true) };
})();
