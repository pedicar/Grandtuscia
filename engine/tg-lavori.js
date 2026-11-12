/* TG.Lavori — «O lavoro de oggi»: ogni giorno un personaggio di Radio Nocchia chiede una cosa che si fa in uno dei giochi.
   Il mondo diventa la piazza, i giochi le botteghe. Il premio torna nel mondo: lire e punti pe' o paese.
   Modulo aggiunto accanto a mondo/app.js (usa TG.debug.acts/setDest, TG.GIOCHI, TG.Profile, TG.Contadino, TG.PrimoMinuto). */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const $ = id => document.getElementById(id);
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c, v, x) => { try { TG.Stats && TG.Stats.ev(t, c, v, x); } catch(e){} };
const oggi = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const giornoN = () => Math.floor((Date.now() - new Date(2026, 0, 1).getTime()) / 864e5);

/* Chi chiede, cosa chiede, quanto paga. Il testo è quello che dice il personaggio. */
const LAVORI = [
 { gioco: 'vicopesca', chi: 'Bifo', dove: 'a o molo de o lago', dice: "Oh nì, me servono tre carpe pe' stasera. Vai a o lago e portamele. A carpa reale no, quella è mia.", lire: 3000, punti: 10 },
 { gioco: 'vicosail', chi: "Zi' Nello", dove: 'a Punta de o Lago', dice: "Stamattina c'è vento bono. Fai 'na regata pe' me, che io c'ho a schiena. Si arrivi tra i primi, pago.", lire: 3500, punti: 12 },
 { gioco: 'carrettini', chi: 'I ragazzini de Fabrica', dove: 'in cima a via Roma', dice: "Dicono che a Caprarola nun sanno scenne co' o carrettino. Vai a fa' vedé come se fa, che noi semo piccoli.", lire: 2500, punti: 10 },
 { gioco: 'citta', chi: "Mi' nonno", dove: 'a i campi de Falerii', dice: "Falerii l'ho fatta io, ma sta sotto tera. Pija o georadar e tirala su 'n antro po', che a gente nun ce crede.", lire: 3000, punti: 10 },
 { gioco: 'funghi', chi: "Mi' padre", dove: 'ne o bosco de o Cimino', dice: "I porcini stanno... vabbè, nun te lo dico. Ma si me porti 'n cestino pieno, stasera se magna. E nun dì a nessuno 'ndo sei stato.", lire: 2500, punti: 8 },
 { gioco: 'ciminodh', chi: "'N sorianese", dove: 'in cima a a faggeta', dice: "A faggeta è nostra, ma a discesa è de chi a fa più veloce. Scendi co' a bici e nun guardà i sassi.", lire: 3000, punti: 10 },
 { gioco: 'corseavuoto', chi: 'O barista de Ronciglione', dove: 'a Ronciglione', dice: "Stasera correno i cavalli senza fantino. Vai, tifa pe' o mio, e si vince te pago o caffè pe' 'n mese.", lire: 2500, punti: 8 },
 { gioco: 'vicovolo', chi: 'O pilota de o deltaplano', dove: 'su a caldera', dice: "Da lassù se vede tutta a Tuscia. Vola fino a e Pantanacce e dimme si o lago è calmo.", lire: 3000, punti: 10 },
 { gioco: 'santarosa', chi: "'N facchino", dove: 'a Viterbo', dice: "Ce manca 'n facchino pe' a Macchina. Sotto col ciuffo, che Santa Rosa nun aspetta.", lire: 3500, punti: 12 },
];
const MED = { oro: 2, argento: 1.5, bronzo: 1.2 };
const nomeGioco = id => { const g = (TG.GIOCHI || []).find(x => x.id === id); return g ? g.nome : id; };
const paese = () => (TG.PrimoMinuto && TG.PrimoMinuto.paese) || ls.get('tg-paese-dev');
const nomePaese = () => { const p = paese(); try { return TG.Account.nomeComune(p) || p; } catch(e){ return p; } };
function lavoroDiOggi(){ return LAVORI[giornoN() % LAVORI.length]; }
function trovaAtto(gioco){
  const acts = (TG.debug && TG.debug.acts) || [];
  const g = (TG.GIOCHI || []).find(x => x.id === gioco);
  return acts.find(a => a.id === gioco || a.gioco === gioco || a.game === gioco || (g && ((a.url || '').indexOf(g.cartella) >= 0 || a.name === g.nome))) || null;
}

/* ---------- stile ---------- */
const css = document.createElement('style');
css.textContent = `
#lvOv{position:fixed;inset:0;z-index:8900;background:rgba(16,22,21,.9);display:flex;align-items:flex-end;justify-content:center;padding:16px;font-family:"Figtree","Segoe UI",system-ui,sans-serif}
#lvOv[hidden]{display:none}
#lvOv .lvCard{width:min(560px,100%);background:#17201f;color:#f3e7cb;border:2px solid #f2c74e;border-radius:20px;padding:20px 18px 16px;margin-bottom:max(8px,env(safe-area-inset-bottom))}
#lvOv .lvEye{color:#f2c74e;font-weight:800;letter-spacing:.08em;font-size:12px}
#lvOv .lvChi{font-size:22px;font-weight:900;margin:4px 0 2px}
#lvOv .lvDove{color:#9aa39c;font-size:13px;margin-bottom:10px}
#lvOv .lvDice{font-size:17px;line-height:1.35;background:#1f2a28;border-left:4px solid #f2c74e;padding:10px 12px;border-radius:0 12px 12px 0}
#lvOv .lvPremio{margin-top:12px;font-size:14px;color:#c9bfa8}
#lvOv .lvPremio b{color:#f2c74e}
#lvOv .lvRow{display:flex;gap:10px;margin-top:14px}
#lvOv button{appearance:none;border:0;border-radius:12px;padding:13px 16px;font:800 16px "Figtree","Segoe UI",system-ui,sans-serif;background:#f2c74e;color:#14181a;cursor:pointer;flex:1}
#lvOv button.sec{background:transparent;border:2px solid #4a5a55;color:#f3e7cb;font-weight:600}
#lvOv .lvNum{font-size:56px;font-weight:900;color:#f2c74e;line-height:1;text-align:center}
`;
document.head.appendChild(css);
let ov;
function overlay(){ if (!ov) { ov = document.createElement('div'); ov.id = 'lvOv'; ov.hidden = true; document.body.appendChild(ov); } return ov; }

/* ---------- portare il giocatore al gioco ----------
   Il 10/11: 13 lavori accettati, 0 fatti. La freccia non bastava (il gioco può stare a chilometri). Ora, se non sei a piedi,
   il mezzo ti porta davanti all'ingresso (stesso teletrasporto di «Vai subito» della mappa); a piedi resta la freccia. */
function portaAl(gioco, frase){
  const a = trovaAtto(gioco);
  try {
    if (!a) { const g = (TG.GIOCHI || []).find(x => x.id === gioco); if (g) location.href = g.cartella + '/?via=missione'; return; }
    const aPiedi = TG.debug.VEH && TG.debug.VEH.cur && TG.debug.VEH.cur.id === 'piedi';
    TG.debug.setDest(a);
    if (aPiedi) { TG.msg && TG.msg(frase, 'Segui a freccia (co\' a Vespa ce arrivi prima)', 4); return; }
    TG.debug.goTo(a); setTimeout(() => TG.msg && TG.msg(frase, 'Sei arrivato: entra e fai o lavoro', 4), 1400); ev('lavoro', 'portato', null, { gioco });
  } catch(e){}
}

/* ---------- la proposta ---------- */
function proponi(){
  const L = lavoroDiOggi(); const k = oggi();
  if (ls.get('tg-lavoro-visto') === k) return;           // una volta al giorno
  if ((ls.get('tg-lavoro-fatto') || '') === k) return;
  ls.set('tg-lavoro-visto', k); ev('lavoro', 'proposto', null, { gioco: L.gioco });
  const o = overlay(); const p = nomePaese();
  o.innerHTML = `<div class="lvCard"><div class="lvEye">O LAVORO DE OGGI</div><div class="lvChi">${L.chi}</div><div class="lvDove">t'aspetta ${L.dove} · ${nomeGioco(L.gioco)}</div>
  <div class="lvDice">«${L.dice}»</div>
  <div class="lvPremio">Premio: <b>${L.lire.toLocaleString('it-IT')} lire</b>${p && p !== 'nessuno' ? ` e <b>+${L.punti} punti pe' ${nomeP(p)}</b>` : ''} · co' a medaglia d'oro è doppio.</div>
  <div class="lvRow"><button type="button" id="lvVai">Vado</button><button type="button" class="sec" id="lvDopo">Doppo</button></div></div>`;
  o.hidden = false;
  $('lvDopo').addEventListener('click', () => { o.hidden = true; ev('lavoro', 'rimandato', null, { gioco: L.gioco }); });
  $('lvVai').addEventListener('click', () => {
    o.hidden = true; ls.set('tg-lavoro-accettato', k + '|' + L.gioco); ev('lavoro', 'accettato', null, { gioco: L.gioco });
    portaAl(L.gioco, `${L.chi} t'aspetta ${L.dove}`);
  });
}

/* ---------- il ritorno: premio ---------- */
function alRitorno(){
  let q; try { q = new URLSearchParams(window.__tgQ != null ? window.__tgQ : location.search); } catch(e){ return false; }
  const da = q.get('da'); if (!da) return false;
  const acc = (ls.get('tg-lavoro-accettato') || '').split('|');
  if (acc[0] !== oggi() || acc[1] !== da) return false;
  const L = LAVORI.find(x => x.gioco === da); if (!L) return false;
  const ok = q.get('esito') === 'ok', med = q.get('med') || null;
  ls.set('tg-lavoro-accettato', '');
  const o = overlay();
  if (!ok) {
    ev('lavoro', 'mancato', null, { gioco: da });
    o.innerHTML = `<div class="lvCard"><div class="lvEye">O LAVORO DE OGGI</div><div class="lvChi">${L.chi}</div><div class="lvDice">«Vabbè, nun è giornata. Riprova, che o lavoro sta sempre lì.»</div><div class="lvRow"><button id="lvRi">Riprovo</button><button class="sec" id="lvNo">Doppo</button></div></div>`;
    o.hidden = false; $('lvNo').addEventListener('click', () => { o.hidden = true; });
    $('lvRi').addEventListener('click', () => { o.hidden = true; ls.set('tg-lavoro-accettato', oggi() + '|' + da); portaAl(da, `${L.chi} t'aspetta ${L.dove}`); });
    return true;
  }
  const molt = MED[med] || 1, lire = Math.round(L.lire * molt), punti = Math.round(L.punti * molt);
  try { const st = TG.Contadino.stato(TG.Profile.data); st.soldi = (st.soldi || 0) + lire; TG.Profile.salva(); } catch(e){}
  let inviati = null;
  try { if (TG.PrimoMinuto && TG.PrimoMinuto.mandaPunti) inviati = TG.PrimoMinuto.mandaPunti(punti); } catch(e){}
  ls.set('tg-lavoro-fatto', oggi()); ev('lavoro', 'fatto', lire, { gioco: da, med, punti });
  const p = nomePaese();
  o.innerHTML = `<div class="lvCard"><div class="lvEye">LAVORO FATTO${med ? ' · MEDAGLIA ' + med.toUpperCase() : ''}</div><div class="lvChi">${L.chi} è contento</div>
  <div class="lvNum">+${lire.toLocaleString('it-IT')}</div><div style="text-align:center;color:#c9bfa8">lire${p && p !== 'nessuno' ? ` · e <b style="color:#f2c74e">+${punti} punti pe' ${nomeP(p)}</b>` : ''}</div>
  <div class="lvDice" style="margin-top:12px">«${med === 'oro' ? 'Bravo, nì. Doppio, come promesso.' : med ? 'Bono. A prossima volta oro, eh.' : "Grazie. Domani c'è 'n antro lavoro."}»</div>
  <div class="lvRow"><button id="lvOk">Continua a giocà</button></div></div>`;
  o.hidden = false; $('lvOk').addEventListener('click', () => { o.hidden = true; });
  return true;
}

/* ---------- quando ---------- */
let partito = false;
new MutationObserver(() => {
  if (partito || !document.body.classList.contains('playing')) return; partito = true;
  // al ritorno da un gioco il mondo mostra il suo pannello (#missOv): il premio arriva quando quello si chiude
  const aperto = () => { const m = $('missOv'); return m && !m.hidden && getComputedStyle(m).display !== 'none'; };
  const attendi = (f, n) => { if (aperto() && n < 120) setTimeout(() => attendi(f, n + 1), 500); else f(); };
  setTimeout(() => attendi(() => { if (!alRitorno()) { const pm = TG.PrimoMinuto; const attesa = pm && pm.attivo ? 75000 : 25000; setTimeout(() => (TG.fermo ? TG.fermo(proponi, 90000) : proponi()), attesa); } }, 0), 2500);
}).observe(document.body, { attributes: true, attributeFilter: ['class'] });
const nomeP = p => { try { return (TG.PrimoMinuto && TG.PrimoMinuto.nomeComune && TG.PrimoMinuto.nomeComune(p)) || p; } catch(e){ return p; } };
TG.Lavori = { LAVORI, lavoroDiOggi, proponi, alRitorno, trovaAtto };
})();
