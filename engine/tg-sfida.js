/* A SFIDA DE A SETTIMANA — due paesi, una zona, una settimana.
   - Ogni settimana (lunedì → domenica, ora de Roma) se sfidano DUE paesi: PROGRAMMA dice chi, sennò gira ROTA.
   - Chi entra sceglie pe' chi gioca (due bottoni). Se o paese suo è uno de i due, entra da solo ne a squadra sua.
     A scelta vale tutta a settimana; lunedì se riparte.
   - Contano solo i 12 campi de a sfida (6 pe' paese, quelli più vicini a o confine): tg-terre.js li accende e filtra i punteggi.
   - In alto: «⚔ Fabrica 6 – 4 Carbognano». Domenica sera vince chi tiene più campi.
   - ?sfida=0 spegne tutto e torna a a guerra de tutti i paesi.
   Esterno: TG.PrimoMinuto (paese), TG.Stats, TG.Terre (dopo). Va caricato PRIMA de tg-terre.js. */
(function(){
'use strict';
const TG = window.TG = window.TG || {};
const ls = { get: k => { try { return localStorage.getItem(k); } catch(e){ return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch(e){} } };
const ev = (t, c, v, x) => { try { TG.Stats && TG.Stats.ev(t, c, v, x); } catch(e){} };
const giorno = () => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date()); } catch(e){ return new Date().toISOString().slice(0, 10); } };
const piu = (g, n) => { const d = new Date(g + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const lunedi = g => piu(g, -((new Date(g + 'T12:00:00Z').getUTCDay() + 6) % 7));

// chi se sfida: per lunedì de a settimana. Le settimane nun scritte girano su ROTA.
const PROGRAMMA = { '2026-11-09': ['fabrica', 'carbognano'], '2026-11-16': ['fabrica', 'carbognano'] };
const ROTA = [['fabrica', 'carbognano'], ['caprarola', 'ronciglione']];
const NOMI = { fabrica: 'Fabrica', carbognano: 'Carbognano', caprarola: 'Caprarola', ronciglione: 'Ronciglione', viterbo: 'Viterbo' };
const COLORI = { fabrica: '#2f7fd1', carbognano: '#2e9e5b', caprarola: '#d8432a', ronciglione: '#e0a21b', viterbo: '#f39c12' };

const lun = lunedi(giorno()), dom = piu(lun, 6);
const sett = Math.round((Date.parse(lun) - Date.parse('2026-11-16')) / 6048e5);
const P = PROGRAMMA[lun] || ROTA[((sett % ROTA.length) + ROTA.length) % ROTA.length];
const K = 'tg-sfida-' + lun;
const spenta = /[?&]sfida=0\b/.test(location.search);
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const fineTesto = () => { const g = giorno(); if (g === dom) return 'finisce stasera a mezzanotte'; const d = new Date(dom + 'T12:00:00Z'); return 'fino a domenica ' + d.getUTCDate() + ' ' + MESI[d.getUTCMonth()]; };
const fineCorto = () => giorno() === dom ? '⏳ finisce stanotte' : '⏳ fino a dom. ' + new Date(dom + 'T12:00:00Z').getUTCDate();
const mioPaese = () => { const p = (TG.PrimoMinuto && TG.PrimoMinuto.paese) || ls.get('tg-paese-dev'); return p && p !== 'nessuno' ? p : null; };

const S = TG.Sfida = {
  attiva: !spenta, id: lun, p: P, fine: dom, nome: q => NOMI[q] || q, colore: q => COLORI[q] || '#ff8a3c', fineTesto, fineCorto,
  squadra(){ const s = ls.get(K); if (s && P.includes(s)) return s; const m = mioPaese(); if (m && P.includes(m)) { ls.set(K, m); return m; } return null; },
  scegli(q){
    if (!P.includes(q)) return; ls.set(K, q); ev('sfida_squadra', q, null, { sfida: lun, paese: mioPaese() });
    if (!mioPaese()) { ls.set('tg-paese-dev', q); try { if (TG.PrimoMinuto) TG.PrimoMinuto.paese = q; } catch(e){} }
  }
};
if (!S.attiva) return;
ls.set('tg-tuto-terreni', '1');   // o tutorial vecchio lo sostituisce a schermata de a sfida

/* ---------- a schermata d'ingresso: scegli a squadra (o te dice qual è) + 4 righe de regole ---------- */
const st = document.createElement('style'); st.textContent = `
#sfOv{position:fixed;inset:0;z-index:98;display:flex;align-items:center;justify-content:center;background:rgba(8,12,10,.78);padding:16px;font-family:Figtree,"Segoe UI",system-ui,sans-serif}
#sfOv .c{width:min(370px,100%);background:#17201f;border:2px solid #ff8a3c;border-radius:22px;padding:18px 18px 16px;color:#f3e7cb;text-align:center}
#sfOv .k{font:800 12px/1 Figtree,sans-serif;letter-spacing:.12em;color:#ff8a3c;text-transform:uppercase}
#sfOv h2{margin:8px 0 2px;font:900 27px/1.1 Figtree,sans-serif;color:#fff}#sfOv h2 small{display:block;font-size:15px;color:#c9bfa8;margin:3px 0}
#sfOv .f{font:700 13px Figtree,sans-serif;color:#c9bfa8}
#sfOv .bb{display:grid;gap:10px;margin:14px 0 4px}
#sfOv .bb button,#sfOv .go{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;border:0;border-radius:999px;color:#fff;font:900 18px Figtree,sans-serif;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.35)}
#sfOv .bb button:active,#sfOv .go:active{transform:translateY(2px);box-shadow:0 2px 0 rgba(0,0,0,.35)}
#sfOv .q{font:800 13px Figtree,sans-serif;color:#d9cfb6;margin-top:12px}
#sfOv ol{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:8px;text-align:left}#sfOv li{display:grid;grid-template-columns:30px 1fr;gap:6px;align-items:center;font:700 14px/1.3 Figtree,sans-serif}#sfOv li b{font-size:21px;text-align:center}
#sfOv .go{margin-top:14px;background:#ff8a3c}`;
document.head.appendChild(st);
const REGOLE = `<ol><li><b>➜</b><span>Segui a <b style="color:#ff8a3c">colonna de luce</b> fino a un campo de a sfida</span></li><li><b>🌰</b><span>Raccoji e nocchie tra i filari: ogni nocchia è un punto pe' a squadra tua</span></li><li><b>🚩</b><span>Chi ne raccoje de più se prende o campo</span></li><li><b>🏆</b><span>Domenica sera vince chi tiene più campi</span></li></ol>`;
function schermata(){
  if (document.getElementById('sfOv')) return;
  const sq = S.squadra(), visto = ls.get(K + '-visto');
  if (sq && visto) return;
  const d = document.createElement('div'); d.id = 'sfOv';
  const testa = `<div class="k">⚔ A sfida de a settimana</div><h2>${S.nome(P[0])}<small>contro</small>${S.nome(P[1])}</h2><div class="f">${fineTesto()}</div>`;
  if (!sq) {
    d.innerHTML = `<div class="c">${testa}<div class="q">Pe' chi giochi?</div><div class="bb">${P.map(q => `<button type="button" data-q="${q}" style="background:${S.colore(q)}">Gioco pe' ${S.nome(q)}</button>`).join('')}</div>${REGOLE}</div>`;
    d.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { S.scegli(b.dataset.q); ls.set(K + '-visto', '1'); d.remove(); dopo(); });
  } else {
    d.innerHTML = `<div class="c">${testa}<div class="q">Tu giochi pe' <b style="color:${S.colore(sq)}">${S.nome(sq)}</b></div>${REGOLE}<button type="button" class="go">Vado!</button></div>`;
    d.querySelector('.go').onclick = () => { ls.set(K + '-visto', '1'); d.remove(); dopo(); };
  }
  document.body.appendChild(d); ev('sfida_vista', sq || '-', null, { sfida: lun });
}
function dopo(){ try { TG.Terre && TG.Terre.aggiorna && TG.Terre.aggiorna(); } catch(e){} try { TG.Semplice && TG.Semplice.prossimo && setTimeout(TG.Semplice.prossimo, 300); } catch(e){} }
function avvia(){
  if (!document.body.classList.contains('playing')) return setTimeout(avvia, 1200);
  setTimeout(schermata, 1200);
}
if (document.readyState === 'complete') setTimeout(avvia, 1500); else addEventListener('load', () => setTimeout(avvia, 1500));
})();
