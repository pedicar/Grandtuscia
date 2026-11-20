/* ISCRIVITI AR MOMENTO GIUSTO — 20/11: su 200 giocatori solo 32 toccavano «Salva la partita».
   Invece de aspettà che o trovano ner menu, o gioco o propone quanno uno è contento:
     1) quanno conquista o primo campo (dopo almeno 1 minuto de gioco);
     2) quanno vince l'Ape (scaletta de i mezzi).
   Compare in alto un bottone piccolo «🚙 Vinci o 4x4 de campagna» (o «💾 Salva o podere · +100 🌰» si o 4x4 ce l'hai già) pe' 12 secondi: niente blocca, se o tocchi
   s'apre o pannello de sempre (una mail e via). Massimo 2 volte, a distanza de almeno 5 minuti; mai si sei già iscritto,
   in volo, coi trucchi. O 4x4 o dà tg-scala.js appena a mail è confermata (i +100 🌰, a chi o 4x4 ce l'ha già, mondo/app.js).
   Usa TG.Account (stato), TG.debug.openAccount, TG.Scala, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c) => { try { TG.Stats && TG.Stats.ev(t, c || ''); } catch(e){} };
let fatti = {}; try { fatti = JSON.parse(ls.get('tg-iscriviti') || '{}') || {}; } catch(e){}
const css = document.createElement('style'); css.textContent = `#iscrBtn{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 104px);transform:translate(-50%,-8px);opacity:0;z-index:42;padding:10px 18px;border-radius:999px;border:2px solid #f2c74e;background:rgba(14,18,16,.9);color:#f3e7cb;font:900 17px/1.2 Figtree,system-ui,sans-serif;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.35);transition:opacity .3s,transform .3s;pointer-events:none}
#iscrBtn.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}#iscrBtn small{display:block;font-weight:700;font-size:13px;color:#c9bfa8;margin-top:2px}
body:not(.playing) #iscrBtn,body.flying #iscrBtn{display:none}body:has(#iscrBtn.on) #campoPill,body:has(#iscrBtn.on) #crossPill,body:has(#iscrBtn.on) #dhPill{visibility:hidden}`;
document.head.appendChild(css);
const btn = document.createElement('button'); btn.id = 'iscrBtn'; btn.type = 'button';
const testo = () => { let ha = false; try { ha = !!TG.Scala.stato().fatti.pandino; } catch(e){} return ha ? '💾 Salva o podere tuo · +100 🌰<small>una mail e via, niente password</small>' : '🚙 Vinci o 4x4 de campagna<small>salva a partita co\' a mail, niente password</small>'; };
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
  const volte = ['campo', 'ape'].filter(k => fatti[k]).length; if (volte >= 2) return;
  if (fatti.ultimo && Date.now() - fatti.ultimo < 5 * 60e3) return;
  if (document.querySelector('.ov:not([hidden]), #accountOv:not([hidden])')) return;   // c'è un pannello aperto
  const presi = +(ls.get('tg-presi') || 0);
  let scala = {}; try { scala = TG.Scala.stato().fatti || {}; } catch(e){}
  if (!fatti.campo && presi >= 1 && inGioco >= 60) { fatti.campo = 1; setTimeout(() => mostra('campo'), 3500); return; }   // dopo l'avviso de o campo preso
  if (!fatti.ape && scala.ape && Date.now() - (+scala.ape || 0) > 6000) return void mostra('ape');
}, 1000);
TG.Iscriviti = { mostra, stato: () => fatti };
})();
