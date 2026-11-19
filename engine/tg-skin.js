/* VERNICI DE I MEZZI — o primo pezzo de e personalizzazioni.
   Ogni mezzo che c'hai se pò ridipinge: tocchi 🎨 ne o garage, vedi o colore subito sur mezzo, e se te piace o compri.
   Tre tipi de vernice:
     - Originale e Colori de o paese tuo: gratis (o paese prima de tutto)
     - Vernici normali: 100 🌰 l'una, pe' ogni mezzo
     - Speciali: Nocciola 500, Notte 1.000, Oro 10.000 (a più cara, pe' chi c'ha già tutto)
     - Guadagnate, no comprate: «Esploratore» (trovi tutti i 5 mezzi nascosti), «Campione» (o paese tuo primo in classifica)
   Come se colora: se cerca ner modello o materiale che copre de più (a carrozzeria) e se cambia solo quello, su na copia,
   così nun se tocca gnente de l'artri modelli. Funziona pe' tutti i mezzi, anche quelli vecchi.
   Stato: TG.Contadino.stato(...).skin = { mezzo: idVernice }, .vernici = { 'mezzo:idVernice': data }.
   Usa TG.debug (VEH, setVehicle), TG.Cassone (n, togli), TG.Terre (colore, paeseMio, lista, padrone, casa), TG.Scoperte, TG.msg, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ev = (t, c, n) => { try { TG.Stats && TG.Stats.ev(t, c || '', n); } catch(e){} };
const mila = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const st = () => { try { const s = TG.Contadino.stato(TG.Profile.data); s.skin = s.skin || {}; s.vernici = s.vernici || {}; return s; } catch(e){ return null; } };
const salva = () => { try { TG.Profile.salva(); } catch(e){} };
const paese = () => { try { return TG.Terre.paeseMio(); } catch(e){ return ''; } };
const coloreP = () => { try { return TG.Terre.colore(paese()) || '#d8432a'; } catch(e){ return '#d8432a'; } };
// o paese tuo è primo pe' terreni (come ne a classifica)
function primo(){ try { const T = TG.Terre, tot = {}; for (const t of T.lista()) { const p = T.padrone(t.id); if (p && !(T.casa && T.casa(t.id))) tot[p] = (tot[p] || 0) + 1; } const cl = Object.entries(tot).sort((a, b) => b[1] - a[1]); return cl.length && cl[0][0] === paese(); } catch(e){ return false; } }
const VERNICI = [
  { id: 'orig', nome: 'Originale', hex: null, prezzo: 0 },
  { id: 'paese', nome: 'Colori de o paese', hex: coloreP, prezzo: 0 },
  { id: 'rosso', nome: 'Rosso', hex: '#c8321f', prezzo: 100 },
  { id: 'blu', nome: 'Blu', hex: '#1f5fae', prezzo: 100 },
  { id: 'verde', nome: 'Verde bosco', hex: '#2f7a3a', prezzo: 100 },
  { id: 'giallo', nome: 'Giallo', hex: '#f2c200', prezzo: 100 },
  { id: 'bianco', nome: 'Bianco', hex: '#f3efe6', prezzo: 100 },
  { id: 'rosa', nome: 'Rosa', hex: '#e06f9a', prezzo: 100 },
  { id: 'azzurro', nome: 'Azzurro lago', hex: '#5fb7c4', prezzo: 100 },
  { id: 'arancio', nome: 'Arancio', hex: '#f0652b', prezzo: 100 },
  { id: 'nocciola', nome: 'Nocciola', hex: '#8a5a2b', prezzo: 500, speciale: 1 },
  { id: 'notte', nome: 'Notte', hex: '#1b1d22', prezzo: 1000, speciale: 1, lucido: 1 },
  { id: 'oro', nome: 'Oro', hex: '#d4a62a', prezzo: 10000, speciale: 1, oro: 1 },
  { id: 'esploratore', nome: 'Esploratore', hex: '#16a37f', prezzo: 0, premio: 'Trova tutti i 5 mezzi nascosti', ok: () => TG.Scoperte && TG.Scoperte.LISTA.every(m => TG.Scoperte.trovato(m.id)) },
  { id: 'campione', nome: 'Campione', hex: '#7a3fb0', prezzo: 0, premio: 'O paese tuo primo in classifica', ok: primo }
];
const hexDi = v => typeof v.hex === 'function' ? v.hex() : v.hex;
const ce = (mz, v) => { if (v.ok) return !!v.ok(); if (!v.prezzo) return true; const s = st(); return !!(s && s.vernici[mz + ':' + v.id]); };

/* ---------- a carrozzeria: o materiale che copre più triangoli (no gomme, cromo, pelle, vetri, luci) ---------- */
const orig = new WeakMap();   // modello → { mat, col, shin, spec }
function carrozzeria(model){
  if (!model || !model.group) return null;
  if (orig.has(model)) return orig.get(model);
  const conta = new Map();
  model.group.traverse(o => { if (!o.isMesh || !o.material || Array.isArray(o.material)) return; const m = o.material;
    if (m.transparent || (m.emissive && m.emissive.getHSL({ h: 0, s: 0, l: 0 }).l > .05) || !m.color) return;
    const hsl = m.color.getHSL({ h: 0, s: 0, l: 0 }); if (hsl.l < .06 || hsl.s < .12) return;   // gomme, cromo, grigi
    const g = o.geometry, n = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0);
    const r = conta.get(m) || { n: 0, mesh: [] }; r.n += n; r.mesh.push(o); conta.set(m, r); });
  let best = null, bn = 0; for (const [m, r] of conta) if (r.n > bn) { bn = r.n; best = [m, r.mesh]; }
  if (!best) return null;
  const copia = best[0].clone(); for (const o of best[1]) o.material = copia;
  const rec = { mat: copia, col: copia.color.clone(), shin: copia.shininess, spec: copia.specular ? copia.specular.clone() : null };
  orig.set(model, rec); return rec;
}
function dipingi(model, v){
  const c = carrozzeria(model); if (!c) return false; const m = c.mat;
  if (!v || v.id === 'orig') { m.color.copy(c.col); m.shininess = c.shin; c.spec && m.specular && m.specular.copy(c.spec); return true; }
  m.color.set(hexDi(v)); try { m.color.convertSRGBToLinear(); } catch(e){}
  m.shininess = v.oro ? 140 : v.lucido ? 110 : Math.max(40, c.shin || 40);
  if (m.specular) m.specular.set(v.oro ? '#fff2b0' : v.lucido ? '#9aa4b0' : '#555555');
  return true;
}
const D = () => TG.debug;
const curId = () => { try { return D().VEH.cur.id; } catch(e){ return null; } };
const curModel = () => { try { return D().VEH.models[curId()]; } catch(e){ return null; } };
let prova = null;   // { mz, v } vernice in prova (ancora nun comprata)
function applica(){
  const id = curId(), M = curModel(); if (!id || !M) return;
  const s = st(); const vid = prova && prova.mz === id ? prova.v.id : (s && s.skin[id]) || 'orig';
  const v = VERNICI.find(x => x.id === vid) || VERNICI[0];
  if (M._verniceTG === vid + hexDi(v)) return; M._verniceTG = vid + hexDi(v); dipingi(M, v);
}
setInterval(applica, 500);

/* ---------- o pannello 🎨 (da o garage) ---------- */
const css = document.createElement('style'); css.textContent = `
#skOv{position:fixed;left:0;right:0;bottom:0;z-index:98;padding:14px 14px calc(14px + env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;background:#1b2423;border-top:2px solid rgba(242,199,78,.55);color:#f3e7cb;font-family:Figtree,system-ui,sans-serif;max-height:44vh;overflow:auto;box-shadow:0 -8px 30px rgba(0,0,0,.4)}
#skOv[hidden]{display:none}#skOv h3{margin:0 0 2px;font:900 20px Figtree,sans-serif}#skOv p{margin:0 0 8px;color:#c9bfa8;font:700 14px/1.3 Figtree,sans-serif}
#skOv .g{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}#skOv .s{all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 1px;border-radius:12px;background:rgba(255,255,255,.05);font:800 11px/1.1 Figtree,sans-serif;text-align:center}
#skOv .s i{width:32px;height:32px;border-radius:50%;border:3px solid rgba(255,255,255,.25);box-shadow:inset 0 -6px 10px rgba(0,0,0,.25)}#skOv .s.on{outline:3px solid #f2c74e;background:rgba(242,199,78,.12)}#skOv .s.lock i{filter:saturate(.7) brightness(.9)}
#skOv .s small{font-weight:700;color:#c9bfa8}#skOv .t{margin:10px 0 4px;font:900 14px Figtree,sans-serif;color:#f2c74e}
#skOv .b{position:sticky;bottom:-14px;display:flex;gap:10px;margin:12px -14px -14px;padding:10px 14px 14px;background:#1b2423}#skOv .b button{flex:1;padding:14px;border:0;border-radius:16px;font:900 17px Figtree,sans-serif;cursor:pointer}#skOv .b .si{background:#f2c74e;color:#1b2423}#skOv .b .no{background:#3a4a47;color:#f3e7cb}#skOv .b .si:disabled{opacity:.45}`;
document.head.appendChild(css);
let ov = null, mz = null, scelta = null;
function apri(mezzo){
  mz = mezzo; const s = st(); if (!s) return;
  try { const o = document.getElementById('vehOv'); const x = o && o.querySelector('[data-close]'); if (x) x.click(); else if (o) o.hidden = true; } catch(e){}
  // se o mezzo nun è quello in uso, ce se sale (così o colore se vede subito)
  if (curId() !== mz) { try { if (mz === 'aereo' || (TG.Scoperte && TG.Scoperte.LISTA.some(m => m.id === mz && m.vola))) {} else D().setVehicle(mz); } catch(e){} }
  scelta = VERNICI.find(v => v.id === (s.skin[mz] || 'orig')); prova = null;
  if (!ov) { ov = document.createElement('div'); ov.id = 'skOv'; document.body.appendChild(ov); }
  disegna(); ov.hidden = false; ev('skin_apri', mz);
}
function disegna(){
  const s = st(), n = TG.Cassone ? TG.Cassone.n : 0, usa = s.skin[mz] || 'orig';
  const cella = v => { const h = hexDi(v), mio = ce(mz, v), sotto = v.id === usa ? 'In uso' : mio ? (v.prezzo || v.ok ? 'Tua' : 'Gratis') : v.premio ? '🏆 Da vince' : mila(v.prezzo) + ' 🌰';
    return `<button class="s${scelta && scelta.id === v.id ? ' on' : ''}${mio ? '' : ' lock'}" data-v="${v.id}"><i style="background:${h ? (v.oro ? `linear-gradient(135deg,#fff3b0,${h} 45%,#8a6a10)` : h) : 'conic-gradient(#888 0 25%,#bbb 0 50%,#888 0 75%,#bbb 0)'}"></i>${v.nome}<small>${sotto}</small></button>`; };
  const v = scelta || VERNICI[0], mio = ce(mz, v);
  let bt; if (v.id === usa) bt = `<button class="si" data-ok>Fatto</button>`;
  else if (mio) bt = `<button class="si" data-usa>Usa ${v.nome}</button>`;
  else if (v.premio) bt = `<button class="si" disabled>🏆 ${v.premio}</button>`;
  else bt = n >= v.prezzo ? `<button class="si" data-compra>Compra · ${mila(v.prezzo)} 🌰</button>` : `<button class="si" disabled>Te ne mancano ${mila(v.prezzo - n)}</button>`;
  ov.innerHTML = `<h3>🎨 Vernice pe' ${nomeMezzo(mz)}</h3><p>Tocca un colore e o vedi subito. Hai ${mila(n)} 🌰</p>
    <div class="g">${VERNICI.filter(x => !x.speciale && !x.premio).map(cella).join('')}</div>
    <div class="t">✨ Speciali</div><div class="g">${VERNICI.filter(x => x.speciale).map(cella).join('')}</div>
    <div class="t">🏆 Se vincono, nun se comprano</div><div class="g">${VERNICI.filter(x => x.premio).map(cella).join('')}</div>
    <div class="b"><button class="no" data-chiudi>Chiudi</button>${bt}</div>`;
  ov.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { scelta = VERNICI.find(x => x.id === b.dataset.v); prova = { mz, v: scelta }; disegna(); });
  const q = k => ov.querySelector(k);
  q('[data-chiudi]').onclick = chiudi; q('[data-ok]') && (q('[data-ok]').onclick = chiudi);
  q('[data-usa]') && (q('[data-usa]').onclick = () => { s.skin[mz] = v.id; salva(); prova = null; ev('skin_usa', mz + ':' + v.id); chiudi(); });
  q('[data-compra]') && (q('[data-compra]').onclick = () => { if (TG.Cassone.n < v.prezzo) return; TG.Cassone.togli(v.prezzo); s.vernici[mz + ':' + v.id] = Date.now(); s.skin[mz] = v.id; salva(); prova = null; ev('skin_compra', mz + ':' + v.id, v.prezzo); try { TG.msg(`🎨 ${v.nome}: è tua!`, `−${mila(v.prezzo)} 🌰`, 3); } catch(e){} chiudi(); });
}
function chiudi(){ prova = null; if (ov) ov.hidden = true; const M = curModel(); if (M) M._verniceTG = null; applica(); }
function nomeMezzo(id){ try { const m = (TG.Cassone.MEZZI() || []).concat(TG.Scoperte ? TG.Scoperte.LISTA : []).find(x => x.id === id); return m ? m.ico + ' ' + m.nome : id; } catch(e){ return id; } }
TG.Skin = { apri, VERNICI, applica, chiudi };
})();
