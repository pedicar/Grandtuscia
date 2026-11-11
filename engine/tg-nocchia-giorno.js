/* A NOCCHIA DE O GIORNO — una nocchia d'oro nascosta ogni giorno in un posto diverso della Tuscia.
   Chi la trova porta 10 punti al suo comune. L'indizio è la descrizione del luogo, senza il nome: lo stesso
   indizio esce nel post del mattino su Facebook, così il post e il gioco parlano della stessa cosa.
   Modulo esterno: usa TG.debug (places, scene, car, world.ground, showToast) e TG.PrimoMinuto.mandaPunti. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const PUNTI = 10, RAGGIO = 7;
const oggi = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const giornoN = (d) => Math.floor(((d || new Date()).getTime() - (d || new Date()).getTimezoneOffset() * 60000) / 86400000);
function paese(){ const p = ls.get('tg-paese-dev'); return p && p !== 'nessuno' ? p : null; }
function nomePaese(){ const p = paese(); if (!p) return 'o paese tuo'; try { const n = TG.PrimoMinuto && TG.PrimoMinuto.nomeComune ? TG.PrimoMinuto.nomeComune(p) : p; return n || p; } catch(e){ return p; } }
// Solo luoghi raggiungibili in 2–3 minuti dal podere: niente vette, niente Viterbo, niente estremi della mappa (il 10/11: 41 indizi aperti, 0 nocchie trovate)
const ESCLUSI = new Set(['lago', 'soratte', 'venere', 'faggeta-venere', 'faggeta-unesco', 'sasso', 'cimino', 'deltaplano', 'bunker', 'fogliano', 'san-pellegrino', 'santa-rosa', 'viterbo', 'palazzo-papi', 'cigni']);
function luoghi(){ try { return (TG.debug.places || []).filter(p => p.cat && p.x != null && p.z != null && !ESCLUSI.has(p.id)); } catch(e){ return []; } }
// Stessa regola in Python (meme/nocchia-giorno.py): indice = (n * 11) % numero luoghi, angolo = (n * 53) % 360, distanza 14 m
function scelta(d){
  const L = luoghi(); if (!L.length) return null;
  const n = giornoN(d), p = L[(n * 11) % L.length], a0 = ((n * 53) % 360) * Math.PI / 180;
  // 14 m dal luogo, ma mai nell'acqua né dentro una casa: giro l'angolo (poi allargo) finché trovo terra libera
  let x = p.x, z = p.z;
  try {
    const E = TG.debug.world;
    const libero = (xx, zz) => !(E.isWater && E.isWater(xx, zz)) && !(E.collidersNear ? E.collidersNear(xx, zz) : []).some(c => (c.x - xx) ** 2 + (c.z - zz) ** 2 < (c.r + 2.5) ** 2);
    cerca: for (const dist of [14, 24, 36]) for (let k = 0; k < 8; k++) { const a = a0 + k * Math.PI / 4, xx = p.x + Math.cos(a) * dist, zz = p.z + Math.sin(a) * dist; if (libero(xx, zz)) { x = xx; z = zz; break cerca; } }
  } catch(e){}
  return { luogo: p, x, z };
}
let mesh = null, beam = null, stato = null, t0 = 0, hud = null, mostrato = false, attesa = 0;
function costruisci(s){
  const D = TG.debug, E = D.world, scene = D.scene; if (!scene || typeof THREE === 'undefined') return;
  const y = E.ground(s.x, s.z);
  const g = new THREE.Group(); g.position.set(s.x, y, s.z);
  const oro = new THREE.MeshStandardMaterial({ color: 0xf2b134, emissive: 0x7a4a00, emissiveIntensity: .6, metalness: .7, roughness: .3, flatShading: true });
  const noc = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), oro); noc.scale.set(1, 1.25, 1); noc.position.y = 2.2; g.add(noc);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.9, .7, 6), new THREE.MeshStandardMaterial({ color: 0x8a5a2b, flatShading: true })); cap.position.y = 3.3; g.add(cap);
  beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, 1.6, 60, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 30; g.add(beam);
  const luce = new THREE.PointLight(0xffc14d, 1.2, 25); luce.position.y = 3; g.add(luce);
  scene.add(g); mesh = g; mesh.userData.noc = noc;
}
function tick(){
  if (!mesh) return;
  const t = (performance.now() - t0) / 1000;
  try { const y = TG.debug.world.ground(mesh.position.x, mesh.position.z); if (isFinite(y) && Math.abs(y - mesh.position.y) > 0.05) mesh.position.y = y; } catch(e){}  // il terreno si costruisce dopo: la nocchia lo segue
  mesh.userData.noc.rotation.y = t * 1.2; mesh.userData.noc.position.y = 2.2 + Math.sin(t * 2) * .25;
  if (beam) beam.material.opacity = .14 + Math.sin(t * 3) * .05;
  const c = TG.debug.car; if (!c) return;
  const dx = c.x - mesh.position.x, dz = c.z - mesh.position.z;
  if (dx * dx + dz * dz < RAGGIO * RAGGIO) presa();
}
function presa(){
  if (!mesh) return;
  const s = stato; mesh.parent && mesh.parent.remove(mesh); mesh = null;
  ls.set('tg-nocchia-giorno', oggi());
  const n = nomePaese();
  try { TG.debug.showToast('🌰 A nocchia de o giorno! +' + PUNTI + ' pe\' ' + n + ' · era a ' + s.luogo.name); } catch(e){}
  try { if (paese() && TG.PrimoMinuto && TG.PrimoMinuto.mandaPunti) TG.PrimoMinuto.mandaPunti(PUNTI); } catch(e){}
  try { TG.Stats && TG.Stats.ev('nocchia_giorno', s.luogo.id, PUNTI, { paese: paese() }); } catch(e){}
  aggiornaHud(true);
  if (!paese() && TG.PrimoMinuto && TG.PrimoMinuto.chiediPaese) { try { TG.PrimoMinuto.chiediPaese(); } catch(e){} }
}
function aggiornaHud(presaOra){
  if (!hud) {
    hud = document.createElement('button'); hud.type = 'button'; hud.id = 'ngHud';
    hud.setAttribute('style', 'position:fixed;z-index:30;left:50%;transform:translateX(-50%);top:calc(150px + env(safe-area-inset-top,0px));max-width:min(560px,92vw);padding:8px 14px;border-radius:999px;border:1px solid rgba(255,210,100,.55);background:rgba(40,30,12,.82);color:#ffe3a3;font:700 13px system-ui,sans-serif;cursor:pointer;text-align:center;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:none');
    hud.onclick = () => {
      if (!stato || trovata()) return;
      if (hud.dataset.chiuso) { hud.dataset.chiuso = ''; hud.dataset.aperto = '1'; try { TG.Stats && TG.Stats.ev('nocchia_giorno', 'indizio'); } catch(e){} }
      else if (hud.dataset.aperto) { // secondo tocco: la freccia della missione porta lì (è un gioco quotidiano, non un enigma)
        try { TG.debug.setDest({ x: stato.x, z: stato.z, name: "A nocchia d'oro" }); TG.Stats && TG.Stats.ev('nocchia_giorno', 'mappa'); } catch(e){}
        hud.dataset.chiuso = '1'; hud.dataset.aperto = ''; try { TG.debug.showToast('Segui a freccia: a nocchia d\'oro sta là'); } catch(e){}
      } else hud.dataset.aperto = '1';
      aggiornaHud();
    };
    document.body.appendChild(hud);
  }
  if (trovata()) { hud.textContent = presaOra ? '🌰 Presa! +' + PUNTI + ' pe\' ' + nomePaese() + ' · domani ce n\'è n\'altra' : '🌰 A nocchia de oggi l\'hai già presa · domani ce n\'è n\'altra'; hud.style.display = 'block'; if (!presaOra) setTimeout(() => { hud.style.display = 'none'; }, 6000); else setTimeout(() => { hud.style.display = 'none'; }, 9000); return; }
  if (!stato) { hud.style.display = 'none'; return; }
  hud.style.display = 'block';
  // chiuso: solo la nocchia, piccola, in alto a sinistra sotto il pannello; aperto: il testo. Si richiude da solo: lo schermo serve per giocare
  if (hud.dataset.chiuso) { hud.textContent = '🌰'; hud.style.cssText += ';left:auto;right:10px;transform:none;padding:6px 9px;font-size:18px;top:calc(196px + env(safe-area-inset-top,0px))'; return; }
  hud.style.cssText = hud.style.cssText.replace(/;left:auto;right:10px;transform:none;padding:6px 9px;font-size:18px;top:[^;]*/g, '');
  hud.textContent = hud.dataset.aperto ? '🌰 «' + stato.luogo.short + '» · tocca ancora pe\' a freccia' : '🌰 A nocchia de o giorno: +' + PUNTI + ' pe\' ' + nomePaese() + ' · tocca pe\' l\'indizio';
  clearTimeout(hud._t); hud._t = setTimeout(() => { hud.dataset.chiuso = '1'; hud.dataset.aperto = ''; aggiornaHud(); }, hud.dataset.aperto ? 9000 : 6000);
}
const trovata = () => ls.get('tg-nocchia-giorno') === oggi();
const inGioco = () => document.body.classList.contains('playing');
function avvia(){
  if (!TG.debug || !TG.debug.scene) return setTimeout(avvia, 1500);
  stato = scelta(); if (!stato) return setTimeout(avvia, 1500);  // i luoghi arrivano con il mondo
  t0 = performance.now();
  if (!trovata()) costruisci(stato);
  setInterval(() => {
    tick();
    // il chip aspetta che il primo minuto (HUD #pmHud o card #pmOv) sia finito: una cosa alla volta
    if (!mostrato && inGioco()) {
      const occupato = document.getElementById('pmHud') || (document.getElementById('pmOv') && !document.getElementById('pmOv').hidden) || (TG.PrimoMinuto && TG.PrimoMinuto.attivo);
      if (!occupato) { if (!attesa) attesa = Date.now(); else if (Date.now() - attesa > 4000) { mostrato = true; aggiornaHud(); } } else attesa = 0;
    }
  }, 100);
}
TG.NocchiaGiorno = { _dbg: () => ({ mostrato, attesa, stato: !!stato, hud: !!hud }), scelta, indizio: d => { const s = scelta(d); return s ? { luogo: s.luogo.name, indizio: s.luogo.short, id: s.luogo.id, cat: s.luogo.cat } : null; }, trovata, PUNTI };
if (document.readyState === 'complete') setTimeout(avvia, 2500); else addEventListener('load', () => setTimeout(avvia, 2500));
})();
