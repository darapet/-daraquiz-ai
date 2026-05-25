/* XZILY AI Studio — Service Worker  (place this file at www/ root, NOT www/js/)
   HOW TO PUSH AN UPDATE:
     1. Bump CACHE below (e.g. xzily-v5, xzily-v6…)
     2. Bump "version" in version.json to match
     3. Commit & push — GitHub Actions will rebuild & deploy
   Users on the web will see the "Update available" banner automatically.
   Users on the Capacitor app will see a banner via version.json polling.  */

var CACHE = 'xzily-v4';

/* Pages to pre-cache so the app works offline */
var SHELL = [
    './',
    './index.html',
    './login.html',
    './dashboard.html',
    './take-quiz.html',
    './create-quiz.html',
    './challenge.html',
    './studio.html',
    './tts.html',
    './image-gen.html',
    './version.json',
    './css/aqs-main.css',
    './css/aqs-studio.css',
    './js/aqs-main.js',
    './js/aqs-firebase.js',
    './js/aqs-pwa.js',
    './js/aqs-create.js',
    './js/aqs-studio.js',
    './js/aqs-tts.js',
    './js/aqs-imagegen.js',
    './js/aqs-groq-key.js',
    './js/aqs-session.js'
];

self.addEventListener('install', function (e) {
    /* Pre-cache the app shell so it works offline */
    e.waitUntil(
        caches.open(CACHE).then(function (c) {
            /* Use individual try/catch so one bad asset doesn't block install */
            return Promise.allSettled(
                SHELL.map(function (url) {
                    return c.add(url).catch(function (err) {
                        console.warn('[SW] Failed to cache:', url, err.message);
                    });
                })
            );
        })
    );
    /* Do NOT skipWaiting here — wait for user to tap "Update Now" */
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

/* Message handler: page sends SKIP_WAITING → triggers controlled reload */
self.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'SKIP_WAITING') {
        self.skipWaiting().then(function () {
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
    if (!url.startsWith('http')) return;

    /* Never intercept Firebase / Groq / HuggingFace / external API calls */
    var passThrough = [
        'firebaseapp.com', 'googleapis.com', 'gstatic.com',
        'groq.com', 'huggingface.co', 'pollinations.ai',
        'firebase.google.com', 'firebasestorage.app',
        'api-inference.huggingface.co', 'chart.googleapis.com'
    ];
    for (var i = 0; i < passThrough.length; i++) {
        if (url.indexOf(passThrough[i]) !== -1) return;
    }

    /* Network-first for HTML & version.json (always fresh) */
    var dest = req.destination;
    var isDoc = dest === 'document' || dest === '' || url.indexOf('version.json') !== -1;
    if (isDoc) {
        e.respondWith(
            fetch(req).then(function (resp) {
                /* Update cache with fresh copy */
                if (resp && resp.status === 200) {
                    var clone = resp.clone();
                    caches.open(CACHE).then(function (c) { c.put(req, clone); });
                }
                return resp;
            }).catch(function () {
                /* Offline fallback: serve cached page */
                return caches.match(req).then(function (r) {
                    return r || caches.match('./index.html');
                });
            })
        );
        return;
    }

    /* Cache-first for static assets (JS, CSS, fonts, images) */
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
