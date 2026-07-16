/* ============ sw.js — Service Worker ============ */
const CACHE_NAME = "gol-cache-v2.9";
const DEFAULT_INVENTORY_URL = "/default-inventory.json";

const SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  DEFAULT_INVENTORY_URL,
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

const BYPASS_DOMAINS = [
  "www.gstatic.com", "googleapis.com", "firestore.googleapis.com",
  "firebaseio.com", "accounts.google.com"
];

function shouldBypass(url) {
  try {
    const host = new URL(url).hostname;
    return BYPASS_DOMAINS.some(d => host === d || host.endsWith("." + d));
  } catch (_) { return false; }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Force fresh default-inventory.json and delete old cache if changed
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (shouldBypass(request.url)) return;

  // Special handling for default-inventory.json
  if (request.url.includes("default-inventory.json")) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("Network error");

          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone()); // Update cache
          return response;
        })
        .catch(async () => {
          // Offline fallback
          return caches.match(request);
        })
    );
    return;
  }

  // Normal navigation requests
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets - Cache first, then network
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
