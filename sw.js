// Grand Tuscia Adventure · service worker minimo: serve per poter "installare" il sito come app.
// Non tiene copie dei file (così ogni aggiornamento del sito arriva subito): passa tutto alla rete.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
