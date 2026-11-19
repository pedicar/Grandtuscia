/* SALTI E TRICK — valgono nocchie.
   - Ogni mezzo: se stai in aria più de 0,7 secondi, all'atterraggio pij nocchie (4 al secondo de volo).
   - Moto da cross: salta de più (spinta x1,5 quanno decolla), bottone tondo «⤴ SALTA» pe' saltà
     da fermo o in corsa; in aria o stesso bottone diventa «🤸 TRICK»: ogni tocco fa un trick (Backflip, 360, Superman, Giro de botte,
     Frontflip). Atterri dritto → nocchie de o volo x2 + i trick (2 o più trick: +50%). Atterri a metà trick → «💥 Caduto!», niente.
   - Ape: in curva veloce va su due ruote; più ce resti, più nocchie (3 al secondo, da 0,8 s in su).
   Avvisi in alto, niente da toccà. Tastiera: J = salta/trick (Spazio è o freno).
   Usa TG.debug (car: x z y vy speed; world.ground/surfH; VEH.cur/models), TG.Cassone.aggiungi, TG.msg, TG.Stats. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ev = (t, c, n) => { try { TG.Stats && TG.Stats.ev(t, c || '', n); } catch(e){} };
const TRICK = [
  { nome: 'Backflip', dur: .75, p: 15, f: (T, u) => { T.x = -u * Math.PI * 2; } },
  { nome: '360', dur: .6, p: 10, f: (T, u) => { T.y = u * Math.PI * 2; } },
  { nome: 'Superman', dur: .7, p: 20, f: (T, u) => { T.su = Math.sin(u * Math.PI); } },
  { nome: 'Giro de botte', dur: .7, p: 12, f: (T, u) => { T.z = u * Math.PI * 2; } },
  { nome: 'Frontflip', dur: .8, p: 18, f: (T, u) => { T.x = u * Math.PI * 2; } }
];
let aria = 0, eraInAria = false, spinto = false, fatti = [], inCorso = null, prossimo = 0, dueRuote = 0, tPrima = performance.now();
const css = document.createElement('style'); css.textContent = `
#trickBtn{position:fixed;right:18px;bottom:calc(env(safe-area-inset-bottom,0px) + 118px);z-index:30;width:92px;height:92px;border-radius:50%;border:3px solid rgba(255,255,255,.85);background:radial-gradient(circle at 35% 30%,#ff9a5c,#f0652b 60%,#b9431a);color:#fff;font:900 15px/1.05 Figtree,system-ui,sans-serif;text-shadow:0 2px 0 rgba(0,0,0,.35);box-shadow:0 6px 0 rgba(0,0,0,.3),0 8px 18px rgba(0,0,0,.3);touch-action:none;-webkit-tap-highlight-color:transparent;display:none}
#trickBtn.on{display:block}#trickBtn.aria{background:radial-gradient(circle at 35% 30%,#7fd0ff,#1f8fd0 60%,#145e8a)}#trickBtn:active{transform:translateY(3px);box-shadow:0 3px 0 rgba(0,0,0,.3)}
#trickBtn span{display:block;font-size:30px;line-height:1}`;
document.head.appendChild(css);
const btn = document.createElement('button'); btn.id = 'trickBtn'; btn.type = 'button'; btn.innerHTML = '<span>⤴</span>SALTA';
btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); premi(); });
btn.addEventListener('click', e => e.stopPropagation());
document.body.appendChild(btn);
addEventListener('keydown', e => { if (e.code === 'KeyJ' && cur() === 'moto' && document.body.classList.contains('playing')) { e.preventDefault(); premi(); } });

const D = () => TG.debug;
const cur = () => { try { return D().VEH.cur.id; } catch(e){ return null; } };
const modello = () => { try { return D().VEH.models[cur()]; } catch(e){ return null; } };
function suolo(c){ const E = D().world; let g = E.ground(c.x, c.z); try { if (E.surfH) g = Math.max(g, E.surfH(c.x, c.z)); } catch(e){} return g; }
function dai(k, titolo, sotto){ if (!(k > 0)) return; let n = k; try { n = TG.Cassone.aggiungi(k, true) || k; } catch(e){} try { TG.msg(titolo, `+${n} 🌰${sotto ? ' · ' + sotto : ''}`, 2.6); } catch(e){} }
function premi(){
  const c = D() && D().car; if (!c || cur() !== 'moto') return;
  const alto = c.y - suolo(c);
  if (alto < .25) { if (Math.abs(c.speed || 0) < 1 && c.vy > 1) return; c.vy = 8 + Math.min(5, Math.abs(c.speed || 0) * .05); c.y += .08;   // poi decollando se moltiplica x1,5
    ev('moto_salto'); return; }
  if (inCorso) return;   // un trick pe' volta
  const T = TRICK[prossimo++ % TRICK.length]; inCorso = { T, t: 0 };
}
function giro(){
  requestAnimationFrame(giro);
  const ora = performance.now(), dt = Math.min(.1, (ora - tPrima) / 1000); tPrima = ora;
  const Dg = D(); if (!Dg || !Dg.car || !Dg.world) return;
  const id = cur(), M = modello(), c = Dg.car;
  const gioca = document.body.classList.contains('playing') && !document.body.classList.contains('flying');
  btn.classList.toggle('on', gioca && id === 'moto');
  if (!gioca) { aria = 0; eraInAria = false; fatti = []; inCorso = null; return; }
  const alto = c.y - suolo(c), inAria = alto > .3;
  if (inAria) {
    aria += dt;
    if (id === 'moto') {
      if (!spinto && c.vy > 2.5) { c.vy *= 1.5; spinto = true; }   // salta de più
      if (inCorso) { inCorso.t += dt; const u = Math.min(1, inCorso.t / inCorso.T.dur); const T = M && M.trick; if (T) { T.x = T.y = T.z = T.su = 0; inCorso.T.f(T, u); }
        if (u >= 1) { fatti.push(inCorso.T); inCorso = null; if (T) { T.x = T.y = T.z = T.su = 0; } } }
    }
  } else if (eraInAria) {
    // atterrato
    const T = M && M.trick;
    if (inCorso && inCorso.t / inCorso.T.dur < .85) { try { c.speed *= .2; } catch(e){} try { TG.msg('💥 Caduto!', 'A metà de ' + inCorso.T.nome + ': niente nocchie', 2.2); } catch(e){} ev('moto_caduto', inCorso.T.nome); }
    else {
      if (inCorso) fatti.push(inCorso.T);
      let k = aria > .7 ? Math.round(aria * 4) * (id === 'moto' ? 2 : 1) : 0;
      if (fatti.length) { let p = fatti.reduce((s, x) => s + x.p, 0); if (fatti.length > 1) p = Math.round(p * 1.5); k += p; }
      if (k > 0) { const nomi = fatti.map(x => x.nome); dai(k, nomi.length ? '🤸 ' + nomi.join(' + ') + '!' : `🦘 Salto de ${aria.toFixed(1).replace('.', ',')} secondi!`); ev(fatti.length ? 'trick' : 'salto', nomi.join('+') || id, k); }
    }
    if (T) T.x = T.y = T.z = T.su = 0;
    aria = 0; fatti = []; inCorso = null; spinto = false;
  } else spinto = false;
  eraInAria = inAria;
  btn.classList.toggle('aria', inAria); const lab = inAria ? '<span>🤸</span>TRICK' : '<span>⤴</span>SALTA'; if (btn._l !== lab) { btn._l = lab; btn.innerHTML = lab; }
  // Ape su due ruote
  if (id === 'ape' && M && !inAria) {
    const L = Math.abs(M.lean || 0);
    if (L > .25 && Math.abs(c.speed || 0) > 10) dueRuote += dt;
    else if (dueRuote > 0) { if (dueRuote > .8) { const k = Math.round(dueRuote * 3) + 2; dai(k, '🛺 Su due ruote!', dueRuote.toFixed(1).replace('.', ',') + ' secondi'); ev('ape_due_ruote', '', k); } dueRuote = 0; }
  } else dueRuote = 0;
}
requestAnimationFrame(giro);
TG.Trick = { premi, stato: () => ({ aria, eraInAria, fatti: fatti.map(x => x.nome), inCorso: inCorso && inCorso.T.nome }) };
})();
