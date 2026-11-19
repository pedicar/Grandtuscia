/* MEZZI DA SCOPRÌ — i vecchi giochi a parte (VicoVolo, VicoSail, CiminoDH, Corse a Vuoto, Carrettini) mo' stanno dentro o mondo:
   o mezzo sta parcheggiato ne o posto suo, co' na colonna de luce sopra. Ce passi vicino e l'hai scoperto: da allora sta ne o garage.
   Nun so' regali: se trovano girando. Ne o garage, quelli ancora da trovà c'hanno l'indizio e «Portamece» (te lascia a 35 m).
   Usa TG.debug (scene, world, car, setVehicle, vola), TG.GEO, TG.Veicoli, TG.Contadino/TG.Profile (mezzi), TG.Consigli.porta, TG.msg, TG.Stats.
   Letto da tg-cassone.js (bottega). */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ev = (t, c) => { try { TG.Stats && TG.Stats.ev(t, c || ''); } catch(e){} };
const LISTA = [
  { id: 'deltaplano', prezzo: 700, art: 'o', nome: 'Deltaplano', ico: '🪂', vola: 'Vola', cosa: 'Parti da o decollo e plani sopra o Lago de Vico', indizio: 'Sopra o Lago de Vico, su a rampa de o decollo', luogo: 'o decollo de o Lago de Vico',
    dove: G => G.RAMPA && { x: G.RAMPA.x, z: G.RAMPA.z, mx: G.RAMPA.x, mz: G.RAMPA.z } },
  { id: 'barca', prezzo: 1000, art: 'a', nome: 'Barca a vela', ico: '⛵', vola: 'Salpa', cosa: 'Navighi sul Lago de Vico, a vela va da sola', indizio: 'A o pontile de a Punta de o Lago de Vico', luogo: 'o pontile de o Lago de Vico',
    dove: G => G.PONTILE && G.PONTILE_BASE && { x: G.PONTILE_BASE.x, z: G.PONTILE_BASE.z, mx: G.PONTILE.x, mz: G.PONTILE.z, acqua: 1 } },
  { id: 'bici', prezzo: 200, art: 'a', nome: 'Mountain bike', ico: '🚵', cosa: 'Leggera, sale e scende pe\' i boschi', indizio: 'Su o Monte Cimino, ne a faggeta', luogo: 'a faggeta de o Monte Cimino',
    dove: G => G.CIM && { x: G.CIM.x + 40, z: G.CIM.z + 110 } },
  { id: 'cavallo', prezzo: 600, art: 'o', nome: 'Cavallo', ico: '🐎', cosa: 'Galoppa dappertutto', indizio: 'A Ronciglione, dove parte a corsa de i cavalli', luogo: 'Ronciglione',
    dove: G => G.CORSE && { x: G.CORSE.x, z: G.CORSE.z } },
  { id: 'carrettino', prezzo: 50, art: 'o', nome: 'Carrettino', ico: '🛷', cosa: 'De legno, come a a corsa de Fabrica', indizio: 'A Fabrica, in cima a via Roma', luogo: 'via Roma a Fabrica',
    dove: G => G.RAPIDA && { x: G.RAPIDA.x + 16, z: G.RAPIDA.z + 20 } }
];
const D = () => TG.debug;
const st = () => { try { const s = TG.Contadino.stato(TG.Profile.data); s.mezzi = s.mezzi || {}; return s; } catch(e){ return null; } };
const preso = id => { const s = st(); return !!(s && s.mezzi[id]); };
// trovato = l'hai visto (se pò comprà); preso = l'hai comprato (o trovato prima de o 20/11, quando era gratis)
const trovati = () => { const s = st(); if (!s) return {}; s.trovati = s.trovati || {}; return s.trovati; };
const trovato = id => preso(id) || !!trovati()[id];
const posto = m => { try { return m.dove(TG.GEO || {}); } catch(e){ return null; } };
const colonne = {};
function metti(){
  const T = D(); if (!T || !T.scene || !T.world || !TG.Veicoli || !TG.GEO) return setTimeout(metti, 1000);
  for (const m of LISTA) {
    const p = posto(m); if (!p || !TG.Veicoli[m.id]) continue;
    const mx = p.mx != null ? p.mx : p.x + 6, mz = p.mz != null ? p.mz : p.z + 6;
    const y = p.acqua ? .25 : T.world.ground(mx, mz);
    try { const v = TG.Veicoli[m.id](T.world.col); v.group.position.set(mx, y, mz); v.group.rotation.y = Math.atan2(p.x - mx, p.z - mz) + Math.PI; v.group.scale.setScalar(1.25); v.update && v.update(.016, { speed: 0, steer: 0 }); T.scene.add(v.group); } catch(e){}
    const c = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 70, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd65a, transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide }));
    c.position.set(mx, y + 35, mz); c.visible = !trovato(m.id); T.scene.add(c); colonne[m.id] = c;
  }
  setInterval(guarda, 500);
}
let aperto = false;
function guarda(){
  const T = D(); if (!T || !T.car || aperto) return;
  const c = T.car, s = st(); if (!s) return;
  for (const m of LISTA) {
    if (trovato(m.id)) { if (colonne[m.id]) colonne[m.id].visible = false; continue; }
    const p = posto(m); if (!p) continue;
    if (Math.hypot(c.x - p.x, c.z - p.z) < 22) { trovatoOra(m); break; }
  }
}
function trovatoOra(m){
  trovati()[m.id] = Date.now(); try { TG.Profile.salva(); } catch(e){}
  if (colonne[m.id]) colonne[m.id].visible = false;
  ev('scoperta_mezzo', m.id); aperto = true;
  let premio = 0; try { premio = TG.Cassone ? TG.Cassone.aggiungi(20, true) : 0; } catch(e){}   // chi gira aiuta o paese: 20 nocchie pe' ogni scoperta
  const nn = TG.Cassone ? TG.Cassone.n : 0, puo = nn >= m.prezzo;
  const o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;z-index:96;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,14,13,.72);font-family:Figtree,system-ui,sans-serif;color:#f3e7cb';
  o.innerHTML = `<div style="width:min(380px,100%);padding:20px 18px 16px;border-radius:22px;background:#1b2423;border:2px solid rgba(242,199,78,.6);text-align:center">
    <div style="font-size:54px;line-height:1">${m.ico}</div><div style="font:900 14px Figtree,sans-serif;letter-spacing:.12em;color:#f2c74e;margin-top:8px">🔍 SCOPERTA!</div>
    <h2 style="margin:4px 0 6px;font:900 26px/1.15 Figtree,sans-serif">Hai trovato ${m.art} ${m.nome}</h2>
    <p style="margin:0 0 14px;font:700 16px/1.35 Figtree,sans-serif;color:#c9bfa8">${m.cosa}.</p>${premio ? `<p style="margin:-6px 0 12px;font:900 17px Figtree,sans-serif;color:#f2c74e">🎁 +${premio} 🌰 pe' a scoperta</p>` : ''}
    ${puo ? `<button data-si style="display:block;width:100%;padding:15px;border:0;border-radius:16px;background:#f2c74e;color:#1b2423;font:900 19px Figtree,sans-serif">COMPRALO · ${String(m.prezzo).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} 🌰</button>` : `<p style="margin:0 0 4px;font:800 17px/1.35 Figtree,sans-serif">Costa ${String(m.prezzo).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} 🌰: te ne mancano ${String((m.prezzo - nn)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}.<br><span style="color:#c9bfa8;font-weight:700">Quanno ce l'hai, compralo da MENU → Cambia mezzo</span></p>`}
    <button data-no style="display:block;width:100%;margin-top:8px;padding:12px;border:0;border-radius:14px;background:transparent;color:#c9bfa8;font:800 16px Figtree,sans-serif">${puo ? 'Dopo' : 'OK'}</button></div>`;
  document.body.appendChild(o);
  const chiudi = () => { o.remove(); setTimeout(() => { aperto = false; }, 1500); };
  o.querySelector('[data-no]').onclick = () => { chiudi(); ev('scoperta_dopo', m.id); };
  const si = o.querySelector('[data-si]'); if (si) si.onclick = () => { chiudi(); if (TG.Cassone.compraMezzo(m.id)) ev('scoperta_compra', m.id); };
}
function usa(id){
  const T = D(); if (!T) return; const m = LISTA.find(x => x.id === id);
  setTimeout(() => { try { if (m && m.vola) T.vola(id); else T.setVehicle(id); } catch(e){} }, 250);
}
function portami(id){
  const m = LISTA.find(x => x.id === id), p = m && posto(m), T = D(); if (!p || !T || !T.car) return;
  const c = T.car, dx = c.x - p.x, dz = c.z - p.z, L = Math.hypot(dx, dz) || 1;
  let x = p.x + dx / L * 35, z = p.z + dz / L * 35;
  try { if (T.world.isWater && T.world.isWater(x, z)) { x = p.x; z = p.z; } } catch(e){}
  if (TG.Consigli && TG.Consigli.porta) TG.Consigli.porta(x, z, m.luogo); else try { T.placeCar(x, z, Math.atan2(p.x - x, p.z - z)); } catch(e){}
  ev('scoperta_portami', id);
}
TG.Scoperte = { LISTA, preso, trovato, usa, portami, scopri: id => { const m = LISTA.find(x => x.id === id); m && !trovato(id) && trovatoOra(m); } };
metti();
})();
