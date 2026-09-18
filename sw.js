// BLACKOUT — Service Worker
//
// WICHTIG: Diese Datei muss bei JEDEM inhaltlichen Update (js/css/html geändert) mit
// hochgezählt werden, sonst erkennt der Browser keine Änderung an diesem Skript und
// installiert den Service Worker nie neu — Spieler bleiben dann auf altem Cache-Stand
// hängen, egal was sich in game.js/data.js/style.css ändert. Genau das ist zwischen
// Schritt 2 und diesem Fix passiert (sw.js wurde 6 Commits lang nicht angerührt).
//
// Strategie: App-Shell (HTML/CSS/JS) wird NETWORK-FIRST geladen (immer der aktuelle
// Stand, wenn online; Cache nur als Offline-Fallback) statt cache-first. Damit hängt
// "bekommt der Spieler das Update" nicht mehr allein davon ab, ob diese Datei manuell
// hochgezählt wurde. Icons/Manifest bleiben cache-first (ändern sich praktisch nie,
// spart Bandbreite).
const CACHE_NAME = "blackout-cache-v1.8";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./icon-180.png",
  "./css/style.css",
  "./js/data.js",
  "./js/leaderboard.js",
  "./js/audio.js",
  "./js/game.js"
];
const CACHE_FIRST = [".png", ".jpg", ".jpeg", ".webp", "manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = event.request.url;
  const isCacheFirst = CACHE_FIRST.some((suffix) => url.endsWith(suffix));

  if (isCacheFirst) {
    // Icons/Manifest: cache-first, spart Bandbreite, ändert sich praktisch nie
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // App-Shell (HTML/CSS/JS): network-first, damit Updates ankommen sobald online,
  // unabhängig davon ob CACHE_NAME diesmal hochgezählt wurde. Offline-Fallback = Cache.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
