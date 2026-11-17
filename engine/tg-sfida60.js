/* SFIDA AL FANTASMA — 60 secondi contro o migliore de oggi de un antro paese (o O Contadino se ancora nun c'è nessuno).
   O gioco chiama:
     TGSfida.avvia({ gioco:'vicopesca', punti: () => S.pts, unita: 'punti', top: 64 })   all'inizio de a partita
     const r = await TGSfida.fine()                                                       quanno o tempo è finito
     TGSfida.esito(r)  → { titolo, testo }  pe' a schermata finale;   PONTE.torna({ ok, t, sf: TGSfida.token })
   In alto compare una striscia piccola: ⏱ secondi · Tu 320 · 👻 Carbognano 280, co' due barrette.
   O premio (300 se vinci, 50 se perdi) o decide o server (tg_sfida_fine) e se ritira ne o mondo (tg_sfida_ritira).
   Esterno: window.TG_STATS_CONFIG (url, key), localStorage 'tuscia-stats-v1' (dev), 'tg-paese-dev', TG.Fantasmi.soprannome. */
(function(){
'use strict';
const BASE = (document.currentScript && document.currentScript.src || '').replace(/tg-sfida60\.js.*$/, '');
const ls = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
const cfg = () => window.TG_STATS_CONFIG || null;
function pronta(){
  return new Promise(res => {
    if (cfg()) return res(true);
    if (!document.querySelector('script[src*="tg-stats-config.js"]')) { const s = document.createElement('script'); s.src = BASE + 'tg-stats-config.js'; document.head.appendChild(s); }
    let n = 0; const t = setInterval(() => { if (cfg() || ++n > 50) { clearInterval(t); res(!!cfg()); } }, 100);
  });
}
function dev(){
  try { if (window.TG && TG.Stats && TG.Stats.dispositivo) return TG.Stats.dispositivo(); } catch(e){}
  try { const s = JSON.parse(ls('tuscia-stats-v1') || 'null'); if (s && s.dev) return s.dev; } catch(e){}
  return ls('tg-dev-fantasma');
}
const paese = () => { const p = ls('tg-paese-dev'); return p && p !== 'nessuno' ? p : null; };
const nomeMio = () => { try { return (window.TG && TG.Fantasmi && TG.Fantasmi.soprannome && TG.Fantasmi.soprannome()) || ''; } catch(e){ return ''; } };
const NOMI = { fabrica: 'Fabrica', carbognano: 'Carbognano', caprarola: 'Caprarola', ronciglione: 'Ronciglione', viterbo: 'Viterbo', vignanello: 'Vignanello', canepina: 'Canepina', nepi: 'Nepi', 'civita-castellana': 'Civita', vallerano: 'Vallerano', corchiano: 'Corchiano', sutri: 'Sutri', soriano: 'Soriano', contadino: 'O Contadino' };
const nomeP = p => NOMI[p] || (p ? p.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()) : '?');
async function rpc(f, body){
  await pronta(); const c = cfg(); if (!c || !c.url) throw new Error('server');
  const r = await fetch(c.url.replace(/\/$/, '') + '/rest/v1/rpc/' + f, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: c.key, Authorization: 'Bearer ' + c.key }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}

let opz = null, F = null, tl = [], t0 = 0, giro = 0, bar = null, chiusa = false, stNasc = null;
// i secondi passati: se o gioco ce dice quanto manca (opz.tempo), se segue o tempo suo (pausa compresa)
const trascorsi = () => Math.max(0, Math.min(60, opz && opz.tempo ? 60 - (+opz.tempo() || 0) : (performance.now() - t0) / 1000));
const S = window.TGSfida = { attiva: false, token: null, fantasma: null, risultato: null,
  avvia, fine, esito, valoreFantasma: s => F ? (F.timeline[Math.max(0, Math.min(F.timeline.length - 1, Math.ceil(s) - 1))] || 0) : 0 };

function striscia(){
  if (bar) return bar;
  const st = document.createElement('style'); st.textContent = `
#tgSfida{position:fixed;z-index:10001;left:50%;transform:translateX(-50%);top:calc(var(--sfTop,8px) + env(safe-area-inset-top,0px));width:min(262px,66vw);padding:6px 10px 7px;border-radius:12px;background:rgba(14,20,19,.82);color:#f3e7cb;font:700 12px/1.25 Figtree,system-ui,sans-serif;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.3)}
body:has(#tgCartello) #tgSfida{visibility:hidden}
#tgSfida.sx{left:calc(10px + env(safe-area-inset-left,0px));transform:none;width:min(236px,60vw)}
#tgSfida .r{display:grid;grid-template-columns:78px minmax(0,1fr) 40px;align-items:center;gap:6px;margin-top:3px}
#tgSfida .r span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#tgSfida .r b{text-align:right;font-variant-numeric:tabular-nums}
#tgSfida .tr{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}#tgSfida .tr i{display:block;height:100%;border-radius:3px;transition:width .4s}
#tgSfida .tu i{background:#f2c74e}#tgSfida .fa i{background:#b9c2ff}
#tgSfida .h{display:flex;justify-content:space-between;font-weight:800}#tgSfida .h em{font-style:normal;color:#f2c74e}
#tgSfida.avanti .h em::after{content:" · sei avanti!";color:#8cd17a}#tgSfida.dietro .h em::after{content:" · te sta a batte";color:#ffb3a1}`;
  document.head.appendChild(st);
  bar = document.createElement('div'); bar.id = 'tgSfida'; bar.setAttribute('aria-live', 'polite'); document.body.appendChild(bar);
  return bar;
}
function disegna(){
  if (!bar || !F) return;
  const s = trascorsi(), mio = +opz.punti() || 0, fa = S.valoreFantasma(s);
  const mx = Math.max(1, F.punti, mio, fa) * 1.05, u = opz.unita ? ' ' + opz.unita : '';
  bar.classList.toggle('avanti', mio > fa && s > 3); bar.classList.toggle('dietro', fa > mio && s > 3);
  bar.innerHTML = `<div class="h"><span>👻 Sfida al fantasma</span><em>⏱ ${Math.max(0, Math.ceil(60 - s))}s</em></div>
    <div class="r tu"><span>Tu</span><span class="tr"><i style="width:${mio / mx * 100}%"></i></span><b>${Math.round(mio)}</b></div>
    <div class="r fa"><span>${nomeP(F.paese)}</span><span class="tr"><i style="width:${fa / mx * 100}%"></i></span><b>${Math.round(fa)}</b></div>`;
}
async function avvia(o){
  opz = Object.assign({ unita: '', top: 8 }, o || {}); tl = []; F = null; chiusa = false; S.token = null; S.risultato = null; S.attiva = true;
  clearInterval(giro); t0 = performance.now();
  const b = striscia(); b.style.setProperty('--sfTop', (opz.top || 8) + 'px'); b.style.display = ''; b.classList.toggle('sx', opz.posizione === 'sinistra');
  // o fantasma de riserva finché nun risponde o server: nun se aspetta mai
  F = { paese: 'contadino', nome: 'O Contadino', punti: opz.bot || 0, timeline: Array.from({ length: 60 }, (x, i) => Math.round((opz.bot || 0) * (i + 1) / 60)) };
  if (opz.nascondi) { if (!stNasc) { stNasc = document.createElement('style'); document.head.appendChild(stNasc); } stNasc.textContent = `body.tg-sfida60 :is(${opz.nascondi}){display:none!important}`; }
  document.body.classList.add('tg-sfida60');
  giro = setInterval(() => { const s = trascorsi(); if (tl.length < Math.min(60, Math.floor(s))) tl.push(Math.round(+opz.punti() || 0)); disegna(); }, 250);
  try {
    const r = await rpc('tg_sfida_inizia', { p_dev: dev(), p_gioco: opz.gioco, p_paese: paese(), p_nome: nomeMio() || null });
    if (r && r.ok) { S.token = r.token; const f = r.fantasma || {}; F = { paese: f.paese, nome: f.nome, punti: +f.punti || 0, timeline: Array.isArray(f.timeline) && f.timeline.length ? f.timeline : F.timeline }; S.fantasma = F; }
  } catch(e){}
  disegna();
  return F;
}
async function fine(finale){
  if (chiusa) return S.risultato; chiusa = true; S.attiva = false; clearInterval(giro);
  const mio = Math.round(typeof finale === 'number' ? finale : (+opz.punti() || 0)); while (tl.length < 60) tl.push(mio);
  if (bar) bar.style.display = 'none'; document.body.classList.remove('tg-sfida60');
  let r = { ok: false, vinto: mio > (F ? F.punti : 0), premio: 0, punti: mio, fantasma: F ? F.punti : 0, f_paese: F && F.paese, offline: true };
  if (S.token) { try { const x = await rpc('tg_sfida_fine', { p_dev: dev(), p_token: S.token, p_punti: mio, p_timeline: tl.slice(0, 60) }); if (x && x.ok) r = x; } catch(e){} }
  S.risultato = r; return r;
}
function esito(r){
  r = r || S.risultato || {}; const chi = r.f_paese === 'contadino' || !r.f_paese ? 'O Contadino' : 'o fantasma de ' + nomeP(r.f_paese), u = opz && opz.unita ? ' ' + opz.unita : '';
  if (r.offline) return { titolo: r.vinto ? '👻 Fantasma battuto!' : '👻 O fantasma ha vinto', testo: `Tu ${r.punti}${u} · ${chi} ${r.fantasma}${u}. Senza connessione o premio nun se pò segnà.`, premio: 0 };
  if (r.nulla) return { titolo: '👻 Partita nun valida', testo: 'Tempo de gioco troppo corto: riprova da capo.', premio: 0 };
  const pr = r.premio ? `+${r.premio} 🌰 ne o cassone quanno torni ne o mondo` : 'Pe\' oggi i premi de sto gioco so\' finiti: domani se riparte';
  return r.vinto ? { breve: '👻 Battuto!', titolo: `👻 Hai battuto ${chi}!`, testo: `Tu ${r.punti}${u} · ${chi.replace(/^o /, '')} ${r.fantasma}${u}. ${pr}${r.premio >= 300 && r.vinte_oggi ? ` (vittoria ${r.vinte_oggi} de 3 pagate oggi)` : ''}`, premio: r.premio }
                 : { breve: '👻 Ha vinto lui', titolo: `👻 Te l'ha fatta ${chi}`, testo: `Tu ${r.punti}${u} · ${chi.replace(/^o /, '')} ${r.fantasma}${u}. ${pr}. Batterlo vale 300!`, premio: r.premio };
}
})();
