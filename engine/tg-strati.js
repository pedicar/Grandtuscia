/* STRATI — il regista: decide cosa si vede in base a quanto hai giocato. Il gioco ha tanta roba; non deve arrivare tutta al minuto zero.
   Stadio 0 (primo giorno, nessuna cella presa): paese, guida, territorio (chip + barra + card «come se ruba»). Niente lavoro del
   giorno, niente card «torna domani», niente primo minuto, niente nocchia d'oro, radio senza parlato nei primi 5 minuti, HUD ridotto.
   Stadio 1 (prima cella presa, o dal secondo giorno): si aggiungono nocchia d'oro, lavoro del giorno, primo minuto come sfida, chiama
   un amico, chi entra. Stadio 2 (dal terzo giorno, o primo record): tutto — gare, fantasmi, Codex, My Tuscia, giochi completi.
   Non tocca i moduli: li spegne con flag giornalieri e CSS. Esterno: TG.Stats.ev (ascolta zona_rubata/record), RadioNocchia. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} }, del: k => { try { localStorage.removeItem(k); } catch(e){} } };
const oggi = () => new Date().toISOString().slice(0, 10);
// giorni giocati (date distinte)
let giorni = []; try { giorni = JSON.parse(ls.get('tg-giorni') || '[]'); } catch(e){ giorni = []; }
if (!giorni.includes(oggi())) { giorni.push(oggi()); ls.set('tg-giorni', JSON.stringify(giorni.slice(-60))); }
const presa = () => !!ls.get('tg-cella-presa'), record = () => !!ls.get('tg-pm-record');
function stadio(){
  if (ls.get('tg-strati-forza') != null) return +ls.get('tg-strati-forza');
  if (giorni.length >= 3 || record()) return 2;
  if (giorni.length >= 2 || presa()) return 1;
  return 0;
}
let S = stadio();
document.documentElement.dataset.stadio = S;
// stadio 0: i moduli «del giorno» restano zitti (i flag che loro stessi usano per «una volta al giorno»)
if (S === 0) {
  ls.set('tg-lavoro-visto', oggi()); ls.set('tg-torna-visto', oggi());
  if (!ls.get('tg-primo-minuto')) { ls.set('tg-primo-minuto', '1'); ls.set('tg-strati-pm-rinviato', '1'); }  // il cronometro arriva allo stadio 1, come sfida
} else if (ls.get('tg-strati-pm-rinviato')) { ls.del('tg-strati-pm-rinviato'); ls.del('tg-primo-minuto'); }
const st = document.createElement('style'); st.textContent = `
/* sempre: niente orologio e richieste del contadino in alto finché non si arriva allo stadio 2 (resta la radio) */
html[data-stadio="0"] #hOra#hOra#hOra,html[data-stadio="1"] #hOra#hOra#hOra,html[data-stadio="0"] #hGoal#hGoal#hGoal,html[data-stadio="1"] #hGoal#hGoal#hGoal{display:none!important}
html.tg-noPodere #prompt{display:none!important}
/* stadio 0: schermo libero */
html[data-stadio="0"] #ngHud,html[data-stadio="0"] #sfHud,html[data-stadio="0"] #pmRiga,html[data-stadio="0"] #pmHud,html[data-stadio="0"] #prMini{display:none!important}
html[data-stadio="0"] body.touch #hud .where>#score,html[data-stadio="0"] body.touch #hud .where.rot>#score,html[data-stadio="0"] body.phoneBox .where.aperto #score{display:none!important}
html[data-stadio="0"] #menu details,html[data-stadio="0"] #bCodex,html[data-stadio="0"] #bCodex2,html[data-stadio="0"] #bMe,html[data-stadio="0"] #bInvito,html[data-stadio="0"] #menuProg{display:none!important}
html[data-stadio="0"] #mapQuick [data-q="nocchia"]{display:none!important}
/* stadio 1: ancora niente gare e Codex in faccia */
html[data-stadio="1"] #menu details,html[data-stadio="1"] #bCodex2{display:none!important}
html[data-stadio="1"] #sfHud{display:none!important}
`;
document.head.appendChild(st);
// radio: nei primi 5 minuti dello stadio 0 non parla (le canzoni restano)
let t0 = 0;
function radioZitta(){
  const R = window.RadioNocchia; if (!R || !R.annuncia || R.annuncia._strati) return;
  const o = R.annuncia.bind(R);
  const n = function(a){ if (S === 0 && document.body.classList.contains('playing') && (!t0 || Date.now() - t0 < 300000)) return; return o(a); };
  n._strati = 1; R.annuncia = n;
}
// ascolto gli eventi: prima cella presa → stadio 1 dalla prossima volta (e lo dico); record → stadio 2
function ascolta(){
  const S0 = TG.Stats; if (!S0 || !S0.ev || S0.ev._strati) return;
  const o = S0.ev.bind(S0);
  const n = function(t, c, v, x){
    try {
      if (t === 'zona_rubata' && !presa()) { ls.set('tg-cella-presa', oggi()); if (S === 0) setTimeout(() => { try { TG.msg('Prima terra presa!', "Da domani: a nocchia d'oro e o lavoro de o giorno. Mo' tienila", 5); } catch(e){} }, 6000); }
      if (t === 'record' && S < 2) ls.set('tg-strati-record', '1');
    } catch(e){}
    return o(t, c, v, x);
  };
  n._strati = 1; S0.ev = n;
}
new MutationObserver(() => { if (document.body.classList.contains('playing') && !t0) t0 = Date.now(); }).observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['class'] });
// stadio 0: il bottone «La tua terra · IL PODERE» (vendere, mezzi, terreni) non serve nei primi minuti: si guida e si raccoglie
setInterval(() => { try { const n = document.getElementById('pName'), on = S === 0 && n && /tua terra|podere/i.test(n.textContent) && t0 && Date.now() - t0 < 240000; document.documentElement.classList.toggle('tg-noPodere', !!on); } catch(e){} }, 800);
TG.Strati = { stadio: () => S, giorni: () => giorni.length, forza: n => { ls.set('tg-strati-forza', n); location.reload(); }, libera: () => { ls.del('tg-strati-forza'); location.reload(); } };
let tent = 0; const prova = () => { radioZitta(); ascolta(); if (++tent < 30 && (!TG.Stats || !window.RadioNocchia)) setTimeout(prova, 1000); };
prova();
})();
