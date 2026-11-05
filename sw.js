/* =========================================================
   Service Worker · Barras Singapur
   Caché estática "cache-first": la app funciona 100 % sin conexión
   después de la primera visita.

   IMPORTANTE: cada vez que modifiques un archivo del repositorio,
   cambia la versión de CACHE (p. ej. v1.0.1) para que los
   dispositivos descarguen la versión nueva.
   ========================================================= */
const CACHE = 'barras-singapur-v1.0.0';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('barras-singapur-') && k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // solo recursos propios

  // Navegación: siempre se sirve la app desde la caché (funciona sin red)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html')
        .then(cached => cached || fetch(req))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Recursos estáticos: caché primero; si no está, red y se guarda
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
