/* GIOCO SEMPLICE — un solo obiettivo: PRENDI I TERRENI PE' O PAESE TUO.
   - In alto, al posto de scoperta/lire/cuori/cassone: «🌰 Fabrica 12 terreni · 2° · Canepina 14 1°».
   - A freccia porta sempre a o terreno più vicino che nun è vostro; quanno o prendi, passa a o prossimo.
     Se scegli tu un'altra meta (mappa, un gioco), a freccia è tua finché nun ci arrivi.
   - Via missioni automatiche, lavoro de o giorno, primo minuto, compito «raccogli 10 nocciole», bottone de o podere sui campi.
   - I mezzi se sbloccano prendendo terreni: 2 → Ape, 6 → trattore (o cassone nun se riempie più: app.js Pi()).
   Esterno: TG.Terre (lista, padrone, terraIn, colore), TG.debug (car, setDest, NAV, setVehicle), TG.Contadino, TG.Profile, TG.msg. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const oggi = () => new Date().toISOString().slice(0, 10);
// i moduli «de o giorno» restano zitti
ls.set('tg-lavoro-visto', oggi()); ls.set('tg-torna-visto', oggi()); if (!ls.get('tg-primo-minuto')) ls.set('tg-primo-minuto', '1');
const st = document.createElement('style'); st.textContent = `
html body #hud .where>#score#score,html body.touch #hud .where>#score#score,html body.phoneBox .where #score#score{display:flex!important}
#score>*:not(#trTop){display:none!important}
#score{padding:6px 12px!important}
#trTop{display:flex;align-items:center;gap:7px;overflow:hidden;max-width:62vw;font:800 14px/1.2 Figtree,"Segoe UI",system-ui,sans-serif;color:#f3e7cb;white-space:nowrap}
#trTop i{display:inline-block;width:10px;height:10px;border-radius:50%}
#trTop .alt{color:#c9bfa8;font-weight:700}
#primi,#hOra,#hGoal,#hCal,#ngHud,#pmHud,#pmRiga,#done{display:none!important}
html.tg-campo #prompt{display:none!important}
#mission .tg-label{font-size:0!important}#mission .tg-label::after{content:"🔥 Terreno acceso";font-size:11px}
#mChange{display:none!important}`;
document.head.appendChild(st);
const paese = () => { const p = (TG.PrimoMinuto && TG.PrimoMinuto.paese) || ls.get('tg-paese-dev'); return p && p !== 'nessuno' ? p : null; };
const corto = p => { let n = p; try { n = (TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p; } catch(e){} return (n || '').replace(/ (di|in|sul|al|nel) .*$/i, ''); };
const breve = n => (n || '').replace(/^(Il|I|La|Le|Lo) /, '');

/* ---------- in alto: quanti terreni tiene o paese tuo ---------- */
function conta(){ const W = TG.Terre, t = {}; if (!W) return t; for (const T of W.lista()) { const p = W.padrone(T.id); if (p) t[p] = (t[p] || 0) + 1; } return t; }
function alto(){
  const sc = document.getElementById('score'); if (!sc || !TG.Terre) return;
  let el = document.getElementById('trTop'); if (!el) { el = document.createElement('div'); el.id = 'trTop'; sc.appendChild(el); }
  const t = conta(), p = paese(), cl = Object.entries(t).sort((a, b) => b[1] - a[1]), mio = t[p] || 0, pos = cl.findIndex(r => r[0] === p) + 1, tot = TG.Terre.lista().length;
  const capo = cl[0] && cl[0][0] !== p ? cl[0] : (cl[1] || null);
  el.innerHTML = p ? `<span>🌰 <i style="background:${TG.Terre.colore(p)}"></i> ${corto(p)} <b>${mio}</b></span>` + (pos ? `<span class="alt">${pos}°</span>` : '') + (capo ? `<span class="alt">· ${corto(capo[0])} ${capo[1]}</span>` : '') : `🌰 ${tot} terreni da prende`;
}

/* ---------- a freccia: o prossimo terreno da prende ---------- */
let mia = null, partito = false;
function prossimo(){
  const D = TG.debug, W = TG.Terre; if (!D || !W || !D.car || !document.body.classList.contains('playing')) return;
  const p = paese(); if (!p) return;
  const c = D.car, dentro = W.terraIn(c.x, c.z);
  document.documentElement.classList.toggle('tg-campo', !!dentro);
  const N = D.NAV || {}, dest = N.dest;
  if (dest && dest !== mia && partito) { if (Math.hypot(dest.x - c.x, dest.z - c.z) > 60) return; }   // meta scelta da te: rispettata finché nun ci arrivi
  if (dentro && W.padrone(dentro.id) !== p) { if (mia && mia.id === dentro.id) return; }        // stai a raccoje: lascia stare
  if (mia && W.padrone(mia.id) !== p && dest === mia) return;                                     // ancora da prende
  let best = null, bd = 1e9;
  for (const T of W.lista()) { if (W.padrone(T.id) === p || (W.acceso && !W.acceso(T.id))) continue; const d = Math.hypot(T.x - c.x, T.z - c.z) - T.rad; if (d < bd) { bd = d; best = T; } }
  if (!best) return;
  mia = { x: best.x, z: best.z, name: breve(best.nome), id: best.id };
  try { D.setDest(mia); mia = (D.NAV && D.NAV.dest) || mia; mia.id = best.id; } catch(e){}
  partito = true;
}

/* ---------- i mezzi se sbloccano prendendo terreni ---------- */
const SOGLIE = [[2, 'ape', "L'Ape: più veloce e più stabile"], [6, 'trattore', 'O trattore: passa ovunque tra i filari']];
function sblocca(tot){
  try { const L = TG.Contadino.stato(TG.Profile.data); for (const [n, id, cosa] of SOGLIE) if (tot >= n && !L.mezzi[id]) { L.mezzi[id] = Date.now(); TG.Profile.salva && TG.Profile.salva(); setTimeout(() => { try { TG.msg('🚜 Mezzo nuovo!', cosa + ` (${n} terreni presi)`, 4); TG.debug.setVehicle && TG.debug.setVehicle(id); } catch(e){} }, 5600); } } catch(e){}
}
addEventListener('tg-presa', e => { sblocca(e.detail.tot); setTimeout(prossimo, 6000); });

function avvia(){
  if (!TG.Terre || !TG.debug || !TG.debug.car) return setTimeout(avvia, 1000);
  sblocca(+(ls.get('tg-presi') || 0));
  setInterval(alto, 1500); setInterval(prossimo, 2500); alto();
  // a battaglia de o giorno: detta una volta, quando se comincia a giocà
  const dici = () => { try { const b = TG.Terre.battaglia(), T = b && TG.Terre.lista().find(x => x.id === b); if (!T || ls.get('tg-battaglia-detta') === oggi() + b) return; if (!document.body.classList.contains('playing')) return setTimeout(dici, 3000); ls.set('tg-battaglia-detta', oggi() + b); setTimeout(() => TG.msg('⚔ Battaglia de oggi', breve(T.nome) + ': ogni nocchia vale doppio', 5), 8000); } catch(e){} };
  setTimeout(dici, 4000);
}
TG.Semplice = { prossimo, alto };
if (document.readyState === 'complete') setTimeout(avvia, 2000); else addEventListener('load', () => setTimeout(avvia, 2000));
})();
