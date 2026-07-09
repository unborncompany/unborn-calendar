/* ============================================================
   Service Worker — Game of Life Daily Planner
   ============================================================
   Strategy:
   - Static assets (HTML, CSS, JS, icons, fonts): Cache-first
   - Firebase SDK (gstatic.com): Cache-first (SDK itself is versioned)
   - Firebase API calls (firestore, auth): Network-only (bypass cache)
   - Navigation: Network-first, fallback to cached index.html
   - Images: Cache-first with network fallback

   On install: Pre-cache app shell
   On activate: Clean old caches, claim clients
   ============================================================ */

const CACHE_NAME = 'gol-planner-v2';

/* ---------- App shell files to pre-cache ---------- */
const PRE_CACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './default-inventory.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
];

/* ---------- Firebase domains to BYPASS (network-only) ---------- */
const FIRESTORE_API_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseio.com',
];

/* ---------- Firebase SDK bundles (cache these — they're versioned CDN files) ---------- */
const FIREBASE_SDK_HOST = 'www.gstatic.com';

function isFirebaseApiUrl(url) {
  return FIRESTORE_API_HOSTS.some(host => url.hostname === host);
}

function isFirebaseSdkUrl(url) {
  return url.hostname === FIREBASE_SDK_HOST && url.pathname.includes('/firebasejs/');
}

function isFirebaseAuthUrl(url) {
  return url.hostname === 'firebase.google.com' || url.pathname.includes('/auth/');
}

function isStaticAsset(url) {
  return url.origin === self.location.origin;
}

function isFontOrCssUrl(url) {
  return url.hostname.includes('fonts.googleapis.com') ||
         url.hostname.includes('fonts.gstatic.com') ||
         url.hostname.includes('gstatic.com') && !isFirebaseSdkUrl(url);
}

/* ============================================================
   INSTALL
   ============================================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          PRE_CACHE_URLS.map((url) =>
            cache.add(url).catch(() => {})
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ============================================================
   ACTIVATE
   ============================================================ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ============================================================
   FETCH
   ============================================================ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // 1. Firebase API calls → network only (never cache auth/firestore data)
  if (isFirebaseApiUrl(url) || isFirebaseAuthUrl(url)) {
    return;
  }

  // 2. Navigation requests → network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3. Firebase SDK bundles (gstatic.com/firebasejs/) → cache first
  if (isFirebaseSdkUrl(url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 4. Static assets (same-origin) and fonts/CSS → cache first, then network
  if (isStaticAsset(url) || isFontOrCssUrl(url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (!response || response.status !== 200) return response;
          // Don't cache opaque responses from cross-origin
          if (response.type === 'opaque') return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return response;
        }).catch(() => {
          // Fallback for images
          if (request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#3d8b6e" width="100" height="100" rx="16"/><text x="50" y="58" text-anchor="middle" fill="white" font-family="sans-serif" font-size="16" font-weight="bold">GoL</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // 5. Everything else → network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

/* ============================================================
   MESSAGE HANDLER
   ============================================================ */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
