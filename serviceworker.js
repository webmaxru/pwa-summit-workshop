const VERSION = 'v1';
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return cache.addAll(['/css/main.css', '/js/main.js']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // clean up stale caches
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            return !key.startsWith(VERSION);
          })
          .map((key) => {
            return caches.delete(key);
          })
      );
    })
  );

  clients.claim();
});
