/* CLASSIFICA DE I PAESI — una sola classifica, quella che conta: quanti terreni ha comprato ogni paese.
   Sostituisce o vecchio «Trono de Nocchie» (cuori e stima) ne o menu e in home (pulsanti bTrono/pTrono, menu → trono).
   Contano solo i terreni comprati (no quelli de casa), come in tg-semplice.js e ne a minimappa.
   In più: i messaggi che parlano ancora de lire, stima o Trono (da a vecchia economia de o contadino) nun se fanno vedé.
   Usa TG.Terre (lista, padrone, casa, colore, paese), TG.PrimoMinuto.nomeComune. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ev = (t, c) => { try { TG.Stats && TG.Stats.ev(t, c || ''); } catch(e){} };
const nome = p => { try { return ((TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p).replace(/ (di|in|sul|al|nel) .*$/i, '').replace(/^([a-z])([a-z]*)-([a-z])/, (m, a, b, c) => a.toUpperCase() + b + ' ' + c.toUpperCase()); } catch(e){ return p; } };
const st = document.createElement('style'); st.textContent = `
#clOv{position:fixed;inset:0;z-index:97;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,14,13,.8);font-family:Figtree,system-ui,sans-serif;color:#f3e7cb}#clOv[hidden]{display:none}
#clOv .c{width:min(420px,100%);max-height:100%;overflow:auto;padding:18px 16px 14px;border-radius:22px;background:#1b2423;border:2px solid rgba(242,199,78,.55)}
#clOv h2{margin:0 0 4px;font:900 24px/1.15 Figtree,sans-serif}#clOv p{margin:0 0 12px;font:700 15px/1.3 Figtree,sans-serif;color:#c9bfa8}
#clOv .r{display:grid;grid-template-columns:34px 16px 1fr auto;gap:10px;align-items:center;padding:10px 8px;border-radius:12px;font:800 19px Figtree,sans-serif}
#clOv .r.me{background:rgba(255,214,90,.14);outline:2px solid rgba(255,214,90,.6)}#clOv .r i{width:16px;height:16px;border-radius:50%}#clOv .r em{font-style:normal;opacity:.7;text-align:right}#clOv .r b{font-size:21px}
/* cose vecchie che nun se usano più: via da a vista (o codice resta) */
/* a schermo o meno possibile: via a scritta de a radio in alto (a radio se sente uguale), a classifica sotto a a minimappa,
   e ne o riquadro (da o passo 3) a barra e a riga de sotto: restano solo titolo e una riga */
#radio,#trCl,html body.touch #hud .where.rot>#radio.rotOn.rotOn,html body.touch #hud .where.rot>#mission.rotOn.rotOn,html body #hud .where>#mission#mission{display:none!important}
/* REGOLA UNICA: a schermo solo 🌰 e 🏆; o riquadro solo pe' i primi due passi; niente minimappa, bottone COMPRA, cooperativa, cartelli de i giochi */
html:not(.tg-lt3) #obi,#mini,#scBtn,#coBtn,[data-coop],#tgCartello{display:none!important}
/* o joystick se vede solo quanno ce metti o dito */
html body.touch #joy:not(.act){opacity:0!important}
html:not(.tg-lt3) #obi .b,html:not(.tg-lt3) #obi .r{display:none!important}
html body #hud .where{width:max-content!important;min-width:0!important;max-width:calc(100vw - 130px)!important}
#trTop{font-size:20px!important}#trTop b{font-weight:900}
#pmRiga,#bCodex,#bMe,#bInvito,#pInvito,#segComandi,h4:has(+#segComandi){display:none!important}
#clOv button{display:block;width:100%;margin-top:14px;padding:15px;border:0;border-radius:16px;background:#f2c74e;color:#1b2423;font:900 19px Figtree,sans-serif}`;
document.head.appendChild(st);
let ov = null;
function apri(){
  const T = TG.Terre; if (!T || !T.lista) return;
  // chiude o menu o a pausa da cui s'è aperta, così se vede solo a classifica
  for (const id of ['menuTOv', 'pauseOv', 'menuOv', 'tronoOv']) { const e = document.getElementById(id); if (e && !e.hidden) e.hidden = true; }
  try { if (TG.debug && TG.debug.S && TG.debug.S.phase === 'play') TG.debug.S.paused = false; } catch(e){}
  if (!ov) { ov = document.createElement('div'); ov.id = 'clOv'; ov.hidden = true; document.body.appendChild(ov); ov.addEventListener('click', e => { if (e.target === ov) ov.hidden = true; }); }
  const tot = {}; for (const t of T.lista()) { const pd = T.padrone(t.id); if (pd && !(T.casa && T.casa(t.id))) tot[pd] = (tot[pd] || 0) + 1; }
  const mio = T.paeseMio ? T.paeseMio() : '', cl = Object.entries(tot).sort((a, b) => b[1] - a[1]);
  const pos = cl.findIndex(([p]) => p === mio), miei = +(localStorage.getItem('tg-presi') || 0);
  const riga = ([p, n], i) => `<div class="r${p === mio ? ' me' : ''}"><em>${i + 1}°</em><i style="background:${T.colore(p)}"></i><span>${nome(p)}</span><b>${n}</b></div>`;
  let righe = cl.slice(0, 10).map(riga).join('');
  if (pos >= 10) righe += riga(cl[pos], pos);
  ov.innerHTML = `<div class="c"><h2>👑 Chi tiene più terreni</h2><p>${mio ? (pos >= 0 ? `${nome(mio)} è ${pos + 1}°. ` : `${nome(mio)} ancora nun c'ha terreni. `) : ''}${miei ? `Tu n'hai comprati ${miei}.` : 'Raccoi e nocchie e compra o primo!'}</p>${righe || '<p>Ancora tutti liberi: comincia tu!</p>'}<button>Torna a giocà</button></div>`;
  ov.querySelector('button').onclick = () => { ov.hidden = true; };
  ov.hidden = false; ev('classifica', String(pos + 1));
}
TG.Classifica = { apri };
// rete de sicurezza: niente più lire, stima o Trono ne i messaggi
const VECCHIO = /\blire\b|\bstima\b|♥|Trono de|Trono di|affitt|manutenz|cooperativ|rinforz|al massimo|metà prezzo|cassone pieno|limite orario/i;
(function filtro(){
  if (!TG.msg || TG.msg._vecchio) return setTimeout(filtro, 400);
  const o = TG.msg, n = function(t, s){ if (VECCHIO.test(String(t) + ' ' + (s || ''))) return; return o.apply(this, arguments); };
  for (const k in o) n[k] = o[k]; n._vecchio = 1; TG.msg = n;
})();
})();
