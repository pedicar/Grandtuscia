/* INVITA N'AMICO — senza account, senza codici da scrive.
   Chi invita: MENU → «📲 Invita n'amico» → un bottone grande WhatsApp co' o messaggio già scritto e o link
     gioca.html?invito=<dispositivo>&p=<paese>. Quanno l'amico arriva e comincia a giocà, a chi l'ha invitato vanno 200 🌰
     (controllo ogni minuto: tg_amici_premi) e un avviso in alto «🎉 N'amico è arrivato grazie a te!».
   Chi arriva da o link: gioca subito pe' o paese de chi l'ha invitato (salta «De 'ndo sei?»), 50 🌰 de benvenuto,
     e o server segna l'arrivo (tg_amico_arrivato: una volta sola, solo pe' chi nun aveva mai giocato).
   Questo file va caricato PRIMA de tg-primo-minuto.js: o paese se deve mette in localStorage prima che quello o legga.
   Usa TG_STATS_CONFIG (url, pub), TG.Stats (dispositivo, ev), TG.Cassone (aggiungi), TG.PrimoMinuto (paese, nomeComune), TG.Fantasmi (soprannome), TG.msg. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const cfg = window.TG_STATS_CONFIG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c, n) => { try { TG.Stats && TG.Stats.ev(t, c || '', n); } catch(e){} };
const PREMIO = 200, BENVENUTO = 50, SITO = 'https://grandtuscia.netlify.app/gioca.html';
const K_DA = 'tg-invitato-da', K_FATTO = 'tg-invito-segnato', K_PAESE = 'tg-paese-dev';

/* ---------- 1) chi arriva da un link: o paese de chi l'ha invitato, subito (prima de tg-primo-minuto.js) ---------- */
const q = (() => { try { return new URLSearchParams(window.__tgQ != null ? window.__tgQ : location.search); } catch(e){ return new URLSearchParams(''); } })();
const codiceArrivo = (q.get('invito') || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
const paeseArrivo = (q.get('p') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
const nomeArrivo = (q.get('n') || '').replace(/[<>&"]/g, '').slice(0, 18);
if (codiceArrivo && !ls.get(K_DA)) {
  ls.set(K_DA, JSON.stringify({ c: codiceArrivo, p: paeseArrivo, n: nomeArrivo, t: Date.now() }));
  if (paeseArrivo && !ls.get(K_PAESE)) ls.set(K_PAESE, paeseArrivo);   // gioca pe' o paese de l'amico, senza domanda
}

async function rpc(f, body){ if (!cfg.url) throw 0; const k = cfg.pub || cfg.key; const r = await fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/' + f, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: k, Authorization: 'Bearer ' + k }, body: JSON.stringify(body || {}) }); if (!r.ok) throw r.status; return r.json(); }
const dev = () => { try { return TG.Stats && TG.Stats.dispositivo; } catch(e){ return null; } };
const paese = () => { try { const p = TG.PrimoMinuto && TG.PrimoMinuto.paese; return p && p !== 'nessuno' && p !== 'fuori' ? p : ''; } catch(e){ return ''; } };
const nomeP = p => { try { return ((TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p).replace(/ (di|in|sul|al|nel) .*$/i, ''); } catch(e){ return p; } };
const soprannome = () => { try { return (TG.Fantasmi && TG.Fantasmi.soprannome()) || ''; } catch(e){ return ''; } };
const msg = (a, b, s) => { try { TG.msg(a, b, s); } catch(e){} };

// quanno l'invitato comincia davero a giocà: o server segna l'arrivo, lui pija o benvenuto
async function segnaArrivo(){
  const da = (() => { try { return JSON.parse(ls.get(K_DA) || 'null'); } catch(e){ return null; } })();
  if (!da || ls.get(K_FATTO) || !document.body.classList.contains('playing')) return;
  const d = dev(); if (!d || d === da.c) { ls.set(K_FATTO, 'tuo'); return; }
  let r = null; try { r = await rpc('tg_amico_arrivato', { p_codice: da.c, p_dev: d, p_paese: da.p || paese() || null }); } catch(e){ return; }
  ls.set(K_FATTO, r && r.nuovo ? 'si' : 'no');
  if (r && r.nuovo) { try { TG.Cassone && TG.Cassone.aggiungi(BENVENUTO, true); } catch(e){}
    msg(`👋 ${da.n ? 'Te ha invitato ' + da.n : 'Benvenuto!'}`, `${da.p ? 'Giochi pe\' ' + nomeP(da.p) + ' · ' : ''}+${BENVENUTO} 🌰 pe' comincià`, 5); ev('invito_arrivato', da.c); }
}
// chi ha invitato: ogni minuto se c'è quarcuno novo
let totale = +(ls.get('tg-amici-tot') || 0);
async function premi(){
  const d = dev(); if (!d || !document.body.classList.contains('playing')) return;
  let r = null; try { r = await rpc('tg_amici_premi', { p_dev: d }); } catch(e){ return; }
  if (!r) return; totale = r.totale || 0; ls.set('tg-amici-tot', String(totale));
  if (r.nuovi > 0) { const k = r.nuovi * PREMIO; try { TG.Cassone && TG.Cassone.aggiungi(k, true); } catch(e){}
    msg(r.nuovi === 1 ? '🎉 N\'amico è arrivato grazie a te!' : `🎉 ${r.nuovi} amici so' arrivati grazie a te!`, `+${k} 🌰 · in tutto ${totale}`, 6); ev('invito_premio', String(r.nuovi), k); }
}

/* ---------- 2) o pannello pe' invitare ---------- */
const css = document.createElement('style'); css.textContent = `
#invOv{position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,14,13,.78);font-family:Figtree,system-ui,sans-serif;color:#f3e7cb}#invOv[hidden]{display:none}
#invOv .c{width:min(400px,100%);padding:20px 18px 14px;border-radius:22px;background:#1b2423;border:2px solid rgba(242,199,78,.55);text-align:center}
#invOv h2{margin:6px 0 6px;font:900 25px/1.15 Figtree,sans-serif}#invOv p{margin:0 0 12px;font:700 16px/1.35 Figtree,sans-serif;color:#c9bfa8}#invOv p b{color:#f2c74e}
#invOv .wa{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;box-sizing:border-box;padding:16px;border-radius:16px;background:#25d366;color:#0b2b17;font:900 20px Figtree,sans-serif;text-decoration:none}
#invOv .alt{display:block;width:100%;margin-top:10px;padding:13px;border:0;border-radius:14px;background:#3a4a47;color:#f3e7cb;font:800 16px Figtree,sans-serif;cursor:pointer}
#invOv .no{display:block;width:100%;margin-top:6px;padding:10px;border:0;background:transparent;color:#c9bfa8;font:800 15px Figtree,sans-serif;cursor:pointer}#invOv .tot{margin:12px 0 0;font-size:14px}`;
document.head.appendChild(css);
let ov = null;
function link(){
  const u = new URL(SITO); u.searchParams.set('invito', dev() || 'x'); const p = paese(); if (p) u.searchParams.set('p', p);
  const n = soprannome(); if (n) u.searchParams.set('n', n.slice(0, 18)); u.searchParams.set('utm_source', 'invito'); return u.toString();
}
function testo(){
  const p = paese();
  return p ? `Aò! Sto a giocà a Grand Tuscia pe' ${nomeP(p)}: stamo a pijà i campi de tutta a Tuscia, ma da solo nun ce a faccio. Vie' a damme na mano, se gioca gratis da o telefono 👇`
           : `Aò! Sto a giocà a Grand Tuscia: se gira pe' a Tuscia e se pijano i campi pe' o paese tuo. Se gioca gratis da o telefono, provalo 👇`;
}
function apri(){
  for (const id of ['menuTOv', 'pauseOv']) { const e = document.getElementById(id); if (e && !e.hidden) e.hidden = true; }
  try { if (TG.debug && TG.debug.S && TG.debug.S.phase === 'play') TG.debug.S.paused = false; } catch(e){}
  if (!ov) { ov = document.createElement('div'); ov.id = 'invOv'; document.body.appendChild(ov); ov.addEventListener('click', e => { if (e.target === ov) ov.hidden = true; }); }
  const p = paese(), L = link(), T = testo() + '\n' + L;
  ov.innerHTML = `<div class="c"><div style="font-size:46px;line-height:1">📲</div><h2>Chiama n'amico</h2>
    <p>${p ? `Più semo, più campi pijamo pe' <b>${nomeP(p)}</b>. L'amico gioca subito co' voi.` : 'Più semo, più se diverte.'}<br>Pe' ogni amico che arriva: <b>+${PREMIO} 🌰</b> a te.</p>
    <a class="wa" href="https://wa.me/?text=${encodeURIComponent(T)}" target="_blank" rel="noopener"><span style="font-size:26px">💬</span> Manda su WhatsApp</a>
    <button class="alt" data-altro>${navigator.share ? 'Manda in n\'antro modo' : 'Copia o link'}</button>
    <button class="no" data-chiudi>Chiudi</button>
    <p class="tot">${totale ? `Amici arrivati grazie a te: <b>${totale}</b>` : 'Ancora nessun amico: o primo porta fortuna.'}</p></div>`;
  ov.querySelector('.wa').addEventListener('click', () => ev('invito', 'whatsapp'));
  ov.querySelector('[data-chiudi]').onclick = () => { ov.hidden = true; };
  ov.querySelector('[data-altro]').onclick = async () => {
    ev('invito', navigator.share ? 'condividi' : 'copia');
    try { if (navigator.share) { await navigator.share({ title: 'Grand Tuscia', text: testo(), url: L }); return; } } catch(e){ if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(T); msg('Link copiato', 'Incollalo dove vòi: WhatsApp, Facebook, na mail', 3); } catch(e){}
  };
  ov.hidden = false; ev('invito', 'aperto');
}
TG.Invita = { apri, link };
function avvia(){ setInterval(segnaArrivo, 3000); setInterval(premi, 60000); setTimeout(premi, 8000); }
if (document.readyState === 'complete') avvia(); else addEventListener('load', avvia);
})();
