const VERSION = 'v1',
  OFFLINE_PAGE = 'offline.html';

function cacheResponse(response, event) {
  console.log('caching a recently fetched copy of', event.request.url);
  event.waitUntil(
    caches.open(VERSION).then((cache) => {
      return cache.put(event.request, response);
    })
  );
  return response.clone();
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return cache.addAll(['/css/main.css', '/js/main.js', OFFLINE_PAGE]);
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

self.addEventListener('fetch', function (event) {
  let request = event.request,
    url = request.url;

  // EXTENSIONS!
  if (/^chrome\-extension/.test(url)) {
    return;
  }

  // handle HTML - Network first
  if (request.mode === 'navigate') {
    console.log('Navigation request', url);
    event.respondWith(
      fetch(request)
        .then((response) => cacheResponse(response, event))
        .catch(() => {
          console.log('whoops, fetch failed…', url);
          return caches.match(request).then((cached_result) => {
            if (cached_result) {
              console.log('Wait! Found a cached copy', url);
              return cached_result;
            }
            console.log('Fetch failed; returning offline page', url);
            return caches.match(OFFLINE_PAGE);
          });
        })
    );
  }

  // CSS & JavaScript - Cache first
  else if (/\.css$/.test(url) || /\.js$/.test(url)) {
    console.log('CSS or JavaScript request', url);
    event.respondWith(
      caches.match(request).then((cached_result) => {
        // cached first
        if (cached_result) {
          console.log('Found a cache match', url);
          return cached_result;
        }
        // fallback to network
        return (
          fetch(request)
            .then((response) => cacheResponse(response, event))
            // fail
            .catch(
              new Response('', {
                status: 408,
                statusText: 'The server appears to be offline.',
              })
            )
        );
      })
    );
  }
});
