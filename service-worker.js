// Service worker for the Localized Database Form PWA.
//
// This only caches the static app shell (HTML/CSS/JS/manifest/icons and
// the CDN libraries the app loads). All actual record data lives in
// IndexedDB on the device and is never touched by this file.

const CACHE_NAME = "localized-db-form-v1";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    // Only handle simple GETs; let everything else (if anything) pass through untouched.
    if (request.method !== "GET") return;

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const networkFetch = fetch(request)
                .then((networkResponse) => {
                    // Cache good, cacheable responses (same-origin or CORS-enabled CDN assets)
                    // as they come in, so the app keeps working offline and stays up to date.
                    if (networkResponse && networkResponse.status === 200 &&
                        (networkResponse.type === "basic" || networkResponse.type === "cors")) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => cachedResponse);

            // Serve from cache instantly when available; otherwise wait on the network.
            return cachedResponse || networkFetch;
        })
    );
});
