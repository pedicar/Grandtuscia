/* TRAMPOLINI — posti fatti apposta pe' saltà e fà i trick (valgono nocchie: tg-trick.js).
   5 parchi ne i posti larghi de a mappa, ognuno co' 3 trampolini de legno (piccolo, medio, grosso) in fila e un cartello «🤸 SALTI».
   Ce passi sopra in avanti: o mezzo sale su a rampa e, a o bordo, decolla (più vai forte, più voli). Co' a moto voli ancora de più.
   O mondo nun sa che ce stanno (nun so' terreno): l'altezza e a spinta se danno qui, ogni frame, a TG.debug.car.
   Usa TG.debug (car, scene, world), TG.GEO, TG.msg, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ev = (t, c) => { try { TG.Stats && TG.Stats.ev(t, c || ''); } catch(e){} };
const PARCHI = [
  { nome: 'Salti de o Podere', dove: G => G.PODERE && { x: G.PODERE.x + 70, z: G.PODERE.z + 45 }, ang: .4 },
  { nome: 'Salti de e Pantanacce', dove: G => G.PANT && { x: G.PANT.x, z: G.PANT.z }, ang: 1.2 },
  { nome: 'Salti de o Pianoro de Falerii', dove: G => G.FALERII && { x: G.FALERII.x + 90, z: G.FALERII.z + 60 }, ang: 2.1 },
  { nome: 'Salti de a Punta de o Lago', dove: G => G.PUNTA && { x: G.PUNTA.x - 40, z: G.PUNTA.z + 30 }, ang: -.6 },
  { nome: 'Salti de o Cimino', dove: G => G.CIM && { x: G.CIM.x + 60, z: G.CIM.z + 140 }, ang: 2.8 }
];
const MISURE = [{ L: 6, W: 4, H: 1.2 }, { L: 8, W: 4.4, H: 2.2 }, { L: 10, W: 5, H: 3.4 }];
const rampe = [];

// na rampa: (cx,cz) = o centro, ang = verso dove se salta, M = { L, W, H }, parco = nome (pe' l'avviso)
let MAT = null;
function aggiungi(cx, cz, ang, M, parco){
  const D = TG.debug; if (!D || !D.scene || !D.world) return null;
  if (!MAT) { const col = h => { const c = new THREE.Color(h); try { c.convertSRGBToLinear(); } catch(e){} return c; };
    MAT = { legno: new THREE.MeshLambertMaterial({ color: col('#b48650'), flatShading: true }), scuro: new THREE.MeshLambertMaterial({ color: col('#7a5634'), flatShading: true }), ara: new THREE.MeshLambertMaterial({ color: col('#f0652b') }), bia: new THREE.MeshLambertMaterial({ color: col('#f6f1e1') }) }; }
  const { legno, scuro, ara, bia } = MAT;
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang);
  const x0 = cx - fx * M.L / 2, z0 = cz - fz * M.L / 2, y0 = D.world.ground(cx, cz);
  const g = new THREE.Group(); g.position.set(x0, y0, z0); g.rotation.y = ang;
  const sh = new THREE.Shape(); sh.moveTo(0, -.3); sh.lineTo(M.L, -.3); sh.lineTo(M.L, M.H); sh.quadraticCurveTo(M.L * .45, M.H * .2, 0, 0); sh.closePath();
  const ge = new THREE.ExtrudeGeometry(sh, { depth: M.W, bevelEnabled: false, curveSegments: 6 }); ge.rotateY(-Math.PI / 2); ge.translate(M.W / 2, 0, 0);
  const m = new THREE.Mesh(ge, legno); m.castShadow = m.receiveShadow = true; g.add(m);
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.18, M.H * .9, .18), scuro); b.position.set((k % 2 ? 1 : -1) * (M.W / 2 - .2), M.H * .45 - .3, M.L * (.55 + k * .1)); g.add(b); }
  for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(M.W / 4, .08, .5), k % 2 ? bia : ara); s.position.set(-M.W / 2 + M.W / 8 + k * M.W / 4, M.H + .02, M.L - .25); g.add(s); }
  D.scene.add(g);
  const R = { x0, z0, fx, fz, sx, sz, L: M.L, W: M.W, H: M.H, parco }; rampe.push(R); return R;
}
let pronto = false, visti = {};
try { visti = JSON.parse(localStorage.getItem('tg-rampe-viste') || '{}') || {}; } catch(e){}
function costruisci(){
  const D = TG.debug, G = TG.GEO; if (!D || !D.scene || !D.world || !G) return setTimeout(costruisci, 1000);
  for (const P of PARCHI) {
    const c = P.dove(G); if (!c) continue;
    try { if (D.world.isWater && D.world.isWater(c.x, c.z)) continue; } catch(e){}
    const fx = Math.sin(P.ang), fz = Math.cos(P.ang), sx = Math.cos(P.ang), sz = -Math.sin(P.ang);
    MISURE.forEach((M, i) => { const off = (i - 1) * 9; aggiungi(c.x + sx * off, c.z + sz * off, P.ang, M, P.nome); });
    // cartello
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d');
    x.fillStyle = 'rgba(16,22,21,.85)'; x.beginPath(); x.roundRect(6, 6, 500, 116, 28); x.fill(); x.fillStyle = '#f0652b'; x.beginPath(); x.roundRect(6, 6, 30, 116, [28, 0, 0, 28]); x.fill();
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f3e7cb'; x.font = '900 52px Figtree, system-ui, sans-serif'; x.fillText('🤸 SALTI', 270, 50); x.font = '700 26px Figtree, system-ui, sans-serif'; x.fillStyle = '#c9bfa8'; x.fillText('salti e trick valgono 🌰', 270, 96);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })); sp.scale.set(16, 4, 1); sp.position.set(c.x - fx * 12, D.world.ground(c.x, c.z) + 14, c.z - fz * 12); D.scene.add(sp);
  }
  pronto = true;
}
let tPrima = performance.now();
function giro(){
  requestAnimationFrame(giro);
  const ora = performance.now(), dt = Math.min(.1, (ora - tPrima) / 1000); tPrima = ora;
  if (!pronto || !document.body.classList.contains('playing') || document.body.classList.contains('flying')) return;
  const D = TG.debug, c = D && D.car; if (!c) return;
  for (const R of rampe) {
    const dx = c.x - R.x0, dz = c.z - R.z0, lz = dx * R.fx + dz * R.fz, lx = dx * R.sx + dz * R.sz;
    if (lz < -30 || lz > R.L + 30 || Math.abs(lx) > 30) continue;
    if (!visti[R.parco] && lz > -25 && lz < R.L + 25) { visti[R.parco] = 1; try { localStorage.setItem('tg-rampe-viste', JSON.stringify(visti)); } catch(e){} try { TG.msg('🤸 ' + R.parco + '!', 'Saltace sopra: salti e trick valgono nocchie (co\' a moto de più)', 4); } catch(e){} ev('rampe_viste', R.parco); }
    if (lz < 0 || lz > R.L || Math.abs(lx) > R.W / 2) continue;
    const avanti = (c.speed || 0) * (Math.sin(c.yaw) * R.fx + Math.cos(c.yaw) * R.fz);   // velocità lungo a rampa
    if (avanti < 3) continue;
    const u = lz / R.L, h = R.H * (u * u * .45 + u * .55);   // profilo curvo come o modello
    const g = D.world.ground(c.x, c.z), base = D.world.ground(R.x0 + R.fx * R.L / 2, R.z0 + R.fz * R.L / 2);
    const sopra = Math.max(g, base) + h;
    if (c.y < sopra) { c.y = sopra; if (c.vy < 0) c.vy = 0; }
    if (u > .86) { const spinta = Math.min(26, avanti * .42 + R.H * 1.6); if (c.vy < spinta) { c.vy = spinta; ev('rampa', R.parco); } }
  }
}

/* SFOLTISCI — tolie da a vista (scala 0) l'erba, i sassi e i cespi che spuntano su na pista, e alberi e chiome troppo vicini
   (che coprono a telecamera), e sposta via i loro ostacoli. punti = [{x,z}], vic = raggio pe' tutto, chi = raggio pe' alberi.
   Riprova ogni 5 s (o mondo pò ricostruì pezzi). */
const SF = [];
function sfoltisci(punti, vic, chi){ SF.push({ punti, vic, chi, cell: null }); passaSF(); }
const fatti = new WeakMap();
function passaSF(){
  const D = TG.debug; if (!D || !D.scene || !SF.length) return;
  const M = new THREE.Matrix4(), v = new THREE.Vector3(), QQ = new THREE.Quaternion(), SS = new THREE.Vector3(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const S of SF) if (!S.cell) { S.cell = new Map(); for (const p of S.punti) { const k = Math.floor(p.x / 20) + ',' + Math.floor(p.z / 20); let a = S.cell.get(k); if (!a) S.cell.set(k, a = []); a.push(p); } }
  const dist = (S, x, z) => { let b = 1e9; const cx = Math.floor(x / 20), cz = Math.floor(z / 20); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = S.cell.get((cx + i) + ',' + (cz + j)); if (a) for (const p of a) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < b) b = d; } } return Math.sqrt(b); };
  D.scene.updateMatrixWorld();
  D.scene.traverse(o => {
    if (!o.isInstancedMesh || o.userData.tgMio || !o.count) return;
    const firma = o.count + ':' + o.id; if (fatti.get(o) === firma) return; fatti.set(o, firma);
    const g = o.geometry.type, albG = /Icosahedron|Dodecahedron/.test(g) || /^(25140a|1a0d07|524d40|020401)$/.test(o.material && o.material.color ? o.material.color.getHexString() : '');
    let cambiato = false;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); M.decompose(v, QQ, SS); const alb = albG || Math.max(SS.x, SS.y, SS.z) > 2.5; v.applyMatrix4(o.matrixWorld);   // alberi: chiome, tronchi e ombre (e tutto quello che è grosso)
      for (const S of SF) { const d = dist(S, v.x, v.z); if (d < S.vic || (alb && d < S.chi)) { o.setMatrixAt(i, Z); cambiato = true; break; } } }
    if (cambiato) o.instanceMatrix.needsUpdate = true;
  });
  // ostacoli de i alberi tolti: via lontano
  try { const E = D.world; for (const S of SF) for (let k = 0; k < S.punti.length; k += 3) { const p = S.punti[k]; for (const r of E.collidersNear(p.x, p.z)) if (r.x < 1e8 && Math.hypot(r.x - p.x, r.z - p.z) < S.chi) { r.x = 1e9; r.z = 1e9; } } } catch(e){}
}
setInterval(passaSF, 5000);
costruisci(); requestAnimationFrame(giro);
TG.Rampe = { lista: () => rampe, PARCHI, aggiungi, sfoltisci, visti: k => { visti[k] = 1; } };
})();
