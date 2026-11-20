/* UNA COSA ALLA VOLTA — chi entra la prima volta vede solo quello che serve adesso.
   Passo 1  RACCOJI      solo joystick, nocchie e un riquadro: «Passa sopra e nocchie · 3/10».
   Passo 2  COMPRA       10 nocchie: a freccia porta a o terreno libero più vicino, compare COMPRA.
   Passo 3  A MAPPA      primo terreno preso: compaiono minimappa e classifica de i paesi.
   Passo 4  GIOCHI       3 terreni: compaiono i cartelli de i giochi (premi in nocchie) e o garage de i mezzi.
   Passo 5  TUTTO        6 terreni: cooperativa, affitti, manutenzione, battaglie.
   Chi giocava già (ha già scaricato almeno una volta) parte da o passo 5: nun je se toje gnente.
   O passo se salva sul telefono (tg-passo). Esterno: TG.Cassone, TG.msg, TG.Stats. Letto da tg-semplice.js e tg-coop.js. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const SOGLIE = { 3: 1, 4: 3, 5: 6 };   // passo → terreni presi
let passo = +(ls.get('tg-passo') || 0);
if (!passo) passo = ls.get('tg-primo-scarico') || +(ls.get('tg-presi') || 0) > 0 ? 5 : ls.get('tg-cassone-10') ? 2 : 1;
const st = document.createElement('style'); st.textContent = `
html.tg-lt3 #mini,html.tg-lt3 #trCl,html.tg-lt3 #obi .r,html.tg-lt3 #scBtn.no{display:none!important}
html.tg-lt4 #tgCartello,html.tg-lt4 #bVeh{display:none!important}
html.tg-lt5 #coBtn,html.tg-lt5 [data-coop]{display:none!important}
html.tg-lt3 #obi{width:min(240px,60vw)!important}
html.tg-lt3 #obi .t{font-size:17px!important}html.tg-lt3 #obi .s{font-size:14px!important}
#obi .n10{margin-top:4px;font:900 15px Figtree,sans-serif;color:#fff;text-align:right}`;
document.head.appendChild(st);
function classi(){ const h = document.documentElement; for (const k of [3, 4, 5]) h.classList.toggle('tg-lt' + k, passo < k); }
function vai(p, zitto){
  if (p <= passo) return; passo = p; ls.set('tg-passo', String(p)); classi();
  try { TG.Stats && TG.Stats.ev('passo', String(p)); } catch(e){}
  if (zitto) return;
  const M = {
    2: comprabile() ? ['🌰 10 nocchie: ce l\'hai!', 'Mo\' segui a freccia arancione: o primo terreno costa poco'] : null,
    3: ['🎉 O primo terreno è vostro!', 'In alto a destra mo\' c\'è a mappa: vedi chi tiene i terreni'],
    4: ['🎮 Novità: i giochi', 'Vicino a i cartelli giochi e vinci tante nocchie. Ne o garage, mezzi più grossi'],
    5: ['🏛 Novità: a cooperativa', 'Ogni paese c\'ha a sua: dona nocchie e fa crescere o paese tuo']
  }[p];
  if (M) setTimeout(() => { try { TG.msg(M[0], M[1], 6); } catch(e){} }, p === 2 ? 300 : 3500);
}
classi();
// prima de o passo 5 i messaggi de cose che ancora nun se vedono stanno zitti
const ZITTI = { 5: /cooperativ|manutenz|affitt|battaglia|tassa/i, 4: /fantasma|garage|mezzo novo/i };
function filtro(){
  if (!TG.msg || TG.msg._passi) return setTimeout(filtro, 300);
  const o = TG.msg, n = function(t, s, sec){ const x = String(t) + ' ' + (s || ''); for (const k in ZITTI) if (passo < +k && ZITTI[k].test(x) && !/^🎮|^🏛/.test(String(t))) return; return o.apply(this, arguments); };
  n._passi = 1; TG.msg = n;
}
filtro();
addEventListener('tg-presa', e => { const t = (e.detail && e.detail.tot) || +(ls.get('tg-presi') || 0); for (const p of [5, 4, 3]) if (t >= SOGLIE[p]) { vai(p); break; } });
setInterval(() => { if (passo === 1 && TG.Cassone && TG.Cassone.n >= 10) vai(2); }, 500);
// c'è almeno un terreno che co' e nocchie de mo' se po' comprà? (sennò nun se dice de annà a comprà)
function comprabile(){ try { const W = TG.Terre, n = TG.Cassone.n; return W.lista().some(T => W.stato(T.id) !== 'nostro' && W.costo(T.id) <= n); } catch(e){ return false; } }
TG.Passi = {
  n: () => passo,
  vai,
  // o riquadro de i primi due passi (tg-semplice.js): null = usa quello normale
  riquadro(dentro){
    const C = TG.Cassone, W = TG.Terre; if (!C || passo > 2) return null;
    const n = C.n, b = (k, m, col) => `<div class="b"><i style="width:${Math.max(3, Math.min(100, k / m * 100))}%;background:${col}"></i></div><div class="n10">🌰 ${Math.min(k, m)}/${m}</div>`;
    if (passo === 1) return `<div class="t">🌰 Passa sopra e nocchie</div><div class="s">Co' 10, o campo dove stai diventa tuo</div>${b(n, 10, '#e2b765')}`;
    if (dentro && W) { const st = W.stato(dentro.id), c = W.costo(dentro.id);
      if (st !== 'nostro' && n >= c) return `<div class="t">🎉 Ce sei!</div><div class="s">O campo sta a diventà tuo</div>`;
      if (st !== 'nostro') return `<div class="t">Questo costa ${c}</div><div class="s">Raccoji ancora ${c - n} nocchie</div>${b(n, c, '#e2b765')}`; }
    if (!comprabile()) return null;   // nessun terreno che te poi permette: se vede o riquadro normale (o prossimo mezzo)
    return `<div class="t">🚩 Mo' compra un terreno</div><div class="s">Segui a freccia arancione</div>`;
  }
};
})();
