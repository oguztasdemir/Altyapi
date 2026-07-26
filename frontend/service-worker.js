const CACHE_NAME = 'altyapi-manager-v19';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/style.css',
  '/static/js/app.js',
  '/static/js/modules/admin.js',
  '/static/js/modules/announcements.js',
  '/static/js/modules/api.js',
  '/static/js/modules/api_admin.js',
  '/static/js/modules/api_calendar.js',
  '/static/js/modules/api_attendance.js',
  '/static/js/modules/api_core.js',
  '/static/js/modules/api_finance.js',
  '/static/js/modules/api_health.js',
  '/static/js/modules/api_management.js',
  '/static/js/modules/api_matches.js',
  '/static/js/modules/archive.js',
  '/static/js/modules/charts.js',
  '/static/js/modules/drag.js',
  '/static/js/modules/lineup.js',
  '/static/js/modules/matches.js',
  '/static/js/modules/notifications.js',
  '/static/js/modules/player.js',
  '/static/js/modules/player_goals.js',
  '/static/js/modules/player_health.js',
  '/static/js/modules/player_tactical.js',
  '/static/js/modules/state.js',
  '/static/js/modules/tactics_draw.js',
  '/static/js/modules/tournaments.js',
  '/static/js/modules/training.js',
  '/static/js/modules/ui.js',
  '/static/js/modules/utils.js'
];

// Install Service Worker and cache all critical assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate service worker and clear old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept requests and serve from network (network-first) or cache
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network-first policy for API requests, falling back to cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // Cache successful API GET responses
          if (e.request.method === 'GET' && response.status === 200) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, cacheCopy);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails (offline), try the cached API response
          return caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return custom json error when both network and cache fail
            return new Response(
              JSON.stringify({
                status: 'offline',
                message: 'Çevrimdışı moddasınız. Bu işlem için internet bağlantısı gerekiyor.'
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
  } else {
    // Network-first policy for static assets to ensure updates propagate immediately in development
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.status === 200) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, cacheCopy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(e.request);
        })
    );
  }
});
