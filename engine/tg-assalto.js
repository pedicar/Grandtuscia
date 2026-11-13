/* L'ASSALTO — come si prende una cella. Tocchi «⚔ Assalta»: nella cella compaiono 6 nocchie con il fascio di luce (sempre nello
   stesso posto per quella cella, così tutti fanno la stessa gara). Hai 90 secondi per prenderle tutte guidando.
   - Il DIFENSORE è chi ha il tempo migliore degli ultimi 7 giorni: il suo fantasma corre con te sulle stesse nocchie. Lo batti → la
     cella è del tuo paese e il difensore diventi tu (server: tg_assalto_salva). Lui al prossimo ingresso legge chi gliel'ha rubata.
   - DUELLO: se uno di un altro paese assalta la stessa cella mentre ci sei, le nocchie sono condivise: chi ne prende una la toglie
     all'altro. Vince chi ne prende di più.
   - ALLARME: se assaltano una cella del tuo paese mentre giochi, ti arriva l'avviso e la freccia per andare a difenderla.
   Rete: TG.Presenza.invia / evento 'tg-guerra'. Esterno: TG.Zone, TG.debug (car, scene, world, VEH, setDest), TG.Veicoli, TG.msg. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const cfg = window.TG_STATS_CONFIG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c, v, x) => { try { TG.Stats && TG.Stats.ev(t, c, v, x); } catch(e){} };
const msg = (a, b, s) => { try { TG.msg(a, b, s); } catch(e){} };
const Z = () => TG.Zone;
const dev = () => { try { return TG.Stats && TG.Stats.dispositivo; } catch(e){ return null; } };
const nome = () => { try { return (TG.Fantasmi && TG.Fantasmi.soprannome()) || ''; } catch(e){ return ''; } };
let N = 6; const DURATA = 90, PASSO_TRACCIA = 0.5;
const RAGGIO_PRESA = { piedi: 5, vespa: 7, ape: 8, trattore: 10, semovente: 13, aereo: 0 };
async function rpc(f, body){
  const r = await fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/' + f, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: 'Bearer ' + cfg.key }, body: JSON.stringify(body || {}) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}
// le 6 nocchie: sempre le stesse per una cella (numeri pseudo-casuali dal nome della cella), sulla terra e non troppo in pendenza
function semi(id){ let h = 2166136261; for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
// i mezzi stanno sulle strade (fuori strada il mondo ti riporta sull'asfalto): le nocchie si mettono lungo le strade de a cella
function stradeIn(c){
  let E; try { E = TG.debug.world; } catch(e){ return []; }
  const lim = Z().R * 0.85, out = [];
  for (const r of (E.roads || [])) { if (r.nodrive || !r.samples) continue; for (const q of r.samples) if (Math.hypot(q[0] - c.x, q[1] - c.z) < lim) out.push({ x: q[0], z: q[1] }); }
  return out;
}
function posti(c){
  const tutti = stradeIn(c), rnd = semi(c.id), out = [];
  if (!tutti.length) return [];
  for (let gap = 70; gap >= 20 && out.length < N; gap -= 15)
    for (let i = 0; i < 300 && out.length < N; i++) {
      const q = tutti[Math.floor(rnd() * tutti.length)];
      if (out.some(p => Math.hypot(p.x - q.x, p.z - q.z) < gap)) continue;
      out.push({ x: q.x, z: q.z });
    }
  return out.length >= 3 ? out : [];
}
const assaltabile = c => posti(c).length >= 3;
/* ---------- oggetti 3D ---------- */
function nocchia3D(p){
  const scene = TG.debug.scene, E = TG.debug.world, y = E.ground(p.x, p.z);
  const g = new THREE.Group();
  const n = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 0), new THREE.MeshBasicMaterial({ color: 0xf2b134 }));
  n.position.y = 2.2; g.add(n);
  const fascio = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 60, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }));
  fascio.position.y = 30; g.add(fascio);
  g.position.set(p.x, y, p.z); scene.add(g); g.userData.n = n; return g;
}
function togli(o){ try { TG.debug.scene.remove(o); o.traverse(m => { if (m.geometry) m.geometry.dispose(); }); } catch(e){} }
/* ---------- il fantasma del difensore ---------- */
function leggiTraccia(s){ if (!s) return null; const pts = s.split(';').map(q => q.split(',').map(Number)).filter(q => q.length === 2 && isFinite(q[0]) && isFinite(q[1])); return pts.length > 2 ? pts : null; }
function fantasma(d){
  let m; try { m = TG.Veicoli.vespa(TG.debug.world.col); } catch(e){ return null; }
  m.group.scale.setScalar(1.3);
  m.group.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .45; } });
  const g = new THREE.Group(); g.add(m.group);
  try { g.add(TG.Presenza.etichetta(`👻 ${d.nome || 'Difensore'} · ${Z().corto(d.paese)} · ${Z().fmtT(d.tempo)}`, Z().colore(d.paese))); } catch(e){}
  TG.debug.scene.add(g); return g;
}
/* ---------- l'assalto ---------- */
let A = null;
function attivo(){
  if (!A) return null;
  const t = Math.max(0, DURATA - A.t), mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  const tempo = `${mm}:${String(ss).padStart(2, '0')}`;
  const g = A.gh ? ` · 👻 ${A.gh.prese}/${N}` : '', duello = A.rivale ? ` · ⚔ ${Z().corto(A.rivale.paese)} ${A.rivale.prese}` : '';
  return { riga1: `⚔ <b>Assalto ${A.prese}/${N}</b>`, riga1b: `<b>${tempo}</b>`, fill: A.prese / N * 100, riga2: (A.d ? `Da battere: ${Z().fmtT(A.d.tempo)}` : 'Nessuno a difende') + g + duello };
}
async function parti(c){
  if (A || !c || !window.THREE) return;
  const p = Z().conPaese(); if (!p) { msg('Prima scegli o paese tuo'); return; }
  let veh = 'vespa'; try { veh = TG.debug.VEH.cur.id; } catch(e){}
  if (veh === 'aereo') { msg("Co' l'aereo nun se assalta", 'Scendi e prendi un mezzo de terra', 3); return; }
  let d = null; try { d = await rpc('tg_cella_difensore', { p_cella: c.id }); } catch(e){ d = Z().difensore(c.id); }
  if (d && !d.paese) d = null;
  const P = posti(c);
  if (P.length < 3) { msg('Qui nun ce so\' strade', 'Questa cella nun se po\' assaltà: provane una vicina', 4); return; }
  N = P.length;
  A = { c, p, d, P, ogg: P.map(nocchia3D), prese: 0, presi: new Set(), t: -3, t0: performance.now() + 3000, traccia: [], ultimoPunto: -1, veh, rivale: null, gh: null };
  const tr = d && leggiTraccia(d.traccia);
  if (tr) { const g = fantasma(d); if (g) A.gh = { g, tr, prese: 0, presi: new Set(), finito: false }; }
  msg(`⚔ Assalto a ${Z().nomeCella(c)}`, d ? `Batti ${d.nome || 'er difensore'} de ${Z().corto(d.paese)}: ${Z().fmtT(d.tempo)}. Via fra 3…` : '6 nocchie in 90 secondi. Via fra 3…', 3);
  try { TG.Presenza && TG.Presenza.invia({ tipo: 'inizio', cella: c.id, paese: p, nome: nome() }); } catch(e){}
  ev('assalto', 'inizio', null, { cella: c.id, difensore: d && d.paese });
  try { TG.debug.setDest({ x: P[0].x, z: P[0].z, name: 'Nocchia d\'assalto' }); } catch(e){}
}
function finisci(esito){
  if (!A) return; const a = A; A = null;
  a.ogg.forEach(togli); if (a.gh) togli(a.gh.g);
  try { TG.debug.setDest(null); } catch(e){}
  try { TG.Presenza && TG.Presenza.invia({ tipo: 'fine', cella: a.c.id, paese: a.p, prese: a.prese }); } catch(e){}
  return a;
}
async function vinto(a){
  const tempo = Math.round(a.t * 10) / 10, n = Z().nomeCella(a.c);
  const traccia = a.traccia.map(q => q[0] + ',' + q[1]).join(';').slice(0, 6000);
  // le nocchie valgono anche pe' a classifica del paese: 3 ognuna
  try { Z().salta = 1; TG.PrimoMinuto && TG.PrimoMinuto.mandaPunti(N * 3); } catch(e){}
  let r = null; try { r = await rpc('tg_assalto_salva', { p_cella: a.c.id, p_dev: dev(), p_paese: a.p, p_nome: nome(), p_tempo: tempo, p_traccia: traccia }); } catch(e){}
  const batte = a.d && tempo < a.d.tempo;
  if ((r && r.vince) || (!r && (!a.d || batte))) {
    Z().nuovoDifensore(a.c.id, { paese: a.p, nome: nome(), tempo });
    if (a.d && a.d.paese !== a.p) msg(`⚔ ${n}: mo' è terra de ${Z().corto(a.p)}!`, `${Z().fmtT(tempo)}: hai battuto ${a.d.nome || 'er difensore'} de ${Z().corto(a.d.paese)} (${Z().fmtT(a.d.tempo)}). Mo' a difendi tu`, 6);
    else if (a.d) msg(`🛡 Nuovo record a ${n}`, `${Z().fmtT(tempo)}: mo' o difensore sei tu`, 5);
    else msg(`⚔ ${n}: mo' è terra de ${Z().corto(a.p)}!`, `${Z().fmtT(tempo)}: era terra de nessuno, mo' a difendi tu`, 6);
    ev('zona_rubata', a.c.id, tempo, { a: a.d && a.d.paese, assalto: true });
  } else {
    msg(`Quasi! ${Z().fmtT(tempo)}`, `${a.d.nome || 'Er difensore'} de ${Z().corto(a.d.paese)} c'ha messo ${Z().fmtT(a.d.tempo)}. Riprova: e nocchie stanno sempre lì`, 6);
  }
  ev('assalto', (r && r.vince) ? 'vinto' : 'battuto', tempo, { cella: a.c.id });
}
let ultimo = 0;
function giro(now){
  requestAnimationFrame(giro);
  const dt = Math.min(.1, (now - ultimo) / 1000 || 0); ultimo = now;
  if (!A) return;
  if (!document.body.classList.contains('playing')) return;
  let c; try { c = TG.debug.car; } catch(e){ return; } if (!c) return;
  const a = A; a.t = (now - a.t0) / 1000;  // orologio vero: se il telefono rallenta, il tempo non si allunga
  // girano e brillano
  for (const o of a.ogg) if (o.visible) { o.userData.n.rotation.y += dt * 2; o.userData.n.position.y = 2.2 + Math.sin(now / 300) * .4; }
  if (a.t < 0) return;
  // traccia (pe' o fantasma de domani)
  const k = Math.floor(a.t / PASSO_TRACCIA); if (k > a.ultimoPunto) { a.ultimoPunto = k; a.traccia.push([Math.round(c.x), Math.round(c.z)]); }
  // fuori da a cella → perso
  if (Math.hypot(c.x - a.c.x, c.z - a.c.z) > Z().R * 1.08) { finisci(); msg('Sei uscito da a cella', 'Assalto perso. Rientra e tocca ⚔ Assalta pe\' riprovà', 4); ev('assalto', 'uscito', a.t); return; }
  // prese
  const rp = RAGGIO_PRESA[a.veh] || 7;
  a.P.forEach((p, i) => {
    if (a.presi.has(i)) return;
    if (Math.hypot(c.x - p.x, c.z - p.z) < rp) {
      a.presi.add(i); a.prese++; a.ogg[i].visible = false;
      try { TG.Presenza && TG.Presenza.invia({ tipo: 'presa', cella: a.c.id, i, paese: a.p }); } catch(e){}
      try { TG.debug.showToast && 0; } catch(e){}
      const resta = a.P.findIndex((q, j) => !a.presi.has(j));
      if (resta >= 0) { const q = a.P.map((q, j) => ({ q, j, d: a.presi.has(j) ? 1e9 : Math.hypot(q.x - c.x, q.z - c.z) })).sort((x, y) => x.d - y.d)[0]; try { TG.debug.setDest({ x: q.q.x, z: q.q.z, name: `Nocchia ${a.prese + 1}/${N}` }); } catch(e){} }
    }
  });
  // il fantasma: si muove sulla sua traccia e prende e nocchie sue
  if (a.gh && !a.gh.finito) {
    const tr = a.gh.tr, f = a.t / PASSO_TRACCIA, i = Math.min(tr.length - 1, Math.floor(f)), j = Math.min(tr.length - 1, i + 1), u = f - Math.floor(f);
    const x = tr[i][0] + (tr[j][0] - tr[i][0]) * u, z = tr[i][1] + (tr[j][1] - tr[i][1]) * u, G = a.gh.g;
    G.position.set(x, TG.debug.world.ground(x, z) + .1, z); G.rotation.y = Math.atan2(tr[j][0] - tr[i][0], tr[j][1] - tr[i][1]);
    a.P.forEach((p, n) => { if (!a.gh.presi.has(n) && Math.hypot(x - p.x, z - p.z) < 9) { a.gh.presi.add(n); a.gh.prese++; } });
    if (i >= tr.length - 1) { a.gh.finito = true; G.visible = false; }
  }
  // fine
  const tutte = a.presi.size + (a.rivale ? a.rivale.presi.size : 0) >= N;
  if (a.prese >= N) { const f = finisci(); vinto(f); return; }
  if (a.rivale && tutte) { const f = finisci(); if (f.prese > f.rivale.prese) { msg(`⚔ Duello vinto ${f.prese}–${f.rivale.prese}!`, `Hai battuto ${f.rivale.nome || 'quello de ' + Z().corto(f.rivale.paese)}`, 5); try { Z().salta = 1; TG.PrimoMinuto.mandaPunti(f.prese * 3 + 10); } catch(e){} ev('duello', 'vinto', f.prese); } else { msg(`Duello perso ${f.prese}–${f.rivale.prese}`, 'Riprova: o difensore se batte col tempo', 5); ev('duello', 'perso', f.prese); } return; }
  if (a.t >= DURATA) { finisci(); msg(`Tempo scaduto: ${a.prese}/${N}`, 'Riprova: e nocchie stanno sempre lì, mo\' sai ndo', 5); ev('assalto', 'scaduto', a.prese); }
}
/* ---------- rete: duello e allarme ---------- */
addEventListener('tg-guerra', e => {
  const m = e.detail || {}; const p = Z() && Z().conPaese(); if (!m.cella || !p) return;
  // duello: un altro sta assaltando la stessa cella mia
  if (A && A.c.id === m.cella && m.paese !== p) {
    if (!A.rivale) { A.rivale = { paese: m.paese, nome: m.nome || '', prese: 0, presi: new Set() }; msg(`⚔ Duello co' ${Z().corto(m.paese)}!`, 'Stesse nocchie: chi ne pija de più vince', 3); ev('duello', 'inizio', null, { con: m.paese }); }
    if (m.tipo === 'presa' && !A.presi.has(m.i) && !A.rivale.presi.has(m.i)) { A.rivale.presi.add(m.i); A.rivale.prese++; if (A.ogg[m.i]) A.ogg[m.i].visible = false; }
    return;
  }
  // allarme: assaltano una cella del mio paese
  if (m.tipo === 'inizio' && !A && document.body.classList.contains('playing') && Z().padrone(m.cella) === p) {
    const c = Z().cellaDaId(m.cella); if (!c) return;
    let d = 0; try { d = Math.hypot(TG.debug.car.x - c.x, TG.debug.car.z - c.z); } catch(e){}
    msg(`⚔ Assaltano ${Z().nomeCella(c)}!`, `${m.nome || 'Uno'} de ${Z().corto(m.paese)} · ${d < 950 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km'}: corri e tocca ⚔ Assalta pe' o duello`, 6);
    try { TG.debug.setDest({ x: c.x, z: c.z, name: 'Difendi ' + Z().nomeCella(c) }); } catch(e){}
    ev('allarme', m.cella, Math.round(d), { da: m.paese });
  }
});
/* ---------- chi t'ha rubato e celle (al rientro) ---------- */
async function perse(){
  const d = dev(); if (!d || !cfg.url) return;
  const da = ls.get('tg-perse-visto') || new Date(Date.now() - 7 * 864e5).toISOString();
  let l = []; try { l = await rpc('tg_mie_perse', { p_dev: d, p_da: da }); } catch(e){ return; }
  ls.set('tg-perse-visto', new Date().toISOString());
  if (!Array.isArray(l) || !l.length) return;
  const r = l[0], c = Z().cellaDaId(r.cella); if (!c) return;
  const altre = l.length > 1 ? ` (e altre ${l.length - 1})` : '';
  const via = () => setTimeout(() => {
    msg(`⚔ T'hanno rubato ${Z().nomeCella(c)}${altre}`, `${r.nome || 'Uno'} de ${Z().corto(r.paese)} in ${Z().fmtT(r.tempo)} (tu ${Z().fmtT(r.mio)}). Segui a freccia e ripijatela`, 7);
    try { TG.debug.setDest({ x: c.x, z: c.z, name: 'Ripijate ' + Z().nomeCella(c) }); } catch(e){}
    ev('perse_viste', r.cella, l.length);
  }, 6000);
  if (document.body.classList.contains('playing')) via(); else new MutationObserver((x, o) => { if (document.body.classList.contains('playing')) { o.disconnect(); via(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
/* ---------- minimappa: le nocchie rimaste (oro) e il fantasma (bianco) ---------- */
let mc = null;
function mini(){
  requestAnimationFrame(mini);
  const m = document.getElementById('mini');
  if (!A || !m || !document.body.classList.contains('playing')) { if (mc) mc.style.display = 'none'; return; }
  const r = m.getBoundingClientRect(); if (!r.width) return;
  if (!mc) { mc = document.createElement('canvas'); mc.setAttribute('style', 'position:fixed;pointer-events:none;border-radius:50%;z-index:13'); mc.width = mc.height = 168; document.body.appendChild(mc); }
  Object.assign(mc.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  let d; try { d = TG.debug.car; } catch(e){ return; }
  const c = mc.getContext('2d'), W = 168, a = W / 2, s = a / 820, rot = -Math.atan2(Math.cos(d.yaw), Math.sin(d.yaw)) - Math.PI / 2;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, W); c.beginPath(); c.arc(a, a, a - 1, 0, Math.PI * 2); c.clip();
  c.translate(a, a); c.rotate(rot); c.scale(s, s);
  A.P.forEach((p, i) => { if (A.presi.has(i) || (A.rivale && A.rivale.presi.has(i))) return; c.beginPath(); c.arc(p.x - d.x, p.z - d.z, 4.5 / s, 0, Math.PI * 2); c.fillStyle = '#f2b134'; c.fill(); c.lineWidth = 2 / s; c.strokeStyle = '#3a2a05'; c.stroke(); });
  if (A.gh && A.gh.g.visible) { const g = A.gh.g.position; c.beginPath(); c.arc(g.x - d.x, g.z - d.z, 5 / s, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.85)'; c.fill(); }
}
TG.Assalto = { parti, attivo, posti, assaltabile, ferma: () => finisci(), _dbg: () => A };
function avvia(){ if (!TG.Zone || !TG.debug) return setTimeout(avvia, 1000); requestAnimationFrame(giro); requestAnimationFrame(mini); perse(); }
if (document.readyState === 'complete') setTimeout(avvia, 2500); else addEventListener('load', () => setTimeout(avvia, 2500));
})();
