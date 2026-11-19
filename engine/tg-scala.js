/* A SCALETTA DE I MEZZI — i primi secondi devono dà a sensazione de annà sempre più veloce, senza fà gnente.
   Chi entra pe' a prima volta parte A PIEDI, e se li vince da solo, uno dopo l'altro:
     3 nocchie raccolte → 🛵 Vespa · 10 nocchie → 🛺 Ape · primo campo preso → 🚙 4x4 de campagna
   Ogni volta ce sale sopra da solo (se stai su un mezzo più lento) e in alto compare «🎁 …» pe' 3 secondi: niente da toccà.
   Chi giocava già: Vespa ce l'ha, l'Ape arriva a 10 nocchie raccolte, o 4x4 dopo 20 secondi (o primo campo l'ha già preso).
   Stato: tg-scala (passi fatti), tg-raccolte (nocchie raccolte in tutto, solo quelle che entrano ner cassone).
   Usa TG.Cassone.n, TG.Contadino/TG.Profile (mezzi), TG.debug (VEH, setVehicle), TG.msg, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c) => { try { TG.Stats && TG.Stats.ev(t, c || ''); } catch(e){} };
const ORDINE = ['piedi', 'vespa', 'ape', 'pandino'];
const PASSI = [
  { id: 'vespa', nocchie: 3, t: '🛵 Mo\' vai in Vespa!', s: 'Più veloce, raccoji de più' },
  { id: 'ape', nocchie: 10, t: '🛺 Te sei vinto l\'Ape!', s: 'Ancora più veloce' },
  { id: 'pandino', campi: 1, attesa: 20, t: '🚙 4x4 de campagna: è tua!', s: 'Va dappertutto' }
];
let fatti = {}; try { fatti = JSON.parse(ls.get('tg-scala') || '{}') || {}; } catch(e){}
const nuovo = !ls.get('tg-primo-scarico') && !(+(ls.get('tg-presi') || 0) > 0) && !ls.get('tg-scala-inizio');
if (!nuovo && !fatti.vespa) fatti.vespa = 1;   // chi giocava già a Vespa ce l'ha: niente avviso
let raccolte = +(ls.get('tg-raccolte') || 0), ultimo = null, inGioco = 0, ultimoPasso = 0, partito = false;
const st = () => { try { const s = TG.Contadino.stato(TG.Profile.data); s.mezzi = s.mezzi || {}; return s; } catch(e){ return null; } };
const cur = () => { try { return TG.debug.VEH.cur.id; } catch(e){ return null; } };
function sali(P){
  const s = st(); if (!s) return;
  fatti[P.id] = Date.now(); ls.set('tg-scala', JSON.stringify(fatti)); ultimoPasso = Date.now();
  s.mezzi[P.id] = s.mezzi[P.id] || Date.now(); try { TG.Profile.salva(); } catch(e){}
  const c = cur(), ic = ORDINE.indexOf(c);
  if (!document.body.classList.contains('flying') && ic >= 0 && ic < ORDINE.indexOf(P.id)) { try { TG.debug.setVehicle(P.id); } catch(e){} }
  try { navigator.vibrate && navigator.vibrate([40, 40, 90]); } catch(e){}
  setTimeout(() => { try { TG.msg(P.t, P.s + ' · 🎁 in regalo', 3.5); } catch(e){} }, 700);   // dopo l'artri avvisi de o momento (es. «10 nocchie»)
  ev('scala', P.id);
}
function giro(){
  if (!TG.Cassone) return;
  const n = TG.Cassone.n; if (ultimo != null && n > ultimo) { raccolte += n - ultimo; ls.set('tg-raccolte', String(raccolte)); } ultimo = n;
  if (!document.body.classList.contains('playing') || !TG.debug || !TG.debug.car) return;
  inGioco += .3;
  if (nuovo && !partito) { partito = true; ls.set('tg-scala-inizio', '1'); if (cur() !== 'piedi') try { TG.debug.setVehicle('piedi'); } catch(e){} }
  if (Date.now() - ultimoPasso < 2500) return;   // uno pe' volta, che se godono
  const presi = +(ls.get('tg-presi') || 0);
  for (const P of PASSI) { if (fatti[P.id]) continue;
    const ok = P.nocchie ? raccolte >= P.nocchie : presi >= P.campi && inGioco >= (nuovo ? 0 : P.attesa || 0);
    if (ok) sali(P); break; }
}
setInterval(giro, 300);
TG.Scala = { stato: () => ({ fatti, raccolte, nuovo }) };
})();
