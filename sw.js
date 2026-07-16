/* ============ sw.js — Service Worker ============ */
const CACHE_NAME = "gol-cache-v2.3";

const SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/default-inventory.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/css/base.css",
  "/css/layout.css",
  "/css/buttons.css",
  "/css/dashboard.css",
  "/css/calendar.css",
  "/css/entries-modals.css",
  "/css/inventory.css",
  "/css/store.css",
  "/css/life.css",
  "/css/settings.css",
  "/css/toast.css",
  "/css/theme-dark.css",
  "/css/responsive.css",
  "/js/state.js",
  "/js/i18n.js",
  "/js/helpers.js",
  "/js/firebase.js",
  "/js/dashboard.js",
  "/js/calendar.js",
  "/js/entries.js",
  "/js/inventory.js",
  "/js/store.js",
  "/js/life.js",
  "/js/settings.js",
  "/js/init.js",
];

/* Domains to never intercept */
const BYPASS_DOMAINS = [
  "www.gstatic.com",
  "googleapis.com",
  "firestore.googleapis.com",
  "firebaseio.com",
  "accounts.google.com",
];
const BYPASS_HOSTS = BYPASS_DOMAINS.map(d => d.replace(/\./g, "\\.").replace(/\*/g, ".*"));

function shouldBypass(url) {
  try {
    const host = new URL(url).hostname;
    return BYPASS_HOSTS.some(pattern => new RegExp("^" + pattern + "$").test(host)) ||
           BYPASS_DOMAINS.some(d => host === d || host.endsWith("." + d));
  } catch (_) {
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("Service Worker: Caching app shell");
      await cache.addAll(SHELL_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (shouldBypass(request.url)) return;

  // Force fresh default-inventory.json when online
  if (request.url.includes("default-inventory.json")) {
    if (navigator.onLine) {
      event.respondWith(
        fetch(request, { cache: "no-store" })
          .then(response => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            return response;
          })
          .catch(() => caches.match(request))
      );
      return;
    }
  }

  // Navigation requests (HTML) — network first, fallback to index.html
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets — Cache-first with network revalidation
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});