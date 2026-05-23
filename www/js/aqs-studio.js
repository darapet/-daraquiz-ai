================================================================
aqs-studio.js — ALL FIXES (3 targeted edits)
Open www/js/aqs-studio.js on GitHub
================================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIX 1 — Remove AudioContext GainNode (fixes rubbish/garbled voice)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIND this block (around line 1347):

        var audio        = new Audio(ttsUrl);
        audio.volume     = 1.0;   /* max HTML5 volume */
        currentStudioAudio = audio;

        /* Boost volume via Web Audio API GainNode — allows amplification
           beyond the default 1.0 cap of the HTML5 Audio element */
        try {
            var _actx  = new (window.AudioContext || window.webkitAudioContext)();
            var _src   = _actx.createMediaElementSource(audio);
            var _gain  = _actx.createGain();
            _gain.gain.value = 2.0;   /* 2× louder */
            _src.connect(_gain);
            _gain.connect(_actx.destination);
        } catch (_gainErr) { /* fallback: plain audio.volume already set to 1.0 */ }

REPLACE WITH:

        var audio        = new Audio(ttsUrl);
        audio.volume     = 1.0;
        currentStudioAudio = audio;


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIX 2 — Add web browsing (AI reads any website URL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIND this line near the top of the file (around line 1-30, inside the IIFE,
after the 'use strict'; and the var declarations):

    var cfg = DTS_CONFIG || {};

(If that exact line isn't there, find ANY var declaration near the top of the file)

AFTER that line (paste as a new block BELOW it), ADD:

    /* ── Web Browse via Jina AI (free, no key needed) ── */
    async function fetchUrlContent(url) {
        try {
            var jinaUrl = 'https://r.jina.ai/' + url;
            var ctrl = new AbortController();
            var tid  = setTimeout(function() { ctrl.abort(); }, 20000);
            var res  = await fetch(jinaUrl, {
                headers: { 'Accept': 'text/plain', 'X-No-Cache': 'true' },
                signal: ctrl.signal
            });
            clearTimeout(tid);
            if (!res.ok) return null;
            var text = await res.text();
            return text.substring(0, 4000); /* keep context reasonable */
        } catch (e) { return null; }
    }

    /* Detect URLs in user message and prepend fetched content */
    var _URL_PATTERN = /https?:\/\/[^\s"'<>\]]+/i;
    async function enrichWithWebContent(userText) {
        var match = userText.match(_URL_PATTERN);
        if (!match) return userText;
        var url = match[0];
        var content = await fetchUrlContent(url);
        if (!content) return userText;
        return userText + '\n\n[Web page content fetched from ' + url + ']:\n' + content;
    }


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIX 3 — Call web browse before sending chat message
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Find the async function that sends the chat message. Look for a function that:
- Contains the text "aqs_send_message" OR "sendMessage" OR "dts-send" click handler
- Calls window.groqFetch or builds the messages array with { role: 'user', content: text }

In that function, find where `text` is added to messages, something like:

        messages.push({ role: 'user', content: text });

BEFORE that line, add:

        /* Auto-browse any URL in the message */
        if (_URL_PATTERN.test(text)) {
            setTyping(true);
            text = await enrichWithWebContent(text);
        }

(Note: if `setTyping` is named differently in the file, use whatever the
 typing indicator function is called. The important part is the enrichWithWebContent call.)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIX 4 — Voice text fallback (for Android where mic speech-to-text doesn't work)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Find the function openVoiceMode() or the voice overlay open logic.
(Search for: dts-voice-overlay)

Find where the voice overlay is shown (something like):
        overlay.style.display = 'flex';

AFTER that line, add:

        /* Show text fallback if SpeechRecognition is not available (e.g. Android WebView) */
        var hasSpeechRec = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
        var textFallback = document.getElementById('dts-voice-text-fallback');
        var textSendBtn  = document.getElementById('dts-voice-text-send');
        var fallbackNote = document.getElementById('dts-voice-fallback-note');
        if (!hasSpeechRec) {
            if (textFallback) textFallback.style.display = 'block';
            if (textSendBtn)  textSendBtn.style.display  = 'block';
            if (fallbackNote) fallbackNote.style.display = 'block';
        }

Then, somewhere in the init/DOMContentLoaded block, add the text send button handler:

        var vtSendBtn = document.getElementById('dts-voice-text-send');
        var vtInput   = document.getElementById('dts-voice-text-fallback');
        if (vtSendBtn && vtInput) {
            function sendVoiceTextFallback() {
                var txt = (vtInput.value || '').trim();
                if (!txt || !voiceActive) return;
                vtInput.value = '';
                sendVoiceMessage(txt);
            }
            vtSendBtn.addEventListener('click', sendVoiceTextFallback);
            vtInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); sendVoiceTextFallback(); }
            });
        }

================================================================
SUMMARY OF ALL CHANGES:
1. studio.html  — already given as a complete replacement file
2. aqs-sidebar.css — already given as a complete replacement file
3. login.html   — already given as a complete replacement file
4. aqs-tts.js   — already given as a complete replacement file
5. aqs-sw.js    — already given as a complete replacement file
6. AndroidManifest.xml — already given as a complete replacement file
7. aqs-studio.js — apply fixes 1, 2, 3, 4 above manually
================================================================
