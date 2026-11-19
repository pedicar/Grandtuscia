/* DE CHI È O CAMPO — se deve vedé a occhio, senza leggere.
   1) Bandiere ner mondo: ogni campo che ha un padrone c'ha 12 bandierine co' o colore de o paese lungo o bordo
      e na bandiera grande in mezzo. I campi liberi nun c'hanno bandiere. Tutto in due InstancedMesh (pali e teli),
      così 160 campi pesano come du' oggetti soli anche sur telefono.
   2) Quanno stai dentro un campo, sotto a barra in alto na striscia piccola: «🚩 Podere · de Carbognano · 350 🌰»,
      «✅ Podere · è vostro», «🌱 Podere · libero · 100 🌰». Nun se tocca, nun copre.
   Usa TG.Terre (lista, padrone, colore, costo, paeseMio, terraIn), TG.debug (scene, world, car). */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const BORDO = 12, MAX = 260 * (BORDO + 1);
let pali = null, teli = null, firma = '';
const corto = p => { try { return ((TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p).replace(/ (di|in|sul|al|nel) .*$/i, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); } catch(e){ return p; } };
const breve = n => String(n || '').replace(/^(Il|Lo|La|I|Gli|Le|L')\s*/i, '').slice(0, 28);
const mila = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function crea(){
  const D = TG.debug; if (!D || !D.scene || !D.world) return false;
  const col = h => { const c = new THREE.Color(h); try { c.convertSRGBToLinear(); } catch(e){} return c; };
  const gP = new THREE.CylinderGeometry(.12, .15, 1, 5); gP.translate(0, .5, 0);
  const gT = new THREE.BoxGeometry(.06, .62, 1); gT.translate(0, 0, .5);   // telo: se allunga verso +z da o palo
  pali = new THREE.InstancedMesh(gP, new THREE.MeshLambertMaterial({ color: col('#e9e2d0') }), MAX);
  teli = new THREE.InstancedMesh(gT, new THREE.MeshLambertMaterial({ color: 0xffffff }), MAX);
  for (const m of [pali, teli]) { m.count = 0; m.frustumCulled = false; m.castShadow = false; D.scene.add(m); }
  teli.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
  return true;
}
function rifai(){
  const W = TG.Terre, D = TG.debug; if (!W || !W.lista || !D || !D.world) return;
  if (!pali && !crea()) return;
  const L = W.lista(), chi = L.map(t => t.x == null ? '' : (W.padrone(t.id) || ''));
  const f = chi.join('|'); if (f === firma) return; firma = f;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
  let n = 0;
  const metti = (x, z, h, larg, ang, c) => {
    if (n >= MAX) return; const y = D.world.ground(x, z) - .2;
    Q.setFromAxisAngle(Y, ang); P.set(x, y, z); S.set(1, h, 1); M.compose(P, Q, S); pali.setMatrixAt(n, M);
    P.set(x, y + h - .35 * (larg / 1.6), z); S.set(1, larg / 1.6, larg); M.compose(P, Q, S); teli.setMatrixAt(n, M);
    C.set(c); try { C.convertSRGBToLinear(); } catch(e){} teli.setColorAt(n, C); n++;
  };
  L.forEach((t, i) => { const p = chi[i]; if (!p) return; const c = W.colore(p) || '#f2c74e', r = Math.min(150, (t.rad || 80) * .82);
    for (let k = 0; k < BORDO; k++) { const a = k / BORDO * Math.PI * 2; metti(t.x + Math.cos(a) * r, t.z + Math.sin(a) * r, 7, 3.2, a + Math.PI / 2, c); }
    metti(t.x, t.z, 18, 8, (i * 1.7) % 6.28, c); });
  pali.count = teli.count = n; pali.instanceMatrix.needsUpdate = teli.instanceMatrix.needsUpdate = true; teli.instanceColor.needsUpdate = true;
}

/* ---------- a striscia quanno stai dentro ---------- */
const css = document.createElement('style'); css.textContent = `
#campoPill{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 104px);z-index:40;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 24px);padding:6px 14px 6px 8px;border-radius:999px;background:rgba(14,18,16,.78);color:#f3e7cb;font:800 15px/1.2 Figtree,system-ui,sans-serif;white-space:nowrap;pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,.25)}
#campoPill i{flex:none;width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.7)}#campoPill span{overflow:hidden;text-overflow:ellipsis}#campoPill b{font-weight:900}
#campoPill[hidden],body:not(.playing) #campoPill,body.flying #campoPill,body:has(#trFesta) #campoPill,body:has(#vehOv:not([hidden])) #campoPill,body:has(#skOv:not([hidden])) #campoPill{display:none!important}`;
document.head.appendChild(css);
let pill = null, ultimo = '';
function striscia(){
  const W = TG.Terre, D = TG.debug; if (!W || !W.terraIn || !D || !D.car) return;
  if (!pill) { pill = document.createElement('div'); pill.id = 'campoPill'; pill.hidden = true; document.body.appendChild(pill); }
  const T = W.terraIn(D.car.x, D.car.z); if (!T) { pill.hidden = true; ultimo = ''; return; }
  const p = W.padrone(T.id), mio = W.paeseMio && W.paeseMio(), c = p ? W.colore(p) : 'transparent';
  const h = !p ? `<i style="border-style:dashed"></i><span>🌱 ${breve(T.nome)} · <b>libero</b> · ${mila(W.costo(T.id))} 🌰</span>`
    : p === mio ? `<i style="background:${c}"></i><span>✅ ${breve(T.nome)} · <b>è vostro</b></span>`
    : `<i style="background:${c}"></i><span>🚩 ${breve(T.nome)} · de <b style="color:${c}">${corto(p)}</b> · ${mila(W.costo(T.id))} 🌰</span>`;
  if (h !== ultimo) { ultimo = h; pill.innerHTML = h; } pill.hidden = false;
}
function avvia(){ if (!TG.Terre || !TG.debug || !TG.debug.scene) return setTimeout(avvia, 1000); setInterval(rifai, 2000); setInterval(striscia, 400); rifai(); }
avvia();
TG.Bandiere = { rifai: () => { firma = ''; rifai(); } };
})();
