/* TG.PrimoMinuto — l'ingresso nel mondo per chi arriva da un post:
   1) «De 'ndo sei?»: il comune si sceglie subito, senza mail (si salva sul telefono; se c'è l'account, anche lì).
   2) Si parte sull'Ape, non a piedi.
   3) Obiettivo da 60 secondi: 10 nocchie pe' o paese; alla fine la card con i punti, «Condividi» e «Salva co' a mail».
   4) I punti vanno al comune anche senza account (tg_punto_dev: per dispositivo, massimo 30 al giorno).
   Modulo aggiunto accanto a mondo/app.js: usa solo TG.debug, TG.Profile, TG.Contadino, TG.Account, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const $ = id => document.getElementById(id);
const K_PAESE = 'tg-paese-dev', K_FATTO = 'tg-primo-minuto', K_APE = 'tg-ape-regalo';
const OBIETTIVO = 10, SECONDI = 60, TETTO = 30;
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const cfg = window.TG_STATS_CONFIG || {};
const ev = (t, c, v, x) => { try { TG.Stats && TG.Stats.ev(t, c, v, x); } catch(e){} };
const COMUNI_FISSI = [['fabrica','Fabrica di Roma'],['caprarola','Caprarola'],['carbognano','Carbognano'],['ronciglione','Ronciglione'],['vallerano','Vallerano'],['soriano','Soriano nel Cimino'],['viterbo','Viterbo'],['corchiano','Corchiano'],['civita','Civita Castellana'],['vignanello','Vignanello'],['canepina','Canepina'],['nepi','Nepi']];

/* ---------- stile ---------- */
const css = document.createElement('style');
css.textContent = `
#pmOv{position:fixed;inset:0;z-index:9000;background:rgba(16,22,21,.94);color:#f3e7cb;display:flex;align-items:center;justify-content:center;padding:18px;font-family:"Figtree","Segoe UI",system-ui,sans-serif}
#pmOv[hidden]{display:none}
#pmOv .pmBox{width:min(560px,100%);max-height:100%;overflow:auto;text-align:center}
#pmOv .pmEye{color:#f2c74e;font-weight:800;letter-spacing:.08em;font-size:13px}
#pmOv h2{font-size:clamp(30px,8vw,46px);margin:6px 0 4px;line-height:1}
#pmOv p{color:#c9bfa8;margin:0 0 16px;font-size:15px}
#pmOv .pmGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
@media(min-width:480px){#pmOv .pmGrid{grid-template-columns:repeat(3,1fr)}}
#pmOv .pmGrid button,#pmOv .pmBtn{appearance:none;border:0;border-radius:12px;padding:14px 10px;font:800 16px "Figtree","Segoe UI",system-ui,sans-serif;background:#f2c74e;color:#14181a;cursor:pointer}
#pmOv .pmGrid button.alt{background:transparent;border:2px solid #4a5a55;color:#f3e7cb;font-weight:600}
#pmOv .pmAltro{margin-top:12px;display:flex;gap:8px}
#pmOv .pmCerca{margin-top:12px;width:100%;box-sizing:border-box;padding:13px 14px;border-radius:12px;border:2px solid #4a5a55;background:#0f1514;color:#f3e7cb;font:600 16px "Figtree","Segoe UI",system-ui,sans-serif}#pmOv .pmCerca::placeholder{color:#8e9b96}
#pmOv .pmTrovati{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px}#pmOv .pmTrovati button{appearance:none;border:2px solid #4a5a55;border-radius:12px;padding:11px 8px;background:transparent;color:#f3e7cb;font:700 15px "Figtree","Segoe UI",system-ui,sans-serif;cursor:pointer}#pmOv .pmTrovati button.si{background:#f2c74e;border-color:#f2c74e;color:#14181a}#pmOv .pmNiente{margin:8px 0 0;font-size:13px;color:#8e9b96}
#pmOv select{flex:1;border-radius:12px;border:2px solid #4a5a55;background:#1d2726;color:#f3e7cb;padding:12px;font-size:16px}
#pmOv .pmSkip{background:none;border:0;color:#8f978f;text-decoration:underline;margin-top:14px;cursor:pointer;font-size:14px}
#pmHud{position:fixed;left:50%;top:118px;transform:translateX(-50%);z-index:60;background:rgba(16,22,21,.86);color:#f3e7cb;border:2px solid #f2c74e;border-radius:14px;padding:8px 14px;font:700 15px "Figtree","Segoe UI",system-ui,sans-serif;display:flex;gap:12px;align-items:center;pointer-events:none}
#pmHud b{color:#f2c74e;font-size:20px}
#pmHud .pmBar{width:90px;height:8px;background:#2b3634;border-radius:4px;overflow:hidden}
#pmHud .pmBar i{display:block;height:100%;background:#f2c74e;width:0}
#pmOv .pmCard{background:#17201f;border:2px solid #f2c74e;border-radius:18px;padding:22px 18px}
#pmOv .pmNum{font-size:clamp(54px,18vw,96px);font-weight:900;color:#f2c74e;line-height:1}
#pmOv .pmRow{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:16px}
#pmOv .pmBtn.sec{background:transparent;border:2px solid #f2c74e;color:#f3e7cb}
#pmRiga{position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:55;background:rgba(16,22,21,.82);color:#f3e7cb;border-radius:999px;padding:6px 14px;font:700 13px "Figtree","Segoe UI",system-ui,sans-serif;white-space:nowrap;pointer-events:auto;cursor:pointer;border:1px solid rgba(242,199,78,.5)}
#pmRiga b{color:#f2c74e}
body:not(.playing) #pmRiga{display:none}
body.touch:has(#prompt:not([hidden])) #pmRiga{display:none}  /* quando c'è il pulsante dell'azione (IL PODERE, ENTRA…) la riga si toglie di mezzo */
#pmRiga.pmQuieta{opacity:.55;font-size:12px;padding:4px 10px}
@media (max-width:700px){#pmRiga{font-size:12px;padding:5px 11px;max-width:92vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
#pmHud{top:196px}
.pmBenv{color:#f2c74e!important;font-weight:700}
`;
document.head.appendChild(css);

/* ---------- stato ---------- */
const PM = { paese: ls.get(K_PAESE) || null, attivo: false, base: 0, t0: 0, timer: null, inviati: 0, oggi: 0, rientro: null };
TG.PrimoMinuto = PM;

function nomeComune(id){
  try { const n = TG.Account && TG.Account.nomeComune && TG.Account.nomeComune(id); if (n && n !== id) return n; } catch(e){}
  const f = COMUNI_FISSI.find(c => c[0] === id); return f ? f[1] : (id || '');
}
const POPOLARI = ['caprarola', 'fabrica', 'carbognano', 'ronciglione', 'canepina', 'vallerano', 'soriano', 'civita-castellana', 'viterbo', 'nepi', 'vignanello', 'corchiano'];
const piatto = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ');
async function listaComuni(){
  try { if (TG.Account && TG.Account.comuni) { const l = await Promise.race([TG.Account.comuni(), new Promise(r => setTimeout(() => r(null), 2500))]); if (l && l.length) return l; } } catch(e){}
  return COMUNI_FISSI.map(([id, nome]) => ({ id, nome }));
}

/* ---------- overlay ---------- */
let ov;
function overlay(){
  if (ov) return ov;
  ov = document.createElement('div'); ov.id = 'pmOv'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  document.body.appendChild(ov); return ov;
}
async function chiediPaese(){
  const o = overlay(); const comuni = await listaComuni();
  // i 6 più giocati come bottoni (il 10/11: 22 giocatori su 29 hanno dovuto aprire «Altro comune…» perché i primi sei erano in ordine alfabetico);
  // tutti gli altri si trovano scrivendo due lettere
  const rank = c => { const i = POPOLARI.indexOf(c.id); return i < 0 ? 99 : i; };
  const ord = comuni.slice().sort((a, b) => rank(a) - rank(b) || a.nome.localeCompare(b.nome, 'it'));
  const primi = ord.slice(0, 6), fuori = ord.find(c => c.id === 'fuori');
  o.innerHTML = `<div class="pmBox"><div class="pmEye">TRONO DE NOCCHIE · SFIDA DEI COMUNI</div><h2>De 'ndo sei?</h2>
  <p>${(CAMP && FRASI_ARRIVO[CAMP]) || "Ogni nocchia che raccoi è 'n punto pe' o paese tuo. Scegli o comune: a classifica è pubblica."}</p>
  <div class="pmGrid">${primi.map(c => `<button data-p="${c.id}">${c.nome}</button>`).join('')}</div>
  <input class="pmCerca" id="pmCerca" type="search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Scrivi o paese tuo (so' ${comuni.length - (fuori ? 1 : 0)} comuni de a Tuscia)…" aria-label="Cerca il tuo comune">
  <div class="pmTrovati" id="pmTrovati" hidden></div>
  <button class="pmSkip" id="pmSkip">${fuori ? 'Nun so de a Tuscia (ma gioco pe\' a Tuscia)' : 'Nun so de a Tuscia, gioco e basta'}</button></div>`;
  o.hidden = false;
  return new Promise(res => {
    const fine = p => { o.hidden = true; res(p); };
    o.querySelectorAll('.pmGrid button').forEach(b => b.addEventListener('click', () => fine(b.dataset.p)));
    const inp = $('pmCerca'), box = $('pmTrovati');
    const cerca = () => {
      const q = piatto(inp.value).trim(); box.innerHTML = '';
      if (q.length < 2) { box.hidden = true; return; }
      const inizia = c => piatto(c.nome).split(' ').some(w => w.startsWith(q));
      const tr = ord.filter(c => c.id !== 'fuori' && (inizia(c) || piatto(c.nome).includes(q))).sort((x, y) => (inizia(y) ? 1 : 0) - (inizia(x) ? 1 : 0)).slice(0, 8);
      box.hidden = false;
      if (!tr.length) { box.innerHTML = '<p class="pmNiente">Nun lo trovo: prova co\' n\'altro nome, o scegli «Nun so de a Tuscia»</p>'; return; }
      tr.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c.nome; if (i === 0) b.className = 'si'; b.addEventListener('click', () => { ev('paese_cercato', c.id); fine(c.id); }); box.appendChild(b); });
    };
    inp.addEventListener('input', cerca);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = box.querySelector('button'); if (b) b.click(); } });
    $('pmSkip').addEventListener('click', () => fine(fuori ? 'fuori' : 'nessuno'));
  });
}
async function impostaPaese(p){
  PM.paese = p; ls.set(K_PAESE, p); ev('paese_scelto', p);
  try { const a = TG.Account; if (p !== 'nessuno' && a && a.stato === 'registrato' && !a.paese && a.scegliPaese) await a.scegliPaese(p); } catch(e){}
}

/* ---------- il post da cui si arriva parla nel menu ---------- */
const CAMP = (() => { try { return new URLSearchParams(window.__tgQ != null ? window.__tgQ : location.search).get('utm_campaign') || ''; } catch(e){ return ''; } })();
const FRASI_ARRIVO = {
  classifica: "Hai visto a classifica de stasera. O paese tuo sale solo si giochi: scegli o comune e raccoi.",
  nocchia: "A nocchia d'oro de oggi sta nascosta ne o mondo: vale 10 pe' o paese tuo. Scegli o comune e vai a cercalla.",
  derby: "O paese tuo sta sotto in classifica. Rimedia: scegli o comune, raccoi, e i punti so' suoi.",
  calendario: "'Na frase a o giorno, 'na nocchia a o giorno. Oggi tocca a te: raccoi pe' o paese tuo.",
  abbecedario: "Qui Radio Nocchia parla caprolatto davero. Entra, accendila, e intanto raccoi pe' Caprarola.",
  tozzetto: "O tozzetto l'hai letto. Mo' raccoi: dieci nocchie in 'n minuto e o paese tuo sale.",
  oroscopo: "E stelle hanno detto a loro. Mo' tocca a te: 'n minuto de raccolta e o paese tuo sale in classifica.",
  primo_minuto: "Qualcuno de o paese tuo ha raccolto 10 nocchie in 'n minuto. Battilo.",
  condivisione: "T'hanno mandato qui pe' 'n motivo: o paese vostro c'ha bisogno de punti. 'N minuto e sei in classifica."
};
function autoPlay(){
  // chi arriva da un post non deve premere niente: il menu si salta (il 10/11: 44 dispositivi, 29 arrivati a «Gioca subito»)
  const menu = $('menu'), b = $('bPlay'); if (!menu || !b) return;
  if (PM.paese) return;  // chi ha già il paese vede il menu: il tocco su «Gioca subito» serve al browser per far partire l'audio
  const via = () => { if (menu.hidden || b.dataset.auto) return; b.dataset.auto = '1'; ev('auto_play', CAMP); setTimeout(() => b.click(), 500); };
  if (!menu.hidden) via(); else new MutationObserver((m, o) => { if (!menu.hidden) { via(); o.disconnect(); } }).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
}
function benvenuto(){
  if (!CAMP) return; ev('arrivo', CAMP); autoPlay();
  const f = FRASI_ARRIVO[CAMP]; if (!f) return;
  const el = document.querySelector('#menu .intro'); if (el) { el.textContent = f; el.classList.add('pmBenv'); }
}
function caricato(){
  try { const t = (performance.now() - (window.__tgT0 || 0)) / 1000; ev('caricato', CAMP || 'nessuna', Math.round(t * 10) / 10); } catch(e){}
}

/* ---------- la classifica sempre sotto gli occhi ---------- */
let riga, trono = null;
const K_ULTIMO = 'tg-trono-ultimo';  // com'era messo il paese l'ultima volta che l'hai visto: serve al rientro («ieri sera…»)
const oggiStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function ricorda(mio, sopra){ try { localStorage.setItem(K_ULTIMO, JSON.stringify({ g: oggiStr(), paese: PM.paese, pos: mio ? mio.pos : 0, punti: mio ? mio.punti : 0, sopra: sopra ? sopra.nome : '', gap: sopra && mio ? sopra.punti - mio.punti : 0 })); } catch(e){} }
async function aggiornaRiga(){
  if (!PM.paese || PM.paese === 'nessuno') return;
  try { trono = await TG.Account.comuniTrono('sempre'); } catch(e){ return; }
  const r = (trono.righe || []); const mio = r.find(x => x.paese === PM.paese);
  if (!riga) { riga = document.createElement('button'); riga.id = 'pmRiga'; riga.type = 'button'; setTimeout(() => riga.classList.add('pmQuieta'), 8000); riga.addEventListener('click', () => { try { TG.debug.openTrono('comuni', PM.paese); } catch(e){} }); document.body.appendChild(riga); }
  const nome = nomeComune(PM.paese), tu = PM.oggi > 0 ? ` · tu +${PM.oggi} oggi` : '';
  const sopra = mio ? r.find(x => x.pos === mio.pos - 1) : null;
  ricorda(mio, sopra);
  if (!mio) { riga.innerHTML = `<b>${nome}</b> nun è ancora in classifica · a prima nocchia è tua`; return; }
  riga.innerHTML = mio.pos === 1 ? `<b>${nome}</b> è 1ª · ${mio.punti} nocchie${tu}` : `<b>${nome}</b> ${mio.pos}ª · ne mancano ${sopra ? sopra.punti - mio.punti : 0} a ${sopra ? sopra.nome : ''}${tu}`;
  // il rientro: se è un giorno nuovo, la riga resta visibile 20 s invece di quietarsi dopo 8
  if (PM.rientro && !riga.dataset.rientro) { riga.dataset.rientro = '1'; riga.classList.remove('pmQuieta'); setTimeout(() => riga.classList.add('pmQuieta'), 20000); }
}
// Al rientro in un giorno nuovo, il menu racconta com'è finita ieri sera: niente card in più, solo la frase d'ingresso
function rientro(){
  let u = null; try { u = JSON.parse(localStorage.getItem(K_ULTIMO) || 'null'); } catch(e){}
  if (!u || !PM.paese || u.paese !== PM.paese || u.g === oggiStr()) return;
  PM.rientro = u;
  const nome = nomeComune(PM.paese);
  const frase = !u.pos ? `${nome} nun è ancora in classifica: oggi ce lo metti tu.` : u.pos === 1 ? `Ieri sera ${nome} ha chiuso 1ª co' ${u.punti} nocchie. Oggi se difende.` : `Ieri sera ${nome} ha chiuso ${u.pos}ª, a ${u.gap} nocchie da ${u.sopra}. Oggi se recupera.`;
  ev('rientro', PM.paese, u.pos);
  const el = document.querySelector('#menu .intro');
  if (CAMP || !el) { PM.fraseRientro = frase; return; }  // il menu si salta: la frase arriva in gioco
  el.textContent = frase; el.classList.add('pmBenv');
}

/* ---------- pulsante Gioca: prima il paese ---------- */
function aggancia(){
  benvenuto(); rientro();
  const menu = $('menu');
  if (menu) { if (!menu.hidden) caricato(); else new MutationObserver((m, o) => { if (!menu.hidden) { caricato(); o.disconnect(); } }).observe(menu, { attributes: true, attributeFilter: ['hidden'] }); }
  const b = $('bPlay'); if (!b) return;
  b.addEventListener('click', async e => {
    try { if (!PM.paese && TG.Account && TG.Account.paese) { PM.paese = TG.Account.paese; ls.set(K_PAESE, PM.paese); } } catch(e){}
    if (PM.paese || b.dataset.pmOk) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const p = await chiediPaese(); await impostaPaese(p);
    b.dataset.pmOk = '1'; b.click(); delete b.dataset.pmOk;
  }, true);
}

/* ---------- punti al comune ---------- */
async function mandaPunti(n){
  if (!n || n <= 0 || !PM.paese || PM.paese === 'nessuno' || !cfg.url) return null;
  const dev = TG.Stats && TG.Stats.dispositivo; if (!dev) return null;
  try {
    const r = await fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/tg_punto_dev', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.key, Authorization: 'Bearer ' + cfg.key }, body: JSON.stringify({ p_dev: dev, p_paese: PM.paese, p_punti: Math.min(TETTO, Math.round(n)) }) });
    if (!r.ok) return null; const j = await r.json(); PM.inviati += n; if (j && j.oggi != null) PM.oggi = j.oggi; setTimeout(aggiornaRiga, 800); return j;
  } catch(e){ return null; }
}
PM.mandaPunti = mandaPunti;
PM.nomeComune = nomeComune;
PM.chiediPaese = async () => { if (PM.paese) return PM.paese; const p = await chiediPaese(); await impostaPaese(p); return p; };
// ogni nocchia raccolta nella sessione conta (si manda a pacchetti)
let ultimoCarico = null, daMandare = 0;
function carico(){ try { return TG.debug.caricoTot(); } catch(e){ return 0; } }
function tickPunti(){
  const c = carico(); if (ultimoCarico === null) ultimoCarico = c;
  if (c > ultimoCarico) daMandare += c - ultimoCarico; ultimoCarico = c;
  if (daMandare >= 5) { const n = daMandare; daMandare = 0; mandaPunti(n); }
}
addEventListener('pagehide', () => { if (daMandare > 0) { const n = daMandare; daMandare = 0; mandaPunti(n); } });

/* ---------- Ape in regalo ---------- */
function regalaApe(){
  try {
    const st = TG.Contadino.stato(TG.Profile.data); st.mezzi = st.mezzi || {};
    if (!st.mezzi.ape) { st.mezzi.ape = 1; TG.Profile.salva(); ev('ape_regalo', 'primo_minuto'); }
    if (TG.debug.VEH && TG.debug.VEH.cur && TG.debug.VEH.cur.id === 'piedi') TG.debug.setVehicle('ape');
    ls.set(K_APE, '1');
  } catch(e){}
}

/* ---------- il primo minuto ---------- */
let hud;
function mostraHud(n, sec){
  if (!hud) { hud = document.createElement('div'); hud.id = 'pmHud'; document.body.appendChild(hud); }
  const p = nomeComune(PM.paese);
  hud.innerHTML = `<span>Nocchie pe' <b>${p}</b></span><b>${Math.min(n, OBIETTIVO)}/${OBIETTIVO}</b><span class="pmBar"><i style="width:${Math.min(100, n / OBIETTIVO * 100)}%"></i></span><span>${sec}s</span>`;
}
function avvia(){
  if (PM.attivo || ls.get(K_FATTO)) return;
  if (!PM.paese || PM.paese === 'nessuno') return;
  PM.attivo = true; PM.base = carico(); PM.t0 = Date.now(); ev('primo_minuto', 'inizio');
  try { TG.debug.showToast && TG.debug.showToast(`Raccoi ${OBIETTIVO} nocchie pe' ${nomeComune(PM.paese)} prima che finisce o minuto!`); } catch(e){}
  PM.timer = setInterval(() => {
    const n = Math.max(0, carico() - PM.base), sec = Math.max(0, SECONDI - Math.floor((Date.now() - PM.t0) / 1000));
    mostraHud(n, sec);
    if (n >= OBIETTIVO || sec <= 0) fine(n);
  }, 250);
}
async function fine(n){
  clearInterval(PM.timer); PM.attivo = false; ls.set(K_FATTO, '1'); hud && hud.remove(); hud = null;
  ev('primo_minuto', n >= OBIETTIVO ? 'riuscito' : 'tempo', n);
  const paese = nomeComune(PM.paese);
  const r = await mandaPunti(Math.max(1, n)); daMandare = 0; ultimoCarico = carico();
  let pos = '';
  try { const t = await TG.Account.comuniTrono('sempre'); const riga = (t.righe || []).find(x => x.paese === PM.paese); if (riga) pos = `${paese} è ${riga.pos}ª co' ${riga.punti} punti`; } catch(e){}
  const reg = TG.Account && TG.Account.stato === 'registrato';
  const o = overlay();
  o.innerHTML = `<div class="pmBox"><div class="pmCard"><div class="pmEye">${n >= OBIETTIVO ? 'CE L\'HAI CACCIATA!' : 'O MINUTO È FINITO'}</div>
  <div class="pmNum">${n}</div><h2 style="font-size:26px">nocchie pe' ${paese}</h2>
  <p>${pos ? pos + '. ' : ''}${r && r.oggi != null ? `Oggi hai portato ${r.oggi} punti a o paese (massimo ${r.tetto} al giorno senza account).` : ''}</p>
  ${reg ? '' : `<p style="color:#f3e7cb">Vòi che i punti contano senza limite e restano pure si cambi telefono? Salva a partita co' a mail: ce vòle 'n minuto.</p>`}
  <div class="pmRow"><button class="pmBtn" id="pmShare">Condividi</button>${reg ? '' : '<button class="pmBtn sec" id="pmSalva">Salva co\' a mail</button>'}<button class="pmBtn sec" id="pmVia">Continua a giocà</button></div></div></div>`;
  o.hidden = false;
  $('pmVia').addEventListener('click', () => { o.hidden = true; });
  $('pmShare').addEventListener('click', async () => {
    const testo = `Ho raccolto ${n} nocchie pe' ${paese} in 'n minuto su Grand Tuscia Adventure. ${pos ? pos + '. ' : ''}Gioca pe' o paese tuo: https://grandtuscia.netlify.app/?utm_source=condivisione&utm_campaign=primo_minuto`;
    ev('condividi', 'primo_minuto');
    try { if (navigator.share) { await navigator.share({ title: 'Trono de Nocchie', text: testo }); return; } } catch(e){}
    try { await navigator.clipboard.writeText(testo); TG.debug.showToast && TG.debug.showToast('Copiato: incollalo su WhatsApp'); } catch(e){}
  });
  const s = $('pmSalva'); s && s.addEventListener('click', () => { o.hidden = true; try { TG.debug.openTrono('comuni', PM.paese); } catch(e){} });
}

/* ---------- quando parte la partita ---------- */
function avvioPartita(){
  if (!ls.get(K_APE)) regalaApe();
  if (PM.fraseRientro) setTimeout(() => { try { TG.msg(PM.fraseRientro, '', 6); } catch(e){} }, 6000);
  ultimoCarico = carico(); setInterval(tickPunti, 2000);
  aggiornaRiga(); setInterval(aggiornaRiga, 120000);
  setTimeout(avvia, 1500);
}
let partito = false;
new MutationObserver(() => {
  if (!partito && document.body.classList.contains('playing')) { partito = true; avvioPartita(); }
}).observe(document.body, { attributes: true, attributeFilter: ['class'] });

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aggancia); else aggancia();
})();
