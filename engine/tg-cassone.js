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
const CAPIENZA = { piedi: 60, vespa: 100, ape: 150, trattore: 250 };
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
    if (prima10 && n >= 10) { prima10 = false; ls.set('tg-cassone-10', '1'); msg('Brau! 10 nocchie ne o cassone', 'Riempilo, poi scegli dove scaricà', 3.5); }
    if (era < c * .5 && n >= c * .5 && n < c) msg('O cassone se sta a riempì', `${n}/${c}: ancora poche e se parte a l'attacco`, 2.5);
    if (n >= c) { ev('cassone_pieno', mezzo(), c); msg('Cassone pieno: è ora de fa\' guerra!', 'Apri a mappa e scegli o terreno, o scarica qui', 4.5); avvisoPieno = Date.now(); }
    return k;
  },
  togli(a){ n = Math.max(0, n - a); salva(); },
  avvisa(){ if (Date.now() - avvisoPieno < 25000) return; avvisoPieno = Date.now(); msg('Cassone pieno', 'Vai a scaricà su un terreno: apri a mappa e scegli', 3.5); }
};

/* ---------- o bottone SCARICA ---------- */
const st = document.createElement('style'); st.textContent = `
#scBtn{position:fixed;z-index:33;right:calc(14px + env(safe-area-inset-right,0px));bottom:calc(118px + env(safe-area-inset-bottom,0px));display:none;flex-direction:column;align-items:center;justify-content:center;min-width:148px;padding:12px 18px 10px;border:0;border-radius:22px;background:#ff8a3c;color:#fff;font:900 20px/1.05 Figtree,"Segoe UI",system-ui,sans-serif;box-shadow:0 5px 0 #b4561c,0 10px 24px rgba(0,0,0,.35);cursor:pointer;touch-action:manipulation}
#scBtn *{pointer-events:none}#scBtn small{display:block;margin-top:3px;font:800 12px/1.2 Figtree,sans-serif;opacity:.95}
#scBtn:active{transform:translateY(3px);box-shadow:0 2px 0 #b4561c,0 6px 14px rgba(0,0,0,.3)}
#scBtn.go{animation:scPulse 1.1s ease-in-out infinite}@keyframes scPulse{50%{transform:scale(1.06)}}
body:not(.playing) #scBtn,body:has(#mapOv:not([hidden])) #scBtn,body:has(#trFesta) #scBtn,body:has(#trOv:not([hidden])) #scBtn{display:none!important}
html.tg-scarica #prompt{display:none!important}
#scVolo{position:fixed;z-index:34;pointer-events:none;font-size:22px;transition:transform .7s cubic-bezier(.3,.6,.4,1),opacity .7s}`;
document.head.appendChild(st);
let btn = null, occupato = false;
function bottone(){
  const W = TG.Terre, D = TG.debug; if (!W || !D || !D.car) return;
  if (!btn) { btn = document.createElement('button'); btn.id = 'scBtn'; btn.type = 'button'; btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); scarica(); }); btn.onclick = e => { e.stopPropagation(); }; /* pointerdown: parte subito, nun se perde */ document.body.appendChild(btn); }
  const c = D.car, T = W.terraIn(c.x, c.z), p = W.paeseMio && W.paeseMio();
  const ok = T && p && n >= MINIMO && !(W.derby && W.derby(T.id) && !(W.sfida() || { p: [] }).p.includes(p));
  document.documentElement.classList.toggle('tg-scarica', !!ok);
  if (!ok || occupato) { btn.style.display = occupato ? 'flex' : 'none'; return; }
  btn.style.display = 'flex';
  const s = W.stato(T.id), verbo = s === 'nostro' ? '🛡 RINFORZA' : s === 'libero' ? '🚩 PRENDI' : '⚔ ATTACCA';
  const h = `${verbo}<small>scarica ${n} nocchie${matchMedia('(pointer:fine)').matches ? ' · tasto E' : ''}</small>`; if (btn._h !== h) { btn._h = h; btn.innerHTML = h; }   // riscritto solo se cambia: sennò Safari perde o clic
  btn.classList.toggle('go', C.pieno());
}
async function scarica(){
  const W = TG.Terre, D = TG.debug; if (occupato || !W || !D) return;
  const T = W.terraIn(D.car.x, D.car.z); if (!T || n < MINIMO) return;
  occupato = true; btn._h = '…'; btn.innerHTML = '…'; volo();
  try { const r = await W.deposita(T, n); if (r && r.aggiunti) { C.togli(r.aggiunti); try { TG.Semplice && TG.Semplice.libera && TG.Semplice.libera(); } catch(e){} } else if (r && r.tetto) msg('Pe\' oggi basta', 'Hai scaricato tanto: riprova domani', 3.5); else msg('Nun è riuscito', 'Controlla a connessione e riprova', 3); }
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

function avvia(){
  if (!TG.Terre || !TG.debug || !TG.debug.car) return setTimeout(avvia, 1000);
  // da computer: E o Invio scaricano quanno o bottone c'è
  addEventListener('keydown', e => { if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && btn && btn.style.display === 'flex' && !occupato && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) { e.preventDefault(); scarica(); } });
  setInterval(bottone, 300); setInterval(mappa, 600);
}
if (document.readyState === 'complete') setTimeout(avvia, 1500); else addEventListener('load', () => setTimeout(avvia, 1500));
})();
