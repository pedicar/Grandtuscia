/* A GUERRA DE I TERRENI — la regola è una: ogni terreno con le nocchie è del paese che ci ha raccolto di più questa settimana.
   - Tutti i terreni (11 + il podere) sono aperti a tutti: non si comprano più, si contendono.
   - Ogni nocchia (o castagna) raccolta dentro un terreno è un punto per il tuo paese in quel terreno (server: tg_terra_punto).
   - Sopra ogni terreno c'è il cartello col nome e il colore del paese che lo tiene; dentro, il blocco sotto la minimappa dice solo
     «Fabrica 340 · Carbognano 290». Quando superi: «Presa!». Se al rientro ve l'hanno fregato, te lo dice e ti dà la freccia.
   - La settimana riparte il lunedì; domenica vince chi tiene più terreni.
   Esterno: TG.debug (car, scene, world, campi, campoIn, setDest, mapHits), TG.Profile.harvestAdd, TG.Contadino, TG.PrimoMinuto, TG.msg. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const cfg = window.TG_STATS_CONFIG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c, v, x) => { try { TG.Stats && TG.Stats.ev(t, c, v, x); } catch(e){} };
const msg = (a, b, s) => { try { TG.msg(a, b, s); } catch(e){} };
const $ = id => document.getElementById(id);
const COLORI = { caprarola: '#d8432a', fabrica: '#2f7fd1', carbognano: '#2e9e5b', ronciglione: '#e0a21b', canepina: '#8e44ad', vallerano: '#16a085', soriano: '#c0392b', 'civita-castellana': '#7f8c8d', viterbo: '#f39c12', nepi: '#1abc9c', vignanello: '#9b59b6', corchiano: '#e67e22', sutri: '#3498db', vetralla: '#27ae60', 'bassano-romano': '#d35400', gallese: '#2c3e50', fuori: '#95a5a6' };
const colore = p => { if (!p) return '#8a8f88'; if (COLORI[p]) return COLORI[p]; let h = 0; for (const c of p) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 55% 50%)`; };
const paese = () => { const p = (TG.PrimoMinuto && TG.PrimoMinuto.paese) || ls.get('tg-paese-dev'); return p && p !== 'nessuno' ? p : null; };
const nomeP = p => { try { return (TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p; } catch(e){ return p; } };
const corto = p => (nomeP(p) || '').replace(/ (di|in|sul|al|nel) .*$/i, '');
const dev = () => { try { return TG.Stats && TG.Stats.dispositivo; } catch(e){ return null; } };
async function rpc(f, body){
  if (!cfg.url) throw new Error('niente server');
  const r = await fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/' + f, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: 'Bearer ' + cfg.key }, body: JSON.stringify(body || {}) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}

/* ---------- i terreni ---------- */
let TERRE = [];   // {id:'t:...', nome, x, z, rad, campo}
const breve = n => n.replace(/^(Il|I|La|Le|Lo) /, '').replace(/^noccioleto /i, 'Noccioleto ').replace(/^castagneto /i, 'Castagneto ');
function costruisci(){
  const out = [];
  let campi = []; try { campi = TG.debug.campi() || []; } catch(e){}
  for (const o of campi) { if (!o || !o.T || !o.campo) continue; out.push({ id: 't:' + o.T.id, nome: o.T.nome, x: o.campo.cx, z: o.campo.cz, rad: o.campo.rad, frutto: o.T.frutto, o }); }
  try { const P = TG.GEO.PODERE; out.unshift({ id: 't:podere', nome: 'Il Podere', x: P.x, z: P.z, rad: P.r, frutto: 'n', podere: true }); } catch(e){}
  return out;
}
function terraIn(x, z){
  try { const o = TG.debug.campoIn(x, z); if (o) return TERRE.find(t => t.o === o) || null; } catch(e){}
  const p = TERRE.find(t => t.podere); if (p && Math.hypot(x - p.x, z - p.z) < p.rad) return p;
  return null;
}
function vicina(x, z, max){ let best = null, bd = max; for (const t of TERRE) { const d = Math.hypot(x - t.x, z - t.z) - t.rad; if (d < bd) { bd = d; best = t; } } return best; }
// tutti i terreni aperti a tutti: per il gioco del contadino risultano «tuoi» (così si raccoglie dappertutto)
function apriTutti(){
  try { const L = TG.Contadino.stato(TG.Profile.data); for (const T of TG.Contadino.TERRENI) L.terreni[T.id] = L.terreni[T.id] || Date.now(); } catch(e){}
}

/* ---------- punteggi ---------- */
let classifica = {}, locali = {}, daMandare = {}, versione = 0, caricato = false;
function punti(id, p){ const l = classifica[id] || []; const r = l.find(x => x.paese === p); return (r ? r.punti : 0) + ((locali[id] || {})[p] || 0); }
function righe(id){
  const m = {}; for (const r of (classifica[id] || [])) m[r.paese] = r.punti;
  for (const p in (locali[id] || {})) m[p] = (m[p] || 0) + locali[id][p];
  return Object.entries(m).map(([paese, punti]) => ({ paese, punti })).sort((a, b) => b.punti - a.punti);
}
const padrone = id => { const r = righe(id)[0]; return r && r.punti > 0 ? r.paese : null; };
async function aggiorna(){ try { const n = await rpc('tg_terre'); if (n && typeof n === 'object') { classifica = n; locali = {}; versione++; } } catch(e){} caricato = true; }
async function invia(){
  const p = paese(), d = dev(); if (!p || !d) return;
  for (const id of Object.keys(daMandare)) {
    const n = daMandare[id]; if (!n) continue; daMandare[id] = 0;
    const prima = padrone(id);
    try {
      const r = await rpc('tg_terra_punto', { p_dev: d, p_terra: id, p_paese: p, p_punti: n });
      if (r && r.aggiunti) {
        locali[id] = locali[id] || {}; locali[id][p] = (locali[id][p] || 0) + r.aggiunti; versione++;
        if (padrone(id) === p && prima !== p) { ev('terra_presa', id, null, { a: prima }); if (!festeggiati[id]) { festeggiati[id] = 1; festa(TERRE.find(x => x.id === id), prima, p); } }
      }
    } catch(e){ daMandare[id] = (daMandare[id] || 0) + n; }
  }
}
// ogni nocchia raccolta dentro un terreno conta pe' o paese tuo
function aggancia(){
  const P = TG.Profile; if (!P || !P.harvestAdd || P.harvestAdd._terre) return;
  const o = P.harvestAdd.bind(P);
  const n = function(t, a){ try { if ((t === 'n' || t === 'c') && a > 0 && paese()) { const c = TG.debug.car, T = c && terraIn(c.x, c.z); if (T) { const prima = padrone(T.id); daMandare[T.id] = (daMandare[T.id] || 0) + a; locali[T.id] = locali[T.id] || {}; const p = paese(), l = righe(T.id), cap = l.find(r => r.paese !== p); if (prima !== p && !festeggiati[T.id] && punti(T.id, p) + daMandare[T.id] > (cap ? cap.punti : 0)) { festeggiati[T.id] = 1; setTimeout(() => festa(T, prima, p), 250); } } } } catch(e){} return o(t, a); };
  n._terre = 1; P.harvestAdd = n;
}


/* ---------- A PRESA: il momento in cui un terreno diventa vostro ----------
   Lampo co' o colore de o paese, «TERRENO PRESO!» che sbatte in mezzo, pioggia de nocchie, fanfara, vibrazione,
   fuochi e colonna de luce sopra o terreno, e o bottone pe' dillo a i compaesani. Dura 3,5 s, se chiude toccando. */
const festeggiati = {};
function fanfara(){
  try { const A = TG.Audio, c = A && A.init ? A.init() : null; if (!c) return; const out = A.sfx || A.master || c.destination, t0 = c.currentTime + .02;
    const nota = (f, t, d, tipo, v) => { const o = c.createOscillator(), g = c.createGain(); o.type = tipo; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + t); g.gain.linearRampToValueAtTime(v, t0 + t + .02); g.gain.exponentialRampToValueAtTime(.001, t0 + t + d); o.connect(g); g.connect(out); o.start(t0 + t); o.stop(t0 + t + d + .05); };
    [[523, 0], [659, .11], [784, .22], [1047, .33]].forEach(([f, t]) => { nota(f, t, .22, 'square', .07); nota(f / 2, t, .22, 'triangle', .09); });
    [1047, 1319, 1568].forEach(f => nota(f, .48, .9, 'sawtooth', .035)); nota(523, .48, 1, 'triangle', .12);
    // grancassa
    const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t0 + .46); o.frequency.exponentialRampToValueAtTime(40, t0 + .7); g.gain.setValueAtTime(.5, t0 + .46); g.gain.exponentialRampToValueAtTime(.001, t0 + .8); o.connect(g); g.connect(out); o.start(t0 + .46); o.stop(t0 + .85);
  } catch(e){}
}
function fuochi(T, col){
  try { const sc = TG.debug.scene, E = TG.debug.world, y0 = E.ground(T.x, T.z), C = new THREE.Color(col), grp = new THREE.Group(); sc.add(grp);
    // colonna de luce
    const col3 = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 120, 12, 1, true), new THREE.MeshBasicMaterial({ color: C, transparent: true, opacity: .45, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    col3.position.set(T.x, y0 + 60, T.z); grp.add(col3);
    // scoppi
    const N = 260, pos = new Float32Array(N * 3), vel = [], g = new THREE.BufferGeometry();
    for (let i = 0; i < N; i++) { const k = i % 3, cx = T.x + (k - 1) * 18, cz = T.z + ((k * 7) % 3 - 1) * 14; pos.set([cx, y0 + 40 + k * 8, cz], i * 3); const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), sp = 14 + Math.random() * 10; vel.push([Math.sin(b) * Math.cos(a) * sp, Math.cos(b) * sp, Math.sin(b) * Math.sin(a) * sp]); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: C, size: 2.6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); const pts = new THREE.Points(g, m); grp.add(pts);
    const m2 = new THREE.PointsMaterial({ color: 0xffe9a8, size: 1.4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); const pts2 = new THREE.Points(g, m2); grp.add(pts2);
    const t0 = performance.now();
    const passo = () => { const t = (performance.now() - t0) / 1000; if (t > 4) { sc.remove(grp); g.dispose(); m.dispose(); m2.dispose(); col3.geometry.dispose(); col3.material.dispose(); return; }
      const dt = 1 / 60; for (let i = 0; i < N; i++) { const v = vel[i]; v[1] -= 9 * dt; v[0] *= .985; v[2] *= .985; pos[i * 3] += v[0] * dt; pos[i * 3 + 1] += v[1] * dt; pos[i * 3 + 2] += v[2] * dt; } g.attributes.position.needsUpdate = true;
      m.opacity = m2.opacity = Math.max(0, 1 - t / 3.2); col3.material.opacity = .45 * Math.max(0, 1 - t / 4); col3.scale.x = col3.scale.z = 1 + Math.sin(t * 6) * .08; requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  } catch(e){}
}

/* a card da condivide: un'immagine 1080×1350 co' o colore de o paese, pronta pe' Facebook, Instagram e WhatsApp */
function cardImmagine(T, prima, p, tot, nome){
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), col = colore(p);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col); g.addColorStop(.55, '#17201f'); g.addColorStop(1, '#0d1110'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // raggi
  c.save(); c.translate(W / 2, 470); c.globalAlpha = .12; c.fillStyle = '#fff'; for (let i = 0; i < 18; i++) { c.rotate(Math.PI / 9); c.beginPath(); c.moveTo(0, 0); c.lineTo(-60, -900); c.lineTo(60, -900); c.closePath(); c.fill(); } c.restore();
  // nocchie che piovono
  const nocchia = (x, y, r, a) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#7a3e16'; c.beginPath(); c.ellipse(0, r * .15, r * .85, r, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#a5592a'; c.beginPath(); c.ellipse(-r * .25, 0, r * .35, r * .6, -.3, 0, Math.PI * 2); c.fill(); c.fillStyle = '#e9d3a8'; c.beginPath(); c.ellipse(0, -r * .85, r * .7, r * .28, 0, 0, Math.PI * 2); c.fill(); c.restore(); };
  let sd = 7; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 16; i++) nocchia(40 + rnd() * (W - 80), 30 + rnd() * 200, 18 + rnd() * 24, rnd() * 6); for (let i = 0; i < 10; i++) { const sx = i % 2 ? W - 45 - rnd() * 25 : 45 + rnd() * 25; nocchia(sx, 320 + rnd() * 980, 16 + rnd() * 14, rnd() * 6); }
  const txt = (t, y, font, fill, sh) => { c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; if (sh) { c.fillStyle = 'rgba(0,0,0,.45)'; c.fillText(t, W / 2, y + 6); } c.fillStyle = fill; c.fillText(t, W / 2, y); };
  const adatta = (t, max, size, peso) => { let s = size; c.font = `${peso} ${s}px Figtree, system-ui, sans-serif`; while (c.measureText(t).width > max && s > 30) { s -= 4; c.font = `${peso} ${s}px Figtree, system-ui, sans-serif`; } return c.font; };
  txt('🚩 ' + corto(p).toUpperCase(), 330, '900 64px Figtree, system-ui, sans-serif', '#fff', true);
  const molti = / e altri \d+$/.test(nome), q = molti ? (+nome.match(/ e altri (\d+)$/)[1] + 1) : 1;
  txt(molti ? q + ' TERRENI' : 'TERRENO', 470, '900 150px Figtree, system-ui, sans-serif', '#fff', true);
  txt(molti ? 'PRESI!' : 'PRESO!', 620, '900 150px Figtree, system-ui, sans-serif', '#fff', true);
  // riquadro
  c.fillStyle = 'rgba(14,18,16,.82)'; c.strokeStyle = col; c.lineWidth = 8; c.beginPath(); c.roundRect(90, 730, W - 180, 330, 40); c.fill(); c.stroke();
  txt(nome, 810, adatta(nome, W - 260, 64, 800), '#f3e7cb');
  txt(prima ? `L'avemo fregato a ${corto(prima)}` : 'Era libero: mo\' è nostro', 900, adatta('x', W, 46, 700), prima ? colore(prima) : '#d9cfb6');
  txt(`${corto(p)} mo' tiene ${tot} terren${tot === 1 ? 'o' : 'i'}`, 985, '800 48px Figtree, system-ui, sans-serif', col);
  txt('A GUERRA DE I TERRENI', 1150, '900 44px Figtree, system-ui, sans-serif', '#e2b765');
  txt('Venite a difenderlo · grandtuscia.netlify.app', 1225, '700 36px Figtree, system-ui, sans-serif', '#cfd6cc');
  txt('Il Trono di Nocchie · Tuscia Games', 1285, '600 30px Figtree, system-ui, sans-serif', '#8f9a90');
  return new Promise(r => cv.toBlob(b => r(b), 'image/jpeg', .9));
}
async function condividiCard(T, prima, p, tot, nome){
  const url = 'https://grandtuscia.netlify.app/?utm_source=condividi&utm_campaign=presa';
  const testo = `🚩 Ho preso o ${nome} pe' ${corto(p)}!${prima ? ` L'avemo fregato a ${corto(prima)}.` : ''} Venite a difenderlo:`;
  ev('terra_condivisa', T.id);
  try {
    const blob = await cardImmagine(T, prima, p, tot, nome); const file = new File([blob], 'terreno-preso.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: testo + ' ' + url, title: 'Terreno preso!' }); return; }
    if (navigator.share) { await navigator.share({ text: testo, url }); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'terreno-preso.jpg'; document.body.appendChild(a); a.click(); a.remove();
    try { await navigator.clipboard.writeText(testo + ' ' + url); } catch(e){}
    msg('Card scaricata!', 'Pubblicala co\' o testo che t\'ho copiato', 3);
  } catch(e){ if (e && e.name === 'AbortError') return; try { await navigator.clipboard.writeText(testo + ' ' + url); msg('Copiato!', 'Incollalo ne o gruppo de o paese', 2); } catch(x){} }
}
function festa(T, prima, p, quanti, sottotitolo){
  if (!T) return; const col = colore(p), nome = quanti > 1 ? `${breve(T.nome)} e altri ${quanti - 1}` : breve(T.nome);
  versione++; try { aggiornaCartelli(); } catch(e){}
  try { navigator.vibrate && navigator.vibrate([70, 50, 70, 50, 180]); } catch(e){}
  fanfara(); fuochi(T, col);
  let tot = 0; for (const X of TERRE) if (padrone(X.id) === p || X.id === T.id) tot++;
  if (!document.getElementById('trFestaCss')) { const st = document.createElement('style'); st.id = 'trFestaCss'; st.textContent = `
#trFesta{position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;pointer-events:auto;font-family:Figtree,"Segoe UI",system-ui,sans-serif;color:#fff;overflow:hidden}
#trFesta .fl{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,var(--c) 0,transparent 70%);animation:trFl 1.1s ease-out forwards}
#trFesta .bx{position:relative;text-align:center;padding:18px 26px 16px;border-radius:22px;background:rgba(14,18,16,.86);border:3px solid var(--c);box-shadow:0 0 0 6px rgba(0,0,0,.25),0 0 60px var(--c);animation:trIn .55s cubic-bezier(.2,1.6,.4,1) both;max-width:88vw}
#trFesta .k{font:900 13px/1 Figtree,sans-serif;letter-spacing:.24em;color:var(--c);text-transform:uppercase}
#trFesta h2{margin:8px 0 4px;font:900 clamp(30px,9vw,54px)/1 Figtree,sans-serif;letter-spacing:.02em;text-shadow:0 3px 0 rgba(0,0,0,.45);animation:trPulse .9s .55s ease-in-out 2}
#trFesta .n{font:800 17px/1.25 Figtree,sans-serif;color:#f3e7cb}
#trFesta .s{margin-top:6px;font:700 14px/1.3 Figtree,sans-serif;color:#d9cfb6}
#trFesta .s b{color:var(--c)}
#trFesta button{margin-top:12px;all:unset;display:inline-block;margin-top:12px;padding:9px 16px;border-radius:999px;background:var(--c);color:#fff;font:800 14px Figtree,sans-serif;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.35)}
#trFesta i.nc{position:absolute;top:-40px;font-style:normal;font-size:26px;animation:trNc linear forwards;pointer-events:none}
#trFesta.via{animation:trVia .35s ease-in forwards}
@keyframes trFl{0%{opacity:0}15%{opacity:.95}100%{opacity:.25}}
@keyframes trIn{0%{transform:scale(.2) rotate(-8deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes trPulse{50%{transform:scale(1.08)}}
@keyframes trNc{to{transform:translateY(110vh) rotate(var(--r))}}
@keyframes trVia{to{opacity:0;transform:scale(1.04)}}`; document.head.appendChild(st); }
  const old = document.getElementById('trFesta'); if (old) old.remove();
  const d = document.createElement('div'); d.id = 'trFesta'; d.style.setProperty('--c', col);
  d.innerHTML = `<div class="fl"></div><div class="bx"><div class="k">🚩 ${corto(p)}</div><h2>${quanti > 1 ? quanti + ' TERRENI PRESI!' : 'TERRENO PRESO!'}</h2><div class="n">${nome}</div><div class="s">${sottotitolo ? sottotitolo + ' · ' : ''}${prima ? `L'avete fregato a <b style="color:${colore(prima)}">${corto(prima)}</b>` : 'Era libero: mo\' è vostro'} · <b>${corto(p)}</b> mo' tiene ${tot} terren${tot === 1 ? 'o' : 'i'}</div><button type="button">📣 Condividi a vittoria</button></div>`;
  for (let i = 0; i < 34; i++) { const n = document.createElement('i'); n.className = 'nc'; n.textContent = T.frutto === 'c' ? '🌰' : (i % 5 ? '🌰' : '✨'); n.style.left = Math.random() * 100 + 'vw'; n.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; n.style.animationDelay = (Math.random() * .6) + 's'; n.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg'); d.appendChild(n); }
  document.body.appendChild(d);
  let chiuso = false; const chiudi = () => { if (chiuso) return; chiuso = true; d.classList.add('via'); setTimeout(() => d.remove(), 360); };
  d.querySelector('button').onclick = e => { e.stopPropagation(); condividiCard(T, prima, p, tot, nome); chiudi(); };
  d.onclick = chiudi; setTimeout(chiudi, 5000);
  ev('terra_festa', T.id, tot, { a: prima });
}
/* ---------- il blocco sotto la minimappa: solo quando sei dentro o vicino a un terreno ---------- */
let box = null;
function ui(){
  if (box) return;
  const st = document.createElement('style'); st.textContent = `
#trBox{position:fixed;z-index:30;right:10px;width:min(196px,52vw);padding:5px 8px 6px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:rgba(16,22,21,.82);color:#f3e7cb;font:700 11px/1.3 Figtree,"Segoe UI",system-ui,sans-serif;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);cursor:pointer}
#trBox .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:800}
#trBox .r{display:flex;justify-content:space-between;gap:6px;white-space:nowrap;margin-top:2px}#trBox .r i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
#trBox .b{height:4px;border-radius:2px;background:rgba(255,255,255,.14);margin-top:4px;overflow:hidden}#trBox .b i{display:block;height:100%;width:0;transition:width .4s}
#trBox .m{margin-top:3px;color:#c9bfa8;font-weight:600}
body:not(.playing) #trBox,body:has(#mapOv:not([hidden])) #trBox,body:has(#pmOv:not([hidden])) #trBox,body:has(#trOv:not([hidden])) #trBox{display:none!important}`;
  document.head.appendChild(st);
  box = document.createElement('div'); box.id = 'trBox'; box.style.display = 'none'; box.onclick = () => aggiorna().then(pannello);
  document.body.appendChild(box);
}
function aggiornaBox(){
  ui();
  if (!document.body.classList.contains('playing')) { box.style.display = 'none'; return; }
  let c; try { c = TG.debug.car; } catch(e){ return; } if (!c) return;
  const dentro = terraIn(c.x, c.z), T = dentro || vicina(c.x, c.z, 60);
  if (!T) { box.style.display = 'none'; const pr = $('primi'); if (pr) pr.style.visibility = ''; return; }
  const m = TG.debug.mini || $('mini'); if (m) { const r = m.getBoundingClientRect(); box.style.top = (r.bottom + 6) + 'px'; box.style.right = Math.max(10, innerWidth - r.right) + 'px'; } else box.style.top = 'calc(232px + env(safe-area-inset-top,0px))';
  const p = paese(), l = righe(T.id), pad = l[0] && l[0].punti > 0 ? l[0] : null, mio = punti(T.id, p) + (daMandare[T.id] || 0);
  const altro = pad && pad.paese !== p ? pad : (l.find(x => x.paese !== p) || null);
  box.style.display = 'block'; box.style.borderColor = pad ? colore(pad.paese) : 'rgba(255,255,255,.3)';
  const riga = (pp, n) => `<span><i style="background:${colore(pp)}"></i>${pp === p ? '<b>' : ''}${corto(pp)} ${n}${pp === p ? '</b>' : ''}</span>`;
  const consiglio = !dentro ? 'entra e raccoi' : (!pad ? 'raccoi: è libero' : pad.paese === p ? 'è vostro' : `ne mancano ${altro.punti - mio + 1}`);
  box.innerHTML = `<div class="n">🌰 ${breve(T.nome)} · <span style="color:#c9bfa8;font-weight:600">${consiglio}</span></div><div class="r">${p ? riga(p, mio) : ''}${altro ? riga(altro.paese, altro.punti) : '<span>nessuno</span>'}</div>`;
  // il compito iniziale («Raccogli 10 nocciole») dice la stessa cosa: quando c'è il blocco, il compito si toglie
  const pr = $('primi'); if (pr) pr.style.visibility = 'hidden';
}

/* ---------- cartelli sopra i terreni ---------- */
const cartelli = {};
function cartello(T){
  const p = padrone(T.id), testo = (p ? corto(p) : 'Libero'), col = colore(p);
  const k = testo + col; const old = cartelli[T.id];
  if (old && old.k === k) return;
  if (old) { try { TG.debug.scene.remove(old.s); old.s.material.map.dispose(); } catch(e){} }
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = 'rgba(16,22,21,.82)'; c.beginPath(); c.roundRect(6, 6, 500, 116, 28); c.fill();
  c.fillStyle = col; c.beginPath(); c.roundRect(6, 6, 30, 116, [28, 0, 0, 28]); c.fill();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#f3e7cb'; c.font = '700 30px Figtree, system-ui, sans-serif'; c.fillText(breve(T.nome).slice(0, 30), 270, 40);
  c.fillStyle = p ? col : '#c9bfa8'; c.font = '800 46px Figtree, system-ui, sans-serif'; c.fillText(testo.slice(0, 18), 270, 88);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  s.scale.set(22, 5.5, 1); let y = 0; try { y = TG.debug.world.ground(T.x, T.z); } catch(e){}
  s.position.set(T.x, y + 30, T.z); s.renderOrder = 3;
  TG.debug.scene.add(s); cartelli[T.id] = { s, k };
}
function nascondiVicini(){ let c; try { c = TG.debug.car; } catch(e){ return; } if (!c) return;
  for (const T of TERRE) { const k = cartelli[T.id], d = Math.hypot(c.x - T.x, c.z - T.z); if (k) k.s.visible = d > T.rad + 90 && d < 1100; }
  // tanti terreni: quelli lontani non si disegnano (piante, cartello de legno, nome, ingressi)
  try { for (const o of TG.debug.campi()) { const cp = o.campo, d = Math.hypot(c.x - cp.cx, c.z - cp.cz) - cp.rad, v = d < 650; if (cp.g) cp.g.visible = v; if (o.g) o.g.visible = d < 450; if (o.label) o.label.visible = d < 450; if (cp.patch) for (const h of cp.patch) h.visible = d < 350; } } catch(e){}
}
let vCart = -1;
function aggiornaCartelli(){ if (vCart === versione || !window.THREE) return; vCart = versione; for (const T of TERRE) try { cartello(T); } catch(e){} }

/* ---------- pannello: tutti i terreni ---------- */
let pan = null;
function pannello(){
  if (!pan) {
    pan = document.createElement('div'); pan.id = 'trOv'; pan.hidden = true;
    const st = document.createElement('style'); st.textContent = `
#trOv{position:fixed;inset:0;z-index:96;background:rgba(10,14,12,.86);display:flex;align-items:center;justify-content:center;padding:14px;font-family:Figtree,"Segoe UI",system-ui,sans-serif;color:#f3e7cb}#trOv[hidden]{display:none}
#trOv .c{width:min(460px,100%);max-height:100%;overflow:auto;background:#17201f;border:1px solid rgba(242,199,78,.5);border-radius:18px;padding:14px}
#trOv h2{margin:0 0 2px;font-size:20px;display:flex;justify-content:space-between}#trOv h2 button{all:unset;cursor:pointer;font-size:24px;padding:0 6px}
#trOv p{margin:0 0 10px;color:#c9bfa8;font-size:13px}
#trOv .row{display:grid;grid-template-columns:12px 1fr auto;gap:10px;align-items:center;padding:8px;border-radius:10px;cursor:pointer}#trOv .row:hover{background:rgba(255,255,255,.06)}
#trOv .row i{width:12px;height:12px;border-radius:50%}#trOv .row b{display:block;font-size:14px}#trOv .row small{color:#9aa39c;font-size:12px}#trOv .row em{font-style:normal;color:#e2b765;font:600 12px ui-monospace,monospace}`;
    document.head.appendChild(st); document.body.appendChild(pan);
    pan.addEventListener('click', e => { if (e.target === pan) pan.hidden = true; });
  }
  let c = { x: 0, z: 0 }; try { c = TG.debug.car; } catch(e){}
  const tot = {}; for (const T of TERRE) { const p = padrone(T.id); if (p) tot[p] = (tot[p] || 0) + 1; }
  const testa = Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([p, n]) => `<b style="color:${colore(p)}">${corto(p)} ${n}</b>`).join(' · ') || 'Ancora tutti liberi';
  const lista = TERRE.map(T => ({ T, d: Math.hypot(T.x - c.x, T.z - c.z), l: righe(T.id) })).sort((a, b) => a.d - b.d);
  pan.innerHTML = `<div class="c"><h2>🌰 I terreni <button aria-label="Chiudi">×</button></h2><p>Ogni terreno è del paese che c'ha raccolto de più questa settimana. Domenica vince chi ne tiene de più. ${testa}</p>`
    + lista.map(({ T, d, l }) => `<div class="row" data-t="${T.id}"><i style="background:${colore(l[0] && l[0].paese)}"></i><div><b>${breve(T.nome)}</b><small>${l.length ? l.slice(0, 2).map(r => corto(r.paese) + ' ' + r.punti).join(' · ') : 'libero'}</small></div><em>${d < 950 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km'}</em></div>`).join('') + '</div>';
  pan.querySelector('h2 button').onclick = () => { pan.hidden = true; };
  pan.querySelectorAll('.row').forEach(r => r.onclick = () => { const T = TERRE.find(x => x.id === r.dataset.t); pan.hidden = true; try { const m = document.querySelector('#mapOv [data-close]'); m && m.click(); TG.debug.setDest({ x: T.x, z: T.z, name: breve(T.nome) }); msg('Segui a freccia: ' + breve(T.nome)); } catch(e){} ev('terra_vai', T.id); });
  pan.hidden = false; ev('terre_aperte', '');
}
function bottone(){
  const q = $('mapQuick'); if (!q || q.querySelector('[data-q="terre"]')) return;
  const b = document.createElement('button'); b.dataset.q = 'terre'; b.innerHTML = '<i style="background:#f2b134"></i><span>🌰 Terreni</span>';
  b.onclick = e => { e.stopPropagation(); aggiorna().then(pannello); };
  q.insertBefore(b, q.firstChild);
}

/* ---------- al rientro: v'hanno fregato un terreno? ---------- */
function controllaPerse(){
  const p = paese(); if (!p || !caricato) return;
  let prima = {}; try { prima = JSON.parse(ls.get('tg-terre-mie') || '{}'); } catch(e){}
  const ora = {}; for (const T of TERRE) if (padrone(T.id) === p) ora[T.id] = 1;
  const perse = Object.keys(prima).filter(id => !ora[id] && padrone(id));
  ls.set('tg-terre-mie', JSON.stringify(ora));
  if (!perse.length) return;
  const T = TERRE.find(x => x.id === perse[0]); if (!T) return;
  const chi = padrone(T.id);
  const via = () => setTimeout(() => { msg(`🌰 ${corto(chi)} v'ha fregato ${T.nome.charAt(0).toLowerCase() + T.nome.slice(1)}`, `Segui a freccia e ripijatelo${perse.length > 1 ? ` (e n'avete persi altri ${perse.length - 1})` : ''}`, 7); try { TG.debug.setDest({ x: T.x, z: T.z, name: 'Ripijate ' + breve(T.nome) }); } catch(e){} ev('terre_perse', T.id, perse.length); }, 5000);
  if (document.body.classList.contains('playing')) via(); else new MutationObserver((x, o) => { if (document.body.classList.contains('playing')) { o.disconnect(); via(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

/* ---------- minimappa: i terreni colorati ---------- */
let mc = null;
function mini(){
  requestAnimationFrame(mini);
  const m = $('mini'), mo = $('mapOv');
  if (!m || !document.body.classList.contains('playing') || (mo && !mo.hidden)) { if (mc) mc.style.display = 'none'; return; }
  const r = m.getBoundingClientRect(); if (!r.width) return;
  if (!mc) { mc = document.createElement('canvas'); mc.setAttribute('style', 'position:fixed;pointer-events:none;border-radius:50%;z-index:11'); mc.width = mc.height = 168; document.body.appendChild(mc); }
  Object.assign(mc.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  let d; try { d = TG.debug.car; } catch(e){ return; } if (!d) return;
  const c = mc.getContext('2d'), W = 168, a = W / 2, s = a / 820, rot = -Math.atan2(Math.cos(d.yaw), Math.sin(d.yaw)) - Math.PI / 2;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, W); c.beginPath(); c.arc(a, a, a - 1, 0, Math.PI * 2); c.clip();
  c.translate(a, a); c.rotate(rot); c.scale(s, s);
  for (const T of TERRE) { const dx = T.x - d.x, dz = T.z - d.z; if (Math.hypot(dx, dz) > 1000) continue; const p = padrone(T.id);
    c.beginPath(); c.arc(dx, dz, Math.max(T.rad, 6 / s), 0, Math.PI * 2); c.fillStyle = colore(p); c.globalAlpha = p ? .45 : .2; c.fill(); c.globalAlpha = 1; c.lineWidth = 2 / s; c.strokeStyle = p === paese() ? '#f2c74e' : 'rgba(255,255,255,.7)'; c.stroke(); }
}

// per la mappa: di chi è il terreno, in una riga
function descrivi(id){
  const l = righe(id).filter(r => r.punti > 0), p = paese();
  if (!l.length) return 'Libero: o primo che ce raccoje se o pija pe\' o paese suo.';
  const b = (pp, n) => `<b style="color:${colore(pp)}">${corto(pp)}</b> ${n}`;
  let t = `È de ${b(l[0].paese, l[0].punti)} nocchie`;
  if (l[1]) t += ` · ${b(l[1].paese, l[1].punti)}`;
  if (p && l[0].paese !== p) { const mio = punti(id, p); t += `<br>Pe' pijallo a ${corto(p)} ne servono ${l[0].punti - mio + 1}.`; }
  else if (p && l[0].paese === p) t += '<br>È vostro: tenetelo.';
  return t;
}

/* ---------- IL PREMIO DE I GIOCHI: ogni partita a un gioco vicino ai terreni vince o terreno più vicino pe' o paese tuo,
   co' l'oro ne vince 5. Si legge dal ritorno ne o mondo (?da=<gioco>&esito=…&med=…); una volta sola pe' partita. ---------- */
let RITORNO = null; try { RITORNO = new URLSearchParams(location.search); } catch(e){}   // letto subito: o mondo poi pulisce l'indirizzo
async function premioGioco(){
  const q = RITORNO; if (!q) return;
  const da = q.get('da'), esito = q.get('esito'); if (!da || !esito) return;
  const chiave = 'tg-premio-' + da + '-' + (q.get('t') || '') + '-' + (q.get('med') || '');
  if (ls.get(chiave)) return;
  const p = paese(), d = dev();
  let A = null; try { A = (TG.debug.acts || []).find(a => a.id === da); } catch(e){}
  if (!A || !p || !d) { if ((premioGioco.n = (premioGioco.n || 0) + 1) < 40) setTimeout(premioGioco, 1500); return; }
  ls.set(chiave, '1');
  const quanti = q.get('med') === 'oro' ? 5 : 1;
  const lista = TERRE.filter(T => padrone(T.id) !== p).map(T => ({ T, d: Math.hypot(T.x - A.x, T.z - A.z) - T.rad })).filter(o => o.d < 2500).sort((a, b) => a.d - b.d);
  const presi = []; let primaPadrone = null;
  for (const { T } of lista) {
    if (presi.length >= quanti) break;
    const l = righe(T.id), cap = l.find(r => r.paese !== p), serve = (cap ? cap.punti : 0) - punti(T.id, p) + 1;
    if (serve > 80) continue;   // troppo lontano pe' un premio: se lo devono pijà co' e nocchie
    try { const r = await rpc('tg_terra_punto', { p_dev: d, p_terra: T.id, p_paese: p, p_punti: Math.max(1, serve) }); if (r && r.aggiunti) { locali[T.id] = locali[T.id] || {}; locali[T.id][p] = (locali[T.id][p] || 0) + r.aggiunti; versione++; if (padrone(T.id) === p) { presi.push(T); if (!primaPadrone && cap) primaPadrone = cap.paese; festeggiati[T.id] = 1; ev('terra_presa', T.id, null, { a: cap && cap.paese, gioco: da }); } } } catch(e){}
  }
  if (!presi.length) return;
  const via = () => setTimeout(() => festa(presi[0], primaPadrone, p, presi.length, quanti > 1 ? '🥇 Premio de l\'oro' : '🎮 Premio de a partita'), 1800);
  if (document.body.classList.contains('playing')) via(); else new MutationObserver((x, o) => { if (document.body.classList.contains('playing')) { o.disconnect(); via(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  ev('terre_premio', da, presi.length, { med: q.get('med') || null });
}
TG.Terre = { colore, padrone, righe, terraIn, aggiorna, pannello, descrivi, _card: cardImmagine, lista: () => TERRE, _dbg: () => ({ classifica, locali, daMandare }) };
// per i moduli che usavano le zone (presenza: colore del paese)
TG.Zone = TG.Zone || { colore, squadra: false };
function avvia(){
  if (!TG.debug || !TG.debug.campi || !TG.Profile || !TG.Contadino) return setTimeout(avvia, 1000);
  TERRE = costruisci(); if (TERRE.length < 2) return setTimeout(avvia, 1500);
  apriTutti(); aggancia();
  aggiorna().then(controllaPerse).then(premioGioco); setInterval(aggiorna, 60000);
  setInterval(() => { aggiornaBox(); aggiornaCartelli(); nascondiVicini(); bottone(); }, 700);
  setInterval(invia, 5000); addEventListener('pagehide', invia);
  requestAnimationFrame(mini);
}
if (document.readyState === 'complete') setTimeout(avvia, 1500); else addEventListener('load', () => setTimeout(avvia, 1500));
})();
