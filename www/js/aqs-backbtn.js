/* XZILY AI — Android / Capacitor Back Button Fix
   Prevents hardware back button from closing the whole app.
   Load this on EVERY page before </body>.
   Works with: Capacitor, Ionic, Cordova, plain Android WebView. */
(function () {
    'use strict';

    var lastBackPress = 0;
    var EXIT_DELAY    = 2000; /* ms — user must press twice within 2 s to exit */

    /* ── Is this the "home" page? ── */
    function isHomePage() {
        var p = window.location.pathname.toLowerCase();
        return p.endsWith('index.html') || p === '/' || p.endsWith('/');
    }

    /* ── Brief "Press back again to exit" toast ── */
    function showExitToast() {
        var el = document.getElementById('aqs-exit-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'aqs-exit-toast';
            el.style.cssText = [
                'position:fixed;bottom:88px;left:50%;transform:translateX(-50%)',
                'background:rgba(0,0,0,0.88);color:#fff;padding:11px 22px',
                'border-radius:24px;font-size:0.88rem;font-family:Inter,sans-serif',
                'z-index:999999;pointer-events:none;transition:opacity 0.3s',
                'box-shadow:0 4px 20px rgba(0,0,0,0.4)'
            ].join(';');
            document.body.appendChild(el);
        }
        el.textContent = 'Press back again to exit';
        el.style.opacity = '1';
        clearTimeout(el._tid);
        el._tid = setTimeout(function () {
            el.style.opacity = '0';
        }, EXIT_DELAY);
    }

    /* ── Core back handler ── */
    function handleBack() {

        /* 1. Close any open modal/overlay first */
        var modal = document.querySelector(
            '.aqs-modal[style*="flex"], .aqs-modal[style*="block"], ' +
            '[id$="-overlay"][style*="flex"], [id$="-overlay"][style*="block"]'
        );
        if (modal && modal.id !== 'aqs-exit-toast') {
            modal.style.display = 'none';
            return;
        }

        /* 2. Close history drawer (studio page) */
        var drawer = document.getElementById('dts-history-drawer');
        if (drawer && drawer.classList.contains('open')) {
            drawer.classList.remove('open');
            var dov = document.getElementById('dts-history-overlay');
            if (dov) dov.classList.remove('open');
            return;
        }

        /* 3. Close sidebar */
        var sidebar = document.getElementById('aqs-sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            var sov = document.getElementById('aqs-sidebar-overlay');
            if (sov) { sov.classList.remove('open'); sov.classList.remove('active'); }
            return;
        }

        /* 4. Navigate back in history if not on home page */
        if (window.history.length > 1 && !isHomePage()) {
            window.history.back();
            return;
        }

        /* 5. On home page: double-press to exit */
        var now = Date.now();
        if (now - lastBackPress < EXIT_DELAY) {
            /* Second press — exit app */
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                window.Capacitor.Plugins.App.exitApp();
            } else if (window.navigator && window.navigator.app) {
                window.navigator.app.exitApp();
            }
        } else {
            lastBackPress = now;
            showExitToast();
        }
    }

    /* ── Register listeners ── */
    function init() {
        /* Capacitor (recommended for Capacitor apps) */
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            window.Capacitor.Plugins.App.addListener('backButton', function () {
                handleBack();
            });
        }

        /* Ionic back button event */
        document.addEventListener('ionBackButton', function (ev) {
            ev.detail.register(10, function () { handleBack(); });
        });

        /* Cordova / PhoneGap (older builds) */
        document.addEventListener('deviceready', function () {
            document.addEventListener('backbutton', function (ev) {
                ev.preventDefault();
                handleBack();
            }, false);
        }, false);

        /* Desktop testing — Escape key */
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') handleBack();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
