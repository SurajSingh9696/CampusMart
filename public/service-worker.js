/*
  Minimal service worker fallback.
  This prevents /service-worker.js 404s when browsers/extensions
  attempt registration on this origin.
*/

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
