// Armoires EP - fonctionnement hors ligne
// Change le numéro de version à chaque mise à jour de l'appli.
const PREFIXE = 'armoires-ep-';
const VERSION = PREFIXE + 'v2';
const FICHIERS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIXE) && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Page de l'appli : réseau d'abord (pour avoir les mises à jour), sinon la copie hors ligne
  if (req.mode === 'navigate') {
    e.respondWith(
      // toujours la dernière version quand il y a du réseau (sans la copie de 10 min du navigateur)
      fetch(req, { cache: 'no-store' }).then(r => {
        const copie = r.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copie));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Le reste (icônes, polices) : copie hors ligne d'abord, puis réseau
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') {
        const copie = r.clone();
        caches.open(VERSION).then(c => c.put(req, copie));
      }
      return r;
    }))
  );
});
