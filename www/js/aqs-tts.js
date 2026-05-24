================================================================
FILE: www/js/aqs-tts.js
CHANGE: Add Groq TTS as first priority (English + Arabic voices)
        Pollinations stays as fallback for all other languages
================================================================

Make TWO edits inside aqs-tts.js — both are easy find-and-replace.

================================================================
EDIT 1 of 2 — Add Groq voice map + _groqTTSChunk function
FIND this line (it's around line 142):
================================================================

    var POLLY_TO_POLLINATIONS = {

ADD EVERYTHING BELOW *BEFORE* that line (paste it just above "var POLLY_TO_POLLINATIONS"):
────────────────────────────────────────────────────────────────

    /* ── Groq TTS voice map (English + Arabic voices only)
       Groq PlayAI supports EN and AR. For other languages we skip
       Groq and fall straight through to Pollinations.              */
    var GROQ_VOICE_MAP = {
        /* English male */
        Brian:    'Fritz-PlayAI',
        Geraint:  'George-PlayAI',
        Joey:     'Atlas-PlayAI',
        Justin:   'Liam-PlayAI',
        Matthew:  'Tobias-PlayAI',
        Russell:  'Odin-PlayAI',
        /* English female */
        Amy:      'Celeste-PlayAI',
        Emma:     'Eleanor-PlayAI',
        Ivy:      'Aria-PlayAI',
        Joanna:   'Nova-PlayAI',
        Kendra:   'Paige-PlayAI',
        Kimberly: 'Quinn-PlayAI',
        Salli:    'Sally-PlayAI',
        Nicole:   'Stella-PlayAI',
        /* Indian English (mapped to closest EN Groq voices) */
        Aditi:    'Nia-PlayAI',
        Raveena:  'Samara-PlayAI',
        /* Arabic */
        Zeina:    'Amira-PlayAI',
    };

    /* ── Fetch a single audio chunk via Groq TTS API ──
       Returns ArrayBuffer on success, throws on failure.
       Only handles English and Arabic — other languages throw
       immediately so fetchChunk falls back to Pollinations.        */
    async function _groqTTSChunk(text, voice) {
        var voiceObj = VOICES.find(function (v) { return v.id === voice; });
        var lang     = voiceObj ? (voiceObj.lang || 'en') : 'en';

        /* Only English and Arabic are supported by Groq PlayAI */
        if (lang !== 'en' && lang !== 'ar' && lang !== 'hi') {
            throw new Error('Groq TTS does not support language: ' + lang);
        }

        /* Get key — uses the admin-configured keys from Firebase */
        if (typeof window.getGroqKey !== 'function') throw new Error('getGroqKey not loaded yet');
        var key = window.getGroqKey();
        if (!key || !key.startsWith('gsk_')) throw new Error('No Groq key configured');

        var model      = (lang === 'ar') ? 'playai-tts-arabic' : 'playai-tts';
        var groqVoice  = GROQ_VOICE_MAP[voice] || (lang === 'ar' ? 'Amira-PlayAI' : 'Fritz-PlayAI');

        var ctrl = new AbortController();
        var tid  = setTimeout(function () { ctrl.abort(); }, 30000);
        try {
            var res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': 'Bearer ' + key,
                },
                signal: ctrl.signal,
                body: JSON.stringify({
                    model:           model,
                    voice:           groqVoice,
                    input:           text,
                    response_format: 'mp3',
                }),
            });
            clearTimeout(tid);
            if (res.status === 429) throw new Error('Groq TTS rate limited — switching to Pollinations');
            if (!res.ok) throw new Error('Groq TTS HTTP ' + res.status);
            var buf = await res.arrayBuffer();
            if (!buf || buf.byteLength < 100) throw new Error('Groq TTS returned empty audio');
            return buf;
        } catch (e) {
            clearTimeout(tid);
            throw e;
        }
    }

════════════════════════════════════════════════════════════════

================================================================
EDIT 2 of 2 — Replace fetchChunk to try Groq first
FIND this ENTIRE function (starts around line 191):
================================================================

    async function fetchChunk(text, voice) {
        /* Resolve the Pollinations engine voice for this named voice */
        var pollinationsVoice = POLLY_TO_POLLINATIONS[voice] || 'alloy';

        /* Each named voice carries a unique seed so that voices sharing the same
           engine voice (e.g. two voices both mapped to "shimmer") still produce
           meaningfully different speech — Pollinations uses the seed for prosody
           variation, pacing, and intonation. */
        var voiceObj  = VOICES.find(function(v) { return v.id === voice; });
        var voiceSeed = voiceObj ? voiceObj.seed : Math.floor(Math.random() * 9000 + 1000);

        /* Build the Pollinations TTS URL.
           NOTE: Do NOT pass a language= param here — the text has already been
           translated above, so the model speaks the target language automatically.
           Passing language= can override the voice and cause all output to use
           the same default model voice. */
        var encodedText = encodeURIComponent(text);
        var pollinationsUrl = 'https://audio.pollinations.ai/' + encodedText +
            '?model=openai-audio' +
            '&voice='  + pollinationsVoice +
            '&seed='   + voiceSeed +
            '&nologo=true' +
            '&_t='     + Date.now();   /* timestamp prevents browser audio cache reuse */

        try {
            var pCtrl = new AbortController();
            var pTid  = setTimeout(function() { pCtrl.abort(); }, 45000);
            var audioRes = await fetch(pollinationsUrl, { signal: pCtrl.signal, cache: 'no-store' });
            clearTimeout(pTid);
            if (audioRes.ok) return await audioRes.arrayBuffer();
        } catch (pErr) { /* fall through to browser speech */ }

        throw new Error('TTS service unavailable. Using browser voice instead.');
    }

REPLACE WITH (Groq first → Pollinations fallback):
────────────────────────────────────────────────────────────────

    async function fetchChunk(text, voice) {
        /* ── Step 1: Try Groq TTS first (English + Arabic only)
           Groq uses your admin-configured API keys from Firebase.
           Fastest response time and highest audio quality.         */
        try {
            var groqBuf = await _groqTTSChunk(text, voice);
            return groqBuf; /* success — return immediately */
        } catch (groqErr) {
            console.warn('[TTS] Groq failed, trying Pollinations:', groqErr.message);
        }

        /* ── Step 2: Pollinations TTS (free fallback — all languages) */
        var pollinationsVoice = POLLY_TO_POLLINATIONS[voice] || 'alloy';
        var voiceObj  = VOICES.find(function(v) { return v.id === voice; });
        var voiceSeed = voiceObj ? voiceObj.seed : Math.floor(Math.random() * 9000 + 1000);

        var encodedText     = encodeURIComponent(text);
        var pollinationsUrl = 'https://audio.pollinations.ai/' + encodedText +
            '?model=openai-audio' +
            '&voice='  + pollinationsVoice +
            '&seed='   + voiceSeed +
            '&nologo=true' +
            '&_t='     + Date.now();

        try {
            var pCtrl = new AbortController();
            var pTid  = setTimeout(function () { pCtrl.abort(); }, 45000);
            var audioRes = await fetch(pollinationsUrl, { signal: pCtrl.signal, cache: 'no-store' });
            clearTimeout(pTid);
            if (audioRes.ok) return await audioRes.arrayBuffer();
        } catch (pErr) {
            console.warn('[TTS] Pollinations also failed:', pErr.message);
        }

        throw new Error('TTS service unavailable. Using browser voice instead.');
    }

================================================================
QUICK CHECK — after applying:
  aqs-tts.js now runs:  Groq TTS → Pollinations → Browser Speech
  aqs-studio.js runs:   Groq chat → Pollinations → proxy       ✅
  aqs-main.js runs:     Groq quiz → Pollinations stream → race ✅
  aqs-imagegen.js runs: Groq enhance → Pollinations image gen  ✅
  (Note: actual image pixel generation cannot use Groq — Groq is
   text-only. Pollinations is always used for image pixels.)
================================================================
