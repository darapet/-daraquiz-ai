/* XZILY AI Studio — Chat Interface JS
   Depends on: marked.js (CDN), window.groqFetch (aqs-groq-key.js)          */
(function () {
    'use strict';

    /* ── Constants ── */
    var HISTORY_KEY    = 'dts_chat_history';
    var MAX_HISTORY    = 40;
    var MAX_CONTEXT    = 12;
    var GROQ_MODEL     = 'llama-3.1-8b-instant';

    /* ── State ── */
    var currentChatId = null;
    var messages      = [];
    var isTyping      = false;
    var attachedFile  = null;
    var attachedImage = null;
    var voiceMode     = false;
    var recognition   = null;

    /* ═══════════════════════════════════════════
       HISTORY HELPERS
       ═══════════════════════════════════════════ */

    function loadHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(e) { return []; }
    }
    function saveHistory(hist) {
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist)); } catch(e) {}
    }
    function saveCurrentChat() {
        if (!currentChatId || !messages.length) return;
        var hist  = loadHistory();
        var idx   = hist.findIndex(function(h) { return h.id === currentChatId; });
        var title = (messages[0] && messages[0].content) ? messages[0].content.substring(0, 52) : 'Chat';
        var entry = { id: currentChatId, title: title, messages: messages.slice(), timestamp: Date.now() };
        if (idx >= 0) hist[idx] = entry; else hist.unshift(entry);
        if (hist.length > MAX_HISTORY) hist = hist.slice(0, MAX_HISTORY);
        saveHistory(hist);
        renderHistoryList();
    }
    function deleteChat(id) {
        var hist = loadHistory().filter(function(h) { return h.id !== id; });
        saveHistory(hist);
        if (id === currentChatId) startNewChat();
        else renderHistoryList();
    }
    function loadChat(id) {
        var entry = loadHistory().find(function(h) { return h.id === id; });
        if (!entry) return;
        currentChatId = id;
        messages = (entry.messages || []).slice();
        renderAllMessages();
        renderHistoryList();
    }
    function startNewChat() {
        currentChatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        messages = [];
        renderWelcome();
        renderHistoryList();
    }

    /* ─ relative time ─ */
    function relTime(ts) {
        var d = Date.now() - ts;
        if (d < 60000)   return 'just now';
        if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
        if (d < 86400000)return Math.floor(d / 3600000) + 'h ago';
        return Math.floor(d / 86400000) + 'd ago';
    }

    /* ═══════════════════════════════════════════
       RENDER HISTORY LISTS
       ═══════════════════════════════════════════ */

    function renderHistoryList() {
        var history = loadHistory();

        /* ─ Sidebar list ─ */
        var list  = document.getElementById('dts-history-list');
        var empty = document.getElementById('dts-history-empty');
        if (list) {
            list.innerHTML = '';
            if (!history.length) {
                if (empty) empty.style.display = '';
            } else {
                if (empty) empty.style.display = 'none';
                history.forEach(function(entry) {
                    var item = document.createElement('div');
                    item.className = 'dts-history-item' + (entry.id === currentChatId ? ' active' : '');
                    var titleEl = document.createElement('span');
                    titleEl.className = 'dts-history-item-title';
                    titleEl.textContent = entry.title || 'Chat';
                    titleEl.title = entry.title || 'Chat';
                    var del = document.createElement('button');
                    del.className = 'dts-history-item-del';
                    del.textContent = '✕';
                    del.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (confirm('Delete this conversation?')) deleteChat(entry.id);
                    });
                    item.appendChild(titleEl);
                    item.appendChild(del);
                    item.addEventListener('click', function() { loadChat(entry.id); });
                    list.appendChild(item);
                });
            }
        }

        /* ─ Drawer list ─ */
        var drawer = document.getElementById('dts-drawer-list');
        if (!drawer) return;
        drawer.innerHTML = '';
        if (!history.length) {
            drawer.innerHTML = '<div class="dts-drawer-empty">No conversations yet — start chatting!</div>';
            return;
        }
        history.forEach(function(entry) {
            var item = document.createElement('div');
            item.className = 'dts-drawer-item' + (entry.id === currentChatId ? ' active' : '');
            item.innerHTML =
                '<span class="dts-drawer-item-icon">💬</span>' +
                '<div class="dts-drawer-item-body">' +
                    '<div class="dts-drawer-item-title">' + esc(entry.title || 'Chat') + '</div>' +
                    '<div class="dts-drawer-item-time">' + relTime(entry.timestamp || 0) + '</div>' +
                '</div>' +
                '<button class="dts-drawer-item-del" title="Delete">✕</button>';
            item.querySelector('.dts-drawer-item-del').addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm('Delete this conversation?')) deleteChat(entry.id);
            });
            item.addEventListener('click', function() { loadChat(entry.id); closeHistoryDrawer(); });
            drawer.appendChild(item);
        });
    }

    /* ═══════════════════════════════════════════
       HISTORY DRAWER
       ═══════════════════════════════════════════ */

    function openHistoryDrawer() {
        renderHistoryList();
        var drawer  = document.getElementById('dts-history-drawer');
        var overlay = document.getElementById('dts-history-overlay');
        if (drawer)  drawer.classList.add('open');
        if (overlay) overlay.classList.add('open');
    }
    function closeHistoryDrawer() {
        var drawer  = document.getElementById('dts-history-drawer');
        var overlay = document.getElementById('dts-history-overlay');
        if (drawer)  drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
    }
    function setupHistoryDrawer() {
        var histBtn = document.getElementById('dts-hist-btn');
        if (histBtn) histBtn.addEventListener('click', openHistoryDrawer);
        var cancelBtn = document.getElementById('dts-drawer-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', closeHistoryDrawer);
        var overlay = document.getElementById('dts-history-overlay');
        if (overlay) overlay.addEventListener('click', closeHistoryDrawer);
        var newBtn = document.getElementById('dts-drawer-new-btn');
        if (newBtn) newBtn.addEventListener('click', function() { startNewChat(); closeHistoryDrawer(); });
        var clearBtn = document.getElementById('dts-drawer-clear-btn');
        if (clearBtn) clearBtn.addEventListener('click', function() {
            if (confirm('Clear ALL chat history? This cannot be undone.')) {
                saveHistory([]);
                startNewChat();
                closeHistoryDrawer();
            }
        });
    }

    /* ═══════════════════════════════════════════
       UTILITIES
       ═══════════════════════════════════════════ */

    function esc(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    /* ── Inline markdown fallback (works even when marked.js CDN fails) ── */
    function _inlineMD(src) {
        if (!src) return '';
        function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
        function inlineFmt(s) {
            return s
                .replace(/`([^`
]+)`/g, '<code>$1</code>')
                .replace(/\*\*([^*
]+)\*\*/g, '<strong>$1</strong>')
                .replace(/__([^_
]+)__/g, '<strong>$1</strong>')
                .replace(/\*([^*
]+)\*/g, '<em>$1</em>')
                .replace(/_([^_
]+)_/g, '<em>$1</em>');
        }
        var lines = src.replace(/
/g,'
').split('
');
        var out = [], inCode = false, codeBuf = [], inUL = false, inOL = false;
        function flushList() {
            if (inUL) { out.push('</ul>'); inUL = false; }
            if (inOL) { out.push('</ol>'); inOL = false; }
        }
        for (var i = 0; i < lines.length; i++) {
            var ln = lines[i];
            if (/^```/.test(ln)) {
                if (!inCode) { flushList(); inCode = true; codeBuf = []; }
                else { out.push('<pre><code>' + escHtml(codeBuf.join('
')) + '</code></pre>'); inCode = false; codeBuf = []; }
                continue;
            }
            if (inCode) { codeBuf.push(ln); continue; }
            var hm = ln.match(/^(#{1,4})\s+(.*)/);
            if (hm) { flushList(); var hn = hm[1].length; out.push('<h'+hn+'>'+inlineFmt(hm[2])+'</h'+hn+'>'); continue; }
            if (/^---+$/.test(ln.trim())) { flushList(); out.push('<hr>'); continue; }
            var ulm = ln.match(/^[\-\*\+]\s+(.*)/);
            if (ulm) { if (!inUL) { if(inOL){out.push('</ol>');inOL=false;} out.push('<ul>'); inUL = true; } out.push('<li>'+inlineFmt(ulm[1])+'</li>'); continue; }
            var olm = ln.match(/^\d+\.\s+(.*)/);
            if (olm) { if (!inOL) { if(inUL){out.push('</ul>');inUL=false;} out.push('<ol>'); inOL = true; } out.push('<li>'+inlineFmt(olm[1])+'</li>'); continue; }
            flushList();
            if (ln.trim() === '') { out.push('<br>'); continue; }
            out.push('<p>'+inlineFmt(ln)+'</p>');
        }
        flushList();
        if (inCode && codeBuf.length) out.push('<pre><code>'+escHtml(codeBuf.join('
'))+'</code></pre>');
        return out.join('');
    }

    var markedReady = false;
    function setupMarked() {
        if (typeof marked !== 'undefined') {
            try { marked.setOptions({ breaks: true, gfm: true }); } catch(e) {}
            markedReady = true;
        }
    }
    function renderMD(text) {
        if (markedReady && typeof marked !== 'undefined') {
            try { return marked.parse(text); } catch(e) {}
        }
        /* Fallback: inline renderer — handles code blocks, headings, bold, lists */
        return _inlineMD(text);
    }
    function runKatex(el) {
        if (typeof renderMathInElement !== 'function') return;
        try {
            renderMathInElement(el, {
                delimiters: [{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],
                throwOnError: false
            });
        } catch(e) {}
    }

    /* ═══════════════════════════════════════════
       WELCOME SCREEN
       ═══════════════════════════════════════════ */

    function renderWelcome() {
        var msgs = document.getElementById('dts-messages');
        if (!msgs) return;
        msgs.innerHTML =
            '<div class="dts-welcome" id="dts-welcome">' +
                '<div class="dts-welcome-icon">' +
                    '<svg width="56" height="56" viewBox="0 0 36 36" fill="none">' +
                    '<polygon points="18,2 34,10 34,26 18,34 2,26 2,10" fill="#6366f1" opacity="0.9"/>' +
                    '<polygon points="18,8 28,13 28,23 18,28 8,23 8,13" fill="white" opacity="0.15"/>' +
                    '<circle cx="18" cy="18" r="5" fill="white"/></svg>' +
                '</div>' +
                '<h1 class="dts-welcome-title">What can I help you with?</h1>' +
                '<p class="dts-welcome-sub">Ask me anything — I can answer questions, explain topics, help you study, create content, and more.</p>' +
                '<div class="dts-suggestions" id="dts-suggestions">' +
                    '<button class="dts-suggestion-btn" data-text="Generate 10 multiple choice questions on human body systems for grade 10">📝 Generate quiz questions for me</button>' +
                    '<button class="dts-suggestion-btn" data-text="Explain the difference between mitosis and meiosis in simple terms">🔬 Explain a science concept</button>' +
                    '<button class="dts-suggestion-btn" data-text="Write a short essay outline on climate change and its effects on agriculture">✍️ Help me write an essay</button>' +
                    '<button class="dts-suggestion-btn" data-text="Create a study plan for a mathematics exam covering algebra and geometry">📚 Make a study plan</button>' +
                '</div>' +
            '</div>';
    }

    /* ═══════════════════════════════════════════
       MESSAGE RENDERING
       ═══════════════════════════════════════════ */

    function renderAllMessages() {
        var msgs = document.getElementById('dts-messages');
        if (!msgs) return;
        msgs.innerHTML = '';
        if (!messages.length) { renderWelcome(); return; }
        messages.forEach(function(m) {
            if (m.role === 'system') return;
            appendMessage(m.role === 'user' ? 'user' : 'ai', m.content);
        });
        msgs.scrollTop = msgs.scrollHeight;
    }

    /* ═══════════════════════════════════════════
       STREAMING ANIMATION — types out AI responses word by word
       ═══════════════════════════════════════════ */
    function animateResponse(wrapEl, fullText) {
        return new Promise(function(resolve) {
            if (!wrapEl) { resolve(); return; }
            var bubble = wrapEl.querySelector('.dts-msg-bubble');
            if (!bubble) { resolve(); return; }

            var CHUNK = 4;   /* words per tick */
            var DELAY = 18;  /* ms between ticks — feels natural */
            var words  = fullText.split(/( +|
)/); /* split on spaces/newlines, keep them */
            var idx    = 0;
            var built  = '';

            var msgs = document.getElementById('dts-messages');

            function tick() {
                var end = Math.min(idx + CHUNK, words.length);
                for (var i = idx; i < end; i++) built += words[i];
                idx = end;

                /* Render markdown every tick — fast enough to look smooth */
                bubble.innerHTML = renderMD(built) +
                    (idx < words.length
                        ? '<span style="display:inline-block;width:2px;height:0.9em;background:currentColor;' +
                          'opacity:0.8;vertical-align:text-bottom;animation:aqs-cursor-blink .65s step-end infinite;"></span>'
                        : '');

                if (msgs) msgs.scrollTop = msgs.scrollHeight;

                if (idx < words.length) {
                    setTimeout(tick, DELAY);
                } else {
                    /* Final clean render */
                    bubble.innerHTML = renderMD(fullText);
                    runKatex(bubble);
                    /* Re-attach copy button */
                    var actions = wrapEl.querySelector('.dts-msg-actions');
                    if (actions) {
                        var copyBtn = actions.querySelector('.dts-copy-btn');
                        if (copyBtn && !copyBtn._bound) {
                            copyBtn._bound = true;
                            copyBtn.addEventListener('click', function() {
                                navigator.clipboard.writeText(fullText).then(function() {
                                    copyBtn.textContent = 'Copied!';
                                    setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1500);
                                }).catch(function() {});
                            });
                        }
                    }
                    if (msgs) msgs.scrollTop = msgs.scrollHeight;
                    resolve();
                }
            }

            /* Start immediately */
            setTimeout(tick, 0);
        });
    }

    function appendMessage(role, content) {
        var msgs = document.getElementById('dts-messages');
        if (!msgs) return null;
        var welcome = document.getElementById('dts-welcome');
        if (welcome) welcome.style.display = 'none';

        var wrap = document.createElement('div');
        wrap.className = 'dts-message ' + (role === 'user' ? 'dts-user' : 'dts-ai');

        var avatarHtml = role === 'user'
            ? '<div class="dts-msg-avatar" style="background:#6366f1;color:#fff;font-size:0.85rem;font-weight:700;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">U</div>'
            : '<div class="dts-msg-avatar" style="background:#0f172a;color:#fff;font-size:1rem;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">⬡</div>';

        var bubbleHtml = role === 'ai' ? renderMD(content) : esc(content).replace(/\n/g, '<br>');

        wrap.innerHTML =
            avatarHtml +
            '<div class="dts-msg-content">' +
                '<div class="dts-msg-bubble">' + bubbleHtml + '</div>' +
                (role === 'ai' ? '<div class="dts-msg-actions"><button class="dts-copy-btn">Copy</button></div>' : '') +
            '</div>';

        var bubble = wrap.querySelector('.dts-msg-bubble');
        if (bubble && role === 'ai') runKatex(bubble);

        var copyBtn = wrap.querySelector('.dts-copy-btn');
        if (copyBtn && content) {
            (function(text) {
                copyBtn.addEventListener('click', function() {
                    navigator.clipboard.writeText(text).then(function() {
                        copyBtn.textContent = 'Copied!';
                        setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1500);
                    }).catch(function() {});
                });
            })(content);
        }

        msgs.appendChild(wrap);
        msgs.scrollTop = msgs.scrollHeight;
        return wrap;
    }

    /* ═══════════════════════════════════════════
       AI API CALLS
       ═══════════════════════════════════════════ */

    var _URL_RE = /https?:\/\/[^\s"'<>\]]+/i;

    async function enrichUrl(text) {
        var m = text.match(_URL_RE);
        if (!m) return text;
        try {
            var ctrl = new AbortController();
            setTimeout(function() { ctrl.abort(); }, 15000);
            var res = await fetch('https://r.jina.ai/' + m[0], {
                headers: { 'Accept': 'text/plain', 'X-No-Cache': 'true' },
                signal: ctrl.signal
            });
            if (!res.ok) return text;
            var body = (await res.text()).substring(0, 4000);
            return text + '\n\n[Web page content from ' + m[0] + ']:\n' + body;
        } catch(e) { return text; }
    }

    function getSystemPrompt() {
        return 'You are an expert AI assistant called AI Studio, created by XZILY AI (Darapet Technology). ' +
               'You help students, teachers, and professionals with questions, explanations, writing, quiz creation, and more. ' +
               'Format responses with Markdown (headings, bold, lists, code blocks). ' +
               'For math use LaTeX: inline $expr$ or display $$expr$$. ' +
               'When generating quiz questions, output ONLY valid JSON: ' +
               '{"questions":[{"question":"...","options":["A","B","C","D"],"correct_answer_index":0,"explanation":"..."}]}';
    }

    async function callGroq(context) {
        if (!window.groqFetch) return null;
        var hasKey = false;
        try {
            var personal = localStorage.getItem('aqs_groq_key') || '';
            hasKey = (personal && personal.startsWith('gsk_')) ||
                     (window._AQS_GROQ_MASTER_KEYS && window._AQS_GROQ_MASTER_KEYS.length > 0);
        } catch(e) {}
        if (!hasKey) return null;

        try {
            var res = await window.groqFetch({ model: GROQ_MODEL, messages: context, max_tokens: 2048, temperature: 0.7, stream: false });
            if (!res.ok) return null;
            var data = await res.json();
            return (((data.choices || [])[0] || {}).message || {}).content || null;
        } catch(e) { return null; }
    }

    /* Groq fallback with alternate models */
    async function callGroqFallback(context) {
        if (typeof window.groqFetch !== 'function') return null;
        var FALLBACK_MODELS = ['llama-3.1-70b-versatile', 'llama-3.3-70b-versatile', 'gemma2-9b-it'];
        for (var mi = 0; mi < FALLBACK_MODELS.length; mi++) {
            try {
                var ctrl = new AbortController();
                setTimeout(function() { ctrl.abort(); }, 25000);
                var res = await window.groqFetch(
                    { model: FALLBACK_MODELS[mi], messages: context, temperature: 0.7, max_tokens: 2048 },
                    { signal: ctrl.signal }
                );
                if (!res.ok) continue;
                var data = await res.json();
                var text = (((data.choices || [])[0] || {}).message || {}).content || '';
                if (text.trim().length >= 3) return text.trim();
            } catch(e) { /* try next */ }
        }
        return null;
    }

    async function waitForGroqKeys(ms) {
        if (window._AQS_GROQ_MASTER_KEYS && window._AQS_GROQ_MASTER_KEYS.length) return;
        var waited = 0;
        while (waited < ms) {
            await new Promise(function(r) { setTimeout(r, 300); });
            waited += 300;
            if (window._AQS_GROQ_MASTER_KEYS && window._AQS_GROQ_MASTER_KEYS.length) return;
        }
    }

    /* ═══════════════════════════════════════════
       SEND MESSAGE
       ═══════════════════════════════════════════ */

    async function sendMessage(userText, imageDataUrl) {
        var text = (userText || '').trim();
        if (!text && !attachedFile && !imageDataUrl) return;

        var aiText = text;

        /* Enrich URLs */
        if (_URL_RE.test(aiText)) {
            setTyping(true);
            aiText = await enrichUrl(aiText);
        }

        /* Append file context */
        if (attachedFile) {
            aiText += '\n\n[Attached: ' + attachedFile.name + ']\n' + attachedFile.content.substring(0, 6000);
        }

        /* Show user message */
        if (imageDataUrl) {
            var wrap = appendMessage('user', text || '(image)');
            if (wrap) {
                var bubble = wrap.querySelector('.dts-msg-bubble');
                if (bubble) {
                    bubble.innerHTML = '<div class="dts-msg-img-wrap"><img style="max-width:min(260px,72vw);max-height:200px;border-radius:10px;object-fit:cover;display:block;border:1px solid rgba(255,255,255,0.25);" src="' + imageDataUrl + '" alt="image"></div>' +
                        (text ? esc(text).replace(/\n/g,'<br>') : '');
                }
            }
        } else {
            appendMessage('user', text);
        }

        messages.push({ role: 'user', content: aiText || text });

        var input = document.getElementById('dts-input');
        if (input) { input.value = ''; input.style.height = ''; input.dispatchEvent(new Event('input')); }
        clearAttachedFile();
        clearAttachedImage();

        setTyping(true);
        await waitForGroqKeys(4000);

        /* Build context */
        var context = [{ role: 'system', content: getSystemPrompt() }];
        messages.slice(-MAX_CONTEXT).forEach(function(m) {
            if (m.role !== 'system') context.push({ role: m.role, content: m.content });
        });

        try {
            var reply = await callGroq(context);
            if (!reply) reply = await callGroqFallback(context);
            if (!reply) throw new Error('No response received. Check your Groq API keys in js/aqs-groq-key.js');

            setTyping(false);
            /* Animate the AI response word-by-word so it feels live */
            var aiWrap = appendMessage('ai', '');
            await animateResponse(aiWrap, reply);
            messages.push({ role: 'assistant', content: reply });
            saveCurrentChat();

            /* Check for quiz JSON */
            tryDetectQuiz(reply);

            /* TTS in voice mode */
            if (voiceMode) speakReply(reply);

        } catch(e) {
            setTyping(false);
            appendMessage('ai', '⚠️ **Error:** ' + (e.message || 'Something went wrong. Please try again.'));
        }
    }

    /* ═══════════════════════════════════════════
       QUIZ IMPORT DETECTION
       ═══════════════════════════════════════════ */

    function tryDetectQuiz(text) {
        try {
            var cleaned = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
            var start = Math.max(cleaned.indexOf('{'), cleaned.indexOf('['));
            if (start < 0) return;
            cleaned = cleaned.substring(start);
            var parsed = null;
            var om = cleaned.match(/\{[\s\S]*\}/);
            if (om) { try { parsed = JSON.parse(om[0]); } catch(_) {} }
            if (!parsed || !parsed.questions) {
                var am = cleaned.match(/\[[\s\S]*\]/);
                if (am) { var arr = JSON.parse(am[0]); if (Array.isArray(arr)) parsed = { questions: arr }; }
            }
            if (!parsed || !Array.isArray(parsed.questions)) return;
            var qs = parsed.questions.filter(function(q) {
                return q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length >= 2;
            });
            if (!qs.length) return;
            showImportBanner(qs);
        } catch(e) {}
    }

    function showImportBanner(questions) {
        var banner = document.getElementById('dts-import-banner');
        var desc   = document.getElementById('dts-import-desc');
        if (!banner) return;
        if (desc) desc.textContent = questions.length + ' question' + (questions.length !== 1 ? 's' : '') + ' generated — send to Create Quiz.';
        banner.classList.add('visible');
        var btn = document.getElementById('dts-import-use-btn');
        if (btn) btn.onclick = function() {
            try { sessionStorage.setItem('aqs_studio_import', JSON.stringify({ questions: questions })); } catch(e) {}
            window.location.href = 'create-quiz.html';
        };
    }

    /* ═══════════════════════════════════════════
       TYPING + SEND STATE
       ═══════════════════════════════════════════ */

    function setTyping(show) {
        isTyping = show;
        var t = document.getElementById('dts-typing');
        if (t) t.style.display = show ? 'flex' : 'none';
        updateSendBtn();
        if (show) {
            var msgs = document.getElementById('dts-messages');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }
    }

    function updateSendBtn() {
        var input  = document.getElementById('dts-input');
        var sendBtn= document.getElementById('dts-send');
        if (sendBtn) {
            sendBtn.disabled = isTyping || ((!input || !input.value.trim()) && !attachedFile && !attachedImage);
        }
    }

    /* ═══════════════════════════════════════════
       INPUT SETUP
       ═══════════════════════════════════════════ */

    function setupInput() {
        var input  = document.getElementById('dts-input');
        var sendBtn= document.getElementById('dts-send');
        if (!input || !sendBtn) return;

        input.addEventListener('input', function() {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 180) + 'px';
            updateSendBtn();
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) doSend(); }
        });
        sendBtn.addEventListener('click', function() { if (!sendBtn.disabled) doSend(); });
    }

    function doSend() {
        var input = document.getElementById('dts-input');
        sendMessage(input ? input.value : '', attachedImage ? attachedImage.dataUrl : null);
    }

    /* ═══════════════════════════════════════════
       SUGGESTIONS
       ═══════════════════════════════════════════ */

    function setupSuggestions() {
        document.addEventListener('click', function(e) {
            var btn = e.target.closest('.dts-suggestion-btn');
            if (!btn) return;
            var text  = btn.dataset.text || btn.textContent.trim();
            var input = document.getElementById('dts-input');
            if (input) { input.value = text; input.dispatchEvent(new Event('input')); input.focus(); }
        });
    }

    /* ═══════════════════════════════════════════
       SIDEBAR
       ═══════════════════════════════════════════ */

    function setupSidebar() {
        var toggle  = document.getElementById('aqs-sidebar-toggle');
        var sidebar = document.getElementById('dts-sidebar');
        var overlay = document.getElementById('dts-overlay');
        if (!toggle || !sidebar) return;
        toggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            if (overlay) overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
        });
        if (overlay) overlay.addEventListener('click', function() {
            sidebar.classList.remove('open');
            overlay.style.display = 'none';
        });
    }

    /* ═══════════════════════════════════════════
       NEW CHAT BUTTON
       ═══════════════════════════════════════════ */

    function setupNewChat() {
        var btn = document.getElementById('dts-new-chat');
        if (btn) btn.addEventListener('click', startNewChat);
    }

    /* ═══════════════════════════════════════════
       FILE UPLOAD
       ═══════════════════════════════════════════ */

    function clearAttachedFile() {
        attachedFile = null;
        var s = document.getElementById('dts-file-status');
        if (s) s.style.display = 'none';
        var i = document.getElementById('dts-file-input');
        if (i) i.value = '';
        updateSendBtn();
    }
    function clearAttachedImage() {
        attachedImage = null;
        var w = document.getElementById('dts-img-preview-wrap');
        if (w) w.style.display = 'none';
        var i = document.getElementById('dts-img-input');
        if (i) i.value = '';
        updateSendBtn();
    }

    async function extractText(file) {
        if (file.type === 'text/plain' || /\.(txt|md|csv)$/i.test(file.name)) {
            return new Promise(function(resolve, reject) {
                var r = new FileReader();
                r.onload  = function(e) { resolve(e.target.result || ''); };
                r.onerror = function()  { reject(new Error('Cannot read file.')); };
                r.readAsText(file);
            });
        }
        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
            return new Promise(function(resolve, reject) {
                var r = new FileReader();
                r.onload = async function(e) {
                    try {
                        if (typeof pdfjsLib === 'undefined') { resolve('[PDF: ' + file.name + ' — content not extracted]'); return; }
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                        var pdf = await pdfjsLib.getDocument({ data: e.target.result }).promise;
                        var pages = [];
                        for (var i = 1; i <= Math.min(pdf.numPages, 20); i++) {
                            var page = await pdf.getPage(i);
                            var tc = await page.getTextContent();
                            pages.push(tc.items.map(function(it) { return it.str; }).join(' '));
                        }
                        resolve(pages.join('\n\n'));
                    } catch(err) { reject(err); }
                };
                r.onerror = function() { reject(new Error('Cannot read PDF.')); };
                r.readAsArrayBuffer(file);
            });
        }
        if (/\.(docx?)$/i.test(file.name)) {
            return new Promise(function(resolve, reject) {
                var r = new FileReader();
                r.onload = async function(e) {
                    try {
                        if (typeof mammoth === 'undefined') { resolve('[Document: ' + file.name + ']'); return; }
                        var result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
                        resolve(result.value || '');
                    } catch(err) { reject(err); }
                };
                r.onerror = function() { reject(new Error('Cannot read document.')); };
                r.readAsArrayBuffer(file);
            });
        }
        return '[File attached: ' + file.name + ']';
    }

    function setupFileUpload() {
        var fileBtn   = document.getElementById('dts-file-btn');
        var fileInput = document.getElementById('dts-file-input');
        var fileClear = document.getElementById('dts-file-clear');
        if (fileBtn && fileInput) {
            fileBtn.addEventListener('click', function() { fileInput.click(); });
            fileInput.addEventListener('change', async function() {
                var file = fileInput.files[0];
                if (!file) return;
                var statusEl = document.getElementById('dts-file-status');
                var nameEl   = document.getElementById('dts-file-name');
                if (statusEl) statusEl.style.display = 'flex';
                if (nameEl)   nameEl.textContent = 'Reading ' + file.name + '…';
                try {
                    var text = await extractText(file);
                    attachedFile = { name: file.name, content: text };
                    if (nameEl) nameEl.textContent = '📎 ' + file.name;
                    updateSendBtn();
                } catch(e) {
                    if (statusEl) statusEl.style.display = 'none';
                    alert('Could not read file: ' + e.message);
                }
            });
        }
        if (fileClear) fileClear.addEventListener('click', clearAttachedFile);

        var imgBtn   = document.getElementById('dts-img-btn');
        var imgInput = document.getElementById('dts-img-input');
        var imgClear = document.getElementById('dts-img-clear');
        if (imgBtn && imgInput) {
            imgBtn.addEventListener('click', function() { imgInput.click(); });
            imgInput.addEventListener('change', function() {
                var file = imgInput.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function(e) {
                    attachedImage = { name: file.name, dataUrl: e.target.result };
                    var wrap  = document.getElementById('dts-img-preview-wrap');
                    var thumb = document.getElementById('dts-img-preview-thumb');
                    var label = document.getElementById('dts-img-preview-label');
                    if (wrap)  wrap.style.display = 'flex';
                    if (thumb) thumb.src = e.target.result;
                    if (label) label.textContent = file.name;
                    updateSendBtn();
                };
                reader.readAsDataURL(file);
            });
        }
        if (imgClear) imgClear.addEventListener('click', clearAttachedImage);
    }

    /* ═══════════════════════════════════════════
       VOICE MODE
       ═══════════════════════════════════════════ */

    function setupVoice() {
        var voiceBtn  = document.getElementById('dts-voice-btn');
        var voiceClose= document.getElementById('dts-voice-close');
        var voiceEnd  = document.getElementById('dts-voice-end');
        var voiceToggle=document.getElementById('dts-voice-toggle');
        if (voiceBtn)   voiceBtn.addEventListener('click', openVoice);
        if (voiceClose) voiceClose.addEventListener('click', closeVoice);
        if (voiceEnd)   voiceEnd.addEventListener('click', closeVoice);
        if (voiceToggle) voiceToggle.addEventListener('click', function() {
            if (recognition && voiceMode) { try { recognition.stop(); } catch(e) {} }
            else startListening();
        });
        var vtSend = document.getElementById('dts-voice-text-send');
        var vtInput= document.getElementById('dts-voice-text-fallback');
        if (vtSend && vtInput) {
            function sendFallback() {
                var t = (vtInput.value || '').trim();
                if (!t) return;
                vtInput.value = '';
                closeVoice();
                sendMessage(t, null);
            }
            vtSend.addEventListener('click', sendFallback);
            vtInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); sendFallback(); } });
        }
    }

    function openVoice() {
        var overlay = document.getElementById('dts-voice-overlay');
        if (overlay) overlay.style.display = 'flex';
        voiceMode = true;
        setVoiceState('idle');
        var hasSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
        if (!hasSpeech) {
            var tf = document.getElementById('dts-voice-text-fallback');
            var ts = document.getElementById('dts-voice-text-send');
            var fn = document.getElementById('dts-voice-fallback-note');
            if (tf) tf.style.display = 'block';
            if (ts) ts.style.display = 'block';
            if (fn) fn.style.display = 'block';
        } else {
            startListening();
        }
    }
    function closeVoice() {
        voiceMode = false;
        if (recognition) { try { recognition.stop(); } catch(e) {} recognition = null; }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        var overlay = document.getElementById('dts-voice-overlay');
        if (overlay) overlay.style.display = 'none';
    }
    function setVoiceState(state) {
        var orb    = document.getElementById('dts-voice-orb');
        var status = document.getElementById('dts-voice-status');
        var toggle = document.getElementById('dts-voice-toggle');
        if (orb) orb.dataset.state = state;
        var labels = { idle:'Tap to start', listening:'Listening…', thinking:'Thinking…', speaking:'Speaking…', error:'Error — tap to retry' };
        if (status) status.textContent = labels[state] || state;
        if (toggle) toggle.textContent = state === 'listening' ? '⏸ Pause' : '🎙 Start Listening';
    }
    function startListening() {
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        setVoiceState('listening');
        recognition.onresult = function(e) {
            var t = '';
            for (var i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
            var el = document.getElementById('dts-voice-transcript');
            if (el) el.textContent = t;
            if (e.results[e.results.length - 1].isFinal && t.trim()) {
                var overlay = document.getElementById('dts-voice-overlay');
                if (overlay) overlay.style.display = 'none';
                sendMessage(t.trim(), null);
            }
        };
        recognition.onerror = function() { setVoiceState('error'); };
        recognition.onend   = function() { if (voiceMode) setTimeout(startListening, 500); };
        try { recognition.start(); } catch(e) { setVoiceState('error'); }
    }
    function speakReply(text) {
        if (!('speechSynthesis' in window)) return;
        var plain = text.replace(/```[\s\S]*?```/g,'').replace(/[*_#>`]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').substring(0, 500);
        var utt = new SpeechSynthesisUtterance(plain);
        utt.lang = 'en-US';
        utt.rate = 1.0;
        utt.onend = function() { if (voiceMode) { setVoiceState('listening'); startListening(); } };
        window.speechSynthesis.speak(utt);
        setVoiceState('speaking');
    }

    /* ═══════════════════════════════════════════
       AUTH STATE — update sidebar user info
       ═══════════════════════════════════════════ */

    function setupUserInfo() {
        document.addEventListener('aqsAuthReady', function(e) {
            var user = e.detail;
            if (!user) return;
            var av = document.getElementById('dts-user-avatar');
            var nm = document.getElementById('dts-user-name');
            var rl = document.getElementById('dts-user-role');
            if (av) av.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();
            if (nm) nm.textContent = user.displayName || user.email || 'User';
            if (rl) rl.textContent = user.role || 'member';
        });
    }

    /* ═══════════════════════════════════════════
       INIT
       ═══════════════════════════════════════════ */

    function init() {
        [setupMarked, setupInput, setupSidebar, setupSuggestions,
         setupNewChat, setupFileUpload, setupVoice, renderHistoryList,
         setupHistoryDrawer, setupUserInfo].forEach(function(fn) {
            try { fn(); } catch(e) { console.warn('Studio init:', fn.name, e); }
        });

        currentChatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        messages = [];
        renderWelcome();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
