// Keeps a copy of the app on the iPad so it opens without internet.
// Bump VERSION whenever any file below changes, so the iPad picks up the new version.
const VERSION = "mis-clases-v9";
const FILES = [
  "./", "index.html", "styles.css", "clases.css", "app.js", "store.js", "registry.js", "demo-data.js", "xlsx.js",
  "icons.svg", "favicon.svg", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png",
  "fonts/Baloo2-variable.woff2", "fonts/AtkinsonHyperlegible-400.woff2", "fonts/AtkinsonHyperlegible-700.woff2", "fonts/PatrickHand-400.woff2",
];

self.addEventListener("install", (e) => {
  // "reload" skips Safari's HTTP cache (GitHub Pages lets it keep files 10 minutes), so a new version never stores old files
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network first (so updates arrive when online), cached copy when offline. "no-cache" asks the
// server every time (a cheap "not modified" when nothing changed) instead of Safari's 10-minute copy.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  const fresh = e.request.mode === "navigate" ? new Request(e.request.url, { cache: "no-cache" }) : new Request(e.request, { cache: "no-cache" });
  e.respondWith(
    fetch(fresh)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html"))),
  );
});
