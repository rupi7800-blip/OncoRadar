// Service worker: salva in cache solo il guscio dell'app. Le API scientifiche vanno sempre in rete.
const CACHE = 'oncoradar-shell-v2';
const SHELL = ['./', 'index.html', 'css/style.css', 'icon.svg', 'manifest.webmanifest',
  'js/app.js', 'js/store.js', 'js/sources.js', 'js/connectors.js', 'js/classify.js', 'js/radar.js', 'js/content.js',
  'js/atlas-data.js', 'js/feed.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});
