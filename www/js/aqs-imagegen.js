/* AI Quiz System — Image Generator
   Images:  Hugging Face Inference API (primary — high quality, no watermarks)
   Text AI: Groq AI (prompt enhancement — fast & reliable)
   Gallery: Firebase Firestore (saved images, cross-device)
   Developed by Omomo Excellence in corporation with Darapet Technology */
(function () {
    'use strict';

    var selectedStyle = '';
    var lastPrompt    = '';
    var history       = [];

    var IG_HISTORY_KEY = 'aqs_ig_history';

    function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
    function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

    /* ── DOM refs ── */
    var $wrap = document.getElementById('aqs-imagegen-wrap');
    if (!$wrap) return;

    var $promptTA  = document.getElementById('aqs-ig-prompt');
    var $genBtn    = document.getElementById('aqs-ig-generate-btn');
    var $enhBtn    = document.getElementById('aqs-ig-enhance-btn');
    var $clearBtn  = document.getElementById('aqs-ig-clear-btn');
    var $status    = document.getElementById('aqs-ig-status');
    var $statusTxt = document.getElementById('aqs-ig-status-text');
    var $error     = document.getElementById('aqs-ig-error');
    var $results   = document.getElementById('aqs-ig-results');
    var $grid      = document.getElementById('aqs-ig-grid');
    var $histSec   = document.getElementById('aqs-ig-history-section');
    var $histGrid  = document.getElementById('aqs-ig-history-grid');
    var $lb        = document.getElementById('aqs-ig-lightbox');
    var $lbOvr     = document.getElementById('aqs-ig-lb-overlay');
    var $lbImg     = document.getElementById('aqs-ig-lb-img');
    var $lbDl      = document.getElementById('aqs-ig-lb-download');
    var $lbRegen   = document.getElementById('aqs-ig-lb-regen');
    var $lbPrompt  = document.getElementById('aqs-ig-lb-prompt');
    var $lbClose   = document.getElementById('aqs-ig-lb-close');
    var $dlAll     = document.getElementById('aqs-ig-download-all');
    var $clrHist   = document.getElementById('aqs-ig-clear-history');
    var $presets   = document.querySelectorAll('.aqs-ig-preset');
    var $sizeEl    = document.getElementById('aqs-ig-size');
    var $qualEl    = document.getElementById('aqs-ig-quality');
    var $countEl   = document.getElementById('aqs-ig-count');

    /* ── Style preset selection ── */
    $presets.forEach(function (btn) {
        btn.addEventListener('click', function () {
            $presets.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            selectedStyle = btn.getAttribute('data-style') || '';
        });
    });

    /* ── Load history ── */
    history = lsGet(IG_HISTORY_KEY, []);
    renderHistory();

    /* ═══════════════════════════════════════════════════════════
       GALLERY — Firebase Firestore (cross-device saved images)
       ═══════════════════════════════════════════════════════════ */
    var gallerySection = null;
    var galleryGrid    = null;

    function buildGallerySection() {
        if (document.getElementById('aqs-ig-gallery-section')) return;

        var sec = document.createElement('div');
        sec.id = 'aqs-ig-gallery-section';
        sec.className = 'aqs-imagegen-history-section';
        sec.style.cssText = 'margin-top:32px;display:none;';
        sec.innerHTML =
            '<div class="aqs-ig-history-header">' +
                '<h3 style="display:flex;align-items:center;gap:8px;">❤ My Gallery <span id="aqs-ig-gallery-count" style="font-size:0.75rem;font-weight:500;color:#94a3b8;"></span></h3>' +
                '<div style="display:flex;gap:8px;">' +
                    '<button id="aqs-ig-gallery-refresh" style="background:rgba(99,102,241,0.08);border:1.5px solid rgba(99,102,241,0.25);color:#6366f1;border-radius:8px;padding:5px 12px;font-size:0.8rem;font-weight:600;cursor:pointer;">↺ Refresh</button>' +
                '</div>' +
            '</div>' +
            '<div id="aqs-ig-gallery-grid" class="aqs-ig-grid"></div>' +
            '<div id="aqs-ig-gallery-empty" style="display:none;text-align:center;padding:32px 16px;color:#94a3b8;font-size:0.9rem;">' +
                '<div style="font-size:2rem;margin-bottom:8px;">🖼</div>' +
                'No saved images yet. Click ❤ Save on any generated image to add it here.' +
            '</div>';

        $wrap.appendChild(sec);
        gallerySection = sec;
        galleryGrid    = document.getElementById('aqs-ig-gallery-grid');

        document.getElementById('aqs-ig-gallery-refresh').addEventListener('click', loadGallery);
    }

    function loadGallery() {
        buildGallerySection();
        var user = window._aqsFirebaseUser;
        if (!user) { gallerySection.style.display = 'none'; return; }

        gallerySection.style.display = 'block';
        galleryGrid.innerHTML = '<div style="color:#94a3b8;font-size:0.88rem;padding:16px 0;">Loading gallery…</div>';
        document.getElementById('aqs-ig-gallery-empty').style.display = 'none';

        if (typeof window.aqsAjax !== 'function') return;

        window.aqsAjax({ action: 'aqs_get_gallery_images' }, function (res) {
            galleryGrid.innerHTML = '';
            var items = (res && res.success && res.data && res.data.images) ? res.data.images : [];
            var countEl = document.getElementById('aqs-ig-gallery-count');
            if (countEl) countEl.textContent = items.length ? '(' + items.length + ')' : '';

            if (!items.length) {
                document.getElementById('aqs-ig-gallery-empty').style.display = 'block';
                return;
            }
            items.forEach(function (item) {
                renderGalleryCard(item);
            });
        }, function () {
            galleryGrid.innerHTML = '<div style="color:#ef4444;font-size:0.88rem;padding:16px 0;">Could not load gallery. Please try again.</div>';
        });
    }

    function renderGalleryCard(item) {
        var card = document.createElement('div');
        card.className = 'aqs-ig-card aqs-ig-hist-card';
        card.dataset.galleryId = item.id || '';
        card.innerHTML =
            '<img src="' + escHtml(item.url) + '" alt="" loading="lazy">' +
            '<div class="aqs-ig-card-actions" style="flex-direction:column;align-items:flex-start;gap:5px;">' +
                '<span class="aqs-ig-hist-prompt">' + escHtml(item.rawPrompt || '') + '</span>' +
                '<div style="display:flex;gap:6px;">' +
                    '<button class="aqs-btn aqs-btn-sm aqs-ig-view-btn" style="background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.75rem;">View</button>' +
                    '<button class="aqs-btn aqs-btn-sm aqs-ig-gallery-del-btn" style="background:rgba(239,68,68,0.2);color:#fca5a5;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.75rem;">🗑 Remove</button>' +
                '</div>' +
            '</div>';

        card.querySelector('.aqs-ig-view-btn').addEventListener('click', function () {
            openLightbox(item.url, item.rawPrompt || '');
        });
        card.querySelector('.aqs-ig-gallery-del-btn').addEventListener('click', function () {
            if (!confirm('Remove this image from your gallery?')) return;
            deleteGalleryImage(item.id, card);
        });

        galleryGrid.appendChild(card);
    }

    function saveToGallery(url, rawPrompt, saveBtn) {
        var user = window._aqsFirebaseUser;
        if (!user) {
            alert('Please sign in to save images to your gallery.');
            return;
        }
        if (typeof window.aqsAjax !== 'function') return;

        saveBtn.disabled = true;
        saveBtn.textContent = '💾 Saving…';

        window.aqsAjax(
            { action: 'aqs_save_gallery_image', url: url, rawPrompt: rawPrompt },
            function (res) {
                if (res && res.success) {
                    saveBtn.textContent = '❤ Saved!';
                    saveBtn.style.background = 'rgba(34,197,94,0.2)';
                    saveBtn.style.color = '#4ade80';
                    saveBtn.style.border = '1px solid rgba(34,197,94,0.3)';
                    /* Refresh gallery if it's visible */
                    if (gallerySection && gallerySection.style.display !== 'none') loadGallery();
                } else {
                    saveBtn.disabled = false;
                    saveBtn.textContent = '❤ Save';
                }
            },
            function () {
                saveBtn.disabled = false;
                saveBtn.textContent = '❤ Save';
            }
        );
    }

    function deleteGalleryImage(id, cardEl) {
        if (!id || typeof window.aqsAjax !== 'function') return;
        window.aqsAjax({ action: 'aqs_delete_gallery_image', id: id }, function (res) {
            if (res && res.success) {
                cardEl.style.transition = 'opacity 0.3s';
                cardEl.style.opacity = '0';
                setTimeout(function () { cardEl.remove(); }, 300);
                /* Update count */
                var remaining = galleryGrid.querySelectorAll('.aqs-ig-card').length;
                var countEl = document.getElementById('aqs-ig-gallery-count');
                if (countEl) countEl.textContent = remaining > 1 ? '(' + (remaining - 1) + ')' : '';
                if (remaining <= 1) document.getElementById('aqs-ig-gallery-empty').style.display = 'block';
            }
        });
    }

    /* Load gallery once Firebase auth resolves */
    document.addEventListener('aqs:authchange', function (ev) {
        var user = ev.detail && ev.detail.user;
        if (user) {
            buildGallerySection();
            gallerySection.style.display = 'block';
            loadGallery();
        } else {
            if (gallerySection) gallerySection.style.display = 'none';
        }
    });

    /* ─────────────────────────────────────────────────────────────
       SMART PROMPT BUILDER
    ───────────────────────────────────────────────────────────── */
    var DESIGN_RE = /\b(flyer|flier|banner|poster|obituar|memorial|tribute|funeral|invitation|invite|card|thumbnail|logo|certificate|brochure|menu|social.?media|instagram|facebook|print|leaflet|handout|signage|billboard|coupon|voucher|ad\b|advert|promotional|event.?graphic|cover.?page|announcement|pamphlet|booklet)\b/i;

    var PHOTO_SUFFIX = [
        'ultra-realistic professional photography',
        'shot on Sony A7R V with 85mm f/1.4 lens',
        'natural cinematic lighting',
        'sharp focus tack-sharp detail',
        '8K RAW photo HDR',
        'studio-quality color grading',
        'masterpiece composition'
    ].join(', ');

    var DESIGN_SUFFIX = [
        'professional graphic design',
        'print-ready quality',
        'clean crisp layout',
        'bold typography',
        'vibrant well-balanced colors',
        'sharp vector-quality edges',
        'high-resolution output'
    ].join(', ');

    var DESIGN_TYPE_SUFFIX = {
        flyer:      'eye-catching flyer design, bold headline text, vivid colors, promotional layout, print-quality',
        banner:     'professional banner design, bold imagery, high-contrast text, wide-format layout, premium finish',
        poster:     'dramatic poster design, large-format print quality, impactful typography, cinematic composition',
        obituary:   'dignified memorial design, soft muted elegant tones, serif typography, respectful layout, tasteful border',
        memorial:   'dignified memorial design, soft muted elegant tones, serif typography, respectful layout, tasteful border',
        tribute:    'heartfelt tribute design, warm tones, elegant typography, emotive composition',
        funeral:    'dignified funeral program design, dark muted tones, formal serif font, respectful solemn layout',
        invitation: 'elegant invitation design, decorative flourishes, refined typography, premium card texture',
        card:       'professional card design, clean layout, crisp typography, balanced whitespace, premium finish',
        thumbnail:  'high-impact thumbnail, bold text overlay, vivid eye-catching colors, designed for digital screens',
        logo:       'clean minimalist logo design, vector style, crisp edges, scalable, strong brand identity',
        certificate:'formal certificate design, ornate border, official typography, premium aged paper texture',
        brochure:   'professional brochure layout, organised sections, clean typography, high-quality print design',
        menu:       'appetising restaurant menu design, clean food layout, premium typography, elegant styling'
    };

    function buildPrompt(raw) {
        var p = raw.trim();
        if (selectedStyle) p = p + ', ' + selectedStyle;
        var isDesign = DESIGN_RE.test(raw);
        if (isDesign) {
            var specificSuffix = '';
            for (var dtype in DESIGN_TYPE_SUFFIX) {
                if (new RegExp('\\b' + dtype + '\\b', 'i').test(raw)) {
                    specificSuffix = DESIGN_TYPE_SUFFIX[dtype];
                    break;
                }
            }
            p += ', ' + (specificSuffix || DESIGN_SUFFIX);
        } else {
            p += ', ' + PHOTO_SUFFIX;
        }
        return p;
    }

    var NEGATIVE = encodeURIComponent([
        'blurry','blur','out of focus','noise','grainy','low quality','bad quality',
        'distorted','deformed','watermark','text overlay','overexposed','underexposed',
        'amateur','cartoon','anime','illustration','painting','drawing','sketch',
        'plastic','artificial','fake','mutated','disfigured','bad anatomy',
        'extra limbs','duplicate','tiling','ugly','poorly drawn','low res','draft'
    ].join(','));

    function parseSize(sizeStr) {
        var parts = (sizeStr || '1024x1024').split('x');
        return { w: parseInt(parts[0]) || 1024, h: parseInt(parts[1]) || 1024 };
    }

    /* ══════════════════════════════════════════════════════════════
       HUGGING FACE IMAGE GENERATION
       Primary generator — higher quality, no watermarks.
    ══════════════════════════════════════════════════════════════ */
    var HF_MODELS = [
        'stabilityai/stable-diffusion-xl-base-1.0',
        'stabilityai/stable-diffusion-2-1',
        'runwayml/stable-diffusion-v1-5'
    ];

    async function hfGenerateImage(prompt, width, height, seed) {
        /* Clamp to dimensions HF models support */
        var w = Math.min(width  || 1024, 1024);
        var h = Math.min(height || 1024, 1024);
        /* Round down to nearest multiple of 64 */
        w = Math.floor(w / 64) * 64 || 512;
        h = Math.floor(h / 64) * 64 || 512;

        var hfToken = (window.AQS_ADMIN_SETTINGS && window.AQS_ADMIN_SETTINGS.hf_token) || window.HF_TOKEN || '';

        for (var mi = 0; mi < HF_MODELS.length; mi++) {
            try {
                var headers = { 'Content-Type': 'application/json', 'x-use-cache': 'false' };
                if (hfToken) headers['Authorization'] = 'Bearer ' + hfToken;

                var body = { inputs: prompt };
                if (HF_MODELS[mi].indexOf('xl') !== -1 || HF_MODELS[mi].indexOf('stable-diffusion-2') !== -1) {
                    body.parameters = { width: w, height: h, num_inference_steps: 20, guidance_scale: 7 };
                    if (seed) body.parameters.seed = seed;
                }

                var ctrl = new AbortController();
                var tid  = setTimeout(function () { ctrl.abort(); }, 60000);

                var res = await fetch('https://api-inference.huggingface.co/models/' + HF_MODELS[mi], {
                    method:  'POST',
                    headers: headers,
                    signal:  ctrl.signal,
                    body:    JSON.stringify(body)
                });
                clearTimeout(tid);

                if (res.status === 503) {
                    /* Model still loading — try the next one */
                    console.warn('[ImageGen] HF model loading:', HF_MODELS[mi]);
                    continue;
                }
                if (!res.ok) continue;

                /* Check content-type to confirm it's image data */
                var ctype = res.headers.get('content-type') || '';
                if (ctype.indexOf('image') === -1 && ctype.indexOf('octet') === -1) continue;

                var blob = await res.blob();
                if (!blob || blob.size < 5000) continue; /* too small = error payload */

                var objectUrl = URL.createObjectURL(blob);
                return { url: objectUrl, isHF: true, blob: blob };
            } catch (e) {
                console.warn('[ImageGen] HF model failed:', HF_MODELS[mi], e.message);
            }
        }
        throw new Error('All Hugging Face models unavailable or still loading');
    }

    async function raceImage(prompt, width, height, seed, statusCallback) {
        if (statusCallback) statusCallback('Generating via Hugging Face AI… (up to 60 s)');
        try {
            return await hfGenerateImage(prompt, width, height, seed);
        } catch (hfErr) {
            throw new Error('Image generation failed: ' + hfErr.message);
        }
    }

    /* ─────────────────────────────────────────────────────────────
       AI TEXT — Groq only
    ───────────────────────────────────────────────────────────── */
    async function callAI(messages) {
        if (typeof window.groqFetch !== 'function') return null;
        try {
            var ctrl = new AbortController();
            var tid  = setTimeout(function () { ctrl.abort(); }, 15000);
            var res  = await window.groqFetch({
                model: 'llama-3.1-8b-instant', messages: messages,
                max_tokens: 300, temperature: 0.8
            }, { signal: ctrl.signal });
            clearTimeout(tid);
            if (!res.ok) return null;
            var data = await res.json();
            var text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
            return text.trim() || null;
        } catch (e) {
            console.warn('[ImageGen] Groq callAI failed:', e.message);
            return null;
        }
    }

    /* ── Enhance Prompt ── */
    $enhBtn.addEventListener('click', async function () {
        var raw = $promptTA.value.trim();
        if (!raw) { showError('Please enter a prompt first.'); return; }
        $enhBtn.disabled = true;
        $enhBtn.innerHTML = '<svg class="aqs-ig-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Enhancing…';
        var isDesign = DESIGN_RE.test(raw);
        var styleHint = isDesign
            ? 'The user wants a graphic design. Enhance the prompt for professional, high-quality graphic design. Do NOT add photography/camera terms.'
            : 'The user wants a realistic photograph. Enhance for cinematic, professional photography. Be specific about lighting, composition, and visual details.';
        var messages = [
            { role: 'system', content: 'You are an expert AI image prompt engineer for XZILY AI Studio. ' + styleHint + ' Rewrite the user\'s rough description into a detailed professional image prompt. Output ONLY the enhanced prompt text, max 150 words.' },
            { role: 'user', content: raw }
        ];
        var enhanced = await callAI(messages);
        $enhBtn.disabled = false;
        $enhBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Enhance Prompt';
        if (enhanced) {
            $promptTA.value = enhanced.replace(/^["']|["']$/g, '').trim();
            $promptTA.style.height = 'auto';
            $promptTA.style.height = $promptTA.scrollHeight + 'px';
        } else {
            showError('Could not enhance prompt. Please try again.');
        }
    });

    /* ─────────────────────────────────────────────────────────────
       GENERATE IMAGES
    ───────────────────────────────────────────────────────────── */
    $genBtn.addEventListener('click', generateImages);
    $promptTA.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generateImages();
    });

    async function generateImages() {
        var raw = $promptTA.value.trim();
        if (!raw) { showError('Please enter a description for the image.'); return; }
        hideError();
        lastPrompt = raw;
        var fullPrompt = buildPrompt(raw);
        var size  = parseSize($sizeEl ? $sizeEl.value : '1024x1024');
        var count = parseInt($countEl ? $countEl.value : '1') || 1;
        $genBtn.disabled = true;
        $genBtn.innerHTML = '<svg class="aqs-ig-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Generating…';
        $status.style.display = 'flex';
        $results.style.display = 'block';
        $grid.innerHTML = '';
        setStatus('Sending request to AI server…');
        $dlAll.style.display = count > 1 ? 'inline-flex' : 'none';

        var seeds = [];
        var cards = [];
        for (var i = 0; i < count; i++) {
            seeds.push(Math.floor(Math.random() * 9999999));
            var card = document.createElement('div');
            card.className = 'aqs-ig-card loading';
            card.innerHTML = '<div class="aqs-ig-card-shimmer"><div class="aqs-ig-card-spinner"></div><span>Generating…</span></div>';
            $grid.appendChild(card);
            cards.push(card);
        }

        var successUrls = [];
        var settled     = 0;

        for (var idx = 0; idx < count; idx++) {
            (function (cardEl, imgIdx, seed) {
                var delay = imgIdx * 2000;
                setTimeout(async function () {
                    if (imgIdx === 0) setStatus('Generating image' + (count > 1 ? ' 1 of ' + count : '') + '… please wait');
                    else setStatus('Generating image ' + (imgIdx + 1) + ' of ' + count + '…');
                    var shimmerLabel = cardEl.querySelector('.aqs-ig-card-shimmer span');
                    try {
                        var result = await raceImage(fullPrompt, size.w, size.h, seed, function (msg) {
                            if (shimmerLabel) shimmerLabel.textContent = msg;
                            if (imgIdx === 0 || count === 1) setStatus(msg);
                        });
                        settled++;
                        successUrls.push(result.url);
                        cardEl.className = 'aqs-ig-card loaded';
                        cardEl.innerHTML = '';
                        var imgEl = document.createElement('img');
                        imgEl.src = result.url; imgEl.alt = raw; imgEl.loading = 'lazy';
                        cardEl.appendChild(imgEl);
                        var finalUrl = result.url;
                        var actions = document.createElement('div');
                        actions.className = 'aqs-ig-card-actions';
                        /* ── Save to Gallery button (only for signed-in users) ── */
                        var isLoggedIn = !!window._aqsFirebaseUser;
                        actions.innerHTML =
                            '<button class="aqs-btn aqs-btn-sm aqs-ig-view-btn">View Full</button>' +
                            '<a class="aqs-btn aqs-btn-sm aqs-btn-primary aqs-ig-dl-btn" href="' + finalUrl + '" download="xzily-ai-' + (imgIdx + 1) + '.jpg" target="_blank">Download</a>' +
                            (isLoggedIn
                                ? '<button class="aqs-btn aqs-btn-sm aqs-ig-save-btn" style="background:rgba(244,63,94,0.18);color:#fb7185;border:1px solid rgba(244,63,94,0.3);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.75rem;font-weight:600;white-space:nowrap;">❤ Save</button>'
                                : '');
                        cardEl.appendChild(actions);
                        cardEl.querySelector('.aqs-ig-view-btn').addEventListener('click', function () { openLightbox(finalUrl, raw); });
                        var saveBtn = cardEl.querySelector('.aqs-ig-save-btn');
                        if (saveBtn) {
                            saveBtn.addEventListener('click', function () { saveToGallery(finalUrl, raw, saveBtn); });
                        }
                    } catch (_) {
                        settled++;
                        cardEl.className = 'aqs-ig-card error';
                        cardEl.innerHTML =
                            '<div class="aqs-ig-card-err">' +
                                '<div style="font-size:1.6rem;margin-bottom:8px">⚠️</div>' +
                                '<div style="margin-bottom:10px">Image generation timed out.<br><small style="opacity:.75">The AI server took too long to respond.</small></div>' +
                                '<button class="aqs-ig-retry-btn" style="background:#6366f1;color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:0.82rem;font-weight:700;cursor:pointer;">↺ Try Again</button>' +
                            '</div>';
                        cardEl.querySelector('.aqs-ig-retry-btn').addEventListener('click', function () {
                            cardEl.className = 'aqs-ig-card loading';
                            cardEl.innerHTML = '<div class="aqs-ig-card-shimmer"><div class="aqs-ig-card-spinner"></div><span>Retrying…</span></div>';
                            var newSeed = Math.floor(Math.random() * 9999999);
                            var retryShimmer = cardEl.querySelector('.aqs-ig-card-shimmer span');
                            raceImage(fullPrompt, size.w, size.h, newSeed, function (msg) {
                                if (retryShimmer) retryShimmer.textContent = msg;
                            }).then(function (result) {
                                cardEl.className = 'aqs-ig-card loaded';
                                cardEl.innerHTML = '';
                                var ri = document.createElement('img');
                                ri.src = result.url; ri.alt = raw; ri.loading = 'lazy';
                                cardEl.appendChild(ri);
                                var ra = document.createElement('div');
                                ra.className = 'aqs-ig-card-actions';
                                var isLI = !!window._aqsFirebaseUser;
                                ra.innerHTML =
                                    '<button class="aqs-btn aqs-btn-sm aqs-ig-view-btn">View Full</button>' +
                                    '<a class="aqs-btn aqs-btn-sm aqs-btn-primary aqs-ig-dl-btn" href="' + result.url + '" download="xzily-ai-retry.jpg" target="_blank">Download</a>' +
                                    (isLI ? '<button class="aqs-btn aqs-btn-sm aqs-ig-save-btn" style="background:rgba(244,63,94,0.18);color:#fb7185;border:1px solid rgba(244,63,94,0.3);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.75rem;font-weight:600;white-space:nowrap;">❤ Save</button>' : '');
                                cardEl.appendChild(ra);
                                cardEl.querySelector('.aqs-ig-view-btn').addEventListener('click', function () { openLightbox(result.url, raw); });
                                var sb = cardEl.querySelector('.aqs-ig-save-btn');
                                if (sb) sb.addEventListener('click', function () { saveToGallery(result.url, raw, sb); });
                                successUrls.push(result.url);
                            }).catch(function () {
                                cardEl.className = 'aqs-ig-card error';
                                cardEl.innerHTML = '<div class="aqs-ig-card-err"><div style="font-size:1.4rem;margin-bottom:6px">⚠️</div><div>Server still busy.<br><small>Wait a moment and try generating again.</small></div></div>';
                            });
                        });
                    }
                    if (settled === count) finishGeneration(fullPrompt, successUrls);
                }, delay);
            })(cards[idx], idx, seeds[idx]);
        }
    }

    function finishGeneration(prompt, urls) {
        $status.style.display = 'none';
        $genBtn.disabled = false;
        $genBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg> Generate Image';
        if (urls.length > 0) {
            history.unshift({ prompt: prompt, rawPrompt: lastPrompt, urls: urls, ts: Date.now() });
            if (history.length > 20) history = history.slice(0, 20);
            lsSet(IG_HISTORY_KEY, history);
            renderHistory();
        }
    }

    /* ── Lightbox ── */
    function openLightbox(url, prompt) {
        $lbImg.src = url; $lbDl.href = url; $lbDl.download = 'xzily-ai-image.jpg';
        $lbPrompt.textContent = prompt; $lbRegen.dataset.prompt = prompt;
        $lb.style.display = 'flex'; $lbOvr.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
        $lb.style.display = 'none'; $lbOvr.style.display = 'none';
        document.body.style.overflow = ''; $lbImg.src = '';
    }
    if ($lbClose) $lbClose.addEventListener('click', closeLightbox);
    if ($lbOvr)   $lbOvr.addEventListener('click', closeLightbox);
    if ($lbRegen) $lbRegen.addEventListener('click', function () {
        closeLightbox();
        var p = $lbRegen.dataset.prompt || '';
        if (p) { $promptTA.value = lastPrompt || p; generateImages(); }
    });

    if ($dlAll) $dlAll.addEventListener('click', function () {
        $grid.querySelectorAll('.aqs-ig-dl-btn').forEach(function (a) { setTimeout(function () { a.click(); }, 200); });
    });

    if ($clearBtn) $clearBtn.addEventListener('click', function () {
        $promptTA.value = ''; $results.style.display = 'none'; $grid.innerHTML = ''; hideError(); $promptTA.focus();
    });

    /* ── Local History ── */
    function renderHistory() {
        if (!history.length) { if ($histSec) $histSec.style.display = 'none'; return; }
        if ($histSec) $histSec.style.display = 'block';
        if (!$histGrid) return;
        $histGrid.innerHTML = '';
        history.slice(0, 12).forEach(function (item) {
            var url = item.urls && item.urls[0];
            if (!url) return;
            var card = document.createElement('div');
            card.className = 'aqs-ig-card aqs-ig-hist-card';
            card.innerHTML = '<img src="' + url + '" alt="" loading="lazy">' +
                '<div class="aqs-ig-card-actions"><span class="aqs-ig-hist-prompt">' + escHtml(item.rawPrompt || '') + '</span><button class="aqs-btn aqs-btn-sm aqs-ig-view-btn">View</button></div>';
            card.querySelector('.aqs-ig-view-btn').addEventListener('click', function () { openLightbox(url, item.rawPrompt || ''); });
            $histGrid.appendChild(card);
        });
    }

    if ($clrHist) $clrHist.addEventListener('click', function () {
        if (!confirm('Clear all image history?')) return;
        history = []; lsSet(IG_HISTORY_KEY, []); renderHistory();
    });

    function setStatus(txt) { if ($statusTxt) $statusTxt.textContent = txt; }
    function showError(msg) {
        if (!$error) return;
        $error.textContent = msg; $error.style.display = 'block';
        setTimeout(function () { $error.style.display = 'none'; }, 7000);
    }
    function hideError() { if ($error) $error.style.display = 'none'; }

    if ($promptTA) {
        $promptTA.addEventListener('input', function () {
            this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        });
    }

    function escHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

})();
