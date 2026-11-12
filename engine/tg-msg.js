/* TG.msg — messaggio in basso (lo stesso #msg del gioco) per i moduli esterni.
   TG.debug.showToast(place) mostra la scheda di una scoperta e con una stringa andava in errore:
   qui lo rendo tollerante: con una stringa mostra un messaggio normale. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
let t = 0;
TG.msg = function(titolo, sotto, sec){
  const n = document.getElementById('msg'); if (!n) return;
  n.innerHTML = String(titolo) + (sotto ? '<small>' + sotto + '</small>' : ''); n.classList.add('on');
  clearTimeout(t); t = setTimeout(() => n.classList.remove('on'), (sec || 2.6) * 1000);
};
// Mai una card mentre guidi: aspetta che il mezzo sia fermo (velocità < 3 per un secondo), al massimo `max` ms
TG.fermo = function(f, max){
  const t0 = Date.now(); let fermoDa = 0;
  const id = setInterval(() => {
    let v = 99; try { v = Math.abs(TG.debug.car.speed || 0); } catch(e){}
    if (v < 3) { if (!fermoDa) fermoDa = Date.now(); } else fermoDa = 0;
    if ((fermoDa && Date.now() - fermoDa > 1000) || Date.now() - t0 > (max || 90000)) { clearInterval(id); f(); }
  }, 250);
};
function patch(){
  const D = TG.debug; if (!D || !D.showToast || D.showToast._tg) return setTimeout(patch, 500);
  const o = D.showToast;
  const n = function(e, a, sec){ if (e && typeof e === 'object' && e.cat) return o.call(this, e); return TG.msg(e, a, sec); };
  n._tg = 1;
  try { D.showToast = n; } catch(err){}
  if (D.showToast !== n) { try { Object.defineProperty(D, 'showToast', { value: n, configurable: true, writable: true }); } catch(err){} }
}
patch();
})();

/* CALMA ALLA RADIO — all'inizio la voce diceva tutto di fila (benvenuto, prima nocchia, l'Ape, due ruote, la curva,
   il podere, la sfida dei comuni, la notizia del Trono…): sei annunci in due minuti. Qui gli annunci «al volo»
   passano da un filtro: almeno 25 s di silenzio tra uno e l'altro, nei primi tre minuti di gioco massimo tre,
   e se ne arrivano tanti insieme resta solo l'ultimo (quelli vecchi parlano di cose già passate). */
(function(){
  const R = window.RadioNocchia; if (!R || !R.annuncia || R.annuncia._calma) return;
  const orig = R.annuncia.bind(R);
  const GAP = 25000, PRIMI_MIN = 180000, MAX_PRIMI = 3;
  let ultimo = 0, detti = 0, t0 = 0, inAttesa = null, timer = null;
  const inizio = () => { if (!t0 && document.body.classList.contains('playing')) t0 = Date.now(); return t0; };
  function prova(){
    timer = null; if (!inAttesa) return;
    const now = Date.now(), dall = now - ultimo;
    if (dall < GAP) { timer = setTimeout(prova, GAP - dall); return; }
    if (inizio() && now - t0 < PRIMI_MIN && detti >= MAX_PRIMI) { timer = setTimeout(prova, PRIMI_MIN - (now - t0)); return; }
    const a = inAttesa; inAttesa = null; ultimo = now; detti++; orig(a);
  }
  const calma = function(a){ if (!a) return; inizio(); inAttesa = a; if (!timer) prova(); };
  calma._calma = 1; R.annuncia = calma;
  new MutationObserver(inizio).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
