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
#mChange{display:none!important}
#trBox{display:none!important}
#obi{position:fixed;z-index:31;left:calc(10px + env(safe-area-inset-left,0px));top:calc(var(--obiTop,112px) + env(safe-area-inset-top,0px));width:min(250px,60vw);padding:8px 11px 9px;border-radius:14px;background:rgba(16,22,21,.86);border:2px solid #ff8a3c;color:#f3e7cb;font:700 13px/1.3 Figtree,"Segoe UI",system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.3);pointer-events:auto;cursor:pointer}
#obi .t{font:900 15px/1.2 Figtree,sans-serif;color:#fff}
#obi .s{margin-top:2px;color:#d9cfb6;font-weight:700}
#obi .b{position:relative;height:9px;border-radius:5px;background:rgba(255,255,255,.15);margin-top:6px;overflow:hidden}#obi .b i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;transition:width .3s}
#obi .r{display:flex;justify-content:space-between;margin-top:3px;font-size:12px;color:#c9bfa8}
body:not(.playing) #obi,body:has(#mapOv:not([hidden])) #obi,body:has(#trOv:not([hidden])) #obi,body:has(#trFesta) #obi{display:none!important}
#tuto{position:fixed;inset:0;z-index:97;display:flex;align-items:center;justify-content:center;background:rgba(8,12,10,.7);padding:18px;font-family:Figtree,"Segoe UI",system-ui,sans-serif}
#tuto .c{width:min(360px,100%);background:#17201f;border:2px solid #ff8a3c;border-radius:20px;padding:18px 18px 14px;color:#f3e7cb}
#tuto h2{margin:0 0 10px;font:900 22px Figtree,sans-serif;color:#fff}#tuto ol{margin:0;padding-left:0;list-style:none;display:grid;gap:10px}#tuto li{display:grid;grid-template-columns:34px 1fr;gap:8px;align-items:center;font:700 15px/1.3 Figtree,sans-serif}#tuto li b{font-size:24px;text-align:center}
#tuto button{margin-top:14px;width:100%;padding:12px;border:0;border-radius:999px;background:#ff8a3c;color:#fff;font:900 16px Figtree,sans-serif;cursor:pointer}`;
document.head.appendChild(st);
const SF = () => (TG.Terre && TG.Terre.sfida && TG.Terre.sfida()) || null;
const paese = () => { const p = (TG.PrimoMinuto && TG.PrimoMinuto.paese) || ls.get('tg-paese-dev'); return p && p !== 'nessuno' ? p : null; };
const corto = p => { let n = p; try { n = (TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p; } catch(e){} return (n || '').replace(/ (di|in|sul|al|nel) .*$/i, ''); };
const breve = n => (n || '').replace(/^(Il|I|La|Le|Lo) /, '');

/* ---------- in alto: quanti terreni tiene o paese tuo ---------- */
function conta(){ const W = TG.Terre, t = {}; if (!W) return t; for (const T of W.lista()) { const p = W.padrone(T.id); if (p) t[p] = (t[p] || 0) + 1; } return t; }
function alto(){
  const sc = document.getElementById('score'); if (!sc || !TG.Terre) return;
  let el = document.getElementById('trTop'); if (!el) { el = document.createElement('div'); el.id = 'trTop'; sc.appendChild(el); }
  const S = SF();
  if (S && (S.p.includes(paese()) || Math.floor(Date.now() / 4500) % 2)) { const t = {}; for (const T of TG.Terre.lista()) { if (!TG.Terre.derby(T.id)) continue; const q = TG.Terre.padrone(T.id); if (q) t[q] = (t[q] || 0) + 1; }
    const [a, b] = S.p, p = paese(), nm = q => q === p ? `<b style="color:#fff">${S.nome(q)}</b>` : `<span class="alt">${S.nome(q)}</span>`;
    el.innerHTML = `<span>⚔ <i style="background:${TG.Terre.colore(a)}"></i> ${nm(a)} <b>${t[a] || 0}</b> – <b>${t[b] || 0}</b> ${nm(b)} <i style="background:${TG.Terre.colore(b)}"></i></span>`; return; }
  const t = conta(), p = paese(), cl = Object.entries(t).sort((a, b) => b[1] - a[1]), mio = t[p] || 0, pos = cl.findIndex(r => r[0] === p) + 1, tot = TG.Terre.lista().length;
  const capo = cl[0] && cl[0][0] !== p ? cl[0] : (cl[1] || null);
  el.innerHTML = p ? `<span>🌰 <i style="background:${TG.Terre.colore(p)}"></i> ${corto(p)} <b>${mio}</b></span>` + (pos ? `<span class="alt">${pos}°</span>` : '') + (capo ? `<span class="alt">· ${corto(capo[0])} ${capo[1]}</span>` : '') : `🌰 ${tot} terreni da prende`;
}

/* ---------- 2.0: O TERRENO SCELTO e a freccia ----------
   - Scegli tu dalla mappa (TG.Semplice.scelto, chiamato da app.js) → freccia e colonna arancione fin là.
   - Se nun hai scelto: cassone pieno → freccia a o terreno più vicino da prende; sennò nessuna freccia (raccoji dove te pare). */
let mia = null, scelta = null, sceltaT = 0;
function scelto(id){ scelta = id; sceltaT = Date.now(); const T = TG.Terre.lista().find(x => x.id === id); mia = T ? { id, x: T.x, z: T.z } : null; try { TG.Stats && TG.Stats.ev('mappa_terreno', id, null, { stato: TG.Terre.stato(id) }); } catch(e){} }
const bersaglio = () => (mia && mia.id) || null;
function libera(){ scelta = null; mia = null; }
function prossimo(){
  const D = TG.debug, W = TG.Terre; if (!D || !W || !D.car || !document.body.classList.contains('playing')) return;
  const p = paese(), c = D.car, dentro = W.terraIn(c.x, c.z), C = TG.Cassone;
  const pn = (document.getElementById('pName') || {}).textContent || '';
  document.documentElement.classList.toggle('tg-campo', !!dentro && (/podere|tua terra/i.test(pn) || W.lista().some(T => T.nome === pn || breve(T.nome) === pn)));
  if (!p) return;
  // arrivato a o terreno scelto: a freccia se spegne, resta o bottone SCARICA
  if (mia && dentro && dentro.id === mia.id) { try { if (D.NAV && D.NAV.dest) D.setDest(null); } catch(e){} return; }
  if (scelta) return;   // meta scelta da te: nun se tocca
  const N = D.NAV || {};
  if (N.dest && (!mia || Math.hypot(N.dest.x - mia.x, N.dest.z - mia.z) > 30)) return;   // un'altra meta (un gioco, un luogo): rispettata
  if (!(C && C.pieno()) || dentro) { if (mia && !scelta) { mia = null; try { D.setDest(null); } catch(e){} } return; }
  let best = null, bd = 1e9;
  for (const T of W.lista()) { if (W.stato(T.id) === 'nostro') continue; const d = Math.hypot(T.x - c.x, T.z - c.z) - T.rad; if (d < bd) { bd = d; best = T; } }
  if (!best || (mia && mia.id === best.id)) return;
  mia = { id: best.id, x: best.x, z: best.z };
  try { D.setDest({ x: best.x, z: best.z, name: breve(best.nome) }); } catch(e){}
}
addEventListener('tg-presa', () => { scelta = null; });

/* ---------- IL RIQUADRO: o cassone e cosa fà mo' ----------
   fuori: «🌰 Cassone 45/100» + barra + consiglio; cassone pieno: «scegli dove attaccà» (tocca → mappa);
   verso o scelto: «⚔ Vai a attaccà X · 320 m»; dentro un terreno: chi o tiene e cosa succede se scarichi. */
let obi = null;
function apriMappa(){ try { const b = document.getElementById('bMap') || document.querySelector('[data-open="map"],#mapBtn,#btnMap'); if (b) { b.click(); return; } } catch(e){} try { TG.Terre.pannello(); } catch(e){} }
function obiettivo(){
  const D = TG.debug, W = TG.Terre, C = TG.Cassone; if (!D || !W || !D.car || !C) return;
  if (!obi) { obi = document.createElement('div'); obi.id = 'obi'; obi.onclick = apriMappa; document.body.appendChild(obi); }
  const sc = document.getElementById('score'); if (sc) { const r = sc.getBoundingClientRect(); if (r.bottom > 0) document.documentElement.style.setProperty('--obiTop', Math.round(r.bottom + 8) + 'px'); }
  const p = paese(), c = D.car, dentro = W.terraIn(c.x, c.z), n = C.n, cap = C.cap(), pct = Math.min(100, n / cap * 100);
  if (!p) { obi.innerHTML = `<div class="t">Scegli o paese tuo</div>`; return; }
  const col = W.colore(p), barra = `<div class="b"><i style="width:${Math.max(3, pct)}%;background:${n >= cap ? '#ff8a3c' : col}"></i></div>`;
  const piede = `<div class="r"><span>🌰 Cassone <b style="color:#fff">${n}/${cap}</b></span><span>🗺 tocca pe' a mappa</span></div>`;
  if (dentro) {
    const l = W.righe(dentro.id).filter(r => r.punti > 0), st = W.stato(dentro.id), mio = W.mio(dentro.id), pd = W.padrone(dentro.id), altro = l.find(r => r.paese !== p), loro = altro ? altro.punti : 0;
    obi.style.borderColor = pd ? W.colore(pd) : '#ff8a3c';
    const tit = st === 'nostro' ? `✅ ${breve(dentro.nome)} è nostro` : st === 'libero' ? `🚩 ${breve(dentro.nome)}: libero!` : st === 'conteso' ? `⚔ ${breve(dentro.nome)}: conteso` : `⚔ ${breve(dentro.nome)} è de ${corto(pd)}`;
    const dopo = mio + n, sopra = dopo - loro >= W.SOGLIA;
    const cosa = n < C.MINIMO ? 'Raccoji qui e nocchie, poi scaricale' : st === 'nostro' ? `Scarica ${n}: o rinforzi (${dopo} a ${loro})` : sopra ? `Scarica ${n}: ${dopo} a ${loro}, <b style="color:#fff">è vostro!</b>` : `Scarica ${n}: ${dopo} a ${loro}, ne mancano ancora ${loro - dopo + W.SOGLIA}`;
    obi.innerHTML = `<div class="t">${tit}</div><div class="s">${cosa}</div>${l.length ? `<div class="r"><span style="color:${col}">${corto(p)} ${mio}</span><span>${altro ? corto(altro.paese) + ' ' + loro : 'nessun altro'}</span></div>` : ''}${piede}`;
    return;
  }
  obi.style.borderColor = n >= cap ? '#ff8a3c' : col;
  const T = mia && W.lista().find(x => x.id === mia.id);
  if (T) { const d = Math.max(0, Math.hypot(T.x - c.x, T.z - c.z) - T.rad), az = (W.azione(T.id) || '').replace('Vai a ', '').replace(/^(\S+) /, '$1 Vai a '); obi.innerHTML = `<div class="t">${az}</div><div class="s">${breve(T.nome)} · ${d < 950 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km'}</div>${barra}${piede}`; return; }
  if (n >= cap) { obi.innerHTML = `<div class="t">Cassone pieno: è ora de fa' guerra!</div><div class="s">Tocca qui e scegli o terreno da attaccà</div>${barra}${piede}`; return; }
  obi.innerHTML = `<div class="t">🌰 Raccoji e nocchie!</div><div class="s">Passace sopra ne i campi pe' riempì o cassone</div>${barra}${piede}`;
}
/* ---------- la prima volta: come se conquista un campo, in tre righe ---------- */
function tutorial(){
  if (true || ls.get('tg-tuto-terreni') || !document.body.classList.contains('playing')) return;   // 2.0: sostituito da i messaggi de o cassone
  ls.set('tg-tuto-terreni', '1');
  const d = document.createElement('div'); d.id = 'tuto';
  d.innerHTML = `<div class="c"><h2>Come se prende un campo</h2><ol><li><b>➜</b><span>Segui a <b style="font-size:15px;color:#ff8a3c">freccia</b> fino a o campo 🔥 acceso</span></li><li><b>🌰</b><span>Passa sopra e nocchie tra i filari: ogni nocchia è un punto pe' o paese tuo</span></li><li><b>🚩</b><span>Quanno ne hai più de l'altri paesi, o campo è vostro</span></li><li><b>👑</b><span>Domenica vince o paese che tiene più campi</span></li></ol><button type="button">Ho capito, vado!</button></div>`;
  d.onclick = () => d.remove(); document.body.appendChild(d);
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
  setInterval(alto, 1500); setInterval(prossimo, 2500); setInterval(obiettivo, 500); alto();
  const tt = () => { if (document.body.classList.contains('playing')) setTimeout(tutorial, 2500); else setTimeout(tt, 1500); }; tt();
  // a battaglia de o giorno: detta una volta, quando se comincia a giocà
  const dici = () => { try { const b = TG.Terre.battaglia(), T = b && TG.Terre.lista().find(x => x.id === b); if (!T || ls.get('tg-battaglia-detta') === oggi() + b) return; if (!document.body.classList.contains('playing')) return setTimeout(dici, 3000); ls.set('tg-battaglia-detta', oggi() + b); setTimeout(() => TG.msg('⚔ Battaglia de oggi', breve(T.nome) + ': ogni nocchia vale doppio', 5), 8000); } catch(e){} };
  setTimeout(dici, 4000);
}
TG.Semplice = { prossimo, alto, scelto, bersaglio, libera };
if (document.readyState === 'complete') setTimeout(avvia, 2000); else addEventListener('load', () => setTimeout(avvia, 2000));
})();
