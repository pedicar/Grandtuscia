/* DE CHI È O CAMPO.
   (19/11: tolte e bandiere ner mondo — troppe, basta a striscia in alto.)
   Quanno stai dentro un campo, sotto a barra in alto na striscia piccola: «🚩 Podere · de Carbognano · 350 🌰»,
      «✅ Podere · è vostro», «🌱 Podere · libero · 100 🌰». Nun se tocca, nun copre.
   Usa TG.Terre (padrone, colore, costo, paeseMio, terraIn), TG.debug (car). */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const corto = p => { try { return ((TG.PrimoMinuto && TG.PrimoMinuto.nomeComune(p)) || p).replace(/ (di|in|sul|al|nel) .*$/i, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); } catch(e){ return p; } };
const breve = n => String(n || '').replace(/^(Il|Lo|La|I|Gli|Le|L')\s*/i, '').slice(0, 28);
const mila = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/* ---------- a striscia quanno stai dentro ---------- */
const css = document.createElement('style'); css.textContent = `
#campoPill{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 104px);z-index:40;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 24px);padding:6px 14px 6px 8px;border-radius:999px;background:rgba(14,18,16,.78);color:#f3e7cb;font:800 15px/1.2 Figtree,system-ui,sans-serif;white-space:nowrap;pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,.25)}
#campoPill i{flex:none;width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.7)}#campoPill span{overflow:hidden;text-overflow:ellipsis}#campoPill b{font-weight:900}
#campoPill[hidden],html.tg-lt3 #campoPill,body:not(.playing) #campoPill,body.flying #campoPill,body:has(#trFesta) #campoPill,body:has(#vehOv:not([hidden])) #campoPill,body:has(#skOv:not([hidden])) #campoPill{display:none!important}`;
document.head.appendChild(css);
let pill = null, ultimo = '';
function striscia(){
  const W = TG.Terre, D = TG.debug; if (!W || !W.terraIn || !D || !D.car) return;
  if (!pill) { pill = document.createElement('div'); pill.id = 'campoPill'; pill.hidden = true; document.body.appendChild(pill); }
  const T = W.terraIn(D.car.x, D.car.z); if (!T) { pill.hidden = true; ultimo = ''; return; }
  const p = W.padrone(T.id), mio = W.paeseMio && W.paeseMio(), c = p ? W.colore(p) : 'transparent';
  const h = !p ? `<i style="border-style:dashed"></i><span>🌱 ${breve(T.nome)} · <b>libero</b> · ${mila(W.costo(T.id))} 🌰</span>`
    : p === mio ? `<i style="background:${c}"></i><span>✅ ${breve(T.nome)} · <b>è vostro</b></span>`
    : `<i style="background:${c}"></i><span>🚩 ${breve(T.nome)} · de <b style="color:${c}">${corto(p)}</b> · ${mila(W.costo(T.id))} 🌰</span>`;
  if (h !== ultimo) { ultimo = h; pill.innerHTML = h; } pill.hidden = false;
}
function avvia(){ if (!TG.Terre || !TG.debug || !TG.debug.scene) return setTimeout(avvia, 1000); setInterval(striscia, 400); }
avvia();
TG.Bandiere = { rifai: () => {} };
})();
