/* TRUCCHI — tutto illimitato, pe' provà o gioco. Se attiva co' gioca.html?trucco=tuttotutto (o trucchi.html).
   Gira su un profilo a parte (tg-profile.js: «tuscia-games-profile-trucchi»), senza statistiche (tg-stats.js) e senza salvataggio online (tg-account.js).
   Qui: nocchie sempre a 999.999, tutti i mezzi tuoi (anche quelli da scoprì), tutte e vernici.
   Pe' nun sporcà a classifica vera: i campi se pijano solo sur telefono tuo (o server nun lo sa), e l'altri giocatori nun te vedono
   (tg-presenza.js nun manda posizione né ombre). Usa TG.Cassone, TG.Contadino/TG.Profile, TG.Scoperte, TG.Skin. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
// entrà e uscì senza link (anche ne a prova in chat): 7 tocchi veloci sur numero de e nocchie in alto; pe' uscì, tocca «🪄 TRUCCHI»
let tocchi = [];
document.addEventListener('click', e => {
  if (window.TG_TRUCCO && e.target.closest && e.target.closest('#truccoTag')) { if (confirm('Uscì da i trucchi e tornà a a partita vera?')) { try { localStorage.removeItem('tg-trucco'); } catch(x){} location.href = location.pathname; } return; }
  if (window.TG_TRUCCO || !(e.target.closest && e.target.closest('#trTop'))) return;
  const ora = Date.now(); tocchi = tocchi.filter(t => ora - t < 3000); tocchi.push(ora);
  if (tocchi.length >= 7) { tocchi = []; try { localStorage.setItem('tg-trucco', '1'); } catch(x){} location.reload(); }
}, true);
if (!window.TG_TRUCCO) return;
{ const st = document.createElement('style'); st.textContent = '#truccoTag{pointer-events:auto!important;cursor:pointer;font-size:12px!important;padding:5px 12px!important;white-space:nowrap}'; document.head.appendChild(st);
  const t = () => { const e = document.getElementById('truccoTag'); if (e) e.textContent = '🪄 TRUCCHI · tocca pe\' uscì'; else setTimeout(t, 800); }; t(); }
const PIENO = 999999;
function riempi(){
  try { const C = TG.Cassone; if (C && C.n < PIENO) C.aggiungi(PIENO - C.n, true); } catch(e){}
  try { const s = TG.Contadino.stato(TG.Profile.data); s.mezzi = s.mezzi || {}; s.trovati = s.trovati || {}; s.vernici = s.vernici || {};
    const tutti = ['piedi', 'vespa', 'ape', 'pandino', 'moto', 'trattore', 'semovente', 'supercar', 'aereo'].concat(TG.Scoperte ? TG.Scoperte.LISTA.map(m => m.id) : []);
    let cambiato = false; for (const id of tutti) if (!s.mezzi[id]) { s.mezzi[id] = 1; s.trovati[id] = 1; cambiato = true; }
    if (TG.Skin) for (const id of tutti) for (const v of TG.Skin.VERNICI) if (v.prezzo && !s.vernici[id + ':' + v.id]) { s.vernici[id + ':' + v.id] = 1; cambiato = true; }
    if (cambiato) TG.Profile.salva();
  } catch(e){}
  try { localStorage.setItem('tg-scala', '{"vespa":1,"ape":1,"pandino":1}'); } catch(e){}
}
setInterval(riempi, 1000); riempi();
TG.Trucchi = { attivi: true };
})();
