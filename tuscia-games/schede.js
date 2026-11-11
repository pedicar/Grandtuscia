/* TUSCIA GAMES · le schede del sito (site/tuscia-games/schede.js)
   Nome, riga e colore di ogni gioco vengono dal mondo (engine/tg-giochi.js, TG.GIOCHI): qui c'è solo quello che serve al sito.
   Per aggiungere un gioco al sito: la sua scheda qui (stesso id del mondo) e l'immagine img/<id>.jpg (16:9, circa 720×405).
   Il controllo: node tools/controlla-giochi.mjs

   Campi:
     paese      il cartello marrone sulla card (dove si gioca, nel mondo vero)
     luogo      il punto della mappa del sito (una delle chiavi di TG.LUOGHI qui sotto)
     riga       una frase per la card: che si fa
     passi      come si gioca, 3 o 4 passi [titolo, testo]
     vero       il riquadro "Dal vero": { titolo, testo, fatti: [[etichetta, valore]], mappa: ricerca per Google Maps }
     quando     facoltativo: la stagione o la festa, per la striscia "Adesso in Tuscia" { mesi: [1..12], testo }
*/
(function () {
'use strict';
const TG = window.TG = window.TG || {};

TG.LUOGHI = {
  viterbo: { n: 'Viterbo', x: 118, y: 150, d: 'La città dei Papi: San Pellegrino, il Palazzo dei Papi, la Macchina di Santa Rosa.' },
  cimino: { n: 'Monte Cimino', x: 190, y: 98, d: 'La vetta dei Cimini, con la faggeta patrimonio UNESCO e il Sasso Menicante.' },
  lago: { n: 'Lago di Vico', x: 300, y: 212, d: 'Un lago dentro un antico vulcano, con la riserva naturale e il Monte Venere.' },
  caprarola: { n: 'Caprarola', x: 372, y: 268, d: 'Palazzo Farnese in cima alla via dritta; intorno noccioleti e boschi.' },
  ronciglione: { n: 'Ronciglione', x: 300, y: 360, d: 'Il Corso dei Farnese, il borgo sulla rupe, il Carnevale.' },
  fabrica: { n: 'Fabrica di Roma', x: 500, y: 270, d: 'La Rocca sul peperino, Via Roma e la discesa dei carrettini.' },
  falerii: { n: 'Falerii Novi', x: 590, y: 352, d: 'Le mura romane quasi intatte e l\'abbazia di Santa Maria di Falleri.' },
};

// l'ordine dei giochi sul sito: prima le feste, poi il lago, poi boschi e archeologia
TG.ORDINE_SITO = ['santarosa', 'corseavuoto', 'carrettini', 'vicosail', 'vicopesca', 'vicovolo', 'funghi', 'ciminodh', 'citta'];

TG.MONDO = {
  nome: 'Grand Tuscia Adventure', paese: 'Tutta la Tuscia', luogo: 'lago', url: '',
  riga: 'Il mondo aperto: il lago, i noccioleti, i paesi. Coltivi il tuo podere, guidi trattore, Ape e Vespa, e da qui entri in tutti gli altri giochi.',
};

TG.SCHEDE = {
  santarosa: {
    paese: 'Viterbo · 3 settembre', luogo: 'viterbo',
    riga: 'Porta a spalla la Macchina di Santa Rosa fino al santuario.',
    passi: [['Solleva a tempo', 'Premi quando il cerchio tocca il bordo: "Sotto col ciuffo!", la Macchina si alza.'],
      ['Tienila dritta', 'Con ◀ ▶ correggi le pendenze: curve, sampietrini, il passaggio stretto tra i cornicioni.'],
      ['Ascolta il capofacchino', '"Fermi!", "Avanti!", "Piega a destra": chi esegue guadagna sentimento, e la Macchina va.'],
      ['Sette soste e la salita', 'Fermati nelle piazze, gira agli Almadiani e sali a tempo di tamburo fino al santuario.']],
    vero: { titolo: 'Il trasporto, ogni 3 settembre', fatti: [['Quando', '3 sett., ore 21'], ['Altezza', 'circa 30 m'], ['Peso', 'circa 5 t'], ['Facchini', 'oltre 100']],
      testo: 'Dalla chiesa di San Sisto, accanto a Porta Romana, fino al Santuario di Santa Rosa. Dal 2013 è patrimonio immateriale UNESCO con la rete delle grandi macchine a spalla. Il resto dell\'anno puoi fare lo stesso percorso a piedi.',
      mappa: 'Santuario di Santa Rosa Viterbo' },
    quando: { mesi: [8, 9], testo: 'Il trasporto della Macchina di Santa Rosa, la sera del 3 settembre' },
  },
  corseavuoto: {
    paese: 'Ronciglione · Carnevale', luogo: 'ronciglione',
    riga: 'La corsa dei cavalli senza fantino del Carnevale, giù per il Corso.',
    passi: [['Alla mossa', 'I cavalli entrano al canapo: aspetta che cada e scatta.'],
      ['Incita e tieni la traiettoria', 'Il tuo barbero corre da solo: tu lo spingi, lo guidi tra i materassi e gestisci il fiato.'],
      ['Il Corso fino all\'arrivo', 'Curve, l\'arco, la folla: arriva primo al traguardo.']],
    vero: { titolo: 'I barberi del Carnevale', fatti: [['Quando', 'Carnevale'], ['Dove', 'il Corso'], ['Fantini', 'nessuno'], ['Anche', 'Palio di agosto']],
      testo: 'A Ronciglione i cavalli corrono scossi, senza fantino, lungo il Corso. È il momento più atteso del Carnevale; corse simili si fanno anche per il Palio di San Bartolomeo, a fine agosto.',
      mappa: 'Corso Umberto I Ronciglione' },
    quando: { mesi: [1, 2], testo: 'Il Carnevale di Ronciglione e le corse a vuoto' },
  },
  carrettini: {
    paese: 'Fabrica di Roma', luogo: 'fabrica',
    riga: 'Giù per la discesa fino in fondo a Via Roma, su un carrettino di legno.',
    passi: [['Spingi alla partenza', 'Il via è in cima alla discesa: la spinta iniziale conta.'],
      ['Sterza e frena poco', 'Niente motore: si va di pendenza. Ogni frenata è tempo perso.'],
      ['Fino a Via Roma', 'Batti i rivali in batteria, oppure gioca all\'ammucchiata.']],
    vero: { titolo: 'La gara dei carrettini', fatti: [['Partenza', 'in cima alla discesa'], ['Arrivo', 'fine di Via Roma'], ['Motore', 'la gravità'], ['Mezzi', 'fatti a mano']],
      testo: 'A Fabrica di Roma i carrettini di legno costruiti in casa scendono per la discesa fino in fondo a Via Roma. Sopra c\'è il centro storico de La Rocca, sullo sperone di peperino.',
      mappa: 'Via Roma Fabrica di Roma' },
  },
  vicosail: {
    paese: 'Lago di Vico', luogo: 'lago',
    riga: 'Regata a vela sul lago nel cratere, col vento che gira.',
    passi: [['Leggi il vento', 'Le raffiche scendono dalle colline del cratere e cambiano spesso.'],
      ['Regola la vela', 'Cazza e lasca per tenere la barca veloce sulle boe.'],
      ['Regata o giro libero', 'Batti gli avversari al traguardo, o fai il giro del lago e dei suoi panorami.']],
    vero: { titolo: 'Il lago dentro il vulcano', fatti: [['Quota', '507 m'], ['Riserva', 'naturale'], ['Intorno', 'Monte Venere'], ['Motori', 'regolati']],
      testo: 'Il Lago di Vico riempie il cratere di un antico vulcano dei Monti Cimini ed è protetto da una riserva naturale. Le sue acque calme sono adatte alla vela leggera; informati sulle regole della riserva prima di uscire.',
      mappa: 'Punta del Lago Lago di Vico' },
    quando: { mesi: [5, 6, 7, 8], testo: 'La stagione della vela sul Lago di Vico' },
  },
  vicopesca: {
    paese: 'Lago di Vico', luogo: 'lago',
    riga: 'In barca tra canneti e fondali: lucci, persici, tinche.',
    passi: [['Scegli il posto', 'Canneto, fondale, centro lago: ogni pesce ha il suo.'],
      ['Lancia e aspetta', 'Guarda il galleggiante, ferra al momento giusto.'],
      ['Recupera senza strappare', 'Tieni la lenza in tensione e porta il pesce in barca.']],
    vero: { titolo: 'Pescare nella riserva', fatti: [['Specie', 'luccio, persico, tinca'], ['Dove', 'riva e barca'], ['Serve', 'la licenza'], ['Regole', 'della riserva']],
      testo: 'Nel Lago di Vico si pesca seguendo le regole della riserva naturale e con la licenza di pesca. Prima di andare, informati su zone, periodi e misure consentite.',
      mappa: 'Lago di Vico' },
    quando: { mesi: [4, 5, 6, 9], testo: 'Primavera e fine estate: buona pesca sul Lago di Vico' },
  },
  vicovolo: {
    paese: 'Lago di Vico', luogo: 'lago',
    riga: 'In deltaplano sopra il lago e la faggeta del Monte Venere.',
    passi: [['Decolla', 'Corri verso il bordo della caldera e lasciati prendere dall\'aria.'],
      ['Cerca le termiche', 'L\'aria calda sale sui pendii al sole: gira dentro per salire.'],
      ['Gara o volo libero', 'Passa le porte della gara o vola sopra il lago, poi atterra nel prato.']],
    vero: { titolo: 'Il cratere dall\'alto', fatti: [['Monte Venere', '838 m'], ['Monte Fogliano', '965 m'], ['Lago', '507 m'], ['Faggeta', 'sui versanti']],
      testo: 'I bordi del cratere di Vico, con il Monte Fogliano e il Monte Venere, sono i punti panoramici più belli sul lago. Si salgono a piedi per sentieri nel bosco.',
      mappa: 'Monte Fogliano' },
  },
  funghi: {
    paese: 'Caprarola · Carbognano', luogo: 'caprarola',
    riga: 'Nel bosco dopo la pioggia: riconosci i funghi buoni da quelli che li imitano.',
    passi: [['Cammina piano', 'I funghi crescono a gruppi, nei posti giusti, mezzi coperti dalle foglie.'],
      ['Osserva', 'Cappello, lamelle, gambo: impara a riconoscerli prima di raccoglierli.'],
      ['Gara coi fungaioli', 'Sor Checco, la Peppa e Nando conoscono i posti buoni: trovane più di loro.']],
    vero: { titolo: 'I boschi dei Cimini', fatti: [['Stagione', 'fine estate–autunno'], ['Boschi', 'castagni, cerri, faggi'], ['Serve', 'il tesserino'], ['Dubbi?', 'micologo ASL']],
      testo: 'Tra Caprarola e Carbognano i boschi dei Monti Cimini, dopo le piogge di fine estate, si riempiono di funghi. Per raccoglierli serve l\'autorizzazione regionale; in caso di dubbio fai controllare il raccolto dal servizio micologico dell\'ASL.',
      mappa: 'Monti Cimini Caprarola' },
    quando: { mesi: [9, 10, 11], testo: 'Funghi sul Cimino dopo la pioggia' },
  },
  ciminodh: {
    paese: 'Monte Cimino', luogo: 'cimino',
    riga: 'Downhill in mountain bike tra i faggi del Cimino.',
    passi: [['Scegli il percorso', 'Dal passeggio tra i faggi alla discesa tecnica.'],
      ['Guida la bici', 'Frena prima delle curve, rilascia in uscita, salta le radici.'],
      ['Batti il tempo', 'Scendi pulito fino in fondo: ogni caduta costa secondi.']],
    vero: { titolo: 'La faggeta del Cimino', fatti: [['Vetta', '1053 m'], ['UNESCO', 'dal 2017'], ['Da vedere', 'Sasso Menicante'], ['Paese', 'Soriano nel Cimino']],
      testo: 'Sulla cima del Monte Cimino c\'è una faggeta antica, patrimonio UNESCO dal 2017 con le faggete primordiali d\'Europa. Vicino alla vetta c\'è il Sasso Menicante, il masso che oscilla. Ci si arriva da Soriano nel Cimino.',
      mappa: 'Monte Cimino Soriano nel Cimino' },
  },
  citta: {
    paese: 'Falerii Novi', luogo: 'falerii',
    riga: 'La città romana nascosta sotto i campi, dalla Porta di Giove a Santa Maria di Falleri.',
    passi: [['Entra dalla Porta di Giove', 'Cammina dentro le mura, dove oggi ci sono i campi.'],
      ['Scopri cosa c\'è sotto', 'Col georadar trovi strade, case e il foro della città sepolta.'],
      ['Gara o esplorazione', 'Chiudi le aree a tempo, o segui le tappe con le lezioni e i quiz.']],
    vero: { titolo: 'Le mura di Falerii Novi', fatti: [['Fondata', '241 a.C.'], ['Mura', 'circa 2 km'], ['Porta', 'di Giove'], ['Abbazia', 'XII secolo']],
      testo: 'I Romani fondarono Falerii Novi nel 241 a.C. Oggi restano le mura quasi intere, con le torri e la Porta di Giove, e dentro la chiesa dell\'abbazia di Santa Maria di Falleri. È nel comune di Fabrica di Roma, vicino a Civita Castellana.',
      mappa: 'Falerii Novi Fabrica di Roma' },
  },
};
// le CLIP dei giochi (video di gioco vero, ~11 secondi, 960x540): site/tuscia-games/clip/<id>.mp4 e <id>.jpg
// Si registrano con: python3 tools/registra-clip.py <id>   (regia in tools/clip-regia.json). Qui l'elenco di quelle pronte.
TG.CLIP = ["carrettini","ciminodh","citta","corseavuoto","funghi","santarosa","vicopesca","vicosail","vicovolo"];

// i giochi IN ARRIVO: compaiono sul sito con "Avvisami quando esce", senza pulsante Gioca.
// Quando un gioco esce: si toglie da qui e si aggiunge a engine/tg-giochi.js e a TG.SCHEDE (poi node tools/controlla-giochi.mjs).
TG.PRESTO = [
  { id: 'formulacimina', nome: 'Formula Cimina', paese: 'Monti Cimini · Lago di Vico', luogo: 'cimino', tono: ['#7a1f1f', '#d1492f'],
    riga: 'Monoposto o utilitaria anni \'80 su circuiti nella Tuscia: il Cimino, il lago, il giro attorno alle mura di Falerii. Si gioca anche col volante.' },
  { id: 'faleriiascend', nome: 'Falerii Ascend', paese: 'Falerii Novi · quattro epoche', luogo: 'falerii', tono: ['#4a3a24', '#c08a3e'],
    riga: 'Cornelia corre sui tetti della città romana per capire una spirale incisa nella pietra. Un\'avventura dal 241 a.C. a oggi.' },
  { id: 'selvarally', nome: 'Selva Rally', paese: 'Fabrica di Roma', luogo: 'fabrica', tono: ['#24401f', '#6f9a3a'],
    riga: 'Rally sugli sterrati nel bosco di Fabrica di Roma: una speciale tra gli alberi, a tutto gas.' },
];
})();
