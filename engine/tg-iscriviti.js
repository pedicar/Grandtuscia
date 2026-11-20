/* ISCRIVITI AR MOMENTO GIUSTO — 20/11: su 200 giocatori solo 32 toccavano «Salva la partita».
   Invece de aspettà che o trovano ner menu, o gioco o propone quanno uno è contento:
     1) quanno conquista o primo campo (dopo almeno 1 minuto de gioco);
     2) dopo l'Ape, quanno è o momento de o Trattore (90 s de gioco da l'Ape): NO o bottoncino ma a cartolina grande in mezzo
        «🚜 O Trattore te aspetta · lascia a mail e raccoji e nocchie 3 vorte più veloce» [Lascia a mail] [Dopo]; se dice dopo, torna
        na vorta sola dopo 10 minuti.
   Compare in alto un bottone piccolo «🚜 Vinci o Trattore» (o «💾 Salva o podere · +100 🌰» si o trattore ce l'hai già) pe' 12 secondi: niente blocca, se o tocchi
   s'apre o pannello de sempre (una mail e via). Massimo 2 volte, a distanza de almeno 5 minuti; mai si sei già iscritto,
   in volo, coi trucchi. O trattore o dà tg-scala.js appena a mail è confermata (i +100 🌰, a chi ce l'ha già, mondo/app.js).
   Usa TG.Account (stato), TG.debug.openAccount, TG.Scala, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c) => { try { TG.Stats && TG.Stats.ev(t, c || ''); } catch(e){} };
let fatti = {}; try { fatti = JSON.parse(ls.get('tg-iscriviti') || '{}') || {}; } catch(e){}
const css = document.createElement('style'); css.textContent = `#iscrBtn{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 104px);transform:translate(-50%,-8px);opacity:0;z-index:42;padding:10px 18px;border-radius:999px;border:2px solid #f2c74e;background:rgba(14,18,16,.9);color:#f3e7cb;font:900 17px/1.2 Figtree,system-ui,sans-serif;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.35);transition:opacity .3s,transform .3s;pointer-events:none}
#iscrBtn.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}#iscrBtn small{display:block;font-weight:700;font-size:13px;color:#c9bfa8;margin-top:2px}
body:not(.playing) #iscrBtn,body.flying #iscrBtn{display:none}body:has(#iscrBtn.on) #obi,body:has(#iscrBtn.on) #campoPill,body:has(#iscrBtn.on) #crossPill,body:has(#iscrBtn.on) #dhPill{visibility:hidden}`;
document.head.appendChild(css);
const btn = document.createElement('button'); btn.id = 'iscrBtn'; btn.type = 'button';
const testo = () => { let ha = false; try { ha = !!TG.Scala.stato().fatti.trattore; } catch(e){} return ha ? '💾 Salva o podere tuo · +100 🌰<small>una mail e via, niente password</small>' : '🚜 Vinci o Trattore · nocchie ×3<small>salva a partita co\' a mail, niente password</small>'; };
btn.innerHTML = testo();
let timer = null;
btn.addEventListener('click', e => { e.stopPropagation(); nascondi(); ev('iscrivi_tocco', btn.dataset.perche || ''); try { TG.debug.openAccount(); } catch(er){} });
document.body.appendChild(btn);
function nascondi(){ btn.classList.remove('on'); clearTimeout(timer); }
function mostra(perche){
  fatti[perche] = Date.now(); fatti.ultimo = Date.now(); ls.set('tg-iscriviti', JSON.stringify(fatti));
  btn.dataset.perche = perche; btn.innerHTML = testo(); btn.classList.add('on'); clearTimeout(timer); timer = setTimeout(nascondi, 12000);
  ev('iscrivi_proposto', perche);
}
let inGioco = 0;
setInterval(() => {
  if (window.TG_TRUCCO || !document.body.classList.contains('playing') || document.body.classList.contains('flying')) return;
  inGioco += 1;
  const A = TG.Account; if (!A || A.stato !== 'anonimo' || A.attesa) return;   // già iscritto, o mail già mandata
  let scala = {}; try { scala = TG.Scala.stato().fatti || {}; } catch(e){}
  if (scala.ape && !scala.trattore && inGioco >= 60 && !document.querySelector('.ov:not([hidden]), #accountOv:not([hidden]), #tgFesta, #iscrBtn.on') && Date.now() - (+scala.ape || 0) > 90e3 && (fatti.cart || 0) < 2 && (!fatti.cartT || Date.now() - fatti.cartT > 10 * 60e3)) return void cartolina();
  const volte = ['campo', 'ape'].filter(k => fatti[k]).length; if (volte >= 2) return;
  if (fatti.ultimo && Date.now() - fatti.ultimo < 5 * 60e3) return;
  if (document.querySelector('.ov:not([hidden]), #accountOv:not([hidden])')) return;   // c'è un pannello aperto
  const presi = +(ls.get('tg-presi') || 0);
  if (!fatti.campo && presi >= 1 && inGioco >= 60) { fatti.campo = 1; setTimeout(() => mostra('campo'), 3500); return; }   // dopo l'avviso de o campo preso
}, 1000);
// a cartolina de o trattore (stile de i regali, tg-scala.js #tgFesta)
function cartolina(){
  fatti.cart = (fatti.cart || 0) + 1; fatti.cartT = fatti.ultimo = Date.now(); ls.set('tg-iscriviti', JSON.stringify(fatti));
  const v = document.getElementById('tgFesta'); if (v) v.remove();
  const d = document.createElement('div'); d.id = 'tgFesta';
  d.innerHTML = `<div class="c"><div class="i">🚜</div><div class="r">🎁 PROSSIMO REGALO</div><h2>O Trattore te aspetta!</h2><p>Lascia a tua mail e raccoji e nocchie <b style="color:#fff">3 vorte più veloce</b>.<br>Niente password, a partita resta salvata.</p><button type="button" data-si>📧 Lascia a mail</button><div><button type="button" data-no style="background:none;color:#c9bfa8;font-size:16px;padding:12px 20px 2px">Dopo</button></div></div>`;
  const via = () => { clearTimeout(t); d.remove(); };
  d.querySelector('[data-si]').addEventListener('click', e => { e.stopPropagation(); via(); ev('iscrivi_tocco', 'trattore'); try { TG.debug.openAccount(); } catch(er){} });
  d.addEventListener('click', e => { if (e.target.closest('[data-si]')) return; via(); ev('iscrivi_dopo', 'trattore'); });
  const t = setTimeout(via, 25000); document.body.appendChild(d);
  ev('iscrivi_proposto', 'trattore');
}
TG.Iscriviti = { mostra, cartolina, stato: () => fatti };
})();
