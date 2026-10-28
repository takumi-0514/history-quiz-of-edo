// Force unregister and clear all stale caches
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(cacheNames.map((name) => caches.delete(name)));
        }).then(() => {
            return self.registration.unregister();
        }).then(() => {
            return self.clients.claim();
        }).then(() => {
            return self.clients.matchAll({ type: 'window' }).then((clients) => {
                for (const client of clients) {
                    client.navigate(client.url);
                }
            });
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Pass directly through to network with no caching
    event.respondWith(fetch(event.request));
});
