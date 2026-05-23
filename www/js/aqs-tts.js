/* ================================================================
   PATCH for: www/js/aqs-tts.js
   HOW TO APPLY IN GITHUB:
     1. Open aqs-tts.js in GitHub's web editor
     2. Do TWO find-and-replace operations below
   ================================================================ */


/* ── CHANGE 1: Replace the fetchChunk function (~line 191) ───────
   Find this entire function:

    async function fetchChunk(text, voice) {
        /* Resolve the Pollinations engine voice for this named voice * /
        var pollinationsVoice = POLLY_TO_POLLINATIONS[voice] || 'alloy';

        var voiceObj  = VOICES.find(function(v) { return v.id === voice; });
        var voiceSeed = voiceObj ? voiceObj.seed : Math.floor(Math.random() * 9000 + 1000);

        var encodedText = encodeURIComponent(text);
        var pollinationsUrl = 'https://audio.pollinations.ai/' + encodedText +
            '?model=openai-audio' +
            '&voice='  + pollinationsVoice +
            '&seed='   + voiceSeed +
            '&nologo=true' +
            '&_t='     + Date.now();

        try {
            var pCtrl = new AbortController();
            var pTid  = setTimeout(function() { pCtrl.abort(); }, 45000);
            var audioRes = await fetch(pollinationsUrl, { signal: pCtrl.signal, cache: 'no-store' });
            clearTimeout(pTid);
            if (audioRes.ok) return await audioRes.arrayBuffer();
        } catch (pErr) { /* fall through to browser speech * / }

        throw new Error('TTS service unavailable. Using browser voice instead.');
    }

   Replace that whole function with this:
*/

    async function fetchChunk(text, voice) {
        /* Resolve the Pollinations engine voice for this named voice */
        var pollinationsVoice = POLLY_TO_POLLINATIONS[voice] || 'alloy';

        var voiceObj  = VOICES.find(function(v) { return v.id === voice; });
        var voiceSeed = voiceObj ? voiceObj.seed : Math.floor(Math.random() * 9000 + 1000);

        var encodedText = encodeURIComponent(text);
        var pollinationsUrl = 'https://audio.pollinations.ai/' + encodedText +
            '?model=openai-audio' +
            '&voice='  + pollinationsVoice +
            '&seed='   + voiceSeed +
            '&nologo=true' +
            '&_t='     + Date.now();   /* timestamp prevents browser audio cache reuse */

        /* On Android (Capacitor native or mobile browser), fetching audio as a
           blob then playing a blob:// URL often silently fails in the WebView.
           Instead we return the direct Pollinations URL so <audio src="...">
           can stream the audio natively — this avoids the blob issue entirely. */
        var _isNativePlatform  = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
        var _isMobileWebBrowser = !_isNativePlatform && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (_isNativePlatform || _isMobileWebBrowser) {
            return { __directUrl: pollinationsUrl };
        }

        /* Desktop: fetch as ArrayBuffer so the user can also download the MP3 */
        try {
            var pCtrl = new AbortController();
            var pTid  = setTimeout(function() { pCtrl.abort(); }, 45000);
            var audioRes = await fetch(pollinationsUrl, { signal: pCtrl.signal, cache: 'no-store' });
            clearTimeout(pTid);
            if (audioRes.ok) return await audioRes.arrayBuffer();
        } catch (pErr) { /* fall through to browser speech */ }

        throw new Error('TTS service unavailable. Using browser voice instead.');
    }


/* ── CHANGE 2: Update the generate() function to handle __directUrl ─
   Find this block inside generate() (~line 364):

        try {
            var buffers = [];
            for (var i = 0; i < chunks.length; i++) {
                setStatus('Generating audio… (' + (i + 1) + '/' + chunks.length + ')', true);
                buffers.push(await fetchChunk(chunks[i], voice));
            }
            var combined = chunks.length > 1 ? concatBuffers(buffers) : buffers[0];
            var blob = new Blob([combined], { type: 'audio/mpeg' });
            var url  = URL.createObjectURL(blob);

            var voiceObj  = VOICES.find(function(v) { return v.id === voice; });
            var voiceName = voiceObj ? (voiceObj.name + ' · ' + voiceObj.region) : voice;

            showRealPlayer(url, blob, voiceName, speed, textToSpeak);
            setStatus('', false);
            saveToHistory(textToSpeak, url, voiceName, speed);
            renderHistory();

   Replace ONLY that block with this:
*/

        try {
            var buffers = [];
            for (var i = 0; i < chunks.length; i++) {
                setStatus('Generating audio… (' + (i + 1) + '/' + chunks.length + ')', true);
                buffers.push(await fetchChunk(chunks[i], voice));
            }

            var voiceObj  = VOICES.find(function(v) { return v.id === voice; });
            var voiceName = voiceObj ? (voiceObj.name + ' · ' + voiceObj.region) : voice;

            /* Mobile / native: fetchChunk returned a direct URL — play via <audio src> */
            if (buffers[0] && buffers[0].__directUrl) {
                var directUrl = buffers[0].__directUrl;
                showRealPlayer(directUrl, null, voiceName, speed, textToSpeak);
                setStatus('', false);
                saveToHistory(textToSpeak, directUrl, voiceName, speed);
                renderHistory();
                setGenerating(false);
                return;
            }

            /* Desktop: combine ArrayBuffers into a single blob */
            var combined = chunks.length > 1 ? concatBuffers(buffers) : buffers[0];
            var blob = new Blob([combined], { type: 'audio/mpeg' });
            var url  = URL.createObjectURL(blob);

            showRealPlayer(url, blob, voiceName, speed, textToSpeak);
            setStatus('', false);
            saveToHistory(textToSpeak, url, voiceName, speed);
            renderHistory();

