/* SFIDA AL FANTASMA — o gioco finisce davvero (arrivo o obiettivo), massimo 2 minuti: vince chi ce mette de meno.
   O fantasma è o migliore de oggi de un antro paese (o O Contadino se ancora nun c'è nessuno).
   O gioco chiama:
     TGSfida.avvia({ gioco:'carrettini', progresso: () => 0..1, trascorso: () => secondi de gioco, top: 64 })
     const r = await TGSfida.fine(secondiFinali | 0)    0 = nun è arrivato (tempo scaduto)
     TGSfida.esito(r) → { breve, titolo, testo }  pe' a schermata finale;   PONTE.torna({ ok, t, sf: TGSfida.token })
   In alto: una striscia piccola co' o cronometro e due barrette d'avanzamento (tu e o fantasma).
   O premio (300 se vinci, 50 se perdi) o decide o server (tg_sfida_fine) e se ritira ne o mondo (tg_sfida_ritira).
   TGSfida.MAX = 120 secondi: o gioco deve chiude a partita lì se nun s'è arrivati.
   Esterno: window.TG_STATS_CONFIG (url, key), localStorage 'tuscia-stats-v1' (dev), 'tg-paese-dev', TG.Fantasmi.soprannome. */
(function(){
'use strict';
const MAX = 120;
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
const mmss = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
const mmssCorto = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
async function rpc(f, body){
  await pronta(); const c = cfg(); if (!c || !c.url) throw new Error('server');
  const r = await fetch(c.url.replace(/\/$/, '') + '/rest/v1/rpc/' + f, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: c.key, Authorization: 'Bearer ' + c.key }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}

let opz = null, F = null, tl = [], t0 = 0, giro = 0, bar = null, chiusa = false, stNasc = null;
const trascorsi = () => Math.max(0, opz && opz.trascorso ? (+opz.trascorso() || 0) : (performance.now() - t0) / 1000);
const avanzaFantasma = s => { if (!F) return 0; const T = F.timeline, i = Math.floor(s); if (!T.length) return 0; if (i >= T.length) return 1; const a = i > 0 ? T[i - 1] : 0, b = T[i]; return (a + (b - a) * (s - i)) / 1000; };
const S = window.TGSfida = { MAX, attiva: false, token: null, fantasma: null, risultato: null, avvia, fine, esito, avanzaFantasma };

function striscia(){
  if (bar) return bar;
  const st = document.createElement('style'); st.textContent = `
#tgSfida{position:fixed;z-index:10001;left:50%;transform:translateX(-50%);top:calc(var(--sfTop,8px) + env(safe-area-inset-top,0px));width:min(262px,66vw);padding:6px 10px 7px;border-radius:12px;background:rgba(14,20,19,.82);color:#f3e7cb;font:700 12px/1.25 Figtree,system-ui,sans-serif;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.3)}
body:has(#tgCartello) #tgSfida{visibility:hidden}
#tgSfida.sx{left:calc(10px + env(safe-area-inset-left,0px));transform:none;width:min(236px,60vw)}
#tgSfida .r{display:grid;grid-template-columns:78px minmax(0,1fr) 40px;align-items:center;gap:6px;margin-top:3px}
#tgSfida .r span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#tgSfida .r b{text-align:right;font-variant-numeric:tabular-nums}
#tgSfida .tr{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}#tgSfida .tr i{display:block;height:100%;border-radius:3px;transition:width .3s}
#tgSfida .tu i{background:#f2c74e}#tgSfida .fa i{background:#b9c2ff}#tgSfida .fa.arr b{color:#b9c2ff}
#tgSfida .h{display:flex;justify-content:space-between;gap:8px;font-weight:800}#tgSfida .h em{font-style:normal;color:#f2c74e;font-variant-numeric:tabular-nums}
#tgSfida .o{font-weight:600;color:#c9bfa8;font-size:11px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tgSfida.avanti .h span::after{content:" · sei avanti!";color:#8cd17a}#tgSfida.dietro .h span::after{content:" · te sta a batte";color:#ffb3a1}
#tgSfida.poco .h em{color:#ff8a6a}`;
  document.head.appendChild(st);
  bar = document.createElement('div'); bar.id = 'tgSfida'; bar.setAttribute('aria-live', 'off'); document.body.appendChild(bar);
  return bar;
}
function disegna(){
  if (!bar || !F) return;
  const s = trascorsi(), mio = Math.max(0, Math.min(1, +opz.progresso() || 0)), fa = avanzaFantasma(s), arrivato = fa >= 1;
  bar.classList.toggle('avanti', mio > fa + .01 && s > 3); bar.classList.toggle('dietro', fa > mio + .01 && s > 3); bar.classList.toggle('poco', MAX - s < 20);
  bar.innerHTML = `<div class="h"><span>👻 Sfida</span><em>⏱ ${mmssCorto(s)} / 2:00</em></div>${opz.obiettivo ? `<div class="o">🎯 ${opz.obiettivo}</div>` : ''}
    <div class="r tu"><span>Tu</span><span class="tr"><i style="width:${mio * 100}%"></i></span><b>${Math.round(mio * 100)}%</b></div>
    <div class="r fa${arrivato ? ' arr' : ''}"><span>${nomeP(F.paese)}</span><span class="tr"><i style="width:${fa * 100}%"></i></span><b>${arrivato ? '🏁' : Math.round(fa * 100) + '%'}</b></div>`;
}
async function avvia(o){
  opz = Object.assign({ top: 8 }, o || {}); tl = []; F = null; chiusa = false; S.token = null; S.risultato = null; S.attiva = true;
  clearInterval(giro); t0 = performance.now();
  const b = striscia(); b.style.setProperty('--sfTop', (opz.top || 8) + 'px'); b.style.display = ''; b.classList.toggle('sx', opz.posizione === 'sinistra');
  // o fantasma de riserva finché nun risponde o server: nun se aspetta mai
  const bot = opz.bot || 90;
  F = { paese: 'contadino', nome: 'O Contadino', punti: bot * 10, timeline: Array.from({ length: Math.ceil(bot) }, (x, i) => Math.min(1000, Math.round(1000 * (i + 1) / bot))) };
  if (opz.nascondi) { if (!stNasc) { stNasc = document.createElement('style'); document.head.appendChild(stNasc); } stNasc.textContent = `body.tg-sfida60 :is(${opz.nascondi}){display:none!important}`; }
  document.body.classList.add('tg-sfida60');
  giro = setInterval(() => { const s = trascorsi(); while (tl.length < Math.min(MAX, Math.floor(s))) tl.push(Math.round(Math.max(0, Math.min(1, +opz.progresso() || 0)) * 1000)); disegna(); }, 250);
  try {
    const r = await rpc('tg_sfida_inizia', { p_dev: dev(), p_gioco: opz.gioco, p_paese: paese(), p_nome: nomeMio() || null });
    if (r && r.ok) { S.token = r.token; const f = r.fantasma || {}; F = { paese: f.paese, nome: f.nome, punti: +f.punti || F.punti, timeline: Array.isArray(f.timeline) && f.timeline.length ? f.timeline : F.timeline }; S.fantasma = F; if (!opz.obiettivo && r.obiettivo) opz.obiettivo = r.obiettivo; }
  } catch(e){}
  disegna();
  return F;
}
// secondi: o tempo de arrivo (0 o niente = nun è arrivato entro i 2 minuti)
async function fine(secondi){
  if (chiusa) return S.risultato; chiusa = true; S.attiva = false; clearInterval(giro);
  const t = secondi > 0 ? secondi : 0, d = Math.round(t * 10);
  if (t > 0) { while (tl.length < Math.ceil(t)) tl.push(1000); }
  if (bar) bar.style.display = 'none'; document.body.classList.remove('tg-sfida60');
  let r = { ok: false, tipo: 'tempo', vinto: t > 0 && d < (F ? F.punti : 0), premio: 0, punti: d, fantasma: F ? F.punti : 0, f_paese: F && F.paese, offline: true };
  if (S.token) { try { const x = await rpc('tg_sfida_fine', { p_dev: dev(), p_token: S.token, p_punti: d, p_timeline: tl.slice(0, 125) }); if (x && x.ok) r = x; } catch(e){} }
  S.risultato = r; return r;
}
function esito(r){
  r = r || S.risultato || {};
  const chi = r.f_paese === 'contadino' || !r.f_paese ? 'O Contadino' : 'o fantasma de ' + nomeP(r.f_paese), chiC = chi.replace(/^o /, '');
  const mio = r.punti > 0 ? mmss(r.punti / 10) : 'nun sei arrivato', suo = mmss((r.fantasma || 0) / 10);
  if (r.nulla) return { breve: '👻 Nun vale', titolo: '👻 Partita nun valida', testo: 'Qualcosa nun torna co\' i tempi: riprova da capo.', premio: 0 };
  const riga = `Tu ${mio} · ${chiC} ${suo}.`;
  if (r.offline) return { breve: r.vinto ? '👻 Battuto!' : '👻 Ha vinto lui', titolo: r.vinto ? '👻 Fantasma battuto!' : '👻 O fantasma ha vinto', testo: `${riga} Senza connessione o premio nun se pò segnà.`, premio: 0 };
  const pr = r.premio ? `+${r.premio} 🌰 ne o cassone quanno torni ne o mondo` : 'Pe\' oggi i premi de sto gioco so\' finiti: domani se riparte';
  return r.vinto ? { breve: '👻 Battuto!', titolo: `👻 Hai battuto ${chi}!`, testo: `${riga} ${pr}${r.premio >= 300 && r.vinte_oggi ? ` (vittoria ${r.vinte_oggi} de 3 pagate oggi)` : ''}.`, premio: r.premio }
                 : { breve: '👻 Ha vinto lui', titolo: `👻 Te l'ha fatta ${chi}`, testo: `${riga} ${pr}. Batterlo vale 300!`, premio: r.premio };
}
})();
