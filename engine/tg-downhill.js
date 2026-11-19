/* DOWNHILL DE A FAGGETA — na pista de terra che scende da a cima de o Monte Cimino in mezzo a i faggi (~1,5 km, ~300 m de dislivello).
   - Pista larga 6 m, co' i paletti a nastro arancione ai lati; arco «🚵 DOWNHILL DE A FAGGETA» in cima e arco «🏁 ARRIVO» in fondo.
     O tracciato è stato cercato apposta pe' scende a ~20% senza passà addosso a i faggi (sondato 19/11).
   - In discesa sulla pista se pija slancio da soli (a pendenza spigne, fino a +16 m/s), co' tutti i mezzi; è fatta pe' a bici e pe' a moto.
   - O TEMPO: passi sotto l'arco in cima → parte (striscia in alto «⏱ 0:42,3 · porte 2/4 · migliore 2:01,7»); 4 porte in fila;
     arrivi sotto l'arco in fondo → +60 🌰 (+30 si è o record tuo). Si esci troppo da a pista (60 m) o tempo se ferma.
   - In fondo, quanno nun stai a corre, un bottone «⬆ Torna in cima» te riporta su.
   Usa TG.debug (car, scene, world, placeCar), TG.GEO (CIM.top), TG.Rampe.sfoltisci, TG.Cassone, TG.msg, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ev = (t, c, n) => { try { TG.Stats && TG.Stats.ev(t, c || '', n); } catch(e){} };
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
// punti rispetto a a cima (CIM.top), da 6 in 6 m filtrati: scende a spirale verso sud-ovest
const PUNTI = [[4,14],[13,43],[30,66],[57,77],[87,77],[116,73],[137,53],[154,29],[172,5],[187,-21],[202,-47],[213,-75],[220,-104],[222,-134],[219,-164],[212,-193],[202,-221],[189,-249],[173,-274],[155,-298],[135,-320],[112,-340],[87,-357],[63,-374],[37,-389],[10,-402],[-18,-414],[-46,-424],[-75,-432],[-104,-437],[-134,-441],[-164,-442],[-194,-442],[-224,-441],[-254,-437],[-283,-431],[-312,-423],[-340,-413],[-366,-398],[-389,-379],[-413,-361],[-437,-343],[-460,-323],[-485,-311],[-490,-340],[-485,-370],[-482,-400],[-471,-427],[-459,-455],[-446,-482],[-431,-508],[-415,-533],[-397,-557]];
const LARGO = 6, N = 520;
let pista = [], porte = [], cima = null, fondo = null, pronto = false;
const fmt = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1).replace('.', ','); };
const suolo = (E, x, z) => { let g = E.ground(x, z); try { if (E.surfH) g = Math.max(g, E.surfH(x, z)); } catch(e){} return g; };   // a superficie che se vede (ground + rilievo)
const col = h => { const c = new THREE.Color(h); try { c.convertSRGBToLinear(); } catch(e){} return c; };
function arco(D, P, testo, colore, girato){
  const E = D.world, grp = new THREE.Group(); grp.position.set(P.x, suolo(E, P.x, P.z), P.z); grp.rotation.y = Math.atan2(P.tx, P.tz);
  const legno = new THREE.MeshLambertMaterial({ color: col('#6b4a2c'), flatShading: true });
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.3, .35, 6, 6), legno); c.position.set(s * (LARGO / 2 + .8), 3, 0); grp.add(c); }
  const tr = new THREE.Mesh(new THREE.BoxGeometry(LARGO + 2.4, .4, .4), legno); tr.position.y = 6; grp.add(tr);
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 160; const x = cv.getContext('2d'); x.fillStyle = colore; x.fillRect(0, 0, 1024, 160); x.fillStyle = '#fff7e6'; x.font = '900 70px Figtree, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(testo, 512, 84);
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(LARGO + 2, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide })); ban.position.set(0, 7, -.2); ban.rotation.y = Math.PI; grp.add(ban);   // se legge da chi arriva
  D.scene.add(grp);
}
function costruisci(){
  const D = TG.debug, G = TG.GEO; if (!D || !D.scene || !D.world || !G || !G.CIM || !G.CIM.top) return setTimeout(costruisci, 1000);
  const T = G.CIM.top, E = D.world;
  const curva = new THREE.CatmullRomCurve3(PUNTI.map(p => new THREE.Vector3(T.x + p[0], 0, T.z + p[1])), false, 'catmullrom', .5);
  const pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = curva.getPointAt(u), t = curva.getTangentAt(u), nx = t.z, nz = -t.x;
    pista.push({ x: p.x, z: p.z, tx: t.x, tz: t.z, u });
    for (const s of [-1, 1]) { const x = p.x + nx * s * LARGO / 2, z = p.z + nz * s * LARGO / 2; pos.push(x, suolo(E, x, z) + .14, z); }
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const terra = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col('#6e4a2e'), side: THREE.DoubleSide, flatShading: true })); terra.receiveShadow = true; D.scene.add(terra);
  // paletti col nastro arancione, uno ogni 5 campioni pe' lato
  const gp = new THREE.CylinderGeometry(.08, .08, 1, 4); gp.translate(0, .5, 0);
  const pal = new THREE.InstancedMesh(gp, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.ceil(N / 5) * 2 + 4); pal.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(pal.count * 3), 3);
  const M4 = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < N; i += 5) { const P = pista[i]; for (const s of [-1, 1]) { const x = P.x + P.tz * s * (LARGO / 2 + .5), z = P.z - P.tx * s * (LARGO / 2 + .5); M4.makeTranslation(x, suolo(E, x, z), z); pal.setMatrixAt(k, M4); pal.setColorAt(k, col((i / 5) % 2 ? '#f0652b' : '#f6f1e1')); k++; } }
  pal.count = k; pal.userData.tgMio = 1; D.scene.add(pal);
  cima = pista[3]; fondo = pista[N - 3];
  arco(D, cima, '🚵 DOWNHILL DE A FAGGETA', '#3f6b2a');
  arco(D, fondo, '🏁 ARRIVO', '#b9431a');
  try { TG.Rampe.sfoltisci(pista, LARGO / 2 + 1, 13); } catch(e){}   // via l'erba da a pista e i faggi troppo addosso (coprono a vista)
  porte = [.2, .4, .6, .8].map(u => pista[Math.round(u * N)]);
  pronto = true;
}
/* ---------- discesa a tempo ---------- */
let giro = null, migliore = +(ls.get('tg-dh-record') || 0), visto = !!ls.get('tg-dh-visto'), tPrima = performance.now(), latoC = 0, latoF = 0, vicino = 0, slancio = 0;
const css = document.createElement('style'); css.textContent = `#dhPill{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 104px);z-index:41;padding:7px 16px;border-radius:999px;background:rgba(14,18,16,.82);border:2px solid #8cbf52;color:#f3e7cb;font:900 18px/1.2 Figtree,system-ui,sans-serif;white-space:nowrap;pointer-events:none}#dhPill small{font-weight:700;color:#c9bfa8;font-size:14px}
#dhSu{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 104px);z-index:41;padding:10px 20px;border-radius:999px;border:2px solid #fff;background:#3f6b2a;color:#fff;font:900 18px/1.2 Figtree,system-ui,sans-serif;box-shadow:0 4px 0 rgba(0,0,0,.3)}
#dhPill[hidden],#dhSu[hidden],body:not(.playing) #dhPill,body:not(.playing) #dhSu,body.flying #dhSu{display:none!important}body:has(#dhPill:not([hidden])) #campoPill,body:has(#dhSu:not([hidden])) #campoPill{display:none!important}`;
document.head.appendChild(css);
const pill = document.createElement('div'); pill.id = 'dhPill'; pill.hidden = true; document.body.appendChild(pill);
const su = document.createElement('button'); su.id = 'dhSu'; su.type = 'button'; su.hidden = true; su.textContent = '⬆ Torna in cima';
su.addEventListener('click', e => { e.stopPropagation(); const P = pista[0]; try { TG.debug.placeCar(P.x, P.z, Math.atan2(P.tx, P.tz)); } catch(er){} ev('dh_su'); });
document.body.appendChild(su);
function lato(c, P){ const dx = c.x - P.x, dz = c.z - P.z, lungo = dx * P.tx + dz * P.tz, trav = Math.abs(dx * P.tz - dz * P.tx); return trav < LARGO / 2 + 3 && Math.abs(lungo) < 10 ? Math.sign(lungo) || 1 : 0; }
function passo(){
  requestAnimationFrame(passo);
  const ora = performance.now(), dt = Math.min(.1, (ora - tPrima) / 1000); tPrima = ora;
  if (!pronto || !document.body.classList.contains('playing') || document.body.classList.contains('flying')) { pill.hidden = true; su.hidden = true; return; }
  const D = TG.debug, c = D.car; if (!c) return;
  // punto de a pista più vicino (cerca intorno a l'ultimo, ogni tanto su tutta)
  let best = 1e9, bi = vicino; const da = Math.max(0, vicino - 25), a = Math.min(N, vicino + 25);
  const cerca = (i0, i1, st) => { for (let i = i0; i <= i1; i += st) { const P = pista[i], d = (c.x - P.x) ** 2 + (c.z - P.z) ** 2; if (d < best) { best = d; bi = i; } } };
  cerca(da, a, 1); if (best > 900) cerca(0, N, 4);
  vicino = bi; const dist = Math.sqrt(best), P = pista[bi];
  if (!visto && Math.hypot(c.x - cima.x, c.z - cima.z) < 150) { visto = true; ls.set('tg-dh-visto', '1'); try { TG.msg('🚵 Downhill de a Faggeta!', 'Passa sotto l\'arco e butta giù: parte o tempo. Mejo in bici o in moto', 5); } catch(e){} ev('dh_visto'); }
  // a pendenza spigne: in discesa sulla pista se pija slancio (oltre a a velocità de o mezzo), che se perde in salita, frenando o fori pista
  let pend = 0; const avanti = Math.sin(c.yaw) * P.tx + Math.cos(c.yaw) * P.tz;
  if (dist < LARGO / 2 + 1.5 && bi < N - 2) { const Q = pista[Math.min(N, bi + 4)]; pend = (D.world.ground(Q.x, Q.z) - D.world.ground(P.x, P.z)) / (Math.hypot(Q.x - P.x, Q.z - P.z) || 1); }
  if (pend < 0 && avanti > .6 && c.speed > 3) slancio = Math.min(16, slancio + Math.min(.4, -pend) * 9.8 * .8 * dt);
  else slancio = Math.max(0, slancio - (c.speed > 3 && dist < LARGO ? 3 : 12) * dt);
  if (slancio > .1) { c.x += Math.sin(c.yaw) * slancio * dt; c.z += Math.cos(c.yaw) * slancio * dt; }
  const nC = lato(c, cima), passatoC = latoC < 0 && nC > 0; if (nC) latoC = nC; else if (Math.hypot(c.x - cima.x, c.z - cima.z) > 20) latoC = 0;
  const nF = lato(c, fondo), passatoF = latoF < 0 && nF > 0; if (nF) latoF = nF; else if (Math.hypot(c.x - fondo.x, c.z - fondo.z) > 20) latoF = 0;
  if (giro) {
    giro.t += dt;
    const Pp = porte[giro.porta]; if (Pp && Math.hypot(c.x - Pp.x, c.z - Pp.z) < LARGO + 6) giro.porta++;
    if (passatoF && giro.porta >= porte.length) {
      const t = giro.t, rec = !migliore || t < migliore; if (rec) { migliore = t; ls.set('tg-dh-record', String(t)); }
      const k = 60 + (rec ? 30 : 0); let n = k; try { n = TG.Cassone.aggiungi(k, true) || k; } catch(e){}
      try { TG.msg(rec ? `🏆 Record! Discesa in ${fmt(t)}` : `🏁 Discesa in ${fmt(t)}`, `+${n} 🌰${rec ? '' : ' · migliore ' + fmt(migliore)}`, 4); } catch(e){}
      ev('dh_arrivo', rec ? 'record' : '', Math.round(t * 10) / 10); giro = null;
    } else if (dist > 60) { giro = null; try { TG.msg('Uscito da a pista', 'O tempo s\'è fermato: ripassa sotto l\'arco in cima', 2.5); } catch(e){} }
  }
  if (passatoC) { giro = { t: 0, porta: 0 }; ev('dh_via'); }
  if (giro) { const h = `⏱ ${fmt(giro.t)} <small>· porte ${giro.porta}/${porte.length}${migliore ? ' · migliore ' + fmt(migliore) : ''}</small>`; if (pill._h !== h) { pill._h = h; pill.innerHTML = h; } pill.hidden = false; } else pill.hidden = true;
  su.hidden = !!giro || Math.hypot(c.x - fondo.x, c.z - fondo.z) > 50 || Math.abs(c.speed || 0) > 4;
}
costruisci(); requestAnimationFrame(passo);
TG.Downhill = { pista: () => pista, cima: () => cima, fondo: () => fondo, giro: () => giro, slancio: () => slancio };
})();
