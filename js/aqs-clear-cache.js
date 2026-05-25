/* XZILY AI — In-App Cache Clearer  v1
   Injects a floating ⚙ button on every page.
   Tap → Clear App Cache & Restart  (fixes stuck TTS / image-gen / stale JS)
   Also provides Reset Keys option.                                            */
(function () {
    'use strict';

    function injectBtn() {
        if (document.getElementById('aqs-cc-fab')) return;
        var fab = document.createElement('button');
        fab.id = 'aqs-cc-fab';
        fab.title = 'App Settings';
        fab.textContent = '⚙';
        fab.style.cssText =
            'position:fixed;bottom:72px;right:14px;z-index:99990;' +
            'width:42px;height:42px;border-radius:50%;' +
            'background:rgba(15,23,42,0.88);color:#94a3b8;' +
            'border:1.5px solid rgba(148,163,184,0.22);' +
            'font-size:1.15rem;line-height:1;cursor:pointer;' +
            'display:flex;align-items:center;justify-content:center;' +
            'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
            'box-shadow:0 4px 18px rgba(0,0,0,0.35);' +
            'transition:color .18s,border-color .18s,transform .18s;';
        fab.addEventListener('pointerenter', function(){ fab.style.color='#818cf8'; fab.style.borderColor='rgba(99,102,241,.45)'; });
        fab.addEventListener('pointerleave', function(){ fab.style.color='#94a3b8'; fab.style.borderColor='rgba(148,163,184,.22)'; });
        fab.addEventListener('click', openPanel);
        document.body.appendChild(fab);
    }

    function openPanel() {
        if (document.getElementById('aqs-cc-panel')) return;
        var ov = document.createElement('div');
        ov.id = 'aqs-cc-panel';
        ov.style.cssText =
            'position:fixed;inset:0;z-index:100000;' +
            'background:rgba(0,0,0,.62);display:flex;' +
            'align-items:flex-end;justify-content:center;' +
            'padding:0 0 0 0;animation:aqs-cc-fade .18s ease;';
        ov.innerHTML =
            '<style>' +
            '@keyframes aqs-cc-fade{from{opacity:0}to{opacity:1}}' +
            '@keyframes aqs-cc-slide{from{transform:translateY(32px)}to{transform:translateY(0)}}' +
            '</style>' +
            '<div id="aqs-cc-sheet" style="' +
                'background:#0f172a;' +
                'border:1px solid rgba(255,255,255,.1);' +
                'border-radius:22px 22px 0 0;' +
                'padding:24px 20px 36px;' +
                'width:100%;max-width:480px;' +
                'box-shadow:0 -10px 48px rgba(0,0,0,.55);' +
                'animation:aqs-cc-slide .22s ease;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
                '<span style="font-size:1.05rem;font-weight:700;color:#e2e8f0;">⚙ App Settings</span>' +
                '<button id="aqs-cc-close" style="background:rgba(255,255,255,.07);border:none;border-radius:50%;' +
                    'width:30px;height:30px;color:#94a3b8;font-size:1rem;cursor:pointer;' +
                    'display:flex;align-items:center;justify-content:center;">✕</button>' +
              '</div>' +

              /* Clear Cache button */
              '<button id="aqs-cc-do-clear" style="' +
                  'background:rgba(239,68,68,.11);border:1.5px solid rgba(239,68,68,.3);' +
                  'color:#fca5a5;border-radius:13px;padding:14px 16px;' +
                  'font-size:.93rem;font-weight:600;cursor:pointer;' +
                  'text-align:left;width:100%;margin-bottom:11px;">' +
                '🗑 Clear App Cache &amp; Restart' +
                '<span style="display:block;font-size:.73rem;font-weight:400;color:#94a3b8;margin-top:3px;">' +
                    'Fixes stuck TTS, image gen, or stale JavaScript. App will reload.' +
                '</span>' +
              '</button>' +

              /* Reset Keys button */
              '<button id="aqs-cc-do-keys" style="' +
                  'background:rgba(245,158,11,.09);border:1.5px solid rgba(245,158,11,.25);' +
                  'color:#fcd34d;border-radius:13px;padding:14px 16px;' +
                  'font-size:.93rem;font-weight:600;cursor:pointer;' +
                  'text-align:left;width:100%;margin-bottom:11px;">' +
                '🔑 Reset Saved Keys &amp; Settings' +
                '<span style="display:block;font-size:.73rem;font-weight:400;color:#94a3b8;margin-top:3px;">' +
                    'Clears Groq API keys and local preferences. You\'ll need to re-enter your key.' +
                '</span>' +
              '</button>' +

              /* Version stamp */
              '<p style="color:#334155;font-size:.7rem;text-align:center;margin:14px 0 0;">' +
                  'XZILY AI · DaraQuiz AI' +
              '</p>' +
            '</div>';

        document.body.appendChild(ov);

        document.getElementById('aqs-cc-close').onclick = closePanel;
        ov.addEventListener('click', function(e){ if(e.target===ov) closePanel(); });

        /* ── Clear Cache ── */
        document.getElementById('aqs-cc-do-clear').onclick = async function() {
            var btn = this;
            btn.disabled = true;
            btn.innerHTML = '⏳ Clearing cache… please wait';
            try {
                /* 1. Unregister all service workers */
                if ('serviceWorker' in navigator) {
                    var regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map(function(r){ return r.unregister(); }));
                }
                /* 2. Delete every Cache Storage bucket */
                if ('caches' in window) {
                    var keys = await caches.keys();
                    await Promise.all(keys.map(function(k){ return caches.delete(k); }));
                }
                /* 3. Clear session storage (keep localStorage — has user prefs) */
                try { sessionStorage.clear(); } catch(_) {}
                btn.innerHTML = '✅ Cache cleared! Reloading…';
                setTimeout(function(){ window.location.reload(true); }, 900);
            } catch(e) {
                btn.disabled = false;
                btn.innerHTML = '🗑 Clear App Cache &amp; Restart';
                alert('Cache clear failed: ' + e.message +
                      '\n\nTry: Settings → Apps → DaraQuiz AI → Storage → Clear Cache on your phone.');
            }
        };

        /* ── Reset Keys ── */
        document.getElementById('aqs-cc-do-keys').onclick = function() {
            if (!confirm('This will erase all saved Groq API keys and local settings.\n\nContinue?')) return;
            try { localStorage.clear(); sessionStorage.clear(); } catch(_) {}
            var btn = this;
            btn.innerHTML = '✅ Keys cleared! Reloading…';
            setTimeout(function(){ window.location.reload(true); }, 900);
        };
    }

    function closePanel() {
        var p = document.getElementById('aqs-cc-panel');
        if (p) p.remove();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectBtn);
    } else {
        injectBtn();
    }
})();
