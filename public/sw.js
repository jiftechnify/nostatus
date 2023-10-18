self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (e) => {
  const deleteCache = async () => {
    for (const key of await caches.keys()) {
      await caches.delete(key);
    }
  };
  e.waitUntil(deleteCache());
});

self.addEventListener("fetch", () => {
  return;
});
