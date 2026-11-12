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
// Il soprannome: serve perché «o mejo de o paese» abbia un nome (nel gioco e nel post della domenica). Si chiede una volta, al primo record; si può saltare.
const lsg = k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, lss = (k, v) => { try { localStorage.setItem(k, v); } catch(e){} };
function soprannome(){ try { const a = window.TG.Account; if (a && a.soprannome) return a.soprannome; } catch(e){} return lsg('tg-soprannome') || ''; }
let chiesto = false;
function chiediNome(){
  if (chiesto || lsg('tg-soprannome-no')) return Promise.resolve('');
  chiesto = true;
  return new Promise(res => {
    const o = document.createElement('div'); o.id = 'fnOv';
    o.setAttribute('style', 'position:fixed;inset:0;z-index:9500;background:rgba(16,22,21,.9);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Figtree,"Segoe UI",system-ui,sans-serif;color:#f3e7cb');
    o.innerHTML = '<form style="width:min(420px,100%);background:#17201f;border:2px solid #f2c74e;border-radius:18px;padding:20px 18px;text-align:center"><div style="color:#f2c74e;font-weight:800;letter-spacing:.08em;font-size:12px">O TEMPO TUO VA IN CLASSIFICA</div><h2 style="margin:6px 0 4px;font-size:24px">Come te chiami?</h2><p style="color:#c9bfa8;margin:0 0 12px;font-size:14px">Nome o soprannome: se diventi o mejo de o paese, a domenica lo scrivemo ne o post.</p><input id="fnNome" maxlength="24" autocomplete="nickname" placeholder="es. Marcolino" style="width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:2px solid #4a5a55;background:#0f1514;color:#f3e7cb;font:600 17px inherit"><div style="display:flex;gap:8px;margin-top:12px"><button type="submit" style="flex:1;border:0;border-radius:12px;padding:12px;background:#f2c74e;color:#14181a;font:800 16px inherit;cursor:pointer">Vai</button><button type="button" id="fnNo" style="flex:1;border:2px solid #4a5a55;border-radius:12px;padding:12px;background:transparent;color:#f3e7cb;font:600 15px inherit;cursor:pointer">Senza nome</button></div></form>';
    document.body.appendChild(o);
    const fine = n => { o.remove(); n = String(n || '').trim().slice(0, 24); if (n) lss('tg-soprannome', n); else lss('tg-soprannome-no', '1'); try { window.TG.Stats && window.TG.Stats.ev('soprannome', n ? 'si' : 'no'); } catch(e){} res(n); };
    o.querySelector('form').addEventListener('submit', e => { e.preventDefault(); fine(o.querySelector('#fnNome').value); });
    o.querySelector('#fnNo').addEventListener('click', () => fine(''));
    setTimeout(() => { try { o.querySelector('#fnNome').focus(); } catch(e){} }, 100);
  });
}
TG.Fantasmi = {
  paese, dev,
  attivo(){ return !!paese(); },
  async salva(gioco, tempo, traccia, nome){
    const p = paese(); if (!p || !tempo || !traccia) return null;
    nome = nome || soprannome() || await chiediNome();
    try { const r = await rpc('tg_fantasma_salva', { p_gioco: gioco, p_dev: dev(), p_paese: p, p_nome: nome || null, p_tempo: +tempo, p_traccia: String(traccia) }); if (r && r.salvato) delete cache[gioco]; return r; } catch(e){ return null; }
  },
  soprannome, chiediNome,
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
