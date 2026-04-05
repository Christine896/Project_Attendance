const CACHE_NAME = "jkuat-attendance-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/static/js/main.chunk.js",
  "/static/js/0.chunk.js",
  "/static/js/bundle.js",
  "/manifest.json"
];

// Install the Service Worker and Cache the App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Intercept requests and serve from cache if offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response, else fetch from network
      return response || fetch(event.request);
    })
  );
});