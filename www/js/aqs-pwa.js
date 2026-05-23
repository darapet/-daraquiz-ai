/* XZILY AI Studio — PWA Install + Auto-Update + What's New */
(function () {
    'use strict';

    var deferredPrompt = null;
    var isIOS          = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    var  = ('standalone' in navigator && navigator.standalone) ||
                         window.matchMedia('(display-mode: standalone)').matches;

    /* ══════════════════════════════════════════════════════
       CHANGELOG — EDIT THIS SECTION WHEN YOU PUSH UPDATES
       Add your latest version at the TOP of the list.
       Also bump CACHE_VERSION in aqs-sw.js to match.
       Format: { version: 'v3', date: 'June 2025', changes: [...] }
       ══════════════════════════════════════════════════════ */
    var CHANGELOG = [
        {
            version: 'v2',
            date:    'May 2025',
            changes: [
                '🔐 Google sign-in now works on all devices (mobile & desktop)',
                '🖼️ AI Image Generator upgraded — faster with Try Again on failure',
                '❤️ Save your favourite AI images to your personal gallery',
                '🚀 App now auto-updates — no reinstall needed',
                '⚡ Faster page loading with smarter caching',
                '🐛 Various bug fixes and stability improvements'
            ]
        }
        /* Add older entries below like this:
        ,{
            version: 'v1',
            date:    'April 2025',
            changes: [
                '🎉 Initial release of XZILY AI'
            ]
        }
        */
    ];

    /* Flag so other scripts can detect this file is loaded */
    window._aqsPwaLoaded = true;

    /* Expose globally for manual testing in the console:
       Type  window.aqsShowWhatsNew()  to open the popup anytime */
    window.aqsShowWhatsNew = function () { showWhatsNew(); };

    /* ══════════════════════════════════════════════════════
       SERVICE WORKER REGISTRATION + AUTO-UPDATE DETECTION
       Uses a RELATIVE path so it works correctly on GitHub
       Pages subdirectories like /daraquiz-ai/
       ══════════════════════════════════════════════════════ */
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            var cfg = window.DTS_CONFIG || {};

            /* Build a relative SW URL from the current page's directory.
               e.g. https://darapet.github.io/daraquiz-ai/index.html
                    → registers at  /smartquiz-system/aqs-sw.js
               This avoids the old bug where /aqs-sw.js (absolute) pointed
               to the wrong location on GitHub Pages subdirectory sites.   */
            var swFile = (cfg.sw_url && cfg.sw_url.length) ? cfg.sw_url : 'aqs-sw.js';
            var swScope = (cfg.sw_scope && cfg.sw_scope.length) ? cfg.sw_scope : './';

            var swUrl = swFile.indexOf('/') === -1
                ? (window.location.pathname.replace(/\/[^/]*$/, '/') + swFile)
                : swFile;

            navigator.serviceWorker.register(swUrl, { scope: swScope })
                .then(function (reg) {
                    console.log('[XZILY PWA] SW registered:', reg.scope);

                    /* Force an update check every time the page loads */
                    reg.update();

                    /* If a new SW is already waiting on first load */
                    if (reg.waiting) {
                        showUpdateBanner(reg.waiting);
                    }

                    /* Listen for a new SW found during this session */
                    reg.addEventListener('updatefound', function () {
                        var newWorker = reg.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', function () {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showUpdateBanner(newWorker);
                            }
                        });
                    });
                })
                .catch(function (err) { console.warn('[XZILY PWA] SW registration failed:', err); });

            /* When SW activates after SKIP_WAITING, reload the page */
            var refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', function () {
                if (!refreshing) {
                    refreshing = true;
                    try { sessionStorage.setItem('_aqsJustUpdated', '1'); } catch (ex) {}
                    window.location.reload();
                }
            });
        });
    }

    /* ── Show What's New after a successful update ── */
    document.addEventListener('DOMContentLoaded', function () {
        /* Auto-show after update */
        try {
            if (sessionStorage.getItem('_aqsJustUpdated')) {
                sessionStorage.removeItem('_aqsJustUpdated');
                setTimeout(showWhatsNew, 900);
            }
        } catch (ex) {}

        /* Wire up any "What's New" button already in your HTML.
           Just add  id="aqs-whats-new-btn"  to any button or link. */
        var manualBtn = document.getElementById('aqs-whats-new-btn');
        if (manualBtn) {
            manualBtn.addEventListener('click', function (e) {
                e.preventDefault();
                showWhatsNew();
            });
        }
    });

    /* ══════════════════════════════════════════════════════
       UPDATE BANNER (shown when new version is waiting)
       ══════════════════════════════════════════════════════ */
    function showUpdateBanner(waitingWorker) {
        if (document.getElementById('aqs-update-banner')) return;

        injectStyles();

        var banner = document.createElement('div');
        banner.id = 'aqs-update-banner';
        banner.innerHTML =
            '<span style="font-size:20px">🚀</span>' +
            '<span><strong>Update available!</strong> A new version of XZILY AI is ready.</span>' +
            '<button id="aqs-update-now-btn" class="aqs-upd-btn-primary">Update Now</button>' +
            '<button id="aqs-update-dismiss-btn" class="aqs-upd-btn-ghost">Later</button>';

        document.body.appendChild(banner);

        document.getElementById('aqs-update-now-btn').addEventListener('click', function () {
            banner.remove();
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        });

        document.getElementById('aqs-update-dismiss-btn').addEventListener('click', function () {
            banner.style.animation = 'aqsSlideDown .3s ease forwards';
            setTimeout(function () { banner.remove(); }, 300);
        });
    }

    /* ══════════════════════════════════════════════════════
       WHAT'S NEW MODAL (shown after update OR manually)
       ══════════════════════════════════════════════════════ */
    function showWhatsNew() {
        if (document.getElementById('aqs-whatsnew-overlay')) return;
        if (!CHANGELOG.length) return;

        injectStyles();

        var latest = CHANGELOG[0];

        var changesHtml = latest.changes.map(function (c) {
            return '<li class="aqs-wn-item">' + c + '</li>';
        }).join('');

        var overlay = document.createElement('div');
        overlay.id = 'aqs-whatsnew-overlay';
        overlay.innerHTML =
            '<div id="aqs-whatsnew-modal">' +
                '<div class="aqs-wn-header">' +
                    '<div class="aqs-wn-icon">✨</div>' +
                    '<div>' +
                        '<div class="aqs-wn-title">What\'s New in XZILY AI ' + latest.version + '</div>' +
                        '<div class="aqs-wn-date">Updated ' + latest.date + '</div>' +
                    '</div>' +
                '</div>' +
                '<ul class="aqs-wn-list">' + changesHtml + '</ul>' +
                '<button id="aqs-whatsnew-close" class="aqs-upd-btn-primary" style="width:100%;margin-top:4px">Got it 🎉</button>' +
            '</div>';

        document.body.appendChild(overlay);

        function closeWhatsNew() {
            overlay.style.animation = 'aqsFadeOut .25s ease forwards';
            setTimeout(function () { overlay.remove(); }, 250);
        }

        document.getElementById('aqs-whatsnew-close').addEventListener('click', closeWhatsNew);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeWhatsNew();
        });
    }

    /* ── Inject shared CSS once ── */
    function injectStyles() {
        if (document.getElementById('aqs-update-styles')) return;
        var style = document.createElement('style');
        style.id = 'aqs-update-styles';
        style.textContent = [
            '#aqs-update-banner{',
                'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);',
                'background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;',
                'padding:14px 20px;border-radius:14px;',
                'box-shadow:0 8px 32px rgba(99,102,241,0.45);',
                'display:flex;align-items:center;gap:12px;z-index:99999;',
                'font-family:Inter,sans-serif;font-size:14px;max-width:92vw;',
                'animation:aqsSlideUp .35s ease;',
            '}',
            '#aqs-whatsnew-overlay{',
                'position:fixed;inset:0;background:rgba(0,0,0,0.65);',
                'display:flex;align-items:center;justify-content:center;',
                'z-index:99999;padding:16px;animation:aqsFadeIn .25s ease;',
            '}',
            '#aqs-whatsnew-modal{',
                'background:linear-gradient(160deg,#1e1b4b,#1a1035);',
                'border:1px solid rgba(99,102,241,0.35);',
                'border-radius:20px;padding:28px 24px;max-width:380px;width:100%;',
                'box-shadow:0 24px 64px rgba(0,0,0,0.6);',
                'font-family:Inter,sans-serif;color:#e2e8f0;',
                'animation:aqsPopIn .3s cubic-bezier(.34,1.56,.64,1);',
            '}',
            '.aqs-wn-header{display:flex;align-items:center;gap:14px;margin-bottom:20px;}',
            '.aqs-wn-icon{',
                'font-size:32px;width:52px;height:52px;border-radius:14px;',
                'background:rgba(99,102,241,0.2);display:flex;align-items:center;',
                'justify-content:center;flex-shrink:0;',
            '}',
            '.aqs-wn-title{font-size:18px;font-weight:700;color:#fff;}',
            '.aqs-wn-date{font-size:12px;color:#94a3b8;margin-top:2px;}',
            '.aqs-wn-list{list-style:none;padding:0;margin:0 0 20px 0;display:flex;flex-direction:column;gap:10px;}',
            '.aqs-wn-item{',
                'font-size:14px;line-height:1.5;padding:10px 14px;',
                'background:rgba(255,255,255,0.06);border-radius:10px;',
                'border-left:3px solid #6366f1;',
            '}',
            '.aqs-upd-btn-primary{',
                'background:#fff;color:#6366f1;border:none;border-radius:10px;',
                'padding:10px 18px;font-weight:700;cursor:pointer;font-size:14px;',
                'white-space:nowrap;flex-shrink:0;transition:opacity .15s;',
            '}',
            '.aqs-upd-btn-primary:hover{opacity:.88;}',
            '.aqs-upd-btn-ghost{',
                'background:rgba(255,255,255,0.14);color:#fff;border:none;border-radius:10px;',
                'padding:10px 14px;cursor:pointer;font-size:13px;flex-shrink:0;',
            '}',
            '@keyframes aqsSlideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}',
            '@keyframes aqsSlideDown{from{opacity:1;transform:translateX(-50%) translateY(0)}to{opacity:0;transform:translateX(-50%) translateY(20px)}}',
            '@keyframes aqsFadeIn{from{opacity:0}to{opacity:1}}',
            '@keyframes aqsFadeOut{from{opacity:1}to{opacity:0}}',
            '@keyframes aqsPopIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}'
        ].join('');
        document.head.appendChild(style);
    }

    /* ══════════════════════════════════════════════════════
       INSTALL MODAL
       ══════════════════════════════════════════════════════ */
    function buildModal() {
        if (document.getElementById('aqs-pwa-modal-overlay')) return;

        var overlay = document.createElement('div');
        overlay.id  = 'aqs-pwa-modal-overlay';
        overlay.innerHTML =
            '<div id="aqs-pwa-modal">' +
                '<button class="aqs-pwa-modal-close" id="aqs-pwa-modal-close-btn" aria-label="Close">✕</button>' +
                '<div class="aqs-pwa-modal-head">' +
                    '<div class="aqs-pwa-modal-icon">⬡</div>' +
                    '<div>' +
                        '<div class="aqs-pwa-modal-title">Install XZILY AI</div>' +
                        '<div class="aqs-pwa-modal-sub">Add to your home screen — works offline</div>' +
                    '</div>' +
                '</div>' +
                '<div class="aqs-pwa-modal-tabs">' +
                    '<button class="aqs-pwa-modal-tab active" data-tab="android">Android / PC</button>' +
                    '<button class="aqs-pwa-modal-tab" data-tab="ios">iPhone / iPad</button>' +
                '</div>' +
                '<div class="aqs-pwa-modal-steps active" id="aqs-pwa-steps-android">' +
                    '<div class="aqs-pwa-modal-step"><div class="aqs-pwa-step-num">1</div><div class="aqs-pwa-step-text">Open this page in <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Samsung Browser</strong></div></div>' +
                    '<div class="aqs-pwa-modal-step"><div class="aqs-pwa-step-num">2</div><div class="aqs-pwa-step-text">Tap the browser menu <strong>⋮</strong> (top-right)</div></div>' +
                    '<div class="aqs-pwa-modal-step"><div class="aqs-pwa-step-num">3</div><div class="aqs-pwa-step-text">Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></div></div>' +
                    '<div class="aqs-pwa-modal-step"><div class="aqs-pwa-step-num">4</div><div class="aqs-pwa-step-text">Tap <strong>Install</strong> to confirm — the app icon will appear on your home screen</div></div>' +
                '</div>' +
                '<div class="aqs-pwa-modal-steps" id="aqs-pwa-steps-ios">' +
                    '<div class="aqs-pwa-modal-step"><div class="aqs-pwa-step-num">1</div><div class="aqs-pwa-step-text">Open this page in <strong>Safari</strong> (required on iPhone/iPad)</div></div>' +
                    '<div class="aqs-pwa-modal-step"><div class="aqs-pwa-step-num">2</div><div class="aqs-pwa-step-text">Tap the <strong>Share</strong> button at the bottom of the screen</div></div>' +
                    '<div class="aqs-pwa-modal-step"><div class="aqs-pwa-step-num">3</div><div class="aqs-pwa-step-text">Scroll down and tap <strong>"Add to Home Screen"</strong></div></div>' +
                    '<div class="aqs-pwa-modal-step"><div class="aqs-pwa-step-num">4</div><div class="aqs-pwa-step-text">Tap <strong>Add</strong> — the app icon appears on your home screen instantly</div></div>' +
                '</div>' +
                '<button id="aqs-pwa-modal-native-btn">⬇ Install Now</button>' +
            '</div>';

        document.body.appendChild(overlay);

        if (isIOS) switchTab('ios');

        overlay.addEventListener('click', function (e) {
            var tab = e.target.closest('.aqs-pwa-modal-tab');
            if (tab) switchTab(tab.dataset.tab);
            if (e.target.id === 'aqs-pwa-modal-close-btn') closeModal();
            if (e.target === overlay) closeModal();
            if (e.target.id === 'aqs-pwa-modal-native-btn') {
                if (deferredPrompt) {
                    closeModal();
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(function (r) {
                        if (r.outcome === 'accepted') markInstalled();
                        deferredPrompt = null;
                    });
                }
            }
        });
    }

    function switchTab(name) {
        document.querySelectorAll('.aqs-pwa-modal-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
        document.querySelectorAll('.aqs-pwa-modal-steps').forEach(function (s) { s.classList.toggle('active', s.id === 'aqs-pwa-steps-' + name); });
    }

    function openModal() {
        buildModal();
        var overlay = document.getElementById('aqs-pwa-modal-overlay');
        if (overlay) overlay.classList.add('open');
        var nb = document.getElementById('aqs-pwa-modal-native-btn');
        if (nb) nb.style.display = deferredPrompt ? 'block' : 'none';
    }

    function closeModal() {
        var overlay = document.getElementById('aqs-pwa-modal-overlay');
        if (overlay) overlay.classList.remove('open');
    }

    function markInstalled() {
        var btn = document.getElementById('aqs-pwa-nav-btn');
        if (btn) {
            btn.classList.add('aqs-pwa-installed');
            var label = btn.querySelector('.aqs-pwa-nav-label');
            var icon  = btn.querySelector('.aqs-pwa-nav-icon');
            if (label) label.textContent = 'App Installed ✓';
            if (icon)  icon.textContent  = '✅';
        }
        hideBanner();
        closeModal();
    }

    function hideBanner() {
        var b = document.getElementById('aqs-pwa-banner');
        if (b) b.style.display = 'none';
        try { sessionStorage.setItem('aqs_pwa_dismissed', '1'); } catch (e) {}
    }

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
        try { if (sessionStorage.getItem('aqs_pwa_dismissed')) return; } catch (ex) {}
        var b = document.getElementById('aqs-pwa-banner');
        if (b) b.style.display = 'flex';
    });

    document.addEventListener('click', function (e) {
        if (!e.target) return;
        var navBtn = e.target.closest && e.target.closest('#aqs-pwa-nav-btn');
        if (navBtn) {
            if (isInStandalone) return;
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function (r) {
                    if (r.outcome === 'accepted') markInstalled();
                    deferredPrompt = null;
                });
            } else {
                openModal();
            }
            return;
        }
        if (e.target.id === 'aqs-pwa-install-btn') {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function (r) {
                    if (r.outcome === 'accepted') markInstalled();
                    deferredPrompt = null;
                    hideBanner();
                });
            }
            hideBanner();
            return;
        }
        if (e.target.id === 'aqs-pwa-dismiss-btn' || e.target.id === 'aqs-pwa-ios-dismiss') {
            hideBanner();
            var ib = document.getElementById('aqs-pwa-ios-banner');
            if (ib) ib.style.display = 'none';
        }
    });

    window.addEventListener('appinstalled', function () {
        markInstalled();
        console.log('[XZILY PWA] App installed!');
    });

    document.addEventListener('DOMContentLoaded', function () {
        if (isInStandalone) { markInstalled(); return; }
        if (isIOS) {
            var btn = document.getElementById('aqs-pwa-nav-btn');
            if (btn) { var label = btn.querySelector('.aqs-pwa-nav-label'); if (label) label.textContent = 'Install on iPhone / iPad'; }
            return;
        }
        setTimeout(function () {
            if (!deferredPrompt && !isInStandalone) {
                var btn2 = document.getElementById('aqs-pwa-nav-btn');
                if (btn2 && !btn2.classList.contains('aqs-pwa-installed')) {
                    var label2 = btn2.querySelector('.aqs-pwa-nav-label');
                    if (label2 && label2.textContent === 'Install App') label2.textContent = 'How to Install';
                }
            }
        }, 3000);
    });

})();
