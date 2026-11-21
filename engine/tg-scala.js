/* A SCALETTA DE I MEZZI — i primi secondi devono dà a sensazione de annà sempre più veloce, senza fà gnente.
   Chi entra pe' a prima volta parte A PIEDI, e se li vince da solo, uno dopo l'altro:
     20 nocchie → 🛵 Vespa · 50 nocchie → 🛺 Ape (almeno 20 s / 40 s tra un regalo e l'altro)
     🚜 Trattore (nocchie ×3) → quanno salvi a partita co' a mail (20/11 sera: l'iscrizione vale o trattore), in qualsiasi momento
   Ogni volta ce sale sopra da solo (se stai su un mezzo più lento) e in mezzo a o schermo compare a cartolina «🎉 Hai vinto …» (4 s, o tocchi e sparisce).
   Chi giocava già: Vespa ce l'ha; l'Ape arriva co' e nocchie, o Trattore appena è iscritto.
   Stato: tg-scala (passi fatti), tg-raccolte (nocchie raccolte in tutto, solo quelle che entrano ner cassone).
   Usa TG.Cassone.n, TG.Contadino/TG.Profile (mezzi), TG.debug (VEH, setVehicle), TG.msg, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c) => { try { TG.Stats && TG.Stats.ev(t, c || ''); } catch(e){} };
const ORDINE = ['piedi', 'vespa', 'ape', 'pandino', 'trattore'];
const PASSI = [
  // più calma (19/11 sera): ogni gradino vò un po' de gioco, e almeno 'dopo' secondi da o gradino prima
  { id: 'vespa', nocchie: 20, dopo: 20, ico: '🛵', t: 'Hai vinto a Vespa!', s: 'Più veloce: raccoji de più' },
  { id: 'ape', nocchie: 50, dopo: 40, ico: '🛺', t: 'Hai vinto l\'Ape!', s: 'Ancora più veloce' },
  { id: 'trattore', iscritto: true, ico: '🚜', t: 'Hai vinto o Trattore!', s: 'Partita salvata. Ogni nocchia vale ×3' }
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
  setTimeout(() => festa(P), 700);   // dopo l'artri avvisi de o momento (es. «10 nocchie»)
  ev('scala', P.id);
}
// a cartolina de o regalo: grande, in mezzo, se chiude da sola o toccandola
const css = document.createElement('style'); css.textContent = `#tgFesta{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);animation:tgFi .25s}
#tgFesta .c{background:#1b2423;border:3px solid #f2c74e;border-radius:22px;padding:22px 26px 18px;text-align:center;color:#f3e7cb;font-family:Figtree,system-ui,sans-serif;max-width:min(320px,86vw);box-shadow:0 12px 40px rgba(0,0,0,.5);animation:tgPop .45s cubic-bezier(.2,1.6,.4,1)}
#tgFesta .i{font-size:76px;line-height:1}#tgFesta .r{font:800 15px Figtree,sans-serif;color:#f2c74e;letter-spacing:.06em;margin-top:6px}#tgFesta h2{margin:4px 0 6px;font:900 27px/1.15 Figtree,sans-serif;color:#fff}#tgFesta p{margin:0 0 14px;font-size:17px;color:#ddd4bf}
#tgFesta button{border:0;border-radius:999px;background:#f2c74e;color:#1b2423;font:900 19px Figtree,sans-serif;padding:11px 34px}
@keyframes tgPop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}@keyframes tgFi{from{opacity:0}}`;
document.head.appendChild(css);
function festa(P){
  const v = document.getElementById('tgFesta'); if (v) v.remove();
  const d = document.createElement('div'); d.id = 'tgFesta';
  d.innerHTML = `<div class="c"><div class="i">${P.ico}</div><div class="r">🎉 REGALO</div><h2>${P.t}</h2><p>${P.s}</p><button type="button">Vai!</button></div>`;
  const via = () => { clearTimeout(t); d.remove(); };
  d.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); via(); });
  const t = setTimeout(via, 4000); document.body.appendChild(d);
}
function giro(){
  if (!TG.Cassone) return;
  const n = TG.Cassone.n; if (ultimo != null && n > ultimo) { raccolte += n - ultimo; ls.set('tg-raccolte', String(raccolte)); } ultimo = n;
  if (!document.body.classList.contains('playing') || !TG.debug || !TG.debug.car) return;
  inGioco += .3;
  if (nuovo && !partito) { partito = true; ls.set('tg-scala-inizio', '1'); if (cur() !== 'piedi') try { TG.debug.setVehicle('piedi'); } catch(e){} }
  if (Date.now() - ultimoPasso < 2500) return;   // uno pe' volta, che se godono
  const ultimoT = Math.max(0, ...Object.values(fatti).map(Number).filter(x => x > 1e12));   // quanno è arrivato l'ultimo regalo
  const presi = +(ls.get('tg-presi') || 0);
  const iscritto = (() => { try { return TG.Account.stato === 'registrato'; } catch(e){ return false; } })();
  for (const P of PASSI) { if (fatti[P.id]) continue;
    if (P.iscritto) { if (iscritto) { sali(P); return; } continue; }   // o trattore nun aspetta a fila: arriva appena salvi
    const ok = (P.nocchie ? raccolte >= P.nocchie : presi >= P.campi) && inGioco >= (P.dopo || 0) && Date.now() - ultimoT >= (P.dopo || 0) * 1000;
    if (ok) sali(P); break; }
}
setInterval(giro, 300);
TG.Scala = { stato: () => ({ fatti, raccolte, nuovo }), festa };
})();
