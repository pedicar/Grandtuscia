/* TG.Fantasmi — il giro migliore di ogni comune, da inseguire nei giochi veloci.
   Il gioco registra già la traiettoria del tuo record (il fantasma personale): qui la stessa traccia parte per il
   server insieme al tempo e al comune, e si riscarica quella del paese rivale. Niente nomi: conta il paese.
   Uso: TG.Fantasmi.salva(gioco, tempo, traccia) · await TG.Fantasmi.carica(gioco) · TG.Fantasmi.rivale(lista) */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const cfg = () => window.TG_STATS_CONFIG || null;
// la config del server arriva da tg-stats-config.js, che i giochi caricano in ritardo (tramite tg-ponte): se manca la carico io
const BASE = (document.currentScript && document.currentScript.src || '').replace(/tg-fantasmi\.js.*$/, '');
function pronta(){
  return new Promise(res => {
    if (cfg()) return res(true);
    if (!document.querySelector('script[src*="tg-stats-config.js"]')) { const s = document.createElement('script'); s.src = BASE + 'tg-stats-config.js'; document.head.appendChild(s); }
    let n = 0; const t = setInterval(() => { if (cfg() || ++n > 40) { clearInterval(t); res(!!cfg()); } }, 100);
  });
}
function dev(){
  try { if (TG.Stats && TG.Stats.dispositivo) return TG.Stats.dispositivo; } catch(e){}
  let d = ls.get('tg-dev-fantasma'); if (!d) { d = 'f' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4); ls.set('tg-dev-fantasma', d); } return d;
}
const paese = () => { const p = ls.get('tg-paese-dev'); return p && p !== 'nessuno' ? p : null; };
async function rpc(nome, body){
  await pronta(); const c = cfg(); if (!c || !c.url) throw new Error('server non configurato');
  const r = await fetch(c.url.replace(/\/$/, '') + '/rest/v1/rpc/' + nome, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: c.key, Authorization: 'Bearer ' + c.key }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}
const cache = {};
TG.Fantasmi = {
  paese, dev,
  attivo(){ return !!paese(); },
  async salva(gioco, tempo, traccia, nome){
    const p = paese(); if (!p || !tempo || !traccia) return null;
    try { const r = await rpc('tg_fantasma_salva', { p_gioco: gioco, p_dev: dev(), p_paese: p, p_nome: nome || null, p_tempo: +tempo, p_traccia: String(traccia) }); if (r && r.salvato) delete cache[gioco]; return r; } catch(e){ return null; }
  },
  async carica(gioco){
    if (cache[gioco]) return cache[gioco];
    try { const l = await rpc('tg_fantasmi', { p_gioco: gioco }); cache[gioco] = Array.isArray(l) ? l : []; return cache[gioco]; } catch(e){ return []; }
  },
  // il fantasma da inseguire: il migliore di un ALTRO comune (il più vicino al mio tempo, se ne ho uno; altrimenti il migliore)
  rivale(lista, mioTempo){
    const p = paese(); const altri = (lista || []).filter(f => f.paese !== p);
    if (!altri.length) return null;
    if (mioTempo > 0) { const avanti = altri.filter(f => f.tempo < mioTempo).sort((a, b) => b.tempo - a.tempo); if (avanti.length) return avanti[0]; }
    return altri[0];
  },
  mio(lista){ const p = paese(); return (lista || []).find(f => f.paese === p) || null; },
  fmt(t){ t = +t; const m = Math.floor(t / 60), s = t - m * 60; return (m ? m + ':' : '') + (m ? s.toFixed(1).padStart(4, '0') : s.toFixed(1)); }
};
})();
