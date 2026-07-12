const SHELL_CACHE = 'lessons-tracker-shell-v2';
const SHELL_FILES = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './cloudSync.js',
    './manifest.json',
    './booking.html',
    './booking.js',
    './booking.css',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(function(cache) {
            return cache.addAll(SHELL_FILES);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(name) {
                    return name !== SHELL_CACHE;
                }).map(function(name) {
                    return caches.delete(name);
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function(event) {
    var request = event.request;
    var url = new URL(request.url);

    // Let non-same-origin requests pass through untouched (Firebase SDKs,
    // Firestore, Google auth, fonts, etc.) so their own caching and offline
    // persistence aren't interfered with.
    if (url.origin !== location.origin) {
        event.respondWith(fetch(request));
        return;
    }

    // Navigation requests: cache-first with offline fallback to index.html
    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match(request).then(function(cached) {
                return cached || fetch(request).catch(function() {
                    return caches.match('./index.html');
                });
            })
        );
        return;
    }

    // Same-origin static assets: cache-first
    event.respondWith(
        caches.match(request).then(function(cached) {
            return cached || fetch(request);
        })
    );
});
