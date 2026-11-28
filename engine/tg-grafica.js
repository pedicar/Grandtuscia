/* GRAFICA PIÙ BELLA (28/11) — stesso stile low poly, ma più «cartolina». Tutto leggero pe' i telefoni.
   1) LAGO: l'acqua riflette er cielo quanno a guardi de sbieco (effetto Fresnel), più scura e profonda in mezzo,
      e un luccichio de sole che se move. Se attacca a o materiale de l'acqua de tg-world.js (onBeforeCompile).
   2) POLVERE: dietro a o mezzo, quanno corri su a terra o su o prato, se alza un po' de polvere (un solo Points, 160 granelli).
   3) VIGNETTA: i bordi de lo schermo appena più scuri, come na foto (un div co' un gradiente, costa zero).
   Si er telefono è debole (TG.debug.world.MOBILE e pochi core) a polvere usa la metà de i granelli.
   Usa TG.debug (scene, world, car, VEH, renderer). */
(function(){
'use strict';
const TG = window.TG = window.TG || {};

/* ---------- 3) vignetta ---------- */
const css = document.createElement('style');
css.textContent = `#tgVign{position:fixed;inset:0;pointer-events:none;z-index:1;background:radial-gradient(ellipse 75% 70% at 50% 46%,rgba(0,0,0,0) 62%,rgba(10,8,4,.28) 100%)}body:not(.playing) #tgVign{display:none}`;
document.head.appendChild(css);
const vign = document.createElement('div'); vign.id = 'tgVign'; document.body.appendChild(vign);

/* ---------- 1) lago ---------- */
let acqua = null;
function lago(){
  const D = TG.debug; if (!D || !D.scene) return false;
  D.scene.traverse(o => { const m = o.material; if (acqua || !o.isMesh || !m || m.type !== 'MeshPhongMaterial' || !m.transparent || !m.flatShading || !m.onBeforeCompile || Math.abs(m.opacity - .93) > .03) return; acqua = o; });
  if (!acqua) return false;
  const m = acqua.material, orig = m.onBeforeCompile;
  if (m.userData.tgGrafica) return true; m.userData.tgGrafica = 1;
  const cielo = { value: new THREE.Color(0xbcd4e6) }, tempo = { value: 0 };
  m.userData.tgCielo = cielo; m.userData.tgTempo = tempo;
  m.onBeforeCompile = function(sh, r){
    if (orig) orig.call(this, sh, r);
    sh.uniforms.uCielo = cielo; sh.uniforms.uTg = tempo;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTgW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTgW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uCielo; uniform float uTg; varying vec3 vTgW;')
      .replace('#include <dithering_fragment>', `
  {
    vec3 vv = normalize(vViewPosition);
    float fr = pow(1.0 - clamp(abs(dot(vv, normalize(normal))), 0.0, 1.0), 3.0);
    // più lontano = più cielo (a riva opposta riflessa), più vicino = più profondo
    float lon = clamp(length(vViewPosition) / 900.0, 0.0, 1.0);
    vec3 fondo = gl_FragColor.rgb * vec3(0.62, 0.8, 0.95);
    gl_FragColor.rgb = mix(mix(fondo, gl_FragColor.rgb, 0.35 + 0.65 * lon), uCielo, clamp(fr * 0.45 + lon * 0.12, 0.0, 0.5));
    // luccichio: piccole scintille che se moveno
    float s = sin(vTgW.x * 0.71 + uTg * 1.7) * sin(vTgW.z * 0.63 - uTg * 1.3) * sin((vTgW.x + vTgW.z) * 0.29 + uTg);
    gl_FragColor.rgb += vec3(1.0, 0.95, 0.82) * smoothstep(0.9, 0.995, s) * 0.3 * (1.0 - lon * 0.6);
  }
  #include <dithering_fragment>`);
  };
  m.needsUpdate = true;
  return true;
}
function coloreCielo(){
  const D = TG.debug, m = acqua && acqua.material; if (!m || !m.userData.tgCielo) return;
  const f = D.scene.fog && D.scene.fog.color; if (f) m.userData.tgCielo.value.copy(f).lerp(new THREE.Color(0x9fc2dc), .35);
  m.userData.tgTempo.value = performance.now() / 1000;
}

/* ---------- 2) polvere ---------- */
let pol = null;
function polvere(){
  const D = TG.debug; if (!D || !D.scene || pol) return;
  const debole = (D.world && D.world.MOBILE) && (navigator.hardwareConcurrency || 4) <= 4;
  const N = debole ? 80 : 160, pos = new Float32Array(N * 3), vita = new Float32Array(N), dim = new Float32Array(N);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aVita', new THREE.BufferAttribute(vita, 1)); g.setAttribute('aDim', new THREE.BufferAttribute(dim, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: Object.assign({ uCol: { value: new THREE.Color(0xd8c39a) }, uScala: { value: 300 } }, THREE.UniformsLib.fog),
    vertexShader: `attribute float aVita; attribute float aDim; varying float vA; uniform float uScala;
      #include <fog_pars_vertex>
      void main(){ vA = aVita; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aDim * (1.0 + (1.0 - aVita) * 1.6) * uScala / max(1.0, -mvPosition.z);
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uCol; varying float vA;
      #include <fog_pars_fragment>
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard;
        gl_FragColor = vec4(uCol, vA * 0.55 * (1.0 - d * 4.0));
        #include <fog_fragment>
      }`
  });
  const p = new THREE.Points(g, mat); p.frustumCulled = false; p.renderOrder = 2; D.scene.add(p);
  pol = { p, g, pos, vita, dim, vel: new Float32Array(N * 3), N, k: 0, acc: 0 };
}
const NO = { piedi: 1, aereo: 1, deltaplano: 1, barca: 1, vela: 1 };
function giroPolvere(dt){
  const D = TG.debug, c = D && D.car; if (!pol || !c) return;
  let id = ''; try { id = D.VEH.cur.id; } catch(e){}
  const v = Math.abs(c.speed || 0), E = D.world;
  let su = false; try { su = !NO[id] && !document.body.classList.contains('flying') && v > 6 && !(E.isWater && E.isWater(c.x, c.z)) && Math.abs((c.y || 0) - E.ground(c.x, c.z)) < 1.5; } catch(e){}
  // su l'asfarto meno polvere
  let asf = false; try { const ri = E.roadInfo && E.roadInfo(c.x, c.z); asf = !!(ri && ri.kind === 'asfalto' && ri.d < (ri.w || 4) / 2); } catch(e){}
  if (su) {
    pol.acc += dt * Math.min(60, v * (asf ? 0.8 : 3));
    const yaw = c.yaw || 0, bx = -Math.sin(yaw), bz = -Math.cos(yaw);
    while (pol.acc >= 1) { pol.acc -= 1; const i = pol.k = (pol.k + 1) % pol.N, j = i * 3, l = (Math.random() - .5) * 1.4;
      pol.pos[j] = c.x + bx * 1.6 + bz * l; pol.pos[j + 1] = E.ground(c.x, c.z) + .25; pol.pos[j + 2] = c.z + bz * 1.6 - bx * l;
      pol.vel[j] = bx * v * .08 + (Math.random() - .5) * .8; pol.vel[j + 1] = .6 + Math.random() * .7; pol.vel[j + 2] = bz * v * .08 + (Math.random() - .5) * .8;
      pol.vita[i] = 1; pol.dim[i] = .7 + Math.random() * .8; }
  }
  let vivi = 0;
  for (let i = 0; i < pol.N; i++) { if (pol.vita[i] <= 0) continue; vivi++; const j = i * 3;
    pol.vita[i] = Math.max(0, pol.vita[i] - dt / 1.3); pol.pos[j] += pol.vel[j] * dt; pol.pos[j + 1] += pol.vel[j + 1] * dt; pol.pos[j + 2] += pol.vel[j + 2] * dt;
    pol.vel[j] *= .96; pol.vel[j + 2] *= .96; }
  pol.p.visible = vivi > 0;
  if (vivi) { pol.g.attributes.position.needsUpdate = true; pol.g.attributes.aVita.needsUpdate = true; pol.g.attributes.aDim.needsUpdate = true; }
  // colore de a polvere: più chiara de giorno, più calda ar tramonto (segue a nebbia)
  try { pol.p.material.uniforms.uCol.value.setRGB(.85, .76, .6).lerp(D.scene.fog.color, .25); pol.p.material.uniforms.uScala.value = D.renderer.domElement.height * .55; } catch(e){}
}

let prima = performance.now();
function giro(){
  requestAnimationFrame(giro);
  const ora = performance.now(), dt = Math.min(.1, (ora - prima) / 1000); prima = ora;
  try { coloreCielo(); giroPolvere(dt); } catch(e){}
}
function avvia(){
  const D = TG.debug; if (!window.THREE || !D || !D.scene || !D.world || !D.car) return setTimeout(avvia, 800);
  let n = 0; const prova = () => { if (!lago() && ++n < 20) setTimeout(prova, 1000); }; prova();
  polvere(); requestAnimationFrame(giro);
}
avvia();
TG.Grafica = { acqua: () => acqua, polvere: () => pol };
})();
