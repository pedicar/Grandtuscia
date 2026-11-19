/* CROSSODROMO DE A TUSCIA — na pista de terra chiusa ne a caldera de Vico (vicino a e Pantanacce), co' 6 salti e o tempo.
   - Pista: un anello de ~650 m largo 9, de terra, co' i paletti bianchi e rossi ai lati; arco de partenza a scacchi.
   - Salti: 6 trampolini (tg-rampe.js) messi lungo a pista, ner verso de corsa.
   - O GIRO: passi sotto l'arco e parte o tempo (striscia in alto «⏱ 0:23,4 · migliore 1:02,1»); devi passà da 4 porte in fila;
     riattraversi l'arco → giro fatto: nocchie (40 + 20 si è o record tuo) e avviso in alto. I salti e i trick (tg-trick.js) se pagano a parte.
   - Avviso a a prima visita. Va bene co' tutti i mezzi, ma è fatto pe' a moto da cross.
   Usa TG.debug (car, scene, world), TG.GEO (PANT), TG.Rampe.aggiungi, TG.Cassone, TG.msg, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ev = (t, c, n) => { try { TG.Stats && TG.Stats.ev(t, c || '', n); } catch(e){} };
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const OFF = { x: 300, z: -400 };   // da e Pantanacce: o pezzo più piano e libero vicino (sondato 19/11: 10 m de dislivello su 200x140, niente acqua né case né campi)
const PUNTI = [[-90, -50], [-20, -62], [60, -55], [96, -18], [86, 32], [40, 56], [2, 24], [-30, 60], [-86, 50], [-98, 0]];
const LARGO = 9;
let C = null, pista = [], porte = [], arco = null, pronto = false;
const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1).replace('.', ','); };
function costruisci(){
  const D = TG.debug, G = TG.GEO; if (!D || !D.scene || !D.world || !G || !G.PANT || !TG.Rampe) return setTimeout(costruisci, 1000);
  C = { x: G.PANT.x + OFF.x, z: G.PANT.z + OFF.z }; const E = D.world;
  const curva = new THREE.CatmullRomCurve3(PUNTI.map(p => new THREE.Vector3(C.x + p[0], 0, C.z + p[1])), true, 'catmullrom', .5);
  const N = 340; const pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = curva.getPointAt(u), t = curva.getTangentAt(u), nx = t.z, nz = -t.x;   // normale orizzontale
    pista.push({ x: p.x, z: p.z, tx: t.x, tz: t.z, u });
    for (const s of [-1, 1]) { const x = p.x + nx * s * LARGO / 2, z = p.z + nz * s * LARGO / 2; pos.push(x, E.ground(x, z) + .12, z); }
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const col = h => { const c = new THREE.Color(h); try { c.convertSRGBToLinear(); } catch(e){} return c; };
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const terra = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col('#8a6038'), side: THREE.DoubleSide, flatShading: true })); terra.receiveShadow = true; D.scene.add(terra);
  // paletti ai lati, uno ogni 4 campioni, bianchi e rossi alternati
  const gp = new THREE.CylinderGeometry(.12, .12, 1.1, 5); gp.translate(0, .55, 0);
  const pal = new THREE.InstancedMesh(gp, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.ceil(N / 4) * 2 + 4); pal.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(pal.count * 3), 3);
  const M4 = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < N; i += 4) { const P = pista[i]; for (const s of [-1, 1]) { const x = P.x + P.tz * s * (LARGO / 2 + .6), z = P.z - P.tx * s * (LARGO / 2 + .6); M4.makeTranslation(x, E.ground(x, z), z); pal.setMatrixAt(k, M4); pal.setColorAt(k, col((i / 4) % 2 ? '#d8432a' : '#f6f1e1')); k++; } }
  pal.count = k; D.scene.add(pal);
  // arco de partenza a scacchi
  { const P = pista[0], ang = Math.atan2(P.tx, P.tz), y = E.ground(P.x, P.z), grp = new THREE.Group(); grp.position.set(P.x, y, P.z); grp.rotation.y = ang;
    const ner = new THREE.MeshLambertMaterial({ color: col('#1d1e20') }), bia = new THREE.MeshLambertMaterial({ color: col('#f6f1e1') }), ar = new THREE.MeshLambertMaterial({ color: col('#f0652b') });
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(.5, 6, .5), ar); c.position.set(s * (LARGO / 2 + .8), 3, 0); grp.add(c); }
    for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) { const q = new THREE.Mesh(new THREE.BoxGeometry((LARGO + 2) / 12, .5, .3), (i + j) % 2 ? ner : bia); q.position.set(-(LARGO + 2) / 2 + (i + .5) * (LARGO + 2) / 12, 5.5 + j * .5, 0); grp.add(q); }
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 160; const x = cv.getContext('2d'); x.fillStyle = '#1b2423'; x.fillRect(0, 0, 1024, 160); x.fillStyle = '#f2c74e'; x.font = '900 78px Figtree, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🏁 CROSSODROMO DE A TUSCIA', 512, 82);
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(LARGO + 2, 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide })); ban.position.set(0, 7.1, -.2); ban.rotation.y = Math.PI; grp.add(ban);   // se legge da chi arriva
    D.scene.add(grp); arco = P; }
  // 6 salti lungo a pista (ner verso de corsa), lontani da l'arco
  const SALTI = [[.09, { L: 8, W: 6, H: 2 }], [.22, { L: 10, W: 6, H: 3 }], [.4, { L: 7, W: 6, H: 1.6 }], [.55, { L: 10, W: 6, H: 3.2 }], [.7, { L: 8, W: 6, H: 2.2 }], [.85, { L: 9, W: 6, H: 2.6 }]];
  for (const [u, M] of SALTI) { const P = pista[Math.round(u * N)]; TG.Rampe.aggiungi(P.x, P.z, Math.atan2(P.tx, P.tz), M, 'Crossodromo'); }
  TG.Rampe.visti('Crossodromo');   // l'avviso o dà o crossodromo, no e rampe
  porte = [.25, .5, .7, .9].map(u => pista[Math.round(u * N)]);
  pronto = true;
}
/* ---------- o giro a tempo ---------- */
let giro = null, migliore = +(ls.get('tg-cross-record') || 0), visto = !!ls.get('tg-cross-visto'), tPrima = performance.now(), lato = 0;
const css = document.createElement('style'); css.textContent = `#crossPill{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 104px);z-index:41;padding:7px 16px;border-radius:999px;background:rgba(14,18,16,.82);border:2px solid #f2c74e;color:#f3e7cb;font:900 18px/1.2 Figtree,system-ui,sans-serif;white-space:nowrap;pointer-events:none}#crossPill[hidden],body:not(.playing) #crossPill{display:none!important}#crossPill small{font-weight:700;color:#c9bfa8;font-size:14px}body:has(#crossPill:not([hidden])) #campoPill{display:none!important}`;
document.head.appendChild(css);
const pill = document.createElement('div'); pill.id = 'crossPill'; pill.hidden = true; document.body.appendChild(pill);
function passo(){
  requestAnimationFrame(passo);
  const ora = performance.now(), dt = Math.min(.1, (ora - tPrima) / 1000); tPrima = ora;
  if (!pronto || !document.body.classList.contains('playing') || document.body.classList.contains('flying')) { pill.hidden = true; return; }
  const c = TG.debug.car; if (!c) return;
  const dC = Math.hypot(c.x - C.x, c.z - C.z);
  if (!visto && dC < 180) { visto = true; ls.set('tg-cross-visto', '1'); try { TG.msg('🏁 Crossodromo de a Tuscia!', 'Passa sotto l\'arco: parte o tempo. Mejo co\' a moto da cross', 5); } catch(e){} ev('cross_visto'); }
  // da che parte de a linea de partenza stai (pe' sapé quanno a passi)
  const dx = c.x - arco.x, dz = c.z - arco.z, lungo = dx * arco.tx + dz * arco.tz, trav = Math.abs(dx * arco.tz - dz * arco.tx);
  const nuovoLato = trav < LARGO / 2 + 3 && Math.abs(lungo) < 6 ? Math.sign(lungo) : 0;
  const passato = lato < 0 && nuovoLato > 0; if (nuovoLato) lato = nuovoLato; else if (Math.abs(lungo) > 8 || trav > LARGO) lato = 0;
  if (giro) {
    giro.t += dt;
    const P = porte[giro.porta]; if (P && Math.hypot(c.x - P.x, c.z - P.z) < LARGO + 4) giro.porta++;
    if (passato && giro.porta >= porte.length && giro.t > 20) {
      const t = giro.t, rec = !migliore || t < migliore; if (rec) { migliore = t; ls.set('tg-cross-record', String(t)); }
      const k = 40 + (rec ? 20 : 0); let n = k; try { n = TG.Cassone.aggiungi(k, true) || k; } catch(e){}
      try { TG.msg(rec ? `🏆 Record! Giro in ${fmt(t)}` : `🏁 Giro in ${fmt(t)}`, `+${n} 🌰${rec ? '' : ' · migliore ' + fmt(migliore)}`, 4); } catch(e){}
      ev('cross_giro', rec ? 'record' : '', Math.round(t * 10) / 10);
      giro = { t: 0, porta: 0 };   // giro novo de fila
    } else if (passato && giro.porta < porte.length && giro.t > 5) { giro = { t: 0, porta: 0 }; try { TG.msg('🔁 Giro ripartito', 'Pe\' valé devi fà tutta a pista', 2.5); } catch(e){} }
    if (dC > 260) { giro = null; try { TG.msg('Uscito da o crossodromo', 'O tempo s\'è fermato', 2); } catch(e){} }
  } else if (passato) { giro = { t: 0, porta: 0 }; ev('cross_via'); }
  if (giro) { const h = `⏱ ${fmt(giro.t)} <small>· porte ${giro.porta}/${porte.length}${migliore ? ' · migliore ' + fmt(migliore) : ''}</small>`; if (pill._h !== h) { pill._h = h; pill.innerHTML = h; } pill.hidden = false; } else pill.hidden = true;
}
costruisci(); requestAnimationFrame(passo);
TG.Cross = { centro: () => C, pista: () => pista, partenza: () => arco, giro: () => giro };
})();
