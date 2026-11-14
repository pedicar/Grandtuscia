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
const cap = () => CAPIENZA[mezzo()] || 100;
const salva = () => ls.set('tg-cassone', String(n));
const C = TG.Cassone = {
  get n(){ return n; }, cap, MINIMO,
  pieno: () => n >= cap(),
  aggiungi(a){
    if (!(a > 0)) return 0; const c = cap(); if (n >= c) { C.avvisa(); return 0; }
    const k = Math.min(a, c - n); const era = n; n += k; salva();
    if (prima10 && n >= 10) { prima10 = false; ls.set('tg-cassone-10', '1'); msg('Brau! 10 nocchie ne o cassone', 'Co\' e nocchie se compra: terreni e mezzi', 3.5); }
    if (era < c * .5 && n >= c * .5 && n < c) { if (!ls.get('tg-primo-scarico')) grande(`Hai già ${n} nocchie!`, "I terreni liberi costano 10: entra in un campo e premi COMPRA", false); else msg('O cassone se sta a riempì', `${n}/${c}: ancora poche e se parte a l'attacco`, 2.5); }
    if (n >= c) { ev('cassone_pieno', mezzo(), c); grande('Cassone pieno!', 'Co\' e nocchie compri terreni e mezzi novi: entra in un campo e premi COMPRA, o tocca qui pe\' a mappa', true); avvisoPieno = Date.now(); }
    return k;
  },
  togli(a){ n = Math.max(0, n - a); salva(); },
  avvisa(){ if (Date.now() - avvisoPieno < 25000) return; avvisoPieno = Date.now(); msg('Cassone pieno', 'Vai a scaricà su un terreno: apri a mappa e scegli', 3.5); }
};

/* ---------- o messaggio grande in mezzo (cassone pieno, primo attacco): nun blocca, sparisce da solo ---------- */
function grande(t, s, mappa){
  let g = $('scGrande'); if (g) g.remove();
  g = document.createElement('div'); g.id = 'scGrande'; g.innerHTML = `<b>🌰 ${t}</b><span>${s}</span>${mappa ? '<i>🗺 Tocca pe\' a mappa</i>' : ''}`;
  g.onclick = () => { g.remove(); if (mappa) { const b = $('bMap'); b && b.click(); } };
  document.body.appendChild(g); setTimeout(() => { g.classList.add('via'); setTimeout(() => g.remove(), 500); }, 6500);
}

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
  const h = nostro ? (n >= MINIMO ? `🛡 RINFORZA<small>ce metti ${Math.min(n, 300)} 🌰 · poi costa ${c + Math.min(n, 300)}${tasto}</small>` : `✅ È NOSTRO<small>costa ${c} a chi o vò</small>`)
    : pago ? `💰 COMPRA<small>costa ${c} 🌰 · ce l'hai${tasto}</small>` : `💰 COSTA ${c}<small>te ne mancano ${c - n}</small>`;
  btn.classList.toggle('no', !(pago || (nostro && n >= MINIMO))); if (btn._h !== h) { btn._h = h; btn.innerHTML = h; }   // riscritto solo se cambia: sennò Safari perde o clic
  btn.classList.toggle('go', pago);
}
async function scarica(){
  const W = TG.Terre, D = TG.debug; if (occupato || !W || !D) return;
  const T = W.terraIn(D.car.x, D.car.z); if (!T) return;
  const nostro = W.stato(T.id) === 'nostro', c = W.costo(T.id);
  if (nostro && n < MINIMO) { msg('È già vostro', 'Raccoji nocchie pe\' rinforzallo', 2.5); return; }
  if (!nostro && n < c) { msg(`Costa ${c}: te ne mancano ${c - n}`, 'Raccoji ancora e torna (o cerca un terreno che costa meno)', 3.5); return; }
  occupato = true; btn._h = '…'; btn.innerHTML = '…'; volo();
  try { const r = await W.deposita(T, nostro ? Math.min(n, 300) : n); if (r && r.aggiunti) { ls.set('tg-primo-scarico', '1'); const g = $('scGrande'); g && g.remove(); C.togli(r.aggiunti); try { TG.Semplice && TG.Semplice.libera && TG.Semplice.libera(); } catch(e){} } else if (r && r.tetto) msg('Pe\' oggi basta', 'Hai speso tanto: riprova domani', 3.5); else if (!(r && r.manca)) msg('Nun è riuscito', 'Controlla a connessione e riprova', 3); }
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
  e.textContent = `${s.terreni} terren${s.terreni === 1 ? 'o' : 'i'} · ${s.contesi ? s.contesi + ' sotto attacco · ' : ''}${s.pos ? s.pos + '° in Tuscia' : 'ancora fori classifica'} · 🌰 cassone ${n}/${cap()}`;
}


/* ---------- I MEZZI SE COMPRANO CO' E NOCCHIE: o pannello «Cambia mezzo» diventa a bottega ----------
   Ogni mezzo porta un cassone più grande; a semovente raccoje 3 pe' nocchia e va veloce. */
const MEZZI = [
  { id: 'vespa', nome: 'Vespa', ico: '🛵', prezzo: 0, cosa: 'Veloce e agile' },
  { id: 'ape', nome: 'Ape', ico: '🛺', prezzo: 80, cosa: 'Cassone vero' },
  { id: 'trattore', nome: 'Trattore', ico: '🚜', prezzo: 140, cosa: 'Passa ovunque tra i filari' },
  { id: 'semovente', nome: 'Semovente', ico: '🌾', prezzo: 240, cosa: 'Raccoje 3 pe\' nocchia, spazzola larga, veloce' }
];
const stCont = () => { try { return TG.Contadino.stato(TG.Profile.data); } catch(e){ return null; } };
function bottega(){
  const L = $('vehList'), st = stCont(); if (!L || !st) return; st.mezzi = st.mezzi || {};
  const cur = mezzo();
  L.innerHTML = `<p class="prog" style="margin:0 0 6px">🌰 Ne o cassone: <b style="color:#f2c74e">${n}</b> nocchie · co' e nocchie compri mezzi e terreni</p>` + MEZZI.map(m => {
    const ce = m.prezzo === 0 || st.mezzi[m.id], usa = cur === m.id;
    const bt = usa ? '<span style="color:#8cbf52;font-weight:800">In uso</span>' : ce ? `<button class="tg-btn" data-usa="${m.id}">Usa</button>` : n >= m.prezzo ? `<button class="tg-btn" data-compra="${m.id}">Compra · ${m.prezzo} 🌰</button>` : `<span style="color:#9aa39c;font-weight:700">${m.prezzo} 🌰 · te ne mancano ${m.prezzo - n}</span>`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-top:1px solid rgba(255,255,255,.08)"><span style="font-size:28px">${m.ico}</span><div style="flex:1"><b style="font-size:16px">${m.nome}</b><br><small style="color:#c9bfa8">${m.cosa} · cassone ${CAPIENZA[m.id]}</small></div>${bt}</div>`;
  }).join('');
  L.querySelectorAll('[data-usa]').forEach(b => b.onclick = () => { try { TG.debug.setVehicle(b.dataset.usa); } catch(e){} chiudiMezzi(); });
  L.querySelectorAll('[data-compra]').forEach(b => b.onclick = () => {
    const m = MEZZI.find(x => x.id === b.dataset.compra); if (!m || n < m.prezzo) return;
    C.togli(m.prezzo); st.mezzi[m.id] = Date.now(); try { TG.Profile.salva(); } catch(e){}
    ev('acquisto_mezzo', m.id, m.prezzo); try { TG.debug.setVehicle(m.id); } catch(e){}
    chiudiMezzi(); msg(`${m.ico} ${m.nome} comprata!`, `Cassone da ${CAPIENZA[m.id]}${m.id === 'semovente' ? ' e ogni nocchia vale 3' : ''}`, 4);
  });
}
function chiudiMezzi(){ const o = $('vehOv'); if (!o) return; const x = o.querySelector('[data-close]'); if (x) x.click(); else o.hidden = true; }
function osservaMezzi(){
  const o = $('vehOv'); if (!o) return setTimeout(osservaMezzi, 1500);
  new MutationObserver(() => { if (!o.hidden) setTimeout(bottega, 0); }).observe(o, { attributes: true, attributeFilter: ['hidden'] });
}

function avvia(){
  if (!TG.Terre || !TG.debug || !TG.debug.car) return setTimeout(avvia, 1000);
  // da computer: E o Invio scaricano quanno o bottone c'è
  addEventListener('keydown', e => { if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && btn && btn.style.display === 'flex' && !occupato && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) { e.preventDefault(); scarica(); } });
  setInterval(bottone, 300); setInterval(mappa, 600); osservaMezzi();
}
if (document.readyState === 'complete') setTimeout(avvia, 1500); else addEventListener('load', () => setTimeout(avvia, 1500));
})();
