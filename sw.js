/* Registre Classe — fonctionnement hors connexion.
   À chaque mise à jour, changer le numéro ci-dessous (et VERSION dans test-coque.js) :
   l'iPhone abandonne alors l'ancienne version. */
const CACHE = 'registre-classe-0.1.0';
const FICHIERS = [
  './', 'index.html', 'test-coque.js', 'manifest.webmanifest',
  'icones/icone-180.png', 'icones/icone-192.png', 'icones/icone-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* d'abord le cache, puis le réseau pour le mettre à jour */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(r => {
      if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
      return r;
    }).catch(() => hit || caches.match('index.html'));
    return hit || net;
  }));
});
