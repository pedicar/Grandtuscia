/* L'AEREO DEL BUNKER — versione seconda guerra mondiale (anni '40).
   Caccia monoplano ad ala bassa, motore radiale, elica a tre pale, tettuccio a gabbia, carrello fisso a due ruote
   con carenature + ruotino di coda. Verde oliva/grigio, pancia azzurra, pannelli e rivetti suggeriti con pochi box.
   Nessun simbolo nazionale: solo un numero di matricola stilizzato e una fascia chiara sulla fusoliera.
   Sostituisce TG.Veicoli.aereo mantenendo lo stesso contratto: {id, group, body, prop, update(dt, stato)}.
   Il mondo lo usa in pc() (TG.Veicoli.aereo(ee), scala 1.3, group.position = apron). */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
if (!TG.Veicoli) return;
const originale = TG.Veicoli.aereo;
TG.Veicoli.aereo = function(conv){
  if (typeof THREE === 'undefined') return originale(conv);
  const col = conv || (c => new THREE.Color(c).convertSRGBToLinear());
  const mat = (c, sh, extra) => new THREE.MeshPhongMaterial(Object.assign({ color: col(c), flatShading: true, shininess: sh || 10, specular: col(sh > 40 ? '#ffffff' : '#3a3a3a') }, extra || {}));
  const flat = g => { const o = g.index ? g.toNonIndexed() : g; o.computeVertexNormals(); return o; };
  const add = (parent, geo, m, x, y, z, rx, ry, rz) => { const mesh = new THREE.Mesh(flat(geo), m); mesh.position.set(x || 0, y || 0, z || 0); mesh.rotation.set(rx || 0, ry || 0, rz || 0); mesh.castShadow = true; parent.add(mesh); return mesh; };
  const box = (p, w, h, d, m, x, y, z, rx, ry, rz) => add(p, new THREE.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz);
  const L = {
    oliva: mat('#5b6338', 14), olivaScuro: mat('#454c2b', 10), pancia: mat('#9fb3b8', 18), fascia: mat('#e8e1cf', 12),
    metallo: mat('#4a4c4a', 60), scuro: mat('#262624', 6), gomma: mat('#1c1b1a', 4), pelle: mat('#6b4a2e', 10),
    glass: new THREE.MeshPhongMaterial({ color: col('#9fd0e8'), transparent: true, opacity: .45, shininess: 120, specular: col('#ffffff') }),
    cornice: mat('#3a3d35', 20), scarico: mat('#6a5a4a', 20), numero: mat('#1f1f1f', 8), elica: mat('#2a2622', 10), ogiva: mat('#b53a2a', 30)
  };
  const group = new THREE.Group(), body = new THREE.Group(); body.position.y = 1.9; group.add(body); group.userData.aereo44 = true;
  // Fusoliera: lathe lungo Z (z+ = muso). Sezione tonda, pancia grossa dietro il motore, coda che si affina.
  {
    const prof = [[0, -4.9], [.22, -4.7], [.42, -3.6], [.64, -2.2], [.82, -.6], [.9, .6], [.92, 1.6], [.9, 2.3], [.84, 2.7], [0, 2.75]].map(p => new THREE.Vector2(p[0], p[1]));
    const g = new THREE.LatheGeometry(prof, 14); g.rotateX(Math.PI / 2);
    const fus = add(body, g, L.oliva); fus.scale.set(1, 1.1, 1);
    // dorso: raccordo basso tra tettuccio e coda
    add(body, new THREE.CylinderGeometry(.22, .42, 2.2, 8), L.oliva, 0, .72, -1.9, Math.PI / 2 + .08);
  }
  // Cappottatura motore (anello radiale) + coperchio frontale con feritoie
  add(body, new THREE.CylinderGeometry(.96, .9, 1.25, 14, 1, true), L.olivaScuro, 0, 0, 2.2, Math.PI / 2).material.side = THREE.DoubleSide;
  add(body, new THREE.CylinderGeometry(.9, .96, .18, 14), L.metallo, 0, 0, 2.85, Math.PI / 2);
  add(body, new THREE.CylinderGeometry(.62, .62, .35, 14), L.scuro, 0, 0, 2.9, Math.PI / 2);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; add(body, new THREE.CylinderGeometry(.11, .13, .5, 6), L.metallo, Math.cos(a) * .5, Math.sin(a) * .5, 2.85, Math.PI / 2); }
  // scarichi sotto il motore
  for (const s of [-1, 1]) add(body, new THREE.CylinderGeometry(.06, .08, .7, 6), L.scarico, s * .45, -.78, 1.4, Math.PI / 2 + .25, 0, 0);
  // Fascia chiara di riconoscimento sulla fusoliera e numero di matricola (due barre)
  add(body, new THREE.CylinderGeometry(.68, .76, .32, 14, 1, true), L.fascia, 0, 0, -2.1, Math.PI / 2).material.side = THREE.DoubleSide;
  for (const s of [-1, 1]) { box(body, .05, .34, .16, L.numero, s * .86, .05, -1.1); box(body, .05, .34, .16, L.numero, s * .85, .05, -1.4); }
  // Elica: ogiva + 3 pale + disco trasparente per il moto
  const prop = new THREE.Group(); prop.position.set(0, 0, 3.05); body.add(prop);
  add(prop, new THREE.ConeGeometry(.3, .75, 10), L.ogiva, 0, 0, .3, Math.PI / 2);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const pala = box(prop, .26, 1.9, .07, L.elica, 0, 0, 0); pala.rotation.z = a; pala.position.set(-Math.sin(a) * .95, Math.cos(a) * .95, 0); pala.rotation.y = .35; box(pala, .3, .22, .09, L.fascia, 0, .84, 0); }
  const disco = new THREE.Mesh(new THREE.CircleGeometry(1.95, 20), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0, depthWrite: false })); disco.position.z = .05; prop.add(disco);
  // Ali basse rastremate con bordo d'attacco dritto, estremità arrotondata, leggero diedro
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * .7, -.5, .35); w.rotation.z = s * .09; body.add(w);
    const sh = new THREE.Shape(); sh.moveTo(0, 1.15); sh.lineTo(4.6, .75); sh.quadraticCurveTo(5.5, .55, 5.6, -.1); sh.quadraticCurveTo(5.5, -.6, 4.8, -.7); sh.lineTo(0, -1.25); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: .22, bevelEnabled: true, bevelThickness: .06, bevelSize: .08, bevelSegments: 1 }); g.rotateX(Math.PI / 2); if (s < 0) g.scale(-1, 1, 1);
    const ala = new THREE.Mesh(flat(g), L.oliva); ala.castShadow = true; w.add(ala);
    const sotto = new THREE.Mesh(flat(g.clone()), L.pancia); sotto.scale.set(1, .4, .99); sotto.position.y = -.18; w.add(sotto);
    // alettone + pannello
    box(w, 2.2, .06, .35, L.olivaScuro, s * 3.3, .02, -1.0);
    // carenatura carrello (gamba + "pantalone") e ruota
    box(w, .22, 1.2, .5, L.oliva, s * 1.3, -.75, .3);
    const car = add(w, new THREE.SphereGeometry(.5, 10, 7), L.oliva, s * 1.3, -1.25, .3); car.scale.set(.5, .8, 1.5);
    const ruota = add(w, new THREE.CylinderGeometry(.42, .42, .22, 12), L.gomma, s * 1.3, -1.6, .3, 0, 0, Math.PI / 2);
    add(ruota, new THREE.CylinderGeometry(.2, .2, .24, 10), L.metallo, 0, 0, 0);
    // mitragliatrici alari suggerite da due tubi corti sul bordo d'attacco
    add(w, new THREE.CylinderGeometry(.05, .05, .9, 6), L.scuro, s * 2.6, .05, 1.35, Math.PI / 2);
  }
  // Stabilizzatori di coda e deriva
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape(); sh.moveTo(0, .5); sh.lineTo(1.7, .25); sh.quadraticCurveTo(2.05, .05, 1.85, -.3); sh.lineTo(0, -.55); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: .1, bevelEnabled: false }); g.rotateX(Math.PI / 2); if (s < 0) g.scale(-1, 1, 1);
    const st = new THREE.Mesh(flat(g), L.oliva); st.position.set(s * .25, .25, -4.3); st.castShadow = true; body.add(st);
  }
  {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.4, 0); sh.quadraticCurveTo(1.35, 1.3, .9, 1.75); sh.quadraticCurveTo(.5, 1.95, .1, 1.7); sh.lineTo(-.3, .3); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: false }); g.rotateY(-Math.PI / 2);
    const der = new THREE.Mesh(flat(g), L.oliva); der.position.set(.06, .35, -4.2); der.rotation.y = Math.PI; der.castShadow = true; body.add(der);
  }
  // Tettuccio a gabbia: vetro + montanti, e parabrezza inclinato
  box(body, .95, .1, 1.7, L.cornice, 0, .78, -.3);
  add(body, new THREE.BoxGeometry(.82, .55, 1.5), L.glass, 0, 1.08, -.35);
  for (const z of [.35, -.15, -.65, -1.05]) box(body, .9, .6, .05, L.cornice, 0, 1.08, z);
  for (const s of [-1, 1]) box(body, .05, .6, 1.5, L.cornice, s * .43, 1.08, -.35);
  box(body, .9, .62, .06, L.cornice, 0, 1.0, .55).rotation.x = -.6; // cornice parabrezza
  add(body, new THREE.BoxGeometry(.8, .5, .05), L.glass, 0, 1.0, .53, -.6);
  // Pilota con casco in pelle e occhialoni
  const T = new THREE.Group(); T.position.set(0, .62, -.5); body.add(T);
  box(T, .5, .5, .4, mat('#5a4632', 5), 0, .2, 0);
  add(T, new THREE.IcosahedronGeometry(.19, 1), mat('#e2b48c', 6), 0, .6, .02).scale.set(1, 1.1, 1);
  add(T, new THREE.SphereGeometry(.22, 10, 6, 0, Math.PI * 2, 0, 1.7), L.pelle, 0, .64, 0);
  for (const s of [-1, 1]) add(T, new THREE.CylinderGeometry(.07, .07, .05, 10), L.metallo, s * .08, .64, .19, Math.PI / 2);
  box(T, .5, .05, .05, L.pelle, 0, .64, .18);
  const sciarpa = box(T, .12, .06, .8, L.fascia, .12, .42, -.5);
  // Ruotino di coda
  { const gamba = box(body, .08, .45, .08, L.metallo, 0, -.45, -4.25); const r = add(body, new THREE.CylinderGeometry(.16, .16, .1, 10), L.gomma, 0, -.7, -4.3, 0, 0, Math.PI / 2); add(r, new THREE.CylinderGeometry(.07, .07, .12, 8), L.metallo); void gamba; }
  // Antenna
  add(body, new THREE.CylinderGeometry(.025, .035, .9, 5), L.metallo, 0, 1.25, -1.5);
  let m = 0;
  return { id: 'aereo', group, body, prop, update(dt, st){
    m += dt; const v = Math.abs(st.speed || 0);
    prop.rotation.z += dt * (8 + v * 1.2);
    disco.material.opacity = Math.min(.22, v * .004);
    body.rotation.set(-(st.pitch || 0), 0, -(st.roll || 0));
    sciarpa.rotation.x = .1 + Math.sin(m * 16) * .15 * Math.min(1, v / 40); sciarpa.scale.z = .6 + Math.min(1, v / 50);
  } };
};
})();
