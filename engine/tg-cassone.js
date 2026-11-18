/* GRAND TUSCIA 2.0 — RACCOJI, POI SCEGLI DOVE SCARICÀ.
   - Le nocchie raccolte ovunque (tutti i campi, anche quelli de l'altri) vanno ne o CASSONE: 60 a piedi, 100 in Vespa,
     150 co' l'Ape, 250 col trattore. Pieno = nun raccoje più (mondo/app.js Pi()). Si salva sul telefono.
   - Dentro un terreno compare o bottone grande «SCARICA 45»: e nocchie vanno a quel terreno pe' o paese tuo (server:
     tg_terra_deposito). Prima de scaricà vedi cosa succede («Co' 45: Fabrica 140 – 120, è vostro!»).
   - In cima a a mappa: come sta o paese tuo (terreni, contesi, posizione).
   Esterno: TG.Terre (deposita, stato, righe, lista, terraIn, colore, padrone), TG.debug (car, VEH), TG.msg, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c, v, x) => { try { TG.Stats && TG.Stats.ev(t, c, v, x); } catch(e){} };
const msg = (a, b, s) => { try { TG.msg(a, b, s); } catch(e){} };
const $ = id => document.getElementById(id);
const CAPIENZA = { piedi: 60, vespa: 100, ape: 150, trattore: 250, semovente: 400 };
const MINIMO = 10;
let n = Math.max(0, +(ls.get('tg-cassone') || 0) || 0), avvisoPieno = 0, prima10 = !ls.get('tg-cassone-10');
const mezzo = () => { try { return TG.debug.VEH.cur.id; } catch(e){ return 'vespa'; } };
const cap = () => Math.round((CAPIENZA[mezzo()] || 100) * (TG.Coop && TG.Coop.mio() >= 1 ? 1.1 : 1));   // cooperativa liv 1: cassone +10%
const salva = () => ls.set('tg-cassone', String(n));
const C = TG.Cassone = {
  get n(){ return n; }, cap, MINIMO,
  pieno: () => n >= cap(),
  aggiungi(a, forza){   // forza: i premi de i giochi entrano anche oltre o cassone
    if (!(a > 0)) return 0; const c = cap(); if (n >= c && !forza) { C.avvisa(); return 0; }
    const k = forza ? a : Math.min(a, c - n); const era = n; n += k; salva();
    if (prima10 && n >= 10) { prima10 = false; ls.set('tg-cassone-10', '1'); msg('Brau! 10 nocchie ne o cassone', 'Co\' e nocchie se compra: terreni e mezzi', 3.5); }
    if (era < c * .5 && n >= c * .5 && n < c) { if (!ls.get('tg-primo-scarico')) grande(`Hai già ${n} nocchie!`, 'I terreni liberi costano 10: entra in un campo e premi COMPRA'); else msg('O cassone se sta a riempì', `${n}/${c}: ancora poche e se parte a l'attacco`, 2.5); }
    if (n >= c && era < c) { ev('cassone_pieno', mezzo(), c); grande('Cassone pieno!', 'Entra in un campo e premi COMPRA, o tocca o riquadro pe\' a mappa'); avvisoPieno = Date.now(); }
    return k;
  },
  togli(a){ n = Math.max(0, n - a); salva(); },
  compraMezzo: id => compraMezzo(id), prossimoMezzo: () => prossimoMezzo(),
  // viaggio veloce verso i terreni (da a mappa) pe' chi c'ha o trattore o a semovente
  veloce(){ try { const m = TG.Contadino.stato(TG.Profile.data).mezzi || {}; return !!(m.trattore || m.semovente); } catch(e){ return false; } },
  avvisa(){ if (Date.now() - avvisoPieno < 25000) return; avvisoPieno = Date.now(); msg('Cassone pieno', 'Vai a scaricà su un terreno: apri a mappa e scegli', 3.5); }
};

/* ---------- o messaggio grande in mezzo (cassone pieno, primo attacco): nun blocca, sparisce da solo ---------- */
// niente pannelli in mezzo a o schermo: o messaggio va ne a riga in alto e o riquadro de l'obiettivo lampeggia
function grande(t, s){ msg('🌰 ' + t, s, 5); const o = $('obi'); if (o) { o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash'); setTimeout(() => o.classList.remove('flash'), 4200); } }

/* ---------- o bottone SCARICA ---------- */
const st = document.createElement('style'); st.textContent = `
#scBtn{position:fixed;z-index:33;right:calc(14px + env(safe-area-inset-right,0px));bottom:calc(118px + env(safe-area-inset-bottom,0px));display:none;flex-direction:column;align-items:center;justify-content:center;min-width:148px;padding:12px 18px 10px;border:0;border-radius:22px;background:#ff8a3c;color:#fff;font:900 20px/1.05 Figtree,"Segoe UI",system-ui,sans-serif;box-shadow:0 5px 0 #b4561c,0 10px 24px rgba(0,0,0,.35);cursor:pointer;touch-action:manipulation}
#scBtn *{pointer-events:none}#scBtn small{display:block;margin-top:3px;font:800 12px/1.2 Figtree,sans-serif;opacity:.95}
#scBtn:active{transform:translateY(3px);box-shadow:0 2px 0 #b4561c,0 6px 14px rgba(0,0,0,.3)}
#scBtn.no{background:#4a524e;box-shadow:0 5px 0 #2c322f,0 10px 24px rgba(0,0,0,.35)}
#scBtn.go{animation:scPulse 1.1s ease-in-out infinite}@keyframes scPulse{50%{transform:scale(1.06)}}
body:not(.playing) #scBtn,body:has(#mapOv:not([hidden])) #scBtn,body:has(#trFesta) #scBtn,body:has(#trOv:not([hidden])) #scBtn{display:none!important}
html.tg-scarica #prompt{display:none!important}
body:has(#vehOv:not([hidden])) #scBtn,body:has(#vehOv:not([hidden])) #obi,body:has(#vehOv:not([hidden])) #scGrande{display:none!important}
#scGrande{position:fixed;z-index:36;left:50%;top:42%;transform:translate(-50%,-50%);width:min(330px,86vw);padding:16px 18px 14px;border-radius:20px;background:rgba(16,22,21,.93);border:3px solid #ff8a3c;color:#f3e7cb;text-align:center;font:700 15px/1.3 Figtree,"Segoe UI",system-ui,sans-serif;box-shadow:0 12px 34px rgba(0,0,0,.45);cursor:pointer;animation:scIn .35s cubic-bezier(.2,1.4,.4,1)}#scGrande b{display:block;font:900 26px/1.1 Figtree,sans-serif;color:#fff;margin-bottom:6px}#scGrande span{display:block}#scGrande i{display:inline-block;margin-top:10px;padding:7px 14px;border-radius:999px;background:#ff8a3c;color:#fff;font:900 14px Figtree,sans-serif;font-style:normal}#scGrande.via{opacity:0;transition:opacity .4s}@keyframes scIn{from{transform:translate(-50%,-50%) scale(.6);opacity:0}}body:not(.playing) #scGrande,body:has(#mapOv:not([hidden])) #scGrande{display:none}
html body.touch #prompt#prompt{left:calc(172px + env(safe-area-inset-left,0px))!important;right:calc(12px + env(safe-area-inset-right,0px))!important;transform:none!important;max-width:none!important}   
@media (max-width:420px){html body.touch #pMore{display:none!important}}
#obi.flash{animation:obiFlash .7s ease-in-out 6;border-color:#ff8a3c!important}@keyframes obiFlash{50%{box-shadow:0 0 0 4px rgba(255,138,60,.85),0 6px 18px rgba(0,0,0,.3)}}
#prompt.tgVinci{box-shadow:0 0 0 3px rgba(242,199,78,.8)}#prompt .tgVinci{display:block!important;color:#f2c74e;font-weight:800;font-size:13px;white-space:nowrap}
#scVolo{position:fixed;z-index:34;pointer-events:none;font-size:22px;transition:transform .7s cubic-bezier(.3,.6,.4,1),opacity .7s}`;
document.head.appendChild(st);
let btn = null, occupato = false;
function bottone(){
  const W = TG.Terre, D = TG.debug; if (!W || !D || !D.car) return;
  if (!btn) { btn = document.createElement('button'); btn.id = 'scBtn'; btn.type = 'button'; btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); scarica(); }); btn.onclick = e => { e.stopPropagation(); }; /* pointerdown: parte subito, nun se perde */ document.body.appendChild(btn); }
  const car = D.car, T = W.terraIn(car.x, car.z), p = W.paeseMio && W.paeseMio();
  const ok = T && p && !(W.derby && W.derby(T.id) && !(W.sfida() || { p: [] }).p.includes(p));
  document.documentElement.classList.toggle('tg-scarica', !!ok);
  if (!ok || occupato) { btn.style.display = occupato ? 'flex' : 'none'; return; }
  btn.style.display = 'flex';
  const s = W.stato(T.id), c = W.costo(T.id), tasto = matchMedia('(pointer:fine)').matches ? ' · tasto E' : '';
  const nostro = s === 'nostro', pago = !nostro && n >= c;
  const pr = W.prezzo(T.id), max = W.alMassimo && W.alMassimo(T.id), mette = Math.min(n, 300, Math.max(0, 300 - pr)), rq = W.riconquista && W.riconquista(T.id);
  const h = nostro ? (max ? `✅ AL MASSIMO<small>vale 300: chi o vò paga 310</small>` : n >= MINIMO ? `🛡 RINFORZA<small>ce metti ${mette} 🌰 · poi costa ${pr + mette + 10}${tasto}</small>` : `✅ È NOSTRO<small>costa ${c} a chi o vò</small>`)
    : pago ? (rq ? `🏠 RIPRENDILO<small>a metà: ${c} 🌰${tasto}</small>` : `💰 COMPRA<small>costa ${c} 🌰 · ce l'hai${tasto}</small>`) : `💰 COSTA ${c}<small>${rq ? 'a metà, è de casa · ' : ''}te ne mancano ${c - n}</small>`;
  const bl = W.blocco ? W.blocco() : 0;
  if (bl && (pago || (nostro && n >= MINIMO && !max))) { const hb = `🐢 ASPETTA<small>limite orario · fra ${bl} min</small>`; btn.classList.add('no'); btn.classList.remove('go'); if (btn._h !== hb) { btn._h = hb; btn.innerHTML = hb; } return; }
  btn.classList.toggle('no', !(pago || (nostro && n >= MINIMO && !max))); if (btn._h !== h) { btn._h = h; btn.innerHTML = h; }   // riscritto solo se cambia: sennò Safari perde o clic
  btn.classList.toggle('go', pago);
}
async function scarica(){
  const W = TG.Terre, D = TG.debug; if (occupato || !W || !D) return;
  const T = W.terraIn(D.car.x, D.car.z); if (!T) return;
  const nostro = W.stato(T.id) === 'nostro', c = W.costo(T.id);
  if (W.blocco && W.blocco()) { msg('🐢 Limite orario raggiunto', `Al massimo 3.000 nocchie spese in un'ora: riprova fra ${W.blocco()} min`, 3.5); return; }
  if (nostro && W.alMassimo && W.alMassimo(T.id)) { msg('✅ È già al massimo', 'Vale 300: rinforza un antro terreno vostro', 3); return; }
  if (nostro && n < MINIMO) { msg('È già vostro', 'Raccoji nocchie pe\' rinforzallo', 2.5); return; }
  if (!nostro && n < c) { msg(`Costa ${c}: te ne mancano ${c - n}`, 'Raccoji ancora e torna (o cerca un terreno che costa meno)', 3.5); return; }
  occupato = true; btn._h = '…'; btn.innerHTML = '…'; volo();
  try { const r = await W.deposita(T, nostro ? Math.min(n, 300, Math.max(1, 300 - W.prezzo(T.id))) : n); if (r && r.aggiunti) { ls.set('tg-primo-scarico', '1'); const g = $('scGrande'); g && g.remove(); C.togli(r.aggiunti); try { TG.Semplice && TG.Semplice.libera && TG.Semplice.libera(); } catch(e){} } else if (r && r.tetto) msg('Pe\' oggi basta', 'Hai speso tanto: riprova domani', 3.5); else if (!(r && (r.manca || r.tetto_ora || r.al_massimo))) msg('Nun è riuscito', 'Controlla a connessione e riprova', 3); }
  catch(e){ msg('Nun è riuscito', 'Controlla a connessione e riprova', 3); }
  occupato = false; bottone();
}
function volo(){
  if (!btn) return; const r = btn.getBoundingClientRect();
  for (let i = 0; i < 9; i++) { const s = document.createElement('div'); s.id = 'scVolo'; s.textContent = '🌰'; s.style.left = (r.left + r.width / 2 - 11) + 'px'; s.style.top = (r.top + 6) + 'px'; document.body.appendChild(s);
    requestAnimationFrame(() => { s.style.transform = `translate(${(-innerWidth * .3) + (Math.random() - .5) * 160}px, ${-r.top * .45 + (Math.random() - .5) * 80}px) scale(.6)`; s.style.opacity = '0'; });
    setTimeout(() => s.remove(), 800 + i * 30); }
}

/* ---------- in cima a a mappa: come sta o paese tuo ---------- */
function mappa(){
  const mo = $('mapOv'), W = TG.Terre; if (!mo || mo.hidden || !W || !W.situazione) return;
  const s = W.situazione(); if (!s) return;
  const h = mo.querySelector('.sheetHead h2'); if (!h) return;
  let e = document.getElementById('trSitu'); if (!e) { e = document.createElement('div'); e.id = 'trSitu'; e.setAttribute('style', 'font:800 13px/1.3 Figtree,system-ui,sans-serif;color:#f3e7cb;margin-top:4px'); h.insertAdjacentElement('afterend', e); }
  h.textContent = s.nome; h.style.color = s.colore;
  e.textContent = `${s.terreni} terren${s.terreni === 1 ? 'o' : 'i'} · ${s.contesi ? s.contesi + ' sotto attacco · ' : ''}${s.pos ? s.pos + '° in Tuscia' : 'ancora fori classifica'} · 🌰 cassone ${n}/${cap()}${(m => m && m.pct >= 10 ? ` · 🧾 stanotte −${m.pct}% fori casa` : '')(W.manutenzione && W.manutenzione())}`;
}


/* ---------- I MEZZI SE COMPRANO CO' E NOCCHIE: o pannello «Cambia mezzo» diventa a bottega ----------
   Ogni mezzo porta un cassone più grande; a semovente raccoje 3 pe' nocchia e va veloce. */
const MEZZI = [
  { id: 'vespa', nome: 'Vespa', ico: '🛵', prezzo: 0, cosa: 'Veloce e agile' },
  { id: 'ape', nome: 'Ape', ico: '🛺', prezzo: 80, cosa: 'Cassone vero' },
  { id: 'trattore', nome: 'Trattore', ico: '🚜', prezzo: 140, cosa: 'Passa ovunque e da a mappa vai subito ai terreni' },
  { id: 'semovente', nome: 'Semovente', ico: '🌾', prezzo: 240, cosa: 'Raccoje 3 pe\' nocchia, spazzola larga, veloce' }
];
const prezzoM = m => Math.round(m.prezzo * (TG.Coop && TG.Coop.mio() >= 4 ? .8 : 1));   // cooperativa liv 4: mezzi −20%
const stCont = () => { try { return TG.Contadino.stato(TG.Profile.data); } catch(e){ return null; } };
function bottega(){
  const L = $('vehList'), st = stCont(); if (!L || !st) return; st.mezzi = st.mezzi || {};
  const cur = mezzo();
  L.innerHTML = `<p class="prog" style="margin:0 0 6px">🌰 Ne o cassone: <b style="color:#f2c74e">${n}</b> nocchie · co' e nocchie compri mezzi e terreni</p>` + MEZZI.map(m => {
    const ce = m.prezzo === 0 || st.mezzi[m.id], usa = cur === m.id;
    const bt = usa ? '<span style="color:#8cbf52;font-weight:800">In uso</span>' : ce ? `<button class="tg-btn" data-usa="${m.id}">Usa</button>` : n >= prezzoM(m) ? `<button class="tg-btn" data-compra="${m.id}">Compra · ${prezzoM(m)} 🌰</button>` : `<span style="color:#9aa39c;font-weight:700">${prezzoM(m)} 🌰 · te ne mancano ${prezzoM(m) - n}</span>`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-top:1px solid rgba(255,255,255,.08)"><span style="font-size:28px">${m.ico}</span><div style="flex:1"><b style="font-size:16px">${m.nome}</b><br><small style="color:#c9bfa8">${m.cosa} · cassone ${CAPIENZA[m.id]}</small></div>${bt}</div>`;
  }).join('');
  L.querySelectorAll('[data-usa]').forEach(b => b.onclick = () => { try { TG.debug.setVehicle(b.dataset.usa); } catch(e){} chiudiMezzi(); });
  L.querySelectorAll('[data-compra]').forEach(b => b.onclick = () => { if (compraMezzo(b.dataset.compra)) chiudiMezzi(); });
}
// compra un mezzo co' e nocchie e ce sale sopra (usato da a bottega e da i consigli de tg-facile.js)
function compraMezzo(id){
  const st = stCont(), m = MEZZI.find(x => x.id === id); if (!st || !m || n < prezzoM(m)) return false; st.mezzi = st.mezzi || {};
  C.togli(prezzoM(m)); st.mezzi[m.id] = Date.now(); try { TG.Profile.salva(); } catch(e){}
  ev('acquisto_mezzo', m.id, m.prezzo); try { TG.debug.setVehicle(m.id); } catch(e){}
  msg(`${m.ico} ${m.nome} comprata!`, `Cassone da ${CAPIENZA[m.id]}${m.id === 'semovente' ? ' e ogni nocchia vale 3' : ''}`, 4);
  return true;
}
// o prossimo mezzo da comprà (in ordine), co' o prezzo de adesso
function prossimoMezzo(){ const st = stCont(); if (!st) return null; const h = st.mezzi || {}; const m = MEZZI.find(x => x.prezzo > 0 && !h[x.id]); return m ? Object.assign({}, m, { costo: prezzoM(m), capienza: CAPIENZA[m.id] }) : null; }
function chiudiMezzi(){ const o = $('vehOv'); if (!o) return; const x = o.querySelector('[data-close]'); if (x) x.click(); else o.hidden = true; }
function osservaMezzi(){
  const o = $('vehOv'); if (!o) return setTimeout(osservaMezzi, 1500);
  new MutationObserver(() => { if (!o.hidden) setTimeout(bottega, 0); }).observe(o, { attributes: true, attributeFilter: ['hidden'] });
}

/* ---------- VICINO A UN GIOCO: «Gioca e vinci fino a 120 nocchie» (una volta ogni 4 minuti pe' gioco) ---------- */
function vicinoGioco(){
  const pr = $('prompt'), nm = $('pName'), w = $('pWhat'); if (!pr || pr.hidden || !nm || !w) return;
  const nome = (nm.textContent || '').trim(); let A = null;
  try { A = (TG.debug.acts || []).find(a => [a.name, a.nome, a.id].some(x => x && String(x).trim() === nome)); } catch(e){}
  pr.classList.toggle('tgVinci', !!A);
  const box = nm.parentNode; if (!A || box.querySelector('.tgVinci')) return;
  const sp = document.createElement('span'); sp.className = 'tgVinci'; sp.textContent = ({ vicopesca: 1, funghi: 1, carrettini: 1 })[A.id] ? '👻 Batti o fantasma: 300 🌰' : '🎮 Vinci fino a 120 🌰';   /* sfida da 60 s (tg-sfida60.js) */ box.appendChild(sp);
  if (!vicinoGioco[A.id] || Date.now() - vicinoGioco[A.id] > 240000) { vicinoGioco[A.id] = Date.now(); ev('gioco_popup', A.id); }
}


/* ---------- CLASSIFICA DE I TERRENI sotto a a minimappa: i primi 3 paesi (e o tuo se nun c'è) ---------- */
let clHtml = '';
function classificaMini(){
  const mini = $('mini'); if (!mini || !TG.Terre || !TG.Terre.lista) return;
  let box = $('trCl');
  if (!box) {
    const st = document.createElement('style'); st.textContent = `#trCl{margin-top:6px;width:var(--clW,92px);margin-left:auto;padding:4px 6px;border-radius:10px;background:rgba(20,28,26,.62);color:#f3e7cb;font:800 10px/1.4 Figtree,system-ui,sans-serif;cursor:pointer;box-sizing:border-box}
#trCl div{display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden}#trCl i{flex:none;width:7px;height:7px;border-radius:50%}#trCl span{flex:1;overflow:hidden;text-overflow:ellipsis}#trCl b{flex:none}#trCl .me{color:#ffd65a}#trCl .t{font-size:9.5px;opacity:.75;letter-spacing:.04em}
@media (orientation:landscape) and (max-height:500px){#trCl{position:absolute;right:calc(100% + 6px);top:0;margin:0}}`;
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'trCl'; box.setAttribute('aria-label', 'Classifica de i terreni: tocca pe\' a mappa');
    box.addEventListener('click', () => { try { mini.click(); } catch(e){} ev('classifica_mini'); });
    mini.insertAdjacentElement('afterend', box);
  }
  box.style.setProperty('--clW', Math.max(108, Math.round(mini.getBoundingClientRect().width)) + 'px');
  const T = TG.Terre, tot = {};
  for (const t of T.lista()) { const pd = T.padrone(t.id); if (pd && !(T.casa && T.casa(t.id))) tot[pd] = (tot[pd] || 0) + 1; }
  const cl = Object.entries(tot).sort((a, b) => b[1] - a[1]); if (!cl.length) { box.style.display = 'none'; return; }
  box.style.display = '';
  const mio = T.paeseMio && T.paeseMio(), nome = q => { let n = q; try { n = (TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(q)) || q; } catch(e){} return String(n).replace(/ (di|in|sul|al|nel) .*$/i, ''); };
  let righe = cl.slice(0, 3).map((r, i) => [i + 1, r]); const pm = cl.findIndex(r => r[0] === mio);
  if (pm >= 3) righe.push([pm + 1, cl[pm]]); else if (pm < 0 && mio) righe.push([0, [mio, 0]]);
  const h = '<div class="t">🏆 TERRENI</div>' + righe.map(([n, [q, k]]) => `<div class="${q === mio ? 'me' : ''}"><i style="background:${T.colore(q)}"></i><span>${nome(q)}</span><b>${k}</b></div>`).join('');
  if (h !== clHtml) { clHtml = h; box.innerHTML = h; }
}

function avvia(){
  if (!TG.Terre || !TG.debug || !TG.debug.car) return setTimeout(avvia, 1000);
  // da computer: E o Invio scaricano quanno o bottone c'è
  addEventListener('keydown', e => { if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && btn && btn.style.display === 'flex' && !occupato && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) { e.preventDefault(); scarica(); } });
  setInterval(bottone, 300); setInterval(mappa, 600); setInterval(vicinoGioco, 700); setInterval(classificaMini, 2000); classificaMini(); osservaMezzi();
}
if (document.readyState === 'complete') setTimeout(avvia, 1500); else addEventListener('load', () => setTimeout(avvia, 1500));
})();
