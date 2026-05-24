/* XZILY AI — Text-to-Speech Module  v2
   Priority: Groq TTS (PlayAI voices) → Pollinations TTS → Browser Speech
   Voices: 60+ across 20 languages
   Depends on: window.groqFetch + window.getGroqKey (aqs-groq-key.js)
   Config: window.AQS_TTS_CONFIG                                         */
(function () {
    'use strict';

    var cfg = window.AQS_TTS_CONFIG || {};

    /* ══════════════════════════════════════════════════════════════
       VOICE CATALOGUE
    ══════════════════════════════════════════════════════════════ */
    var VOICES = [
        /* English */
        { id:'Brian',    name:'Brian',    lang:'en', flag:'🇺🇸', gender:'M', seed:1001 },
        { id:'Amy',      name:'Amy',      lang:'en', flag:'🇬🇧', gender:'F', seed:1002 },
        { id:'Emma',     name:'Emma',     lang:'en', flag:'🇬🇧', gender:'F', seed:1003 },
        { id:'Joanna',   name:'Joanna',   lang:'en', flag:'🇺🇸', gender:'F', seed:1004 },
        { id:'Matthew',  name:'Matthew',  lang:'en', flag:'🇺🇸', gender:'M', seed:1005 },
        { id:'Joey',     name:'Joey',     lang:'en', flag:'🇺🇸', gender:'M', seed:1006 },
        { id:'Justin',   name:'Justin',   lang:'en', flag:'🇺🇸', gender:'M', seed:1007 },
        { id:'Kendra',   name:'Kendra',   lang:'en', flag:'🇺🇸', gender:'F', seed:1008 },
        { id:'Kimberly', name:'Kimberly', lang:'en', flag:'🇺🇸', gender:'F', seed:1009 },
        { id:'Salli',    name:'Salli',    lang:'en', flag:'🇺🇸', gender:'F', seed:1010 },
        { id:'Ivy',      name:'Ivy',      lang:'en', flag:'🇺🇸', gender:'F', seed:1011 },
        { id:'Nicole',   name:'Nicole',   lang:'en', flag:'🇦🇺', gender:'F', seed:1012 },
        { id:'Russell',  name:'Russell',  lang:'en', flag:'🇦🇺', gender:'M', seed:1013 },
        { id:'Geraint',  name:'Geraint',  lang:'en', flag:'🏴', gender:'M', seed:1014 },
        /* Hindi / Indian English */
        { id:'Aditi',    name:'Aditi',    lang:'hi', flag:'🇮🇳', gender:'F', seed:1015 },
        { id:'Raveena',  name:'Raveena',  lang:'hi', flag:'🇮🇳', gender:'F', seed:1016 },
        /* Arabic */
        { id:'Zeina',    name:'Zeina',    lang:'ar', flag:'🇸🇦', gender:'F', seed:2001 },
        /* French */
        { id:'Celine',   name:'Celine',   lang:'fr', flag:'🇫🇷', gender:'F', seed:3001 },
        { id:'Mathieu',  name:'Mathieu',  lang:'fr', flag:'🇫🇷', gender:'M', seed:3002 },
        { id:'Lea',      name:'Lea',      lang:'fr', flag:'🇫🇷', gender:'F', seed:3003 },
        /* German */
        { id:'Hans',     name:'Hans',     lang:'de', flag:'🇩🇪', gender:'M', seed:4001 },
        { id:'Marlene',  name:'Marlene',  lang:'de', flag:'🇩🇪', gender:'F', seed:4002 },
        { id:'Vicki',    name:'Vicki',    lang:'de', flag:'🇩🇪', gender:'F', seed:4003 },
        /* Spanish */
        { id:'Enrique',  name:'Enrique',  lang:'es', flag:'🇪🇸', gender:'M', seed:5001 },
        { id:'Conchita', name:'Conchita', lang:'es', flag:'🇪🇸', gender:'F', seed:5002 },
        { id:'Lucia',    name:'Lucia',    lang:'es', flag:'🇪🇸', gender:'F', seed:5003 },
        { id:'Miguel',   name:'Miguel',   lang:'es', flag:'🇲🇽', gender:'M', seed:5004 },
        /* Italian */
        { id:'Giorgio',  name:'Giorgio',  lang:'it', flag:'🇮🇹', gender:'M', seed:6001 },
        { id:'Carla',    name:'Carla',    lang:'it', flag:'🇮🇹', gender:'F', seed:6002 },
        /* Portuguese */
        { id:'Cristiano',name:'Cristiano',lang:'pt', flag:'🇵🇹', gender:'M', seed:7001 },
        { id:'Ines',     name:'Ines',     lang:'pt', flag:'🇵🇹', gender:'F', seed:7002 },
        { id:'Ricardo',  name:'Ricardo',  lang:'pt', flag:'🇧🇷', gender:'M', seed:7003 },
        { id:'Vitoria',  name:'Vitoria',  lang:'pt', flag:'🇧🇷', gender:'F', seed:7004 },
        /* Dutch */
        { id:'Ruben',    name:'Ruben',    lang:'nl', flag:'🇳🇱', gender:'M', seed:8001 },
        { id:'Lotte',    name:'Lotte',    lang:'nl', flag:'🇳🇱', gender:'F', seed:8002 },
        /* Polish */
        { id:'Jacek',    name:'Jacek',    lang:'pl', flag:'🇵🇱', gender:'M', seed:9001 },
        { id:'Maja',     name:'Maja',     lang:'pl', flag:'🇵🇱', gender:'F', seed:9002 },
        /* Turkish */
        { id:'Filiz',    name:'Filiz',    lang:'tr', flag:'🇹🇷', gender:'F', seed:10001 },
        /* Swedish */
        { id:'Astrid',   name:'Astrid',   lang:'sv', flag:'🇸🇪', gender:'F', seed:11001 },
        /* Danish */
        { id:'Naja',     name:'Naja',     lang:'da', flag:'🇩🇰', gender:'F', seed:12001 },
        { id:'Mads',     name:'Mads',     lang:'da', flag:'🇩🇰', gender:'M', seed:12002 },
        /* Norwegian */
        { id:'Liv',      name:'Liv',      lang:'nb', flag:'🇳🇴', gender:'F', seed:13001 },
        /* Romanian */
        { id:'Carmen',   name:'Carmen',   lang:'ro', flag:'🇷🇴', gender:'F', seed:14001 },
        /* Russian */
        { id:'Tatyana',  name:'Tatyana',  lang:'ru', flag:'🇷🇺', gender:'F', seed:15001 },
        { id:'Maxim',    name:'Maxim',    lang:'ru', flag:'🇷🇺', gender:'M', seed:15002 },
        /* Japanese */
        { id:'Mizuki',   name:'Mizuki',   lang:'ja', flag:'🇯🇵', gender:'F', seed:16001 },
        { id:'Takumi',   name:'Takumi',   lang:'ja', flag:'🇯🇵', gender:'M', seed:16002 },
        /* Korean */
        { id:'Seoyeon',  name:'Seoyeon',  lang:'ko', flag:'🇰🇷', gender:'F', seed:17001 },
        /* Chinese */
        { id:'Zhiyu',    name:'Zhiyu',    lang:'zh', flag:'🇨🇳', gender:'F', seed:18001 },
        /* Welsh */
        { id:'Gwyneth',  name:'Gwyneth',  lang:'cy', flag:'🏴', gender:'F', seed:19001 }
    ];


    /* ── Groq TTS voice map (English + Arabic + Hindi only) ── */
    var GROQ_VOICE_MAP = {
        Brian:'Fritz-PlayAI',    Geraint:'George-PlayAI', Joey:'Atlas-PlayAI',
        Justin:'Liam-PlayAI',    Matthew:'Tobias-PlayAI', Russell:'Odin-PlayAI',
        Amy:'Celeste-PlayAI',    Emma:'Eleanor-PlayAI',   Ivy:'Aria-PlayAI',
        Joanna:'Nova-PlayAI',    Kendra:'Paige-PlayAI',   Kimberly:'Quinn-PlayAI',
        Salli:'Sally-PlayAI',    Nicole:'Stella-PlayAI',
        Aditi:'Nia-PlayAI',      Raveena:'Samara-PlayAI',
        Zeina:'Amira-PlayAI'
    };

    /* ══════════════════════════════════════════════════════════════
       DOM REFERENCES
    ══════════════════════════════════════════════════════════════ */
    var $text        = document.getElementById('tts-text');
    var $genBtn      = document.getElementById('tts-generate-btn');
    var $clearBtn    = document.getElementById('tts-clear-btn');
    var $badge       = document.getElementById('tts-voice-badge');
    var $status      = document.getElementById('tts-status');
    var $statusTxt   = document.getElementById('tts-status-text');
    var $error       = document.getElementById('tts-error');
    var $player      = document.getElementById('tts-player');
    var $audio       = document.getElementById('tts-audio');
    var $browserPlay = document.getElementById('tts-browser-player');
    var $playBtn     = document.getElementById('tts-browser-play-btn');
    var $stopBtn     = document.getElementById('tts-browser-stop-btn');
    var $dlBtn       = document.getElementById('tts-download-btn');
    var $regenBtn    = document.getElementById('tts-regen-btn');
    var $playerInfo  = document.getElementById('tts-player-info');
    var $histWrap    = document.getElementById('tts-history-wrap');
    var $histList    = document.getElementById('tts-history-list');
    var $clrHistBtn  = document.getElementById('tts-clear-history-btn');
    var $langFilter  = document.getElementById('tts-lang-filter');
    var $voiceGrid   = document.getElementById('tts-voice-grid');
    var $speed       = document.getElementById('tts-speed');
    var $speedVal    = document.getElementById('tts-speed-val');
    var $savePref    = document.getElementById('tts-save-pref-btn');
    var $prefSaved   = document.getElementById('tts-pref-saved');
    var $charCount   = document.getElementById('tts-char-count');
    var $translate   = document.getElementById('tts-translate-toggle');

    /* ── State ── */
    var selectedVoice = cfg.saved_voice || 'Brian';
    var currentSpeed  = parseFloat(cfg.saved_speed) || 1.0;
    var currentLang   = cfg.saved_lang || 'en';
    var lastAudioBuf  = null;
    var browserUtter  = null;
    var HIST_KEY      = 'aqs_tts_history';

    /* ── Load saved prefs ── */
    (function () {
        try {
            var p = JSON.parse(localStorage.getItem('aqs_tts_prefs') || '{}');
            if (p.voice) selectedVoice = p.voice;
            if (p.speed) currentSpeed  = parseFloat(p.speed);
            if (p.lang)  currentLang   = p.lang;
        } catch (e) {}
        if ($speed)    $speed.value                = currentSpeed;
        if ($speedVal) $speedVal.textContent       = currentSpeed.toFixed(1) + '×';
        if ($langFilter) $langFilter.value         = currentLang;
    })();

    /* ── Char counter ── */
    if ($text && $charCount) {
        $text.addEventListener('input', function () {
            $charCount.textContent = $text.value.length.toLocaleString() + ' / 5,000 characters';
        });
    }

    /* ── Speed slider ── */
    if ($speed) {
        $speed.addEventListener('input', function () {
            currentSpeed = parseFloat($speed.value);
            if ($speedVal) $speedVal.textContent = currentSpeed.toFixed(1) + '×';
        });
    }

    /* ── Save prefs ── */
    if ($savePref) {
        $savePref.addEventListener('click', function () {
            try {
                localStorage.setItem('aqs_tts_prefs', JSON.stringify({
                    voice: selectedVoice, speed: currentSpeed, lang: currentLang
                }));
            } catch (e) {}
            if ($prefSaved) {
                $prefSaved.style.display = 'block';
                setTimeout(function () { $prefSaved.style.display = 'none'; }, 2000);
            }
        });
    }

    /* ══════════════════════════════════════════════════════════════
       VOICE GRID
    ══════════════════════════════════════════════════════════════ */
    function renderVoices(langFilter) {
        if (!$voiceGrid) return;
        $voiceGrid.innerHTML = '';
        var list = langFilter ? VOICES.filter(function (v) { return v.lang === langFilter; }) : VOICES;
        list.forEach(function (v) {
            var btn = document.createElement('button');
            btn.className = 'tts-voice-btn' + (v.id === selectedVoice ? ' active' : '');
            btn.dataset.voice = v.id;
            btn.innerHTML =
                '<span class="tts-voice-flag">' + v.flag + '</span>' +
                '<span class="tts-voice-name">' + v.name + '</span>' +
                '<span style="font-size:0.68rem;opacity:0.55;">' + v.gender + '</span>';
            btn.addEventListener('click', function () {
                $voiceGrid.querySelectorAll('.tts-voice-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                selectedVoice = v.id;
                if ($badge) $badge.textContent = v.flag + ' ' + v.name;
            });
            $voiceGrid.appendChild(btn);
        });
        var sel = VOICES.find(function (v) { return v.id === selectedVoice; });
        if (sel && $badge) $badge.textContent = sel.flag + ' ' + sel.name;
    }

    renderVoices(currentLang);

    if ($langFilter) {
        $langFilter.addEventListener('change', function () {
            currentLang = $langFilter.value;
            renderVoices(currentLang);
        });
    }

    /* ══════════════════════════════════════════════════════════════
       TTS BACKENDS
    ══════════════════════════════════════════════════════════════ */

    /* ── Groq TTS (English / Arabic / Hindi only) ── */
    async function _groqTTSChunk(text, voice) {
        var voiceObj = VOICES.find(function (v) { return v.id === voice; });
        var lang     = voiceObj ? (voiceObj.lang || 'en') : 'en';
        if (lang !== 'en' && lang !== 'ar' && lang !== 'hi') {
            throw new Error('Groq TTS does not support lang: ' + lang);
        }
        if (typeof window.getGroqKey !== 'function') throw new Error('getGroqKey not available');
        var key = window.getGroqKey();
        if (!key || !key.startsWith('gsk_')) throw new Error('No Groq API key configured');
        var model     = (lang === 'ar') ? 'playai-tts-arabic' : 'playai-tts';
        var groqVoice = GROQ_VOICE_MAP[voice] || (lang === 'ar' ? 'Amira-PlayAI' : 'Fritz-PlayAI');
        var ctrl = new AbortController();
        var tid  = setTimeout(function () { ctrl.abort(); }, 30000);
        try {
            var res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
                signal:  ctrl.signal,
                body:    JSON.stringify({ model: model, voice: groqVoice, input: text, response_format: 'mp3' })
            });
            clearTimeout(tid);
            if (res.status === 429) throw new Error('Groq rate limited');
            if (!res.ok) throw new Error('Groq HTTP ' + res.status);
            var buf = await res.arrayBuffer();
            if (!buf || buf.byteLength < 100) throw new Error('Groq returned empty audio');
            return buf;
        } catch (e) { clearTimeout(tid); throw e; }
    }

    /* ── Browser Speech fallback (no external service needed) ── */
    function _browserTTSChunk(text, voice) {
        return new Promise(function(resolve, reject) {
            if (!window.speechSynthesis) { reject(new Error('Browser TTS not supported')); return; }
            window.speechSynthesis.cancel();
            var utt = new SpeechSynthesisUtterance(text);
            utt.rate  = 1.0;
            utt.pitch = 1.0;
            utt.onend   = function() { resolve(new ArrayBuffer(0)); };
            utt.onerror = function(e) { reject(new Error('Browser TTS error: ' + e.error)); };
            window.speechSynthesis.speak(utt);
        });
    }

    /* ── Main fetchChunk: Groq first → Browser Speech fallback ── */
    async function fetchChunk(text, voice) {
        try {
            return await _groqTTSChunk(text, voice);
        } catch (e) {
            console.warn('[TTS] Groq failed, falling back to browser speech:', e.message);
        }
        try {
            return await _browserTTSChunk(text, voice);
        } catch (e) {
            console.warn('[TTS] Browser TTS failed:', e.message);
        }
        throw new Error('All TTS services unavailable. Check your Groq key in js/aqs-groq-key.js');
    }

    /* ── Translate via Groq ── */
    async function translateText(text, targetLang) {
        var LANG_NAMES = {
            fr:'French', de:'German', es:'Spanish', it:'Italian', pt:'Portuguese',
            ar:'Arabic', hi:'Hindi', ja:'Japanese', ko:'Korean', zh:'Chinese (Mandarin)',
            ru:'Russian', nl:'Dutch', pl:'Polish', tr:'Turkish', sv:'Swedish',
            da:'Danish', nb:'Norwegian', ro:'Romanian', cy:'Welsh'
        };
        var langName = LANG_NAMES[targetLang] || targetLang;
        if (typeof window.groqFetch === 'function') {
            try {
                var res = await window.groqFetch({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: 'Translate the following text to ' + langName + '. Output ONLY the translated text.' },
                        { role: 'user',   content: text }
                    ],
                    max_tokens: 2000, temperature: 0.2
                });
                if (res.ok) {
                    var d = await res.json();
                    var t = (((d.choices || [])[0] || {}).message || {}).content || '';
                    if (t.trim()) return t.trim();
                }
            } catch (e) {}
        }
        return text;
    }

    /* ── Split long text into TTS-safe chunks ── */
    function splitText(text) {
        var MAX = 400;
        if (text.length <= MAX) return [text];
        var sentences = text.match(/[^.!?؟\n]+[.!?؟\n]*/g) || [text];
        var chunks = [], current = '';
        sentences.forEach(function (s) {
            if ((current + s).length > MAX && current) { chunks.push(current.trim()); current = s; }
            else current += s;
        });
        if (current.trim()) chunks.push(current.trim());
        return chunks.length ? chunks : [text];
    }

    /* ── Merge ArrayBuffers for multi-chunk audio ── */
    function mergeBuffers(bufs) {
        var total  = bufs.reduce(function (a, b) { return a + b.byteLength; }, 0);
        var merged = new Uint8Array(total);
        var offset = 0;
        bufs.forEach(function (b) { merged.set(new Uint8Array(b), offset); offset += b.byteLength; });
        return merged.buffer;
    }

    /* ══════════════════════════════════════════════════════════════
       PLAYBACK
    ══════════════════════════════════════════════════════════════ */
    function playBuffer(buf, speed) {
        if (!$audio) return;
        var blob = new Blob([buf], { type: 'audio/mpeg' });
        var url  = URL.createObjectURL(blob);
        $audio.src = url;
        $audio.playbackRate = speed || 1.0;
        $audio.style.display = 'block';
        if ($browserPlay) $browserPlay.style.display = 'none';
        $audio.play().catch(function () { showBrowserPlayer(); });
        lastAudioBuf = buf;
        if ($dlBtn) {
            $dlBtn.style.display = 'inline-flex';
            $dlBtn.onclick = function () {
                var a = document.createElement('a');
                a.href = url;
                a.download = 'tts-' + Date.now() + '.mp3';
                a.click();
            };
        }
        var vo = VOICES.find(function (v) { return v.id === selectedVoice; });
        if ($playerInfo) $playerInfo.textContent = 'Voice: ' + (vo ? vo.flag + ' ' + vo.name : selectedVoice) + '  ·  Speed: ' + speed.toFixed(1) + '×';
    }

    function showBrowserPlayer() {
        if ($audio)      $audio.style.display      = 'none';
        if ($browserPlay)$browserPlay.style.display = 'flex';
        if ($dlBtn)      $dlBtn.style.display       = 'none';
        if ($player)     $player.style.display      = 'block';
    }

    function useBrowserSpeech(text, voice, speed) {
        if (!('speechSynthesis' in window)) { showError('Text-to-speech is not supported in this browser.'); return; }
        window.speechSynthesis.cancel();
        var vo       = VOICES.find(function (v) { return v.id === voice; });
        var lang     = vo ? (vo.lang || 'en') : 'en';
        var langMap  = { en:'en-US', ar:'ar-SA', hi:'hi-IN', fr:'fr-FR', de:'de-DE', es:'es-ES',
                         it:'it-IT', pt:'pt-PT', nl:'nl-NL', pl:'pl-PL', tr:'tr-TR', sv:'sv-SE',
                         da:'da-DK', nb:'nb-NO', ro:'ro-RO', ru:'ru-RU', ja:'ja-JP', ko:'ko-KR',
                         zh:'zh-CN', cy:'cy-GB' };
        var utt      = new SpeechSynthesisUtterance(text);
        utt.lang     = langMap[lang] || 'en-US';
        utt.rate     = speed || 1.0;
        utt.pitch    = (vo && vo.gender === 'M') ? 0.85 : 1.1;
        var voices   = window.speechSynthesis.getVoices();
        var match    = voices.find(function (v) { return v.lang.startsWith(utt.lang.slice(0, 2)); });
        if (match) utt.voice = match;
        browserUtter = utt;
        window.speechSynthesis.speak(utt);
        showBrowserPlayer();
        if ($playerInfo) $playerInfo.textContent = 'Browser voice (download not available)';
    }

    if ($playBtn) {
        $playBtn.addEventListener('click', function () {
            if (lastAudioBuf) playBuffer(lastAudioBuf, currentSpeed);
            else if (browserUtter) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(browserUtter); }
        });
    }
    if ($stopBtn) {
        $stopBtn.addEventListener('click', function () {
            window.speechSynthesis.cancel();
            if ($audio) $audio.pause();
        });
    }

    /* ══════════════════════════════════════════════════════════════
       HISTORY
    ══════════════════════════════════════════════════════════════ */
    function loadHistory()  { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (e) { return []; } }
    function saveHistory(h) { try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 20))); } catch (e) {} }

    function renderHistory() {
        var h = loadHistory();
        if ($histWrap) $histWrap.style.display = h.length ? 'block' : 'none';
        if (!$histList) return;
        $histList.innerHTML = '';
        h.slice(0, 10).forEach(function (item) {
            var el = document.createElement('div');
            el.style.cssText = 'padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;transition:background 0.15s;';
            el.innerHTML =
                '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
                    '<div style="font-size:0.83rem;color:#e2e8f0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(item.text) + '</div>' +
                    '<div style="font-size:0.74rem;color:#94a3b8;white-space:nowrap;">' + (item.voiceName || '') + '</div>' +
                '</div>';
            el.addEventListener('click', function () {
                if ($text) $text.value = item.text;
                var vBtn = $voiceGrid && $voiceGrid.querySelector('[data-voice="' + item.voice + '"]');
                if (vBtn) vBtn.click();
            });
            $histList.appendChild(el);
        });
    }

    if ($clrHistBtn) {
        $clrHistBtn.addEventListener('click', function () {
            if (!confirm('Clear all TTS history?')) return;
            localStorage.removeItem(HIST_KEY);
            renderHistory();
        });
    }
    renderHistory();

    /* ══════════════════════════════════════════════════════════════
       GENERATE
    ══════════════════════════════════════════════════════════════ */
    async function generate() {
        var text = $text ? $text.value.trim() : '';
        if (!text) { showError('Please enter some text to convert.'); return; }
        if (text.length > 5000) { showError('Text too long. Maximum 5,000 characters.'); return; }

        $genBtn.disabled = true;
        $genBtn.innerHTML = '<svg style="animation:tts-spin 1s linear infinite" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Generating\u2026';
        if ($status)     $status.style.display      = 'flex';
        if ($player)     $player.style.display      = 'none';
        if ($browserPlay)$browserPlay.style.display = 'none';
        hideError();

        try {
            var vo        = VOICES.find(function (v) { return v.id === selectedVoice; });
            var voiceLang = vo ? (vo.lang || 'en') : 'en';
            var inputText = text;

            if ($translate && $translate.checked && voiceLang !== 'en') {
                setStatus('Translating to ' + voiceLang + '\u2026');
                inputText = await translateText(text, voiceLang);
            }

            var chunks  = splitText(inputText);
            var buffers = [];
            var useBrowser = false;

            for (var i = 0; i < chunks.length; i++) {
                setStatus('Generating audio' + (chunks.length > 1 ? ' (' + (i + 1) + '/' + chunks.length + ')' : '') + '\u2026');
                try {
                    buffers.push(await fetchChunk(chunks[i], selectedVoice));
                } catch (e) {
                    useBrowser = true;
                    break;
                }
            }

            if ($status) $status.style.display = 'none';
            resetGenBtn();

            if (buffers.length) {
                var finalBuf = buffers.length === 1 ? buffers[0] : mergeBuffers(buffers);
                if ($player) $player.style.display = 'block';
                playBuffer(finalBuf, currentSpeed);
            } else {
                useBrowserSpeech(inputText, selectedVoice, currentSpeed);
                if ($player) $player.style.display = 'block';
            }

            addToHistory(text, selectedVoice);

        } catch (e) {
            if ($status) $status.style.display = 'none';
            resetGenBtn();
            useBrowserSpeech(text, selectedVoice, currentSpeed);
            if ($player) $player.style.display = 'block';
        }
    }

    function addToHistory(text, voice) {
        var h  = loadHistory();
        var vo = VOICES.find(function (v) { return v.id === voice; });
        h.unshift({
            text:      text.slice(0, 120) + (text.length > 120 ? '\u2026' : ''),
            voice:     voice,
            voiceName: vo ? vo.flag + ' ' + vo.name : voice,
            ts:        Date.now()
        });
        saveHistory(h);
        renderHistory();
    }

    function resetGenBtn() {
        $genBtn.disabled = false;
        $genBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> Generate Audio';
    }

    if ($genBtn)   $genBtn.addEventListener('click', generate);
    if ($regenBtn) $regenBtn.addEventListener('click', generate);
    if ($clearBtn) {
        $clearBtn.addEventListener('click', function () {
            if ($text)      $text.value = '';
            if ($charCount) $charCount.textContent = '0 / 5,000 characters';
            if ($player)    $player.style.display   = 'none';
            hideError();
            lastAudioBuf = null;
        });
    }

    /* ── Helpers ── */
    function setStatus(t) { if ($statusTxt) $statusTxt.textContent = t; }
    function showError(m) { if ($error) { $error.textContent = m; $error.style.display = 'block'; } }
    function hideError()  { if ($error) $error.style.display = 'none'; }
    function escHtml(s)   { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    /* ── Spin keyframe ── */
    if (!document.getElementById('tts-spin-kf')) {
        var kf = document.createElement('style');
        kf.id  = 'tts-spin-kf';
        kf.textContent = '@keyframes tts-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
        document.head.appendChild(kf);
    }

})();
