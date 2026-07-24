// Minimal service worker — exists purely to make VIPL Internal installable
// as a home-screen app. No offline caching yet, so it always fetches fresh
// data — safe for a live financial dashboard where stale numbers matter.
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  // Pass everything straight through to the network — no caching.
});
