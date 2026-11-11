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
