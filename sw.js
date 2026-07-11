/* ============ sw.js — Service Worker ============ */
const CACHE_NAME = "gol-cache-v1";

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

/* Domains to never intercept — Firebase SDK ES modules, Auth, Firestore, Google Fonts */
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

/* Install — pre-cache the full app shell + Google Fonts */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      /* Cache the app shell */
      await cache.addAll(SHELL_URLS);

      /* Fetch the Google Fonts CSS and cache it + its referenced font files */
      try {
        const fontsCSSUrl = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap";
        const resp = await fetch(fontsCSSUrl);
        if (resp.ok) {
          const cssText = await resp.text();
          await cache.put(fontsCSSUrl, resp);
          /* Extract font URLs from the CSS (url(...) references) */
          const fontUrlRegex = /url\((https?:\/\/[^)]+)\)/g;
          let match;
          const fontUrls = [];
          while ((match = fontUrlRegex.exec(cssText)) !== null) {
            fontUrls.push(match[1]);
          }
          /* Also match src: url(...) patterns */
          const srcRegex = /src:\s*url\((https?:\/\/[^)]+)\)/g;
          while ((match = srcRegex.exec(cssText)) !== null) {
            if (!fontUrls.includes(match[1])) fontUrls.push(match[1]);
          }
          /* Fetch and cache each font file */
          for (const fontUrl of fontUrls) {
            try {
              const fontResp = await fetch(fontUrl);
              if (fontResp.ok) {
                await cache.put(fontUrl, fontResp);
              }
            } catch (_) { /* individual font fetch failed, continue */ }
          }
        }
      } catch (_) { /* Google Fonts fetch failed, continue — offline fonts may still work from browser cache */ }
    }).then(() => self.skipWaiting())
  );
});

/* Activate — clean up old caches */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch — strategy split by request type */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  /* Never intercept non-GET, Firebase, or Google domains */
  if (request.method !== "GET") return;
  if (shouldBypass(request.url)) return;

  /* Navigation / HTML: network-first, fallback to cached index.html */
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          /* Update cache in background */
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  /* Static assets: cache-first (stale-while-revalidate) */
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
