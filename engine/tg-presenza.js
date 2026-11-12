/* CHI C'È MO' — gli altri che giocano adesso, visti nel mondo. Ogni telefono manda posizione, direzione e mezzo una volta al secondo
   su un canale Realtime di Supabase (presence: niente tabelle, niente dati salvati). Gli altri compaiono come mezzi semitrasparenti
   col colore del paese e il soprannome sopra, puntini sulla minimappa, conteggio nel menu («🟢 3 in giro: 2 Fabrica, 1 Carbognano»).
   Vicino a uno del tuo paese (150 m) la conquista va più veloce (TG.Zone.squadra). Chi non ha accettato le statistiche non viene
   mostrato né manda niente. Esterno: TG.debug (car, scene, world, VEH), TG.Veicoli, TG.Zone.colore, TG.Fantasmi.soprannome, TG.msg. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const cfg = window.TG_STATS_CONFIG || {};
const ev = (t, c, v, x) => { try { TG.Stats && TG.Stats.ev(t, c, v, x); } catch(e){} };
const $ = id => document.getElementById(id);
const SCALA = { piedi: 1.15, vespa: 1.3, ape: 1.3, trattore: 1.3, aereo: 1.3 };
const RAGGIO_SQUADRA = 150, SPARISCE = 60000;
let canale = null, altri = {}, me = null, pronto = false, ultimoTrack = 0, ultimoAvviso = 0;
const paese = () => { const p = (TG.PrimoMinuto && TG.PrimoMinuto.paese) || null; return p && p !== 'nessuno' ? p : null; };
const nomeP = p => { try { return (TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p || 'fuori'; } catch(e){ return p || 'fuori'; } };
const corto = p => nomeP(p).replace(/ (di|in|sul|al) .*$/i, '').split(' ')[0];
const colore = p => { try { return TG.Zone.colore(p); } catch(e){ return '#f2c74e'; } };
const dev = () => { try { return TG.Stats && TG.Stats.dispositivo; } catch(e){ return null; } };
const soprannome = () => { try { return TG.Fantasmi.soprannome() || ''; } catch(e){ return ''; } };
const base = () => (document.querySelector('script[src*="tg-presenza.js"]') || { src: '' }).src.replace(/engine\/tg-presenza\.js.*$/, '');

async function libreria(){
  if (window.supabase) return true;
  await new Promise((ok, no) => { const s = document.createElement('script'); s.src = base() + 'engine/vendor/supabase-2.117.2.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  return !!window.supabase;
}
async function collega(){
  if (canale || !cfg.url || !(cfg.pub || cfg.key) || !dev()) return;
  try { if (!await libreria()) return; } catch(e){ return; }
  const cl = window.supabase.createClient(cfg.url, cfg.pub || cfg.key, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'tg-presenza' } });
  canale = cl.channel('mondo', { config: { presence: { key: dev() } } });
  canale.on('presence', { event: 'sync' }, () => {
    const st = canale.presenceState(), ora = Date.now(), mio = dev(), nuovi = {};
    for (const k in st) { if (k === mio) continue; const p = st[k][st[k].length - 1]; if (!p || p.x == null) continue; const g = altri[k] || { id: k, visto: ora }; Object.assign(g, { dati: p, visto: ora }); nuovi[k] = g; }
    const entrati = Object.keys(nuovi).filter(k => !altri[k]);
    for (const k in altri) if (!nuovi[k]) togli(altri[k]);
    altri = nuovi; aggiornaConteggio();
    if (entrati.length && pronto && Date.now() - ultimoAvviso > 20000) { ultimoAvviso = Date.now(); const p = nuovi[entrati[0]].dati; try { TG.msg(`${p.nome ? p.nome : 'Uno de ' + corto(p.paese)} è entrato`, p.paese === paese() ? 'Uno de i vostri: cercatelo' : 'Occhio a e terre vostre', 3); } catch(e){} }
  });
  canale.subscribe(s => { if (s === 'SUBSCRIBED') { pronto = true; manda(true); } });
}
function manda(forza){
  if (!canale || !pronto) return;
  let c; try { c = TG.debug.car; } catch(e){ return; } if (!c) return;
  if (!document.body.classList.contains('playing')) { if (me) { canale.untrack(); me = null; } return; }
  const ora = Date.now(); if (!forza && ora - ultimoTrack < 1000) return; ultimoTrack = ora;
  let veh = 'vespa'; try { veh = TG.debug.VEH.cur.id; } catch(e){}
  me = { x: Math.round(c.x), z: Math.round(c.z), yaw: +c.yaw.toFixed(2), v: Math.round(Math.abs(c.speed || 0)), veh, paese: paese() || 'fuori', nome: soprannome().slice(0, 18), t: ora };
  canale.track(me).catch(() => {});
}

/* ---------- nel mondo: mezzi fantasma ---------- */
const modelli = {};
function etichetta(testo, col){
  const cv = document.createElement('canvas'); cv.width = 384; cv.height = 64; const c = cv.getContext('2d');
  c.font = '800 30px Figtree, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(16,22,21,.75)'; const w = Math.min(378, c.measureText(testo).width + 28); c.beginPath(); c.roundRect((384 - w) / 2, 8, w, 48, 14); c.fill();
  c.fillStyle = col; c.fillText(testo, 192, 33);
  const t = new THREE.CanvasTexture(cv); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(7.5, 1.25, 1); s.position.y = 3.2; return s;
}
function fantasma(g){
  let scene, E; try { scene = TG.debug.scene; E = TG.debug.world; } catch(e){ return null; } if (!scene || !E || !TG.Veicoli) return null;
  const id = TG.Veicoli[g.dati.veh] ? g.dati.veh : 'vespa';
  let m; try { m = TG.Veicoli[id](E.col); } catch(e){ return null; }
  m.group.scale.setScalar(SCALA[id] || 1.3);
  m.group.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .55; o.castShadow = false; } });
  const grp = new THREE.Group(); grp.add(m.group); grp.add(etichetta(g.dati.nome || 'Uno de ' + corto(g.dati.paese), colore(g.dati.paese)));
  scene.add(grp); return { grp, m, veh: id };
}
function togli(g){ if (g.f) { try { TG.debug.scene.remove(g.f.grp); } catch(e){} g.f = null; } }
let ultimoGiro = 0;
function giro(){
  requestAnimationFrame(giro);
  const ora = performance.now(), dt = Math.min(.1, (ora - ultimoGiro) / 1000); ultimoGiro = ora;
  if (!document.body.classList.contains('playing')) return;
  let c, E; try { c = TG.debug.car; E = TG.debug.world; } catch(e){ return; } if (!c || !E) return;
  let squadra = false, p = paese();
  for (const k in altri) {
    const g = altri[k], d = g.dati; if (!d) continue;
    if (Date.now() - g.visto > SPARISCE) { togli(g); continue; }
    if (!g.f || g.f.veh !== (TG.Veicoli[d.veh] ? d.veh : 'vespa')) { togli(g); g.f = fantasma(g); if (!g.f) continue; g.f.grp.position.set(d.x, E.ground(d.x, d.z), d.z); g.f.grp.rotation.y = d.yaw; }
    const G = g.f.grp, k2 = 1 - Math.pow(.02, dt);  // interpolazione morbida verso l'ultima posizione
    G.position.x += (d.x - G.position.x) * k2; G.position.z += (d.z - G.position.z) * k2; G.position.y = E.ground(G.position.x, G.position.z) + .12;
    let dy = d.yaw - G.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); G.rotation.y += dy * k2;
    try { g.f.m.update && g.f.m.update(dt, { speed: d.v || 0, steer: 0, throttle: d.v ? 1 : 0 }); } catch(e){}
    if (p && d.paese === p && Math.hypot(d.x - c.x, d.z - c.z) < RAGGIO_SQUADRA) squadra = true;
  }
  if (TG.Zone) TG.Zone.squadra = squadra;
}

/* ---------- minimappa: puntini ---------- */
let mini = null;
function puntini(){
  const m = $('mini'), mo = $('mapOv'); if (!m || !document.body.classList.contains('playing') || (mo && !mo.hidden) || !Object.keys(altri).length) { if (mini) mini.style.display = 'none'; return; }
  const r = m.getBoundingClientRect(); if (!r.width) return;
  if (!mini) { mini = document.createElement('canvas'); mini.id = 'prMini'; mini.setAttribute('style', 'position:fixed;pointer-events:none;border-radius:50%;z-index:12'); document.body.appendChild(mini); }
  mini.style.display = 'block'; mini.style.left = r.left + 'px'; mini.style.top = r.top + 'px'; mini.style.width = r.width + 'px'; mini.style.height = r.height + 'px';
  const W = 168; if (mini.width !== W) { mini.width = W; mini.height = W; }
  let d; try { d = TG.debug.car; } catch(e){ return; } if (!d) return;
  const c = mini.getContext('2d'), a = W / 2, s = a / 820, rot = -Math.atan2(Math.cos(d.yaw), Math.sin(d.yaw)) - Math.PI / 2;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, W); c.beginPath(); c.arc(a, a, a - 1, 0, Math.PI * 2); c.clip();
  c.translate(a, a); c.rotate(rot); c.scale(s, s);
  for (const k in altri) { const g = altri[k].dati; if (!g) continue; const dx = g.x - d.x, dz = g.z - d.z; const dist = Math.hypot(dx, dz); const f = dist > 790 ? 790 / dist : 1;  // oltre il bordo: sul bordo
    c.beginPath(); c.arc(dx * f, dz * f, 6 / s, 0, Math.PI * 2); c.fillStyle = colore(g.paese); c.fill(); c.lineWidth = 2 / s; c.strokeStyle = '#fff'; c.stroke(); }
}
function giroMini(){ try { puntini(); } catch(e){} requestAnimationFrame(giroMini); }

/* ---------- conteggio nel menu ---------- */
function aggiornaConteggio(){
  let el = $('prConta');
  if (!el) { const menu = $('menu'); if (!menu) return; el = document.createElement('div'); el.id = 'prConta'; el.setAttribute('style', 'margin:6px auto 0;max-width:420px;text-align:center;font:700 13px Figtree,"Segoe UI",system-ui,sans-serif;color:#c9bfa8'); const intro = menu.querySelector('.intro'); (intro ? intro.parentNode : menu).insertBefore(el, intro ? intro.nextSibling : menu.firstChild); }
  const n = Object.keys(altri).length;
  if (!n) { el.innerHTML = '⚪ Nessuno in giro adesso: a Tuscia è tua'; return; }
  const per = {}; for (const k in altri) { const p = altri[k].dati.paese; per[p] = (per[p] || 0) + 1; }
  el.innerHTML = `🟢 <b style="color:#f3e7cb">${n} in giro</b>: ` + Object.entries(per).sort((a, b) => b[1] - a[1]).map(([p, c]) => `<span style="color:${colore(p)}">${c} ${corto(p)}</span>`).join(', ');
}
TG.Presenza = { altri: () => altri, conteggio: () => Object.keys(altri).length, manda, _dbg: () => ({ me, pronto, altri }) };
function avvia(){
  if (!TG.debug || !TG.PrimoMinuto) return setTimeout(avvia, 1000);
  collega(); setInterval(() => { if (!canale) collega(); manda(false); }, 1000); giro(); giroMini();
  addEventListener('pagehide', () => { try { canale && canale.untrack(); } catch(e){} });
}
if (document.readyState === 'complete') setTimeout(avvia, 2500); else addEventListener('load', () => setTimeout(avvia, 2500));
})();
