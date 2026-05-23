/* XZILY AI Studio — Service Worker
   HOW TO PUSH AN UPDATE: just bump the CACHE version below (e.g. xzily-v3, xzily-v4…)
   Users will automatically see an "Update available" banner without reinstalling. */
var CACHE = 'xzily-v3';

self.addEventListener('install', function (e) {
    /* Do NOT skipWaiting automatically — let the user choose when to update */
    /* (No SHELL pre-cache — avoids errors on GitHub Pages subdirectory sites) */
    /* New SW waits until user clicks "Update Now" before taking over */
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (k) { return k !== CACHE; })
                    .map(function (k) { return caches.delete(k); })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

/* ── Message handler: page sends SKIP_WAITING to trigger the update ── */
self.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'SKIP_WAITING') {
        self.skipWaiting().then(function () {
            /* Notify all open clients to reload after SW takes control */
            self.clients.matchAll({ includeUncontrolled: true }).then(function (clients) {
                clients.forEach(function (client) {
                    client.postMessage({ type: 'SW_UPDATED' });
                });
            });
        });
    }
});

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;
    var url = req.url;
    if (url.indexOf('admin-ajax.php') !== -1) return;
    if (url.indexOf('wp-admin') !== -1) return;
    if (url.indexOf('wp-login') !== -1) return;
    if (!url.startsWith('http')) return;
    /* Never intercept external API calls (Pollinations, Firebase, Groq) */
    if (url.indexOf('pollinations.ai') !== -1) return;
    if (url.indexOf('firebaseapp.com') !== -1) return;
    if (url.indexOf('googleapis.com') !== -1) return;
    if (url.indexOf('groq.com') !== -1) return;

    /* Network-first for HTML pages (always fresh content) */
    var dest = req.destination;
    if (dest === 'document' || dest === '') {
        e.respondWith(
            fetch(req).catch(function () {
                return caches.match(req).then(function (r) {
                    return r || caches.match('./');
                });
            })
        );
        return;
    }

    /* Cache-first for static assets (CSS, JS, fonts, images) */
    e.respondWith(
        caches.match(req).then(function (cached) {
            if (cached) return cached;
            return fetch(req).then(function (resp) {
                if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
                var clone = resp.clone();
                caches.open(CACHE).then(function (c) { c.put(req, clone); });
                return resp;
            });
        })
    );
});
