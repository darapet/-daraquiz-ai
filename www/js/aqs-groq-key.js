(function(){
    var GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
    var STORAGE_KEY = 'aqs_groq_key';
    var IDX_KEY     = 'aqs_groq_key_idx';

    /* ══════════════════════════════════════════════════════════════
       PASTE YOUR GROQ API KEYS BELOW (up to 10).
       Get free keys at https://console.groq.com
       They rotate automatically — when one hits rate limit, the
       next one is used instantly, so the app keeps working.

       ALSO paste your Hugging Face token for image generation:
       Get one at https://huggingface.co/settings/tokens
    ══════════════════════════════════════════════════════════════ */
    window._AQS_GROQ_MASTER_KEYS = [
        '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',
        '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',
        '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',
        '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',
        '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',
        // Add more keys here when you get them (up to 10 total):
        // 'gsk_YOUR_KEY_6_HERE',
        // 'gsk_YOUR_KEY_7_HERE',
        // 'gsk_YOUR_KEY_8_HERE',
        // 'gsk_YOUR_KEY_9_HERE',
        // 'gsk_YOUR_KEY_10_HERE',
    ].filter(function(k){ return k && k.startsWith('gsk_'); });

    /* Paste your Hugging Face token here for image generation */
    window.HF_TOKEN = 'PASTE_HF_TOKEN_HERE';
    if (!window.AQS_ADMIN_SETTINGS) window.AQS_ADMIN_SETTINGS = {};
    window.AQS_ADMIN_SETTINGS.hf_token = window.HF_TOKEN;

    /* ──────────────────────────────────────────────────────────── */

    function _getMasterKeys() {
        var wk = window._AQS_GROQ_MASTER_KEYS;
        if (Array.isArray(wk) && wk.length) return wk;
        return [];
    }

    function _getIdx() {
        var keys = _getMasterKeys();
        if (!keys.length) return 0;
        var i = 0;
        try { i = parseInt(localStorage.getItem(IDX_KEY) || '0') || 0; } catch(e) {}
        if (isNaN(i) || i >= keys.length) i = 0;
        return i;
    }
    function _setIdx(i) {
        var keys = _getMasterKeys();
        try { localStorage.setItem(IDX_KEY, String(i % Math.max(1, keys.length))); } catch(e) {}
    }

    window.getGroqKey = function(){
        var stored = '';
        try { stored = (localStorage.getItem(STORAGE_KEY) || '').trim(); } catch(e) {}
        if (stored && stored.startsWith('gsk_')) return stored;
        var keys = _getMasterKeys();
        if (!keys.length) return '';
        var idx = _getIdx();
        _setIdx(idx + 1);
        return keys[idx];
    };

    window.groqFetch = async function(bodyObj, extraOpts) {
        var personal = '';
        try { personal = (localStorage.getItem(STORAGE_KEY) || '').trim(); } catch(e) {}
        if (personal && personal.startsWith('gsk_')) {
            return fetch(GROQ_URL, Object.assign({}, extraOpts || {}, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + personal },
                body:    JSON.stringify(bodyObj)
            }));
        }

        var keys = _getMasterKeys();
        if (!keys.length) throw new Error('No Groq API keys configured. Open js/aqs-groq-key.js and paste your keys.');

        var startIdx = _getIdx();

        for (var attempt = 0; attempt < keys.length; attempt++) {
            var idx = (startIdx + attempt) % keys.length;
            var key = keys[idx];
            var res = await fetch(GROQ_URL, Object.assign({}, extraOpts || {}, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
                body:    JSON.stringify(bodyObj)
            }));

            if (res.status === 429) {
                console.warn('[groqFetch] key slot', idx, 'rate-limited (429), trying next…');
                _setIdx(idx + 1);
                continue;
            }

            _setIdx(idx + 1);
            return res;
        }

        throw new Error('All Groq keys are rate-limited (429). Add more keys or wait a moment.');
    };

    window.setGroqKey = function(k){
        if (k && k.startsWith('gsk_'))
            try { localStorage.setItem(STORAGE_KEY, k.trim()); } catch(e) {}
    };

    window.setGroqKeys = function(arr){
        window._AQS_GROQ_MASTER_KEYS = (arr || []).filter(function(k){ return k && k.startsWith('gsk_'); });
        _setIdx(0);
    };
})();
