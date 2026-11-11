/* TG.Ritorno — perché tornare domani, e con chi.
   1) Serie: giorni di fila giocati; a 3 la Vespa, a 7 il trattore (mezzi del gioco, nessun nuovo asset).
   2) «Torna domani»: una card al giorno, dopo qualche minuto di gioco o quando si torna al menu, con il motivo concreto
      (nocchia d'oro che cambia posto, distanza del comune in classifica, serie) e «Ricordamelo» (icona sul telefono).
   3) «Sfida 'n amico»: link con le tue nocchie di oggi; chi arriva vede la sfida nel menu e un contatore «batti N».
   Modulo esterno: usa TG.debug, TG.Profile, TG.Contadino, TG.Account, TG.Stats, TG.PrimoMinuto, TG.NocchiaGiorno. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const $ = id => document.getElementById(id);
const ev = (tipo, cosa, val, extra) => { try { TG.Stats && TG.Stats.ev(tipo, cosa, val, extra); } catch(e){} };
const oggi = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ieri = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const paese = () => { const p = ls.get('tg-paese-dev'); return p && p !== 'nessuno' ? p : null; };
const nomeP = p => { try { return (TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p; } catch(e){ return p; } };
const toast = t => { try { TG.debug.showToast(t); } catch(e){} };
const carico = () => { try { return TG.debug.caricoTot(); } catch(e){ return 0; } };
const Q = (() => { try { return new URLSearchParams(window.__tgQ != null ? window.__tgQ : location.search); } catch(e){ return new URLSearchParams(); } })();
const MINUTI_CARD = window.__tgRitornoMinuti || 4;
const LINK = 'https://grandtuscia.netlify.app/';

/* ---------- stile ---------- */
const css = document.createElement('style'); css.textContent = `
#rtOv{position:fixed;inset:0;z-index:95;background:rgba(10,14,12,.72);display:flex;align-items:center;justify-content:center;padding:18px;font-family:system-ui,sans-serif}
#rtOv[hidden]{display:none}
.rtCard{background:#1b2a24;color:#faf6eb;border:1px solid rgba(242,199,78,.5);border-radius:22px;padding:22px 20px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.rtEye{font:800 12px/1 system-ui;letter-spacing:.14em;color:#f2c74e;margin-bottom:10px}
.rtCard h2{margin:0 0 8px;font-size:24px;line-height:1.15}
.rtCard p{margin:6px 0;font-size:15px;line-height:1.4;color:#d9d3c4}
.rtSerie{display:flex;gap:6px;margin:12px 0}
.rtSerie i{flex:1;height:10px;border-radius:5px;background:#2e4038}.rtSerie i.on{background:#f2c74e}
.rtRow{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.rtBtn{flex:1 1 45%;padding:12px 10px;border:0;border-radius:12px;background:#f2c74e;color:#1b2a24;font:800 15px system-ui;cursor:pointer}
.rtBtn.sec{background:#2e4038;color:#faf6eb}
#sfHud{position:fixed;z-index:30;right:58px;top:calc(199px + env(safe-area-inset-top,0px));padding:5px 10px;border-radius:999px;background:rgba(40,30,12,.85);color:#ffe3a3;border:1px solid rgba(255,210,100,.55);font:800 12px system-ui;backdrop-filter:blur(4px)}
body:not(.playing) #sfHud{display:none}`;
document.head.appendChild(css);

/* ---------- serie di giorni ---------- */
function serie(){
  let s = { ultimo: null, giorni: 0 }; try { s = JSON.parse(ls.get('tg-serie')) || s; } catch(e){}
  if (s.ultimo === oggi()) return s;
  s.giorni = s.ultimo === ieri() ? (s.giorni || 0) + 1 : 1; s.ultimo = oggi(); ls.set('tg-serie', JSON.stringify(s));
  ev('serie', 'giorno', s.giorni);
  return s;
}
function premiSerie(s){
  try {
    const st = TG.Contadino.stato(TG.Profile.data); st.mezzi = st.mezzi || {};
    if (s.giorni >= 3 && !st.mezzi.vespa) { st.mezzi.vespa = 1; TG.Profile.salva(); ev('serie', 'vespa', s.giorni); setTimeout(() => toast('3 giorni de fila: a Vespa è tua. Premi V ne o garage'), 4000); }
    if (s.giorni >= 7 && !st.mezzi.trattore) { st.mezzi.trattore = 1; TG.Profile.salva(); ev('serie', 'trattore', s.giorni); setTimeout(() => toast('7 giorni de fila: o trattore è tuo!'), 4000); }
  } catch(e){}
}
const prossimoPremio = s => s.giorni < 3 ? { a: 3, cosa: 'a Vespa', tuo: 'tua' } : s.giorni < 7 ? { a: 7, cosa: 'o trattore', tuo: 'tuo' } : null;

/* ---------- icona sul telefono ---------- */
let installPrompt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
const giaInstallata = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
async function ricordamelo(){
  ev('ricordamelo', installPrompt ? 'prompt' : iOS ? 'ios' : 'manuale');
  if (installPrompt) { try { installPrompt.prompt(); const r = await installPrompt.userChoice; ev('ricordamelo', 'esito', null, { esito: r && r.outcome }); installPrompt = null; return; } catch(e){} }
  toast(iOS ? 'Tocca Condividi (il quadrato con la freccia) e poi «Aggiungi alla schermata Home»' : 'Dal menu del browser scegli «Aggiungi a schermata Home» (o «Installa app»)');
}

/* ---------- la card «torna domani» ---------- */
let cardMostrata = false, nocchieInizio = null;
async function cardTornaDomani(){
  if (cardMostrata || ls.get('tg-torna-visto') === oggi()) return;
  // una card alla volta: se c'è già qualcosa sopra il gioco, riprovo tra 20 s
  if (['pmOv', 'lvOv', 'missOv', 'rtOv', 'ngOv'].some(id => { const e = $(id); return e && !e.hidden && e.offsetParent !== null; })) { setTimeout(cardTornaDomani, 20000); return; }
  cardMostrata = true; ls.set('tg-torna-visto', oggi());
  const s = serie(), p = paese(), np = p ? nomeP(p) : 'o paese tuo';
  let distanza = '';
  try { const t = await TG.Account.comuniTrono('sempre'); const r = t.righe || []; const mio = r.find(x => x.paese === p);
    if (mio && mio.pos > 1) { const sopra = r.find(x => x.pos === mio.pos - 1); if (sopra) distanza = `${np} è a ${sopra.punti - mio.punti} nocchie da ${sopra.nome}: ${Math.max(1, Math.ceil((sopra.punti - mio.punti) / 30))} giocator${Math.ceil((sopra.punti - mio.punti) / 30) === 1 ? 'e' : 'i'} domani bastano.`; }
    else if (mio && mio.pos === 1) { const sotto = r.find(x => x.pos === 2); distanza = sotto ? `${np} è primo, ma ${sotto.nome} sta a ${mio.punti - sotto.punti} nocchie. Nun dormì.` : `${np} è primo. Resta primo.`; }
  } catch(e){}
  const pr = prossimoPremio(s);
  const nocchieOggi = Math.max(0, carico() - (nocchieInizio || 0));
  const o = document.createElement('div'); o.id = 'rtOv';
  o.innerHTML = `<div class="rtCard"><div class="rtEye">TORNA DOMANI</div>
  <h2>${s.giorni === 1 ? 'Primo giorno fatto.' : s.giorni + ' giorni de fila.'}</h2>
  <div class="rtSerie">${[1,2,3,4,5,6,7].map(i => `<i class="${i <= s.giorni ? 'on' : ''}"></i>`).join('')}</div>
  <p>${pr ? `Domani fai ${s.giorni + 1}: a ${pr.a} de fila ${pr.cosa} è ${pr.tuo}.` : 'Serie completa: o trattore è tuo.'}</p>
  <p>Domani a nocchia d'oro cambia posto (+10 pe' ${np}).${distanza ? ' ' + distanza : ''}</p>
  <div class="rtRow"><button class="rtBtn" id="rtRic">${giaInstallata() ? 'Ce vedemo domani' : 'Ricordamelo'}</button><button class="rtBtn sec" id="rtSfida">Sfida 'n amico</button><button class="rtBtn sec" id="rtVia" style="flex-basis:100%">Continua a giocà</button></div></div>`;
  document.body.appendChild(o); ev('torna_domani', 'vista', s.giorni);
  $('rtVia').onclick = () => o.remove();
  $('rtRic').onclick = () => { o.remove(); if (!giaInstallata()) ricordamelo(); };
  $('rtSfida').onclick = () => { o.remove(); sfidaAmico(nocchieOggi); };
}

/* ---------- sfida 'n amico ---------- */
async function sfidaAmico(n){
  const p = paese(), np = p ? nomeP(p) : 'a Tuscia';
  n = Math.max(1, Math.round(n || 0));
  const url = `${LINK}?utm_source=sfida&utm_campaign=sfida&n=${n}&da=${encodeURIComponent(p || '')}`;
  const testo = `Oggi ho raccolto ${n} nocchi${n === 1 ? 'a' : 'e'} pe' ${np} su Tuscia Games. Fai de mejo pe' o paese tuo, si ce riesci: ${url}`;
  ev('condividi', 'sfida', n);
  try { if (navigator.share) { await navigator.share({ title: "Sfida 'n amico", text: testo }); return; } } catch(e){}
  try { await navigator.clipboard.writeText(testo); toast('Copiato: incollalo su WhatsApp'); } catch(e){}
}
function arrivoSfida(){
  if (Q.get('utm_campaign') !== 'sfida') return;
  const n = parseInt(Q.get('n') || '0', 10) || 0, da = Q.get('da') || '';
  ev('arrivo', 'sfida', n, { da });
  const el = document.querySelector('#menu .intro');
  if (el) { el.textContent = `Uno de ${da ? nomeP(da) : "n'altro paese"} ha raccolto ${n} nocchi${n === 1 ? 'a' : 'e'} oggi e te sfida. Scegli o paese tuo e fanne ${n + 1}.`; el.classList.add('pmBenv'); }
  // contatore in partita
  let hud = null, battuta = false;
  const tick = () => {
    if (!document.body.classList.contains('playing')) return;
    if (!hud) { hud = document.createElement('div'); hud.id = 'sfHud'; document.body.appendChild(hud); }
    const mie = Math.max(0, carico() - (nocchieInizio || 0));
    if (!battuta && mie > n) { battuta = true; hud.textContent = `🏆 ${mie}`; toast(`Sfida vinta! ${mie} nocchie contro ${n}. Mo' rilancia tu.`); ev('sfida', 'vinta', mie); setTimeout(() => sfidaAmico(mie), 2500); return; }
    if (!battuta) hud.textContent = `⚔ ${mie}/${n + 1}`;
  };
  setInterval(tick, 1000);
}

/* ---------- avvio ---------- */
function avvioPartita(){
  nocchieInizio = carico();
  const s = serie(); premiSerie(s);
  setTimeout(cardTornaDomani, MINUTI_CARD * 60000);
  // se si torna al menu dopo almeno un minuto di gioco, la card esce lì
  const t0 = Date.now();
  new MutationObserver(() => { if (!document.body.classList.contains('playing') && Date.now() - t0 > 60000) cardTornaDomani(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
let partito = false;
new MutationObserver(() => { if (!partito && document.body.classList.contains('playing')) { partito = true; avvioPartita(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
if (document.readyState === 'complete') arrivoSfida(); else addEventListener('load', arrivoSfida);
TG.Ritorno = { serie, cardTornaDomani, sfidaAmico, ricordamelo };
})();
