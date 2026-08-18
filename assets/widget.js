(async function() {
    'use strict';

    window.SMVAAudioDebug = window.SMVAAudioDebug || {};
    window.SMVAAudioDebug.context = 'frontend-widget';
    window.SMVAAudioDebug.loadedAt = Date.now();

    const cfg = window.smvaConfig || {};
    // Stamped from SMVA_VERSION so a trace always names the code that produced
    // it. Never hard-code this — a stale version makes every log ambiguous.
    window.SMVAAudioDebug.version = cfg.pluginVersion || 'unknown';
    window.SMVAAudioDebug.hasConfig = !!window.smvaConfig;
    window.SMVAAudioDebug.hasInternalToken = !!cfg.internalToken;
    if (!cfg.internalToken) { window.SMVAAudioDebug.loadError = 'Missing internalToken'; console.warn('[SMVA] No token'); return; }

    const CONFIG = {
        pluginVersion: cfg.pluginVersion || 'unknown',
        assetsUrl: cfg.assetsUrl || '',
        internalToken: cfg.internalToken,
        licenseKey: cfg.licenseKey || '',
        wsUrl: cfg.wsUrl || 'wss://api2.studiometa.io/voice',
        apiUrl: cfg.apiUrl || 'https://api2.studiometa.io',
        ajaxUrl: cfg.ajaxUrl || '',
        widgetNonce: cfg.widgetNonce || '',
        pricingUrl: cfg.pricingUrl || 'https://studiometa.io/pricing/',
        widgetMode: cfg.widgetMode || 'full',
        plan: cfg.plan || '',
        quota: cfg.quota || null,
        position: cfg.position || 'bottom-right',
        primaryColor: cfg.primaryColor || '#2563eb',
        lang: cfg.lang || 'en',
        businessName: cfg.businessName || 'AI Assistant',
        greeting: cfg.greeting || 'Hello! How can I help you?',
        widgetStyle: cfg.widgetStyle || 'fab',
        pillText: cfg.pillText || 'Ask me anything',
        voiceEnabled: cfg.voiceEnabled !== false,
        chatEnabled: cfg.chatEnabled !== false,
        defaultTab: cfg.defaultTab || 'voice',
        suggestedQuestions: cfg.suggestedQuestions || [],
        workflowButtons: Array.isArray(cfg.workflowButtons) ? cfg.workflowButtons : [],
        callCooldown: parseInt(cfg.callCooldown) || 20,
        // Minutes, and 0 legitimately means "no site limit" — the admin field
        // allows it. A `|| 600` fallback here read as 600 *minutes* further
        // down, so choosing unlimited silently bought a ten-hour ceiling.
        maxCallDuration: (function (v) { var n = parseInt(v, 10); return isNaN(n) || n < 0 ? 0 : n; })(cfg.maxCallDuration),
        silenceTimeout: parseInt(cfg.silenceTimeout) || 60,
        widgetTheme: cfg.widgetTheme || 'classic',
        agentLogo: cfg.agentLogo || '',
        // On unless a site opts out. Browsers still block audio before a real
        // gesture, so a visitor who has not touched the page hears nothing.
        teaseSound: cfg.teaseSound !== false,
    };

    const isRTL = CONFIG.lang === 'fa' || CONFIG.lang === 'ar';
    const GEM_IC = CONFIG.agentLogo ? '<img src="' + CONFIG.agentLogo + '" style="width:36px;height:36px;object-fit:cover;border-radius:50%;" alt="Agent Logo">' : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>';

    const R = CONFIG.position === 'bottom-right';
    const side = R ? 'right' : 'left';
    const c = CONFIG.primaryColor;

    const TRANSLATIONS = {
        en: {
            online: 'Online', ready: 'Ready', on_call: 'On call',
            connecting: 'Connecting...', typing: 'Typing...',
            voice: 'Voice', chat: 'Chat',
            start_call: 'Start Call', end_call: 'End Call',
            voice_assistant: 'Voice assistant', not_now: 'Not now', start_chat: 'Start chat',
            placeholder: 'Type a message...',
            speak_hint: '🎙️ Say something to start...',
            upgrade_title: 'Upgrade to continue',
            upgrade_body:  'Your free trial quota has been used. Upgrade to continue using voice & chat.',
            upgrade_btn:   'View Plans',
            limit_reached: 'Limit reached',
            cooldown: 'Please wait a moment before calling again.',
            rate_limit: 'Too many calls. Please wait a few minutes.',
            voice_unavailable: 'Voice calls unavailable — limit reached. Chat is still active.',
            chat_unavailable:  'Chat unavailable — limit reached. Voice is still active.',
            type_response: 'Type your response',
            send: 'Send',
            call_ended_by_agent: 'Call ended by assistant',
            call_time_up: 'Call time limit reached',
        },
        fa: {
            online: 'آنلاین', ready: 'آماده', on_call: 'در حال مکالمه',
            connecting: 'در حال اتصال...', typing: 'در حال تایپ...',
            voice: 'صوتی', chat: 'چت',
            start_call: 'شروع تماس', end_call: 'پایان تماس',
            voice_assistant: 'دستیار صوتی', not_now: 'الان نه', start_chat: 'شروع گفتگو',
            placeholder: 'پیام خود را بنویسید...',
            speak_hint: '🎙️ چیزی بگویید تا شروع شود...',
            upgrade_title: 'برای ادامه ارتقا دهید',
            upgrade_body:  'سهمیه آزمایشی شما تمام شده است. برای ادامه استفاده از صدا و چت، پلن را ارتقا دهید.',
            upgrade_btn:   'مشاهده پلن‌ها',
            limit_reached: 'سهمیه به پایان رسید',
            cooldown: 'لطفاً چند لحظه صبر کنید.',
            rate_limit: 'تماس‌های زیادی. چند دقیقه صبر کنید.',
            voice_unavailable: 'تماس صوتی در دسترس نیست — سهمیه تمام شده. چت همچنان فعال است.',
            chat_unavailable:  'چت در دسترس نیست — سهمیه تمام شده. تماس صوتی همچنان فعال است.',
            type_response: 'پاسخ خود را تایپ کنید',
            send: 'ارسال',
            call_ended_by_agent: 'مکالمه توسط دستیار پایان یافت',
            call_time_up: 'محدودیت زمان تماس به پایان رسید',
        },
        ar: {
            online: 'متصل', ready: 'جاهز', on_call: 'في مكالمة',
            connecting: 'جار الاتصال...', typing: 'يكتب...',
            voice: 'صوت', chat: 'دردشة',
            start_call: 'بدء المكالمة', end_call: 'إنهاء المكالمة',
            voice_assistant: 'المساعد الصوتي', not_now: 'ليس الآن', start_chat: 'بدء الدردشة',
            placeholder: 'اكتب رسالة...',
            speak_hint: '🎙️ قل شيئاً للبدء...',
            upgrade_title: 'قم بالترقية للمتابعة',
            upgrade_body:  'انتهت حصتك التجريبية. قم بالترقية للاستمرار.',
            upgrade_btn:   'عرض الخطط',
            limit_reached: 'تم الوصول إلى الحد',
            cooldown: 'الرجاء الانتظار لحظة قبل الاتصال مجددًا.',
            rate_limit: 'مكالمات كثيرة. يرجى الانتظار دقائق.',
            voice_unavailable: 'المكالمات الصوتية غير متاحة. الدردشة لا تزال نشطة.',
            chat_unavailable:  'الدردشة غير متاحة. المكالمات الصوتية لا تزال نشطة.',
            type_response: 'اكتب ردك',
            send: 'إرسال',
            call_ended_by_agent: 'انتهت المكالمة من قبل المساعد',
            call_time_up: 'تم بلوغ الحد الزمني للمكالمة',
        },
        fr: {
            online: 'En ligne', ready: 'Prêt', on_call: 'En appel',
            connecting: 'Connexion...', typing: 'En train d\'écrire...',
            voice: 'Voix', chat: 'Chat',
            start_call: 'Démarrer', end_call: 'Terminer',
            voice_assistant: 'Assistant vocal', not_now: 'Plus tard', start_chat: 'Démarrer le chat',
            placeholder: 'Tapez un message...',
            speak_hint: '🎙️ Dites quelque chose pour commencer...',
            upgrade_title: 'Passez à la version supérieure',
            upgrade_body:  'Votre quota d\'essai a été utilisé. Mettez à niveau pour continuer.',
            upgrade_btn:   'Voir les plans',
            limit_reached: 'Limite atteinte',
            cooldown: 'Veuillez patienter avant de rappeler.',
            rate_limit: 'Trop d\'appels. Attendez quelques minutes.',
            voice_unavailable: 'Appels vocaux indisponibles. Le chat reste actif.',
            chat_unavailable:  'Chat indisponible. Les appels vocaux restent actifs.',
            type_response: 'Tapez votre réponse',
            send: 'Envoyer',
            call_ended_by_agent: 'Appel terminé par l\'assistant',
            call_time_up: 'Durée maximale de l\'appel atteinte',
        },
        es: {
            online: 'En línea', ready: 'Listo', on_call: 'En llamada',
            connecting: 'Conectando...', typing: 'Escribiendo...',
            voice: 'Voz', chat: 'Chat',
            start_call: 'Iniciar llamada', end_call: 'Terminar',
            voice_assistant: 'Asistente de voz', not_now: 'Ahora no', start_chat: 'Iniciar chat',
            placeholder: 'Escribe un mensaje...',
            speak_hint: '🎙️ Di algo para empezar...',
            upgrade_title: 'Actualiza para continuar',
            upgrade_body:  'Se ha agotado su cuota de prueba. Actualice para continuar.',
            upgrade_btn:   'Ver planes',
            limit_reached: 'Límite alcanzado',
            cooldown: 'Espere un momento antes de llamar de nuevo.',
            rate_limit: 'Demasiadas llamadas. Espere unos minutos.',
            voice_unavailable: 'Llamadas de voz no disponibles. El chat sigue activo.',
            chat_unavailable:  'Chat no disponible. Las llamadas de voz siguen activas.',
            type_response: 'Escribe tu respuesta',
            send: 'Enviar',
            call_ended_by_agent: 'Llamada finalizada por el asistente',
            call_time_up: 'Se alcanzó el límite de tiempo de la llamada',
        },
    };

    function t(key) {
        const tr = TRANSLATIONS[CONFIG.lang] || TRANSLATIONS['en'];
        return tr[key] || TRANSLATIONS['en'][key] || key;
    }

    let caps = {
        voice: CONFIG.voiceEnabled && (CONFIG.widgetMode === 'full' || CONFIG.widgetMode === 'voice_only'),
        chat:  CONFIG.chatEnabled  && (CONFIG.widgetMode === 'full' || CONFIG.widgetMode === 'chat_only'),
    };

    let ws = null;
    let chatWs = null;
    let audioContext = null;
    let audioCaptureSource = null;
    let audioCaptureNode = null;
    let mediaStream = null;
    // While the visitor is answering a request_text_input prompt, the mic
    // keeps streaming underneath the panel — nothing before this silenced it.
    // Typed and spoken input landing in the same turn is exactly the kind of
    // thing that leaves a realtime model unsure which one to trust, and it's
    // the one difference between this path and every other text message sent
    // during a call (display_text, lead_captured, etc. don't compete with a
    // live turn the way an open text prompt does).
    let micMuted = false;
    let activeTab = CONFIG.defaultTab;
    if (activeTab === 'voice' && !caps.voice) activeTab = 'chat';
    if (activeTab === 'chat' && !caps.chat)   activeTab = 'voice';

    let voiceState = 'idle';
    let chatMessages = [];
    let isTyping = false;
    let callSeconds = 0;
    let callTimer = null;
    // Seconds the backend will actually allow, learned from setup_complete.
    // Falls back to the local setting so the countdown still works against a
    // backend that predates limitMs. 0 = unlimited, bar hidden.
    let callLimitSecs = 0;
    let lastCallEnd = 0;
    let chatSessionId = null;
    let chatHistory = [];
    let chatSavedCount = 0;
    let audioQueue = [];
    let isPlayingAudio = false;
    let playbackAudioContext = null;
    let playbackSources = [];
    let currentPlaybackSource = null;
    let nextPlaybackTime = 0;
    let playbackGeneration = 0;
    // Playback starts only once a small cushion of audio has arrived, and the
    // cushion grows if the stream underruns. See primePlayback()/playNextAudio().
    let playbackPrimed = false;
    let playbackPrimeStartedAt = 0;
    let playbackPrimeTimer = null;
    let playbackStartBuffer = 0.24;
    let playbackReplyUnderran = false;
    // Barge-in (user interrupting the agent) detection state. See
    // handleCapturedAudio() for why a single loud frame must not interrupt.
    let bargeInFrames = 0;
    let lastInterruptAt = 0;
    let playbackStartedAt = 0;
    let suggestionsShown = true;
    let agentEndedCall = false;
    const widgetSessionId = 'smva_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    window.SMVAAudioDebug.widgetSessionId = widgetSessionId;

    // ── Call flight recorder ────────────────────────────────────────────────
    // SMVAAudioDebug holds current state, which cannot explain a dropout that
    // has already happened. This keeps a bounded ring of timestamped events
    // plus per-reply delivery statistics, so a call can be reconstructed after
    // the fact and the cause separated into one of two very different classes:
    //
    //   deliveryRatio < 1.0  audio arrived slower than it plays. The stream
    //                        cannot sustain realtime; no local buffer size can
    //                        hide it. Cause is upstream (backend or network).
    //   deliveryRatio ~ 1.0  enough audio arrived, but in bursts. Look at
    //                        gapP95. A larger start cushion does fix this.
    //
    // Timings use performance.now(): monotonic, sub-millisecond, and immune to
    // system clock adjustments that would corrupt interval maths.
    //
    // Only numbers are recorded — message types, byte counts, timings. No
    // transcript text, no lead fields, no audio is retained.
    //
    // Console API: SMVATrace.summary() | SMVATrace.copy() | SMVATrace.dump()
    const TRACE_MAX_EVENTS    = 4000;
    const TRACE_TRIM_CHUNK    = 500;
    const TRACE_STORE_KEY     = 'smva_trace_v1';
    const TRACE_STORE_CALLS   = 3;
    const TRACE_STORE_EVENTS  = 1500;   // keep localStorage well under quota
    const TRACE_MIC_BUCKET_MS = 500;
    const TRACE_GAP_EVENT_MS  = 250;    // only gaps this large become events

    let traceEvents = [];
    let traceCall   = null;
    let traceReply  = null;
    let traceMic    = null;

    function traceNow() { return Math.round(performance.now() * 10) / 10; }
    function traceRound(v, dp) { const m = Math.pow(10, dp || 0); return Math.round(v * m) / m; }

    function traceAdd(type, data) {
        if (traceEvents.length >= TRACE_MAX_EVENTS) traceEvents.splice(0, TRACE_TRIM_CHUNK);
        const ev = { t: traceNow(), type: type };
        if (data) { for (const k in data) ev[k] = data[k]; }
        traceEvents.push(ev);
        return ev;
    }

    function tracePct(sorted, p) {
        if (!sorted.length) return 0;
        const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
        return traceRound(sorted[i], 1);
    }

    // navigator.connection is advisory and absent on Safari/Firefox, but where
    // it exists it distinguishes "the visitor is on a weak link" from "our
    // backend is slow" — the single most useful piece of context in a report.
    function traceConnection() {
        const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!c) return null;
        return { effectiveType: c.effectiveType || '', downlinkMbps: c.downlink || 0, rttMs: c.rtt || 0, saveData: !!c.saveData };
    }

    function traceCallBegin() {
        traceEvents = [];
        traceMic    = null;
        traceReply  = null;
        traceCall   = {
            sessionId: widgetSessionId,
            pluginVersion: CONFIG.pluginVersion,
            startedAt: new Date().toISOString(),
            t0: traceNow(),
            userAgent: navigator.userAgent,
            lang: CONFIG.lang,
            wsUrl: CONFIG.wsUrl,
            connectionStart: traceConnection(),
            replyCount: 0,
            replies: [],
            micChunks: 0,
            micQuietBuckets: 0,
            micBuckets: 0,
            wsCloseCode: null,
            reason: '',
        };
        traceAdd('call_start', { startBufferMs: Math.round(playbackStartBuffer * 1000) });
    }

    function traceReplyBegin() {
        if (!traceCall) return;
        traceReply = {
            index: traceCall.replyCount + 1,
            firstChunkT: traceNow(),
            lastChunkT: traceNow(),
            chunks: 0, bytes: 0, audioMs: 0,
            gaps: [], underruns: 0, seams: 0, interrupts: 0,
            primeWaitMs: null, primeQueuedMs: null,
            startBufferMs: Math.round(playbackStartBuffer * 1000),
            schedCount: 0, minLookaheadMs: null,
        };
        traceAdd('reply_start', { reply: traceReply.index });
    }

    function traceAudioIn(bytes, sampleRate) {
        if (!traceCall) return;
        if (!traceReply) traceReplyBegin();
        if (!traceReply) return;
        const now = traceNow();
        if (traceReply.chunks) {
            const gap = now - traceReply.lastChunkT;
            traceReply.gaps.push(gap);
            if (gap > TRACE_GAP_EVENT_MS) {
                traceAdd('rx_gap', { reply: traceReply.index, gapMs: traceRound(gap, 1), chunk: traceReply.chunks + 1 });
            }
        }
        traceReply.chunks  += 1;
        traceReply.bytes   += bytes;
        traceReply.audioMs += ((bytes / 2) / (sampleRate || 24000)) * 1000;  // PCM16 mono
        traceReply.lastChunkT = now;
    }

    function traceReplyEnd() {
        if (!traceCall || !traceReply) { traceReply = null; return; }
        const r = traceReply;
        traceReply = null;
        if (!r.chunks) return;

        const wallMs = r.lastChunkT - r.firstChunkT;
        const sorted = r.gaps.slice().sort(function (a, b) { return a - b; });

        // Percentiles alone hide the shape of the distribution. Seven buckets
        // cost nothing to store and show at a glance whether delivery was
        // steady or arrived in clumps.
        const TRACE_GAP_BUCKETS = [20, 50, 100, 200, 400, 800];
        const gapHist = [0, 0, 0, 0, 0, 0, 0];
        for (let gi = 0; gi < r.gaps.length; gi++) {
            let bi = TRACE_GAP_BUCKETS.length;
            for (let bj = 0; bj < TRACE_GAP_BUCKETS.length; bj++) {
                if (r.gaps[gi] < TRACE_GAP_BUCKETS[bj]) { bi = bj; break; }
            }
            gapHist[bi] += 1;
        }
        const summary = {
            reply: r.index,
            chunks: r.chunks,
            kb: traceRound(r.bytes / 1024, 1),
            audioMs: Math.round(r.audioMs),
            wallMs: Math.round(wallMs),
            // The verdict metric. A single-chunk reply has no interval to
            // measure, so it reports null rather than a meaningless number.
            deliveryRatio: (r.chunks > 1 && wallMs > 0) ? traceRound(r.audioMs / wallMs, 2) : null,
            gapP50: tracePct(sorted, 50),
            gapP95: tracePct(sorted, 95),
            gapMax: sorted.length ? traceRound(sorted[sorted.length - 1], 1) : 0,
            gapHist: gapHist,          // counts for <20, <50, <100, <200, <400, <800, 800+ ms
            underruns: r.underruns,
            seams: r.seams || 0,       // harmless timeline joins; should not affect anything
            interrupts: r.interrupts,
            primeWaitMs: r.primeWaitMs,
            primeQueuedMs: r.primeQueuedMs,
            startBufferMs: r.startBufferMs,
            minLookaheadMs: r.minLookaheadMs,
        };
        traceCall.replyCount += 1;
        traceCall.replies.push(summary);
        traceAdd('reply_end', summary);
    }

    function traceMicChunk(maxVal) {
        if (!traceCall) return;
        const now = traceNow();
        if (!traceMic) traceMic = { start: now, n: 0, peak: 0, voiced: 0 };
        traceMic.n    += 1;
        traceMic.peak  = Math.max(traceMic.peak, maxVal || 0);
        if ((maxVal || 0) > 800) traceMic.voiced += 1;
        traceCall.micChunks += 1;
        if ((now - traceMic.start) >= TRACE_MIC_BUCKET_MS) {
            traceAdd('mic', { n: traceMic.n, peak: traceMic.peak, voicedPct: Math.round((traceMic.voiced / traceMic.n) * 100) });
            traceCall.micBuckets += 1;
            if (traceMic.peak < 200) traceCall.micQuietBuckets += 1;
            traceMic = null;
        }
    }

    function traceCallEnd(reason) {
        if (!traceCall) return;
        traceReplyEnd();
        // Guard against a DOM Event arriving here from a listener bound
        // straight to endCall — it would serialise as noise in the report.
        traceCall.reason        = (typeof reason === 'string') ? reason : '';
        traceCall.endedAt       = new Date().toISOString();
        traceCall.durationMs    = Math.round(traceNow() - traceCall.t0);
        traceCall.connectionEnd = traceConnection();
        traceAdd('call_end', { reason: traceCall.reason, durationMs: traceCall.durationMs });
        traceCall.events = traceEvents.slice(-TRACE_STORE_EVENTS);
        traceStore(traceCall);
        traceCall = null;
    }

    // Persisted so a reflexive tab close after a bad call does not destroy the
    // only evidence. Capped hard: three calls, trimmed events.
    function traceStore(call) {
        try {
            const raw  = window.localStorage.getItem(TRACE_STORE_KEY);
            const list = raw ? JSON.parse(raw) : [];
            list.push(call);
            while (list.length > TRACE_STORE_CALLS) list.shift();
            window.localStorage.setItem(TRACE_STORE_KEY, JSON.stringify(list));
        } catch (e) {
            // Private mode, disabled storage, or quota. The live object still
            // works for the current page, so this is not worth surfacing.
            window.SMVAAudioDebug.traceStoreError = String(e && e.message || e);
        }
    }

    function traceVerdict(call) {
        const out  = [];
        const reps = call.replies || [];

        if (!reps.length) {
            out.push('NO AUDIO: the agent never sent any audio in this call.');
        }
        const rated = reps.filter(function (r) { return r.deliveryRatio !== null; });
        const slow  = rated.filter(function (r) { return r.deliveryRatio < 1; });
        if (slow.length) {
            const worst = Math.min.apply(null, slow.map(function (r) { return r.deliveryRatio; }));
            out.push('UPSTREAM: ' + slow.length + '/' + rated.length + ' replies arrived slower than realtime (worst ratio ' + worst + '). No local buffer size can fix this — the backend or the link is the bottleneck.');
        }
        const bursty = rated.filter(function (r) { return r.gapP95 > 300; });
        if (bursty.length) {
            out.push('JITTER: ' + bursty.length + '/' + rated.length + ' replies had p95 arrival gaps over 300ms. Audio is arriving in bursts — a larger start cushion absorbs this.');
        }
        const under = reps.reduce(function (n, r) { return n + r.underruns; }, 0);
        if (under) out.push('UNDERRUNS: ' + under + ' — playback ran dry and the listener heard a break.');

        const firstUnder = reps.filter(function (r) { return r.reply <= 2 && r.underruns > 0; }).length;
        if (firstUnder) out.push('EARLY-CALL: the break happened in the first two replies, when the adaptive cushion is still at its floor.');

        if (call.micChunks === 0) {
            out.push('MIC DEAD: no audio was captured at all. The microphone path failed, not the network.');
        } else if (call.micBuckets && call.micQuietBuckets / call.micBuckets > 0.9) {
            out.push('MIC QUIET: ' + call.micQuietBuckets + '/' + call.micBuckets + ' windows were near-silent. Check the input device.');
        }
        const ints = reps.reduce(function (n, r) { return n + r.interrupts; }, 0);
        if (ints > 2) out.push('BARGE-IN: ' + ints + ' interrupts. Room noise or speaker echo may be cutting the agent off.');

        if (call.wsCloseCode && call.wsCloseCode !== 1000 && call.wsCloseCode !== 1005) {
            out.push('WS CLOSE: code ' + call.wsCloseCode + ' — the connection did not close cleanly.');
        }
        if (!out.length) out.push('CLEAN: audio arrived at or above realtime with no underruns.');
        return out;
    }

    const SMVATrace = {
        current: function () { return traceCall; },
        events:  function () { return traceEvents.slice(); },
        stored:  function () {
            try { return JSON.parse(window.localStorage.getItem(TRACE_STORE_KEY) || '[]'); } catch (e) { return []; }
        },
        clear: function () {
            try { window.localStorage.removeItem(TRACE_STORE_KEY); } catch (e) {}
            traceEvents = [];
            return 'Trace history cleared.';
        },
        dump: function () {
            const calls = SMVATrace.stored();
            if (traceCall) {
                const live = JSON.parse(JSON.stringify(traceCall));
                live.events = traceEvents.slice(-TRACE_STORE_EVENTS);
                live.inProgress = true;
                calls.push(live);
            }
            return JSON.stringify({
                format: 'smva-trace/1',
                pluginVersion: CONFIG.pluginVersion,
                generatedAt: new Date().toISOString(),
                calls: calls,
            }, null, 2);
        },
        // The clipboard API is blocked on plain-http sites, which is exactly
        // where trouble tends to be reported from. Saving a file always works.
        download: function () {
            const blob = new Blob([SMVATrace.dump()], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url;
            a.download = 'smva-trace-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
            return 'Saved to your Downloads folder.';
        },
        copy: function () {
            const text = SMVATrace.dump();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text)
                    .then(function () { return 'Trace copied (' + Math.round(text.length / 1024) + ' KB). Paste it into tools/smva-trace-analyzer.html'; })
                    .catch(function () { console.log(text); return 'Clipboard blocked — the trace was printed above instead.'; });
            }
            console.log(text);
            return 'No clipboard API — the trace was printed above instead.';
        },
        summary: function () {
            const calls = SMVATrace.dump ? JSON.parse(SMVATrace.dump()).calls : [];
            if (!calls.length) { console.log('[SMVA] No calls recorded yet.'); return; }
            calls.forEach(function (call, i) {
                console.group('[SMVA] Call ' + (i + 1) + '/' + calls.length + ' — v' + call.pluginVersion + ' — ' + Math.round((call.durationMs || 0) / 1000) + 's' + (call.inProgress ? ' (in progress)' : ''));
                if (call.connectionStart) console.log('Link:', call.connectionStart.effectiveType, call.connectionStart.downlinkMbps + ' Mbps', 'rtt ' + call.connectionStart.rttMs + 'ms');
                if (call.replies && call.replies.length && console.table) console.table(call.replies);
                traceVerdict(call).forEach(function (line) { console.log('  • ' + line); });
                console.groupEnd();
            });
            return 'Run SMVATrace.copy() to export the full trace.';
        },
    };
    window.SMVATrace = SMVATrace;

    const MIC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    const CHAT_IC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    const AI_IC = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>';
    // A handset, not a speech bubble: on a voice-capable site the launcher should
    // say "you can talk to this", which is the one thing a chat widget can't do.
    const PHONE_IC = '<svg class="smva-hs-ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
    // Sound leaving the handset. Arcs rather than the expanding box-shadow ring
    // every other chat widget uses — and it echoes the signal marks on a phone.
    const WAVES_SVG = '<svg id="smva-waves" viewBox="0 0 100 100" aria-hidden="true"><path d="M62 30a28 28 0 0 1 0 40"/><path d="M70 22a40 40 0 0 1 0 56"/></svg>';
    const END_IC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const SEND_IC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    const CLOSE_IC = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    function h(id) { return document.getElementById(id); }
    function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function saveLeadFragment(field, label, value, source) {
        if (!CONFIG.ajaxUrl || !CONFIG.widgetNonce || !value) return;
        const body = new URLSearchParams();
        body.append('action', 'smva_capture_lead_fragment');
        body.append('nonce', CONFIG.widgetNonce);
        body.append('session_id', widgetSessionId);
        body.append('field', field || 'message');
        body.append('label', label || field || 'Message');
        body.append('value', value);
        body.append('source', source || 'Voice widget');
        fetch(CONFIG.ajaxUrl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
            .then(function(r){ return r.json().catch(function(){ return null; }); })
            .then(function(json){
                window.SMVAAudioDebug.lastLeadFragmentSavedAt = Date.now();
                window.SMVAAudioDebug.lastLeadFragmentResponse = json;
            })
            .catch(function(err){
                window.SMVAAudioDebug.lastLeadFragmentError = String(err && err.message || err);
            });
    }
    // Send the WHOLE lead in one request (never split into fragments) so the owner
    // notification email carries the complete record and fires immediately.
    function saveLeadComplete(lead, source) {
        if (!CONFIG.ajaxUrl || !CONFIG.widgetNonce || !lead) return;
        var name  = lead.name || '';
        var email = lead.email || '';
        var phone = lead.phone || '';
        var notes = lead.notes || lead.message || '';
        if (!name && !email && !phone && !notes) return;
        const body = new URLSearchParams();
        body.append('action', 'smva_capture_lead');
        body.append('nonce', CONFIG.widgetNonce);
        body.append('session_id', widgetSessionId);
        body.append('name', name);
        body.append('email', email);
        body.append('phone', phone);
        body.append('notes', notes);
        body.append('source', source || 'Voice widget');
        fetch(CONFIG.ajaxUrl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
            .then(function(r){ return r.json().catch(function(){ return null; }); })
            .then(function(json){
                window.SMVAAudioDebug.lastLeadSavedAt = Date.now();
                window.SMVAAudioDebug.lastLeadResponse = json;
                // Push to GTM's dataLayer so ad platforms (Google Ads, etc.) can fire
                // conversion tags off this event. The widget itself has no tag IDs —
                // wiring the GTM trigger/tag is done in the GTM container, not here.
                if (window.dataLayer && typeof window.dataLayer.push === 'function') {
                    window.dataLayer.push({ event: 'smva_lead_captured', lead_source: source || 'Widget' });
                }
            })
            .catch(function(err){
                window.SMVAAudioDebug.lastLeadError = String(err && err.message || err);
            });
    }
    function setSt(txt) { const e = h('smva-status'); if(e) e.textContent = txt; }

    function saveChatHistory() {
        if (!chatHistory.length || !CONFIG.ajaxUrl) return;
        if (!chatSessionId) {
            chatSessionId = sessionStorage.getItem('smva_chat_sid');
            if (!chatSessionId) {
                chatSessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return(c==='x'?r:(r&0x3|0x8)).toString(16);});
                sessionStorage.setItem('smva_chat_sid', chatSessionId);
            }
        }
        var toSave = chatHistory.slice(chatSavedCount);
        if (!toSave.length) return;
        var savedBefore = chatHistory.length;
        fetch(CONFIG.apiUrl + '/plugin/license/chat/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                license_key: CONFIG.licenseKey,
                internal_token: CONFIG.internalToken,
                session_id: chatSessionId,
                messages: chatHistory.slice(chatSavedCount),
            })
        }).then(function(){ chatSavedCount = savedBefore; sessionStorage.setItem('smva_chat_saved', savedBefore); }).catch(function(){});
    }

    function injectThemeStyles(theme, c) {
        var ts = document.createElement('style');
        ts.id = 'smva-theme-css';
        var existing = document.getElementById('smva-theme-css');
        if (existing) existing.remove();
        var css = '';
        if (theme === 'floating') {
            css = ['#smva-panel{border-radius:20px!important;border:none!important;box-shadow:0 12px 48px rgba(0,0,0,.18)!important}','.smva-hdr{background:#fff!important;border-bottom:0.5px solid #f0f0f0!important}','.smva-hn{color:#111827!important}.smva-hs{color:#10b981!important}','.smva-hs::before{background:#10b981!important}','.smva-x{background:rgba(0,0,0,.06)!important;color:#374151!important}','.smva-msg-bot{box-shadow:0 2px 12px rgba(0,0,0,.08)!important}','.smva-msg-user{box-shadow:0 2px 12px rgba(0,0,0,.15)!important}'].join('');
        } else if (theme === 'soft') {
            css = ['#smva-panel{border-radius:26px!important;box-shadow:0 4px 24px rgba(0,0,0,.08)!important}','.smva-hdr{background:#fff!important;border-bottom:0.5px solid #f0f0f0!important}','.smva-hn{color:#111827!important}.smva-hs{color:#10b981!important}','.smva-hs::before{background:#10b981!important}','.smva-x{background:rgba(0,0,0,.06)!important;color:#374151!important}','.smva-msg-bot{border:0.5px solid #e5e7eb!important}','.smva-voice-ft,.smva-chat-ft{background:#f9fafb!important}','.smva-input{border-radius:20px!important}','.smva-send{border-radius:50%!important}'].join('');
        } else if (theme === 'dark') {
            css = ['#smva-panel{background:#0f172a!important;border:0.5px solid rgba(99,102,241,.3)!important}','.smva-hdr{background:#0f172a!important;border-bottom:0.5px solid rgba(255,255,255,.06)!important}','.smva-hn{color:#e0e7ff!important}.smva-hs{color:#4ade80!important}','.smva-hs::before{background:#4ade80!important}','.smva-x{background:rgba(255,255,255,.1)!important;color:#e0e7ff!important}','.smva-tabs{background:#0f172a!important;border-bottom:0.5px solid rgba(255,255,255,.08)!important}','.smva-tab-btn{color:rgba(255,255,255,.4)!important}','.smva-tab-btn.active{color:#818cf8!important;border-bottom-color:#818cf8!important;background:#1e293b!important}','.smva-msgs{background:#0f172a!important}','.smva-msg-bot{background:rgba(255,255,255,.06)!important;color:#e2e8f0!important;border:0.5px solid rgba(255,255,255,.1)!important}','.smva-msg-user{background:rgba(99,102,241,.4)!important;color:#c7d2fe!important}','.smva-voice-body{background:#0a0f1e!important}','.smva-status-text{color:rgba(255,255,255,.4)!important}','.smva-timer{color:#e0e7ff!important}','.smva-voice-ft,.smva-chat-ft{background:#0f172a!important;border-top:0.5px solid rgba(255,255,255,.06)!important}','.smva-input{background:rgba(255,255,255,.06)!important;border:0.5px solid rgba(255,255,255,.12)!important;color:#e2e8f0!important}','.smva-send{background:rgba(99,102,241,.5)!important}','.smva-suggestions{border-top:0.5px solid rgba(255,255,255,.06)!important;background:#0f172a!important}','.smva-chip{background:rgba(255,255,255,.06)!important;border-color:rgba(99,102,241,.4)!important;color:#818cf8!important}','.smva-btn-start{background:#6366f1!important}','#smva-text-panel{background:#1e293b!important;border-top:0.5px solid rgba(255,255,255,.08)!important}','#smva-text-label{color:#818cf8!important}','#smva-text-input{background:rgba(255,255,255,.06)!important;border-color:rgba(99,102,241,.4)!important;color:#e2e8f0!important}','.smva-dt{background:rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.12)!important}','.smva-dt-value{color:#e2e8f0!important}','.smva-dt-label{color:rgba(226,232,240,.6)!important}','.smva-opts-title{color:rgba(226,232,240,.6)!important}','.smva-dt-btn{background:rgba(255,255,255,.1)!important;color:#e2e8f0!important;border-color:rgba(255,255,255,.15)!important}','.smva-dt-primary{background:#6366f1!important;color:#fff!important;border-color:transparent!important}'].join('');
        } else if (theme === 'glass') {
            css = ['#smva-panel{background:rgba(255,255,255,.55)!important;border:1px solid rgba(255,255,255,.8)!important;backdrop-filter:blur(20px) saturate(160%)!important;-webkit-backdrop-filter:blur(20px) saturate(160%)!important;box-shadow:0 8px 32px rgba(0,0,0,.12),inset 0 0.5px 0 rgba(255,255,255,.9)!important;border-radius:20px!important}','.smva-hdr{background:rgba(255,255,255,.35)!important;border-bottom:0.5px solid rgba(255,255,255,.6)!important}','.smva-hn{color:#1e293b!important}','.smva-hs{color:#475569!important}','.smva-hs::before{background:#10b981!important}','.smva-x{background:rgba(0,0,0,.06)!important;color:#374151!important;border:0.5px solid rgba(0,0,0,.1)!important}','.smva-tabs{background:rgba(255,255,255,.25)!important;border-bottom:0.5px solid rgba(0,0,0,.06)!important}','.smva-tab-btn{color:#64748b!important}','.smva-tab-btn.active{color:#1e293b!important;border-bottom-color:#1e293b!important;background:rgba(255,255,255,.4)!important}','.smva-msgs{background:transparent!important}','.smva-msg-bot{background:rgba(255,255,255,.6)!important;color:#1e293b!important;border:0.5px solid rgba(255,255,255,.9)!important;backdrop-filter:blur(8px)!important}','.smva-msg-user{background:rgba(30,41,59,.75)!important;color:#fff!important;backdrop-filter:blur(8px)!important}','.smva-voice-body{background:rgba(255,255,255,.2)!important}','.smva-status-text{color:#64748b!important}','.smva-timer{color:#1e293b!important}','.smva-btn-start{background:rgba(30,41,59,.8)!important;color:#fff!important;border:none!important}','.smva-btn-end{background:rgba(220,38,38,.15)!important;color:#b91c1c!important}','.smva-voice-ft,.smva-chat-ft{background:rgba(255,255,255,.3)!important;border-top:0.5px solid rgba(0,0,0,.06)!important}','.smva-input{background:rgba(255,255,255,.6)!important;border:0.5px solid rgba(0,0,0,.1)!important;color:#1e293b!important}','.smva-input::placeholder{color:#94a3b8!important}','.smva-send{background:rgba(30,41,59,.8)!important;border:none!important}','.smva-suggestions{background:rgba(255,255,255,.2)!important;border-top:0.5px solid rgba(0,0,0,.05)!important}','.smva-chip{background:rgba(255,255,255,.5)!important;border-color:rgba(0,0,0,.1)!important;color:#374151!important}','.smva-chip:hover{background:rgba(30,41,59,.8)!important;color:#fff!important;border-color:transparent!important}','#smva-text-panel{background:rgba(255,255,255,.4)!important;backdrop-filter:blur(8px)!important}'].join('');
        } else if (theme === 'gradient') {
            css = ['#smva-panel{border-radius:20px!important}','.smva-hdr{background:linear-gradient(135deg,#667eea,#764ba2)!important}','.smva-msg-user{background:linear-gradient(135deg,#667eea,#764ba2)!important}','.smva-send{background:linear-gradient(135deg,#667eea,#764ba2)!important}','.smva-btn-start{background:linear-gradient(135deg,#667eea,#764ba2)!important}','.smva-tab-btn.active{color:#764ba2!important;border-bottom-color:#764ba2!important}','.smva-chip{color:#764ba2!important;border-color:rgba(118,75,162,.3)!important}','.smva-chip:hover{background:#764ba2!important;color:#fff!important}','#smva-text-send{background:linear-gradient(135deg,#667eea,#764ba2)!important}'].join('');
        }
        if (css) { ts.textContent = css; document.head.appendChild(ts); }
    }

    function injectStyles() {
        const s = document.createElement('style');
        s.textContent = [
            /* Vazirmatn for Persian and Arabic, served from this plugin's own
               directory -- never a font CDN, which would hand every visitor of
               every customer site to a third party.

               `unicode-range` is what makes this safe to ship to everyone: a
               page with no Arabic-script text never requests the file, so an
               English site carries zero extra bytes. The subset holds no Latin
               glyphs either, so Latin keeps the system stack below.

               Skipped entirely when assetsUrl is missing (an older PHP paired
               with a newer widget.js), rather than emitting a broken url(). */
            (CONFIG.assetsUrl
                ? '@font-face{font-family:"Vazirmatn";src:url("' + CONFIG.assetsUrl + 'fonts/vazirmatn-nl-variable.woff2") format("woff2-variations");font-weight:100 900;font-style:normal;font-display:swap;unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F}'
                : ''),
            '#smva{position:fixed!important;bottom:22px!important;'+side+':22px!important;z-index:999999!important;font-family:"Vazirmatn",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
            (CONFIG.widgetStyle==="pill" ? '#smva-fab{border:none;cursor:pointer;transition:all .2s;padding:0}' : '#smva-fab{width:54px;height:54px;border-radius:50%;background:'+c+';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 16px '+c+'66;transition:all .2s;position:relative}'),
            '#smva-fab:hover{transform:scale(1.08);box-shadow:0 6px 20px '+c+'88}#smva-fab:active{transform:scale(.94)}',

            /* ── Two launchers ────────────────────────────────────────────
               On a bundle plan the two ways in are separate buttons rather
               than tabs behind one, because a tab nobody opens is a feature
               nobody knows about. They are deliberately not equals: talking is
               what this product does that a chat box cannot, so voice is the
               filled primary and chat is the quiet alternative above it. */
            '#smva-dock{display:flex;flex-direction:column;align-items:'+(R?'flex-end':'flex-start')+';gap:10px}',
            // Same size as the primary; the difference in weight comes from
            // fill against outline, not from scale.
            '#smva-fab-2{width:54px;height:54px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,.10);cursor:pointer;display:flex;align-items:center;justify-content:center;color:'+c+';box-shadow:0 1px 2px rgba(15,23,42,.05),0 8px 20px -6px rgba(15,23,42,.22);transition:transform .2s ease,box-shadow .2s ease;position:relative;padding:0}',
            '#smva-fab-2:hover{transform:scale(1.09);box-shadow:0 2px 4px rgba(15,23,42,.06),0 12px 24px -6px rgba(15,23,42,.28)}',
            '#smva-fab-2:active{transform:scale(.94)}',
            '#smva-fab-2:focus-visible{outline:2px solid '+c+';outline-offset:2px}',
            // Chat does not ring — it arrives, the way a message does.
            '#smva-fab-2.smva-nudge{animation:smva-nudge 1.5s cubic-bezier(.22,1,.36,1) 2}',
            '@keyframes smva-nudge{0%,55%,100%{transform:translateY(0)}18%{transform:translateY(-7px)}34%{transform:translateY(-2px)}}',
            '#smva-fab-2 .smva-dot{position:absolute;top:2px;'+(R?'right':'left')+':2px;width:9px;height:9px;border-radius:50%;background:'+c+';border:2px solid #fff;opacity:0;transform:scale(.4);transition:opacity .25s ease,transform .35s cubic-bezier(.16,1,.3,1)}',
            '#smva-fab-2.smva-nudge .smva-dot,#smva-fab-2.smva-waiting .smva-dot{opacity:1;transform:scale(1)}',
            // The panel and the card both have to clear whichever dock is
            // under them. The offset is measured from the real dock at build
            // time (see buildWidget) rather than a fixed number here — a
            // hardcoded px value went stale the moment the two buttons
            // changed size and started overlapping the panel by 2px.
            '#smva.smva-two #smva-panel{bottom:calc(var(--smva-dock-h, 118px) + 12px)}',
            '#smva.smva-two #smva-call{bottom:calc(var(--smva-dock-h, 118px) + 14px)}',
            '@media (prefers-reduced-motion:reduce){#smva-fab-2.smva-nudge{animation:none}}',
            '@keyframes smva-pulse{0%,100%{box-shadow:0 4px 16px '+c+'66,0 0 0 0 '+c+'44}70%{box-shadow:0 4px 16px '+c+'66,0 0 0 12px rgba(0,0,0,0)}}',
            '#smva-fab.smva-pulse{animation:smva-pulse 1.8s ease-in-out 3}',
            '#smva-bubble{position:absolute;bottom:64px;right:0;background:#fff;border-radius:12px 12px 0 12px;padding:10px 14px;font-size:13px;color:#111827;box-shadow:0 4px 16px rgba(0,0,0,.12);white-space:normal;max-width:200px;width:max-content;line-height:1.4;opacity:0;transform:translateY(6px);transition:opacity .3s,transform .3s;pointer-events:none}',
            '#smva-bubble.show{opacity:1;transform:translateY(0);pointer-events:auto}',
            '#smva-bubble::after{content:"";position:absolute;bottom:-6px;right:14px;width:12px;height:12px;background:#fff;clip-path:polygon(0 0,100% 0,100% 100%)}',

            /* ── Ringing launcher ─────────────────────────────────────────
               A real phone rocks on its axis; it does not jitter sideways.
               Rotation with a decaying amplitude reads as "ringing", and the
               two-ring-then-rest cadence is the one a phone actually uses. */
            '#smva-fab .smva-hs-ic{transform-origin:50% 62%}',
            '#smva-fab.smva-ring .smva-hs-ic{animation:smva-tilt 1.2s cubic-bezier(.36,.07,.19,.97) 2}',
            '@keyframes smva-tilt{0%,42%,100%{transform:rotate(0)}5%{transform:rotate(-14deg)}11%{transform:rotate(12deg)}17%{transform:rotate(-9deg)}23%{transform:rotate(6deg)}29%{transform:rotate(-3deg)}35%{transform:rotate(1deg)}}',
            '#smva-waves{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;color:'+c+';opacity:0}',
            '#smva-waves path{fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;opacity:0;transform-origin:50% 50%}',
            '#smva-fab.smva-ring #smva-waves{opacity:1}',
            '#smva-fab.smva-ring #smva-waves path{animation:smva-wave 1.2s ease-out 2}',
            '#smva-fab.smva-ring #smva-waves path:nth-child(2){animation-delay:.14s}',
            '@keyframes smva-wave{0%{opacity:0;transform:scale(.6)}20%{opacity:.45}100%{opacity:0;transform:scale(1.5)}}',

            /* ── Call card ──────────────────────────────────────────────── */
            '#smva-call{position:absolute;bottom:72px;'+side+':0;width:274px;max-width:calc(100vw - 44px);background:#fff;border:1px solid rgba(15,23,42,.07);border-radius:18px;padding:14px;text-align:'+(isRTL?'right':'left')+';box-shadow:0 1px 2px rgba(15,23,42,.04),0 16px 36px -12px rgba(15,23,42,.28);opacity:0;transform:translateY(12px) scale(.94);transform-origin:'+(R?'calc(100% - 27px)':'27px')+' 100%;transition:opacity .24s ease,transform .5s cubic-bezier(.16,1,.3,1);pointer-events:none;direction:'+(isRTL?'rtl':'ltr')+'}',
            '#smva-call.show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}',
            '#smva-call-top{display:flex;align-items:center;gap:11px}',
            '#smva-call-av{width:40px;height:40px;border-radius:50%;background:'+c+';color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
            '#smva-call-tx{flex:1;min-width:0}',
            // The eyebrow names what this is. It must never imply someone is
            // actually calling the visitor — the card is an offer, not a ring.
            '#smva-call-eyebrow{font-size:9.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:'+c+';display:block;margin-bottom:2px}',
            '#smva-call-name{font-size:14px;font-weight:600;color:#0f172a;letter-spacing:-.012em;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
            '#smva-call-sub{font-size:12px;line-height:1.45;color:#64748b;margin:9px 0 12px;display:block}',
            '#smva-call-acts{display:flex;align-items:center;gap:8px}',
            '#smva-call-go{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;background:'+c+';color:#fff;border:none;border-radius:11px;padding:9px 12px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;transition:filter .18s ease,transform .18s ease}',
            '#smva-call-go:hover{filter:brightness(1.08);transform:translateY(-1px)}',
            '#smva-call-go:active{transform:translateY(0)}',
            '#smva-call-no{background:none;border:none;color:#94a3b8;font-size:12.5px;font-family:inherit;cursor:pointer;padding:9px 4px;border-radius:8px;transition:color .18s ease}',
            '#smva-call-no:hover{color:#475569}',
            '#smva-call :focus-visible,#smva-fab:focus-visible{outline:2px solid '+c+';outline-offset:2px}',
            // 36px is a comfortable mouse target and a poor thumb one; on a
            // phone both controls grow to the 44px minimum.
            '@media (max-width:480px){#smva-call-go,#smva-call-no{padding-top:13px;padding-bottom:13px}#smva-call-no{padding-left:10px;padding-right:10px}}',

            /* ── Phones ───────────────────────────────────────────────────
               The panel was a fixed 360px pinned 22px from one edge, so on a
               375px screen its far edge sat 7px off-screen and the first
               character of every line was clipped. Let the whole widget span
               the viewport instead and size the panel to what is actually
               there. The dock also turns horizontal: two stacked buttons cost
               118px of a phone's vertical space, and vertical is the scarce
               axis in a thumb's reach. */
            '@media (max-width:480px){',
            '  #smva{left:12px!important;right:12px!important;bottom:16px!important}',
            '  #smva-panel{width:auto!important;left:0;right:0;max-height:calc(100vh - 130px)}',
            '  #smva-dock{flex-direction:row;justify-content:'+(R?'flex-end':'flex-start')+';gap:12px}',
            '  #smva-call{width:auto!important;max-width:none;left:0;right:0}',
            // No mobile-specific override needed here: --smva-dock-h is read
            // from the dock's real rendered height, which is already the
            // short one-row figure on this breakpoint (the dock itself goes
            // row instead of column above), so the base .smva-two rules
            // already come out right.
            '}',
            // Motion is the whole point here, so when it is unwelcome the card
            // still has to work: it simply appears, and nothing moves.
            '@media (prefers-reduced-motion:reduce){#smva-fab.smva-ring .smva-hs-ic,#smva-fab.smva-ring #smva-waves path{animation:none}#smva-fab.smva-ring #smva-waves{opacity:0}#smva-call{transition:opacity .2s ease}#smva-call,#smva-call.show{transform:none}}',
            '#smva-panel{position:absolute;bottom:66px;'+side+':0;width:360px;background:#fff;border-radius:18px;box-shadow:0 8px 40px rgba(0,0,0,.15);overflow:hidden;display:flex;flex-direction:column;transition:height .3s cubic-bezier(.4,0,.2,1),opacity .2s ease;opacity:1}',
            '#smva-panel.hide{display:none}',
            '.smva-hdr{display:flex;align-items:center;gap:10px;padding:13px 16px;background:'+c+';color:#fff}',
            '.smva-av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}',
            '.smva-hi{flex:1;min-width:0}',
            '.smva-hn{font-size:14px;font-weight:600;display:block;letter-spacing:-.01em}',
            '.smva-hs{font-size:11px;opacity:.8;display:flex;align-items:center;gap:4px}',
            '.smva-hs::before{content:"";width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block}',
            '.smva-x{background:rgba(255,255,255,.15);border:none;color:#fff;cursor:pointer;padding:5px;border-radius:6px;opacity:.85;display:flex;align-items:center;justify-content:center;transition:all .15s}.smva-x:hover{opacity:1;background:rgba(255,255,255,.25)}',
            '.smva-tabs{display:flex;border-bottom:1px solid #f0f0f0;background:#fafafa}',
            '.smva-tab-btn{flex:1;padding:11px 8px;border:none;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;color:#9ca3af;border-bottom:2px solid transparent;transition:all .2s;font-weight:500}',
            '.smva-tab-btn.active{color:'+c+';border-bottom-color:'+c+';background:#fff}',
            '.smva-tab-content{display:none;flex:1;min-height:0}.smva-tab-content.active{display:flex;flex-direction:column;overflow:hidden;min-height:0;flex:1}',
            '.smva-voice-body{padding:24px 16px;min-height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#fafafa}',
            '.smva-viz{display:flex;align-items:flex-end;justify-content:center;gap:3px;height:44px;width:100%;display:none}',
            '.smva-viz.show{display:flex}',
            '.smva-bar{width:3px;background:'+c+';border-radius:2px;animation:smvabar 1.1s ease-in-out infinite;opacity:.3}',
            '.smva-viz.active .smva-bar{animation:smvabar2 .55s ease-in-out infinite;opacity:1}',
            '.smva-timer{font-size:15px;font-weight:700;color:#374151;display:none;letter-spacing:.03em}',
            '.smva-timer.show{display:block}',
            // Drains right-to-left under the timer. Width is the only animated
            // property so this stays off the main thread on low-end phones.
            '.smva-progress{width:70%;max-width:200px;height:4px;border-radius:3px;background:#e5e7eb;overflow:hidden;display:none}',
            '.smva-progress.show{display:block}',
            '.smva-progress-fill{height:100%;width:100%;border-radius:3px;background:#22c55e;transition:width 1s linear,background-color 1s linear}',
            '.smva-status-text{font-size:12px;color:#9ca3af;text-align:center;font-weight:500}',
            '.smva-voice-ft{padding:12px 16px;border-top:1px solid #f0f0f0;display:flex;gap:8px;background:#fff}',
            '.smva-btn{flex:1;padding:11px;border-radius:10px;border:none;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s;letter-spacing:-.01em}',
            '.smva-btn-start{background:'+c+';color:#fff;box-shadow:0 2px 8px '+c+'44}.smva-btn-start:hover{filter:brightness(1.08);box-shadow:0 4px 12px '+c+'55}',
            '.smva-btn-end{background:#fee2e2;color:#b91c1c}.smva-btn-end:hover{background:#fecaca}',
            '.smva-btn.hide{display:none}',
            // NEW: text input panel
            '#smva-text-panel{display:none;padding:12px 16px 14px;border-top:1px solid #e8f0fe;background:#f0f4ff;flex-direction:column;gap:8px;flex-shrink:0}',
            '#smva-text-panel.show{display:flex}',
            '#smva-text-label{font-size:12px;font-weight:600;color:'+c+';letter-spacing:-.01em}',
            '.smva-text-input-row{display:flex;gap:8px;align-items:center}',
            '#smva-text-input{flex:1;border:1.5px solid '+c+'55;border-radius:10px;padding:9px 12px;font-size:13px;font-family:inherit;background:#fff;direction:'+(isRTL?'rtl':'ltr')+';transition:border-color .2s;color:#111827}',
            '#smva-text-input:focus{outline:none;border-color:'+c+';box-shadow:0 0 0 3px '+c+'18}',
            '#smva-text-input:disabled{opacity:.5;cursor:not-allowed}',
            '#smva-text-send{padding:9px 14px;border-radius:10px;background:'+c+';color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:filter .15s;display:flex;align-items:center;gap:5px}',
            '#smva-text-send:hover{filter:brightness(1.1)}',
            '#smva-text-send:disabled{opacity:.4;cursor:not-allowed}',
            // Chat
            '.smva-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}',
            '.smva-msgs::-webkit-scrollbar{width:4px}.smva-msgs::-webkit-scrollbar-track{background:transparent}.smva-msgs::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:2px}',
            '.smva-msg{max-width:82%;padding:10px 14px;border-radius:16px;font-size:13.5px;line-height:1.55;word-break:break-word;letter-spacing:-.01em}',
            '.smva-msg-bot{background:#f4f4f5;color:#18181b;align-self:flex-start;border-bottom-left-radius:4px}',
            '.smva-msg-user{background:'+c+';color:#fff;align-self:flex-end;border-bottom-right-radius:4px;box-shadow:0 2px 8px '+c+'33}',
            '.smva-typing{display:flex;gap:5px;padding:12px 14px;background:#f4f4f5;border-radius:16px;border-bottom-left-radius:4px;align-self:flex-start}',
            '.smva-typing span{width:7px;height:7px;background:#a1a1aa;border-radius:50%;animation:smvadot 1.2s ease-in-out infinite}',
            '.smva-typing span:nth-child(2){animation-delay:.2s}.smva-typing span:nth-child(3){animation-delay:.4s}',
            '.smva-suggestions{padding:10px 16px 14px;display:flex;flex-wrap:wrap;gap:6px;border-top:0.5px solid #f0f0f0}',
            '.smva-suggestions.hide{display:none}',
            '.smva-chip{background:#fff;border:1.5px solid '+c+'33;color:'+c+';border-radius:20px;padding:6px 14px;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}',
            '.smva-chip:hover{background:'+c+'!important;color:#fff!important;border-color:'+c+'!important;transform:translateY(-1px)}',
            '.smva-chat-ft{padding:12px 16px;border-top:1px solid #f0f0f0;background:#fafafa}',
            '.smva-input-row{display:flex;gap:8px;align-items:flex-end}',
            '.smva-input{flex:1;border:1.5px solid #e5e7eb;border-radius:12px;padding:10px 14px;font-size:13.5px;resize:none;max-height:100px;direction:'+(isRTL?'rtl':'ltr')+';background:#fff;line-height:1.4;font-family:inherit;transition:border-color .2s}',
            '.smva-input:focus{outline:none;border-color:'+c+';box-shadow:0 0 0 3px '+c+'18}',
            '.smva-send{width:40px;height:40px;border-radius:11px;background:'+c+';border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;box-shadow:0 2px 8px '+c+'44}',
            '.smva-send:hover{filter:brightness(1.08);transform:scale(1.05)}.smva-send:disabled{opacity:.45;cursor:wait;transform:none}',
            '.smva-limit-banner{padding:10px 16px;background:#fffbeb;color:#92400e;font-size:12px;border-bottom:1px solid #fde68a;text-align:'+(isRTL?'right':'left')+'}',
            '.smva-limit-banner a{color:'+c+';font-weight:600;text-decoration:none}',
            '.smva-cta-body{padding:24px 20px;text-align:center}',
            '.smva-cta-title{font-size:15px;font-weight:700;color:#111827;margin:0 0 8px}',
            '.smva-cta-body p{font-size:12.5px;color:#6b7280;line-height:1.5;margin:0 0 16px}',
            '.smva-cta-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:'+c+';color:#fff;border:none;border-radius:10px;padding:11px 20px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;width:100%;box-sizing:border-box;box-shadow:0 2px 8px '+c+'44}',
            '.smva-cta-btn:hover{filter:brightness(1.08)}',
            '.smva-cta-icon{font-size:36px;margin-bottom:10px}',
            '@keyframes smvabar{0%,100%{height:6px}50%{height:20px}}',
            '@keyframes smvabar2{0%,100%{height:10px}50%{height:36px}}',
            '@keyframes smvadot{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}',
        ].join('');
        document.head.appendChild(s);
    }

    function buildCTA() {
        const w = document.createElement('div'); w.id = 'smva';
        w.innerHTML = ''
            + '<div id="smva-panel" class="hide">'
                + '<div class="smva-hdr"><div class="smva-av">' + GEM_IC + '</div><div class="smva-hi"><span class="smva-hn">' + esc(CONFIG.businessName) + '</span><span class="smva-hs">' + esc(t('limit_reached')) + '</span></div><button class="smva-x" id="smva-x">' + CLOSE_IC + '</button></div>'
                + '<div class="smva-cta-body"><div class="smva-cta-icon">💎</div><h3 class="smva-cta-title">' + esc(t('upgrade_title')) + '</h3><p>' + esc(t('upgrade_body')) + '</p><a class="smva-cta-btn" href="' + esc(CONFIG.pricingUrl) + '" target="_blank" rel="noopener">' + esc(t('upgrade_btn')) + ' →</a></div>'
            + '</div>'
            + '<button id="smva-fab" title="' + esc(t('upgrade_title')) + '">' + AI_IC + '</button>';
        document.body.appendChild(w);
        h('smva-fab').addEventListener('click', function() { h('smva-panel').classList.toggle('hide'); });
        h('smva-x').addEventListener('click', function() { h('smva-panel').classList.add('hide'); });
    }

    window.smvaCallBarI18n = {on_call:'On call', end_call:'End Call'};
    function buildWidget() {
        // expose call-bar i18n for use outside closure
        window.smvaCallBarI18n = { on_call: t('on_call'), end_call: t('end_call') };
        if (!caps.voice && !caps.chat) { buildCTA(); return; }

        const questions = Array.isArray(CONFIG.suggestedQuestions) ? CONFIG.suggestedQuestions : [];
        // Quick Action buttons (Voice AI → Automation) were seeded on activation —
        // "Book Appointment" among them — but nothing ever rendered them; this
        // is the only discoverable way a visitor starts a booking conversation
        // rather than having to think to ask for one. Same chip, same click
        // handler as a suggested question: data-q carries the message to send,
        // the button's own label is only ever the caption shown.
        const workflowButtons = Array.isArray(CONFIG.workflowButtons) ? CONFIG.workflowButtons : [];
        const workflowChips = workflowButtons
            .filter(b => b && b.label && b.message)
            .map(b => '<button class="smva-chip smva-wf-chip" data-q="' + esc(b.message) + '">' + esc(b.label) + '</button>')
            .join('');
        const chipsHtml = (questions.length > 0 || workflowChips)
            ? '<div class="smva-suggestions" id="smva-suggestions">' + workflowChips
                + questions.map(q => '<button class="smva-chip" data-q="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div>'
            : '';

        // The dock now IS the voice/chat picker (separate phone and chat
        // buttons). A second picker inside the panel would just repeat that
        // choice, so it only remains for 'pill' — the one style with a single
        // external launcher and therefore no other way to switch.
        const tabsBar = (caps.voice && caps.chat && CONFIG.widgetStyle === 'pill')
            ? '<div class="smva-tabs"><button class="smva-tab-btn ' + (activeTab==='voice'?'active':'') + '" id="smva-tab-voice">' + MIC.replace('18','14') + ' ' + t('voice') + '</button><button class="smva-tab-btn ' + (activeTab==='chat'?'active':'') + '" id="smva-tab-chat">' + CHAT_IC.replace('18','14') + ' ' + t('chat') + '</button></div>'
            : '';

        const voicePanel = caps.voice
            ? '<div class="smva-tab-content ' + (activeTab==='voice'?'active':'') + '" id="smva-voice-tab">'
                + '<div class="smva-voice-body">'
                    + '<div class="smva-viz" id="smva-viz"><span class="smva-bar"></span><span class="smva-bar" style="animation-delay:.1s"></span><span class="smva-bar" style="animation-delay:.2s"></span><span class="smva-bar" style="animation-delay:.3s"></span><span class="smva-bar" style="animation-delay:.4s"></span></div>'
                    + '<div class="smva-timer" id="smva-timer">00:00</div>'
                    + '<div class="smva-progress" id="smva-progress"><div class="smva-progress-fill" id="smva-progress-fill"></div></div>'
                    + '<div class="smva-status-text" id="smva-voice-status">' + t('ready') + '</div>'
                    + '<div class="smva-speak-hint" id="smva-speak-hint" style="display:none;font-size:11px;color:' + c + ';background:' + c + '11;border:1px solid ' + c + '33;border-radius:20px;padding:5px 14px;margin-top:4px;text-align:center;opacity:0;transition:opacity 1s ease">' + t('speak_hint') + '</div>'
                + '</div>'
                + '<div class="smva-voice-ft">'
                    + '<button class="smva-btn smva-btn-start" id="smva-start">' + MIC + ' ' + t('start_call') + '</button>'
                    + '<button class="smva-btn smva-btn-end hide" id="smva-end">' + END_IC + ' ' + t('end_call') + '</button>'
                + '</div>'
              + '</div>'
            : '';

        // Typed input panel — hidden by default, shown when the agent requests it.
        // Deliberately a sibling of the tab contents rather than a child of the
        // voice tab: display_text and options both switch the view to the chat
        // tab, which would hide an input living in the voice tab at exactly the
        // moment the agent is waiting for it to be filled in. The visitor then
        // types into the chat box instead, which is a separate session with none
        // of the call's context.
        const textInputPanel = caps.voice
            ? '<div id="smva-text-panel">'
                + '<div id="smva-text-label">' + t('type_response') + '</div>'
                + '<div class="smva-text-input-row">'
                    + '<input type="text" id="smva-text-input" placeholder="" autocomplete="off">'
                    + '<button id="smva-text-send">' + SEND_IC + '</button>'
                + '</div>'
              + '</div>'
            : '';

        const chatPanel = caps.chat
            ? '<div class="smva-tab-content ' + (activeTab==='chat'?'active':'') + '" id="smva-chat-tab">'
                + '<div class="smva-msgs" id="smva-msgs"></div>'
                + chipsHtml
                + '<div class="smva-chat-ft"><div class="smva-input-row"><textarea class="smva-input" id="smva-input" placeholder="' + t('placeholder') + '" rows="1"></textarea><button class="smva-send" id="smva-send">' + SEND_IC + '</button></div></div>'
              + '</div>'
            : '';

        const w = document.createElement('div'); w.id = 'smva';
        w.innerHTML = ''
            + '<div id="smva-panel" class="hide">'
                + '<div class="smva-hdr"><div class="smva-av">' + GEM_IC + '</div><div class="smva-hi"><span class="smva-hn">' + esc(CONFIG.businessName) + '</span><span class="smva-hs" id="smva-status">' + t('online') + '</span></div><button class="smva-x" id="smva-x">' + CLOSE_IC + '</button></div>'
                + tabsBar + voicePanel + chatPanel + textInputPanel
            + '</div>'
            + (CONFIG.widgetStyle === 'pill'
                ? '<button id="smva-fab" style="display:flex!important;align-items:center;gap:10px;background:#fff!important;border-radius:50px;padding:8px 14px 8px 8px;box-shadow:0 2px 16px rgba(0,0,0,0.12);cursor:pointer;min-width:200px;position:fixed!important;bottom:22px!important;'+side+':22px!important;z-index:999999!important"><div style="width:36px;height:36px;border-radius:50%;background:'+c+';display:flex;align-items:center;justify-content:center">' + AI_IC + '</div><span style="flex:1;font-size:13px;font-weight:500;color:#374151">' + esc(CONFIG.pillText) + '</span><div style="width:32px;height:32px;border-radius:50%;background:'+c+';display:flex;align-items:center;justify-content:center">' + CHAT_IC.replace('18','15') + '</div></button>'
                // The dock carries one button per capability: a voice-only plan
                // gets a handset, a chat-only plan a bubble, a bundle both.
                : '<div id="smva-dock">'
                    + (caps.voice && caps.chat
                        ? '<button id="smva-fab-2" type="button" aria-label="' + esc(t('start_chat')) + '">' + CHAT_IC.replace('width="18" height="18"', 'width="21" height="21"') + '<span class="smva-dot"></span></button>'
                        : '')
                    + '<button id="smva-fab" type="button" aria-label="' + esc(caps.voice ? t('start_call') : t('start_chat')) + '">'
                        // A chat-only plan gets the same bubble the secondary
                        // button uses, so the mark for "chat" is one thing
                        // everywhere rather than two.
                        + (caps.voice ? PHONE_IC + WAVES_SVG : CHAT_IC.replace('width="18" height="18"', 'width="22" height="22"'))
                    + '</button>'
                  + '</div>');

        document.body.appendChild(w);
        if (CONFIG.widgetStyle !== 'pill' && caps.voice && caps.chat) {
            w.classList.add('smva-two');
            // Measured, not guessed: border widths, box-sizing and the
            // desktop-stacked vs. mobile-side-by-side dock are all real by
            // this point (the dock is already in the DOM), so this always
            // matches whatever actually rendered instead of drifting out of
            // sync the next time a button's size changes.
            var dockEl = h('smva-dock');
            if (dockEl) w.style.setProperty('--smva-dock-h', dockEl.offsetHeight + 'px');
        }

        /** Both launchers open the same panel; they differ only in which side
         *  of it the visitor lands on. */
        function openPanel(tab) {
            var panel = h('smva-panel');
            if (!panel) return;
            var hidden    = panel.classList.contains('hide');
            var switching = !!tab && caps.voice && caps.chat && activeTab !== tab;

            // Pressing the launcher you are already on closes the panel.
            // Pressing the other one moves you there rather than closing it.
            if (!hidden && !switching) {
                panel.classList.add('hide');
                panel.style.height = '';
                return;
            }
            if (switching) switchTab(tab);
            panel.classList.remove('hide');
            if (activeTab === 'chat') {
                panel.style.height = '520px';
                var msgs = h('smva-msgs');
                if (msgs) setTimeout(function(){ msgs.scrollTop = msgs.scrollHeight; }, 50);
            }
        }

        h('smva-fab').addEventListener('click', function() {
            if (!caps.voice) { openPanel('chat'); return; }
            var panel = h('smva-panel');
            // "Already looking at the live voice tab" is the one case this
            // click means close (handled inside openPanel) rather than dial —
            // covers both a fresh open and switching over from chat.
            var closing = panel && !panel.classList.contains('hide') && activeTab === 'voice';
            openPanel('voice');
            // The handset dials on the spot. Landing on a screen whose only
            // content is another "start call" button makes the visitor ask
            // twice for the one thing they already asked for. This is a real
            // click, so the mic prompt is allowed to fire from here. Guarded
            // both ways: a call already running must not be restarted (the ✕
            // hides the panel without hanging up, so voiceState can still be
            // 'active' behind a closed panel), and the close gesture above
            // must never dial.
            if (!closing && voiceState === 'idle') startCall();
        });
        if (h('smva-fab-2')) {
            h('smva-fab-2').addEventListener('click', function() {
                h('smva-fab-2').classList.remove('smva-waiting');
                openPanel('chat');
            });
        }
        h('smva-x').addEventListener('click', function() {
            var panel = h('smva-panel');
            panel.classList.add('hide');
            panel.style.height = '';
        });

        // Only present for 'pill' now (see tabsBar above) — guarded rather
        // than gated on widgetStyle again, so this stays correct if that
        // condition ever changes on just one side.
        if (h('smva-tab-voice')) h('smva-tab-voice').addEventListener('click', () => switchTab('voice'));
        if (h('smva-tab-chat'))  h('smva-tab-chat').addEventListener('click',  () => switchTab('chat'));

        if (caps.voice) {
            h('smva-start').addEventListener('click', startCall);
            h('smva-end').addEventListener('click', function () { endCall('user_ended'); });

            // Text input panel submit
            const textSendBtn = h('smva-text-send');
            const textInput   = h('smva-text-input');
            if (textSendBtn && textInput) {
                function submitTextInput() {
                    const val = textInput.value.trim();
                    if (!val || !ws || ws.readyState !== WebSocket.OPEN) return;
                    const field = textInput.dataset.field || '';
                    const label = textInput.dataset.label || '';
                    const eventId = 'txt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                    window.SMVAAudioDebug = window.SMVAAudioDebug || {};
                    window.SMVAAudioDebug.lastTextInputSentAt = Date.now();
                    window.SMVAAudioDebug.lastTextInputField = field;
                    window.SMVAAudioDebug.lastTextInputLabel = label;
                    window.SMVAAudioDebug.lastTextInputEventId = eventId;

                    saveLeadFragment(field, label, val, 'Voice typed response');

                    // Compatibility payload: send the semantic event most voice backends expect.
                    // The legacyType field keeps compatibility with older handlers that called it text_input.
                    const textPayload = {
                        type: 'text_response',
                        legacyType: 'text_input',
                        eventId: eventId,
                        sessionId: widgetSessionId,
                        text: val,
                        value: val,
                        response: val,
                        input: val,
                        field: field,
                        fieldName: field,
                        label: label,
                        source: 'widget_text_panel'
                    };
                    const wsMessageBefore = window.SMVAAudioDebug.lastWsMessageAt || 0;
                    ws.send(JSON.stringify(textPayload));
                    // Fallback for older backends that only listen for `text_input`.
                    setTimeout(function() {
                        if (!ws || ws.readyState !== WebSocket.OPEN) return;
                        const lastAck = window.SMVAAudioDebug.lastTextInputAckAt || 0;
                        const lastMsg = window.SMVAAudioDebug.lastWsMessageAt || 0;
                        if (lastAck < Date.now() - 500 && lastMsg <= wsMessageBefore) {
                            const legacyPayload = Object.assign({}, textPayload, { type: 'text_input', fallback: true });
                            ws.send(JSON.stringify(legacyPayload));
                            window.SMVAAudioDebug.lastTextInputFallbackAt = Date.now();
                        }
                    }, 900);

                    textInput.value = '';
                    textInput.disabled = true;
                    textSendBtn.disabled = true;
                    const vs = h('smva-voice-status');
                    if (vs) vs.textContent = 'Thanks — one moment…';

                    // If the backend does not acknowledge, do not leave the visitor stuck forever.
                    setTimeout(function() {
                        if (!textInput || !textSendBtn) return;
                        if (textInput.disabled && ws && ws.readyState === WebSocket.OPEN) {
                            textInput.disabled = false;
                            textSendBtn.disabled = false;
                            const status = h('smva-voice-status');
                            if (status && voiceState === 'active') status.textContent = t('on_call');
                            window.SMVAAudioDebug.textInputAckTimeouts = (window.SMVAAudioDebug.textInputAckTimeouts || 0) + 1;
                        }
                    }, 8000);
                }
                textSendBtn.addEventListener('click', submitTextInput);
                textInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submitTextInput(); }
                });
            }
        }

        if (caps.chat) {
            h('smva-send').addEventListener('click', sendChatMessage);
            h('smva-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
            });
            const suggestionsEl = h('smva-suggestions');
            if (suggestionsEl) {
                suggestionsEl.addEventListener('click', (e) => {
                    const chip = e.target.closest('.smva-chip');
                    if (!chip) return;
                    const q = chip.getAttribute('data-q');
                    if (q) { hideSuggestions(); h('smva-input').value = q; sendChatMessage(); }
                });
            }
        }
    }

    function hideSuggestions() {
        const el = h('smva-suggestions');
        if (el) el.classList.add('hide');
        suggestionsShown = false;
    }

    function switchTab(tab) {
        if (!caps.voice || !caps.chat) return;
        activeTab = tab;
        // Not present outside 'pill' (see tabsBar) — the panel's own content
        // (voice orb vs. chat thread) already makes the mode unambiguous.
        if (h('smva-tab-voice')) h('smva-tab-voice').classList.toggle('active', tab === 'voice');
        if (h('smva-tab-chat'))  h('smva-tab-chat').classList.toggle('active', tab === 'chat');
        h('smva-voice-tab').classList.toggle('active', tab === 'voice');
        h('smva-chat-tab').classList.toggle('active', tab === 'chat');
        var panel = h('smva-panel');
        if (panel) {
            if (tab === 'chat') {
                var maxH = Math.floor(window.innerHeight * 0.65);
                var targetH = Math.min(maxH, 600);
                if (!panel.style.height || panel.style.height === '') panel.style.height = panel.offsetHeight + 'px';
                requestAnimationFrame(function() { panel.style.height = targetH + 'px'; });
            } else {
                panel.style.height = '';
            }
        }
        if (tab === 'chat') {
            var msgs = h('smva-msgs');
            if (msgs) setTimeout(function(){ msgs.scrollTop = msgs.scrollHeight; }, 50);
        }
    }

    async function refreshQuota() {
        if (!CONFIG.ajaxUrl) return;
        try {
            const res = await fetch(CONFIG.ajaxUrl + '?action=smva_widget_quota', { method: 'GET', credentials: 'same-origin' });
            if (!res.ok) return;
            const json = await res.json();
            if (!json || !json.success) return;
            const q = json.data || {};
            const newCaps = { voice: CONFIG.voiceEnabled && !!q.voice_available, chat: CONFIG.chatEnabled && !!q.chat_available };
            if (newCaps.voice === caps.voice && newCaps.chat === caps.chat) return;
            if (voiceState === 'active') return;
            location.reload();
        } catch (e) {}
    }
    setInterval(refreshQuota, 5 * 60 * 1000);

    async function startCall() {
        if (!caps.voice) return;
        try {
            voiceState = 'connecting';
            if (CONFIG.callCooldown > 0 && lastCallEnd > 0) {
                const elapsed = Math.floor((Date.now() - lastCallEnd) / 1000);
                const remaining = CONFIG.callCooldown - elapsed;
                if (remaining > 0) {
                    var vs = h('smva-voice-status');
                    var startBtn = h('smva-start');
                    var timerEl = h('smva-timer');
                    if (vs) vs.textContent = t('cooldown');
                    if (timerEl) { timerEl.classList.add('show'); timerEl.style.color = '#f59e0b'; }
                    if (startBtn) { startBtn.disabled = true; startBtn.style.opacity = '0.4'; }
                    var rem = remaining;
                    if (timerEl) timerEl.textContent = '⏳ ' + rem + 's';
                    var cdTimer = setInterval(function() {
                        rem--;
                        if (timerEl) timerEl.textContent = '⏳ ' + rem + 's';
                        if (rem <= 0) {
                            clearInterval(cdTimer);
                            if (startBtn) { startBtn.disabled = false; startBtn.style.opacity = ''; }
                            if (timerEl) { timerEl.classList.remove('show'); timerEl.style.color = ''; timerEl.textContent = '00:00'; }
                            if (vs) vs.textContent = t('ready');
                        }
                    }, 1000);
                    return;
                }
            }

            setSt(t('connecting'));
            h('smva-start').classList.add('hide');
            h('smva-end').classList.remove('hide');
            h('smva-voice-status').textContent = t('connecting');

            traceCallBegin();
            const micRequestedAt = traceNow();
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
            traceAdd('mic_ready', { waitMs: Math.round(traceNow() - micRequestedAt) });

            const wsOpenedAt = traceNow();
            ws = new WebSocket(CONFIG.wsUrl + '?token=' + CONFIG.internalToken);

            ws.onopen = () => {
                traceAdd('ws_open', { connectMs: Math.round(traceNow() - wsOpenedAt) });
                ws.send(JSON.stringify({ type: 'start', licenseKey: CONFIG.internalToken, sessionId: widgetSessionId, sessionType: 'voice', isChatOnly: false, callCooldown: CONFIG.callCooldown || 20, maxCallDuration: CONFIG.maxCallDuration || 10, silenceTimeout: CONFIG.silenceTimeout || 60 }));
                voiceState = 'active';
                setSt(t('on_call'));
                h('smva-voice-status').textContent = t('on_call');
                h('smva-viz').classList.add('show', 'active');
                h('smva-timer').classList.add('show');
                const hintEl = h('smva-speak-hint');
                if (hintEl) { hintEl.style.opacity = '0'; hintEl.style.display = 'block'; setTimeout(function(){ hintEl.style.opacity = '1'; }, 50); }
                callSeconds = 0;
                // Provisional until setup_complete lands, so the bar is drawn
                // from the first tick instead of appearing a second late.
                callLimitSecs = CONFIG.maxCallDuration > 0 ? CONFIG.maxCallDuration * 60 : 0;
                var pf0 = h('smva-progress-fill');
                if (pf0) { pf0.style.width = '100%'; pf0.style.backgroundColor = progressColor(1); }
                updateTimer();
                callTimer = setInterval(updateTimer, 1000);
                startAudioCapture();
            };

            ws.onmessage = async (e) => {
                try {
                    const data = JSON.parse(e.data);
                    window.SMVAAudioDebug = window.SMVAAudioDebug || {};
                    window.SMVAAudioDebug.lastWsMessageType = data.type || '';
                    window.SMVAAudioDebug.lastWsMessageAt = Date.now();
                    // Audio is traced separately below with its byte count; every
                    // other message is recorded by type only, never by content.
                    if (data.type !== 'audio') traceAdd('rx', { msg: data.type || '?', code: data.code || undefined });

                    // The backend clamps the site's setting against its own
                    // ceiling, so its number — not ours — is the one the
                    // countdown must be drawn against.
                    if (data.type === 'setup_complete' && typeof data.limitMs === 'number' && data.limitMs > 0) {
                        callLimitSecs = Math.round(data.limitMs / 1000);
                    }

                    if (data.type === 'thinking') {
                        const el = h('smva-voice-status');
                        if (el) { el.textContent = data.text; setTimeout(() => { if (voiceState === 'active') el.textContent = t('on_call'); }, 4000); }
                    }

                    if (data.type === 'audio') {
                        const mime = data.mimeType || 'audio/pcm;rate=24000';
                        const rateM = /rate=(\d+)/i.exec(String(mime));
                        traceAudioIn(Math.floor(String(data.audio || '').length * 3 / 4), rateM ? parseInt(rateM[1], 10) : 24000);
                        audioQueue.push({ audio: data.audio, mimeType: mime });
                        if (!isPlayingAudio) playNextAudio();
                    } else if (data.type === 'chat_response') {
                        isTyping = false;
                        addChatMessage('bot', data.text);
                        chatHistory.push({ role: 'bot', content: data.text });
                        saveChatHistory();

                    // ── Feature A: agent said goodbye → close call + widget ──
                    } else if (data.type === 'end_call') {
                        const delay = typeof data.delay === 'number' ? data.delay : 2000;
                        // Running out of time is not the same as the assistant
                        // deciding it is done: the visitor did not ask to
                        // leave, so the widget stays open and simply returns to
                        // idle, ready for another call once the cooldown ends.
                        const timeUp = data.reason === 'max_duration';
                        const vs = h('smva-voice-status');
                        if (vs) vs.textContent = data.message || t(timeUp ? 'call_time_up' : 'call_ended_by_agent');
                        agentEndedCall = !timeUp;
                        setTimeout(() => {
                            endCall(timeUp ? 'max_duration' : undefined);
                            if (!timeUp) {
                                const panel = h('smva-panel');
                                if (panel) panel.classList.add('hide');
                            } else {
                                const vs2 = h('smva-voice-status');
                                if (vs2) vs2.textContent = t('call_time_up');
                            }
                        }, delay);

                    // ── Feature B: agent requests typed input → open text panel ──
                    } else if (data.type === 'text_input_request') {
                        const panel   = h('smva-text-panel');
                        const label   = h('smva-text-label');
                        const input   = h('smva-text-input');
                        const sendBtn = h('smva-text-send');
                        if (panel && label && input) {
                            label.textContent   = data.label       || t('type_response');
                            input.placeholder   = data.placeholder || '';
                            input.dataset.field = data.field       || '';
                            input.dataset.label = data.label       || '';
                            input.disabled      = false;
                            if (sendBtn) sendBtn.disabled = false;
                            panel.classList.add('show');
                            setTimeout(() => input.focus(), 100);
                            // Silence the mic for as long as the prompt is open. Left
                            // live, ambient sound while the visitor types becomes a
                            // second, competing account of the same turn.
                            micMuted = true;
                        }

                    // ── Feature B: backend confirmed receipt → re-enable input ──
                    } else if (data.type === 'display_text') { renderDisplayText(data);
                    } else if (data.type === 'options') { renderOptions(data);
                    } else if (data.type === 'text_input_received' || data.type === 'text_response_received' || data.type === 'lead_captured') {
                        if (data.type === 'lead_captured' && data.lead) {
                            saveLeadComplete(data.lead, 'Voice lead capture');
                        }
                        const input   = h('smva-text-input');
                        const sendBtn = h('smva-text-send');
                        if (input)   { input.disabled = false; input.value = ''; }
                        if (sendBtn) sendBtn.disabled = false;
                        const panel = h('smva-text-panel');
                        if (panel && (data.type === 'lead_captured' || data.closePanel)) panel.classList.remove('show');
                        const vs = h('smva-voice-status');
                        if (vs && voiceState === 'active') vs.textContent = data.message || t('on_call');
                        window.SMVAAudioDebug.lastTextInputAckAt = Date.now();
                        window.SMVAAudioDebug.lastTextInputAckType = data.type;
                        // Submitted (or the backend moved on without one) — the mic
                        // was only ever muted for the duration of this prompt.
                        micMuted = false;

                    } else if (data.type === 'error' && data.code === 'quota_exceeded') {
                        endCall();
                        setTimeout(refreshQuota, 500);
                    } else if (data.type === 'error' && data.code === 'cooldown_active') {
                        endCall();
                        var waitSec = parseInt((data.message || '').match(/\d+/) || [20]) || 20;
                        var vs = h('smva-voice-status'); if (vs) vs.textContent = t('cooldown');
                        var startBtn = h('smva-start');
                        if (startBtn) {
                            startBtn.disabled = true; startBtn.style.opacity = '0.5';
                            var remaining = waitSec;
                            var cdTimer = setInterval(function() {
                                remaining--;
                                if (startBtn) startBtn.textContent = '⏳ ' + remaining + 's';
                                if (remaining <= 0) { clearInterval(cdTimer); startBtn.disabled = false; startBtn.style.opacity = ''; startBtn.innerHTML = '🎙 ' + t('start_call'); if (vs) vs.textContent = t('ready'); }
                            }, 1000);
                        }
                    } else if (data.type === 'error' && data.code === 'rate_limit') {
                        endCall();
                        var vs2 = h('smva-voice-status'); if (vs2) vs2.textContent = t('rate_limit');
                        var startBtn2 = h('smva-start');
                        if (startBtn2) {
                            startBtn2.disabled = true; startBtn2.style.opacity = '0.5';
                            setTimeout(function() { if (startBtn2) { startBtn2.disabled = false; startBtn2.style.opacity = ''; startBtn2.innerHTML = '🎙 ' + t('start_call'); } if (vs2) vs2.textContent = t('ready'); }, 180000);
                        }
                    }
                } catch (err) { console.error('[SMVA] WS error:', err); }
            };

            ws.onerror = () => { traceAdd('ws_error'); endCall('ws_error'); };
            ws.onclose = (evt) => {
                traceAdd('ws_close', { code: evt.code, wasClean: !!evt.wasClean });
                if (traceCall) traceCall.wsCloseCode = evt.code;
                if (agentEndedCall) { setTimeout(() => { const panel = h('smva-panel'); if (panel) panel.classList.add('hide'); agentEndedCall = false; }, 500); }
                if (evt.code === 4004) { endCall('trial_expired'); setSt('Your trial has expired. Please upgrade your plan.');
                } else if (evt.code === 4003) { endCall('quota_exceeded'); setSt('Monthly usage limit reached. Please upgrade.');
                } else if (evt.code === 4001 || evt.code === 4002) { endCall('license_inactive'); setSt('License inactive. Please check your plan.');
                } else if (evt.code === 4005) { endCall('upstream_unavailable'); setSt('Voice service is temporarily unavailable. Please try again in a moment.');
                } else if (voiceState !== 'idle') { endCall('ws_closed_' + evt.code); }
            };

        } catch (error) {
            console.error('[SMVA] Start call error:', error);
            var msg = 'Could not start call. Please try again.';
            if (error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) msg = 'Microphone access denied. Please allow microphone access in your browser settings and try again.';
            else if (error && error.name === 'NotFoundError') msg = 'No microphone detected. Please connect a headset or microphone and try again.';
            else if (error && error.name === 'NotReadableError') msg = 'Microphone is in use by another application. Please close other apps and try again.';
            else if (error && error.name === 'OverconstrainedError') msg = 'Microphone does not support the required audio settings. Please try a different device.';
            alert(msg);
            endCall();
        }
    }

    function endCall(reason) {
        // Close the trace first: it must see the in-flight reply before
        // stopPlayback() clears the queue. Repeat calls are harmless.
        traceCallEnd(reason || (agentEndedCall ? 'agent_ended' : 'user_ended'));
        if (agentEndedCall) { const panel = h('smva-panel'); if (panel) panel.classList.add('hide'); agentEndedCall = false; }
        voiceState = 'idle';
        micMuted = false;
        lastCallEnd = Date.now();
        setSt(t('ready'));
        const vs = h('smva-voice-status'); if (vs) vs.textContent = t('ready');
        const st = h('smva-start'); if (st) { st.classList.remove('hide'); st.disabled = false; st.style.opacity = ''; }
        const en = h('smva-end'); if (en) en.classList.add('hide');
        const vz = h('smva-viz'); if (vz) vz.classList.remove('show', 'active');
        const tm = h('smva-timer'); if (tm) tm.classList.remove('show');
        const pw = h('smva-progress'); if (pw) pw.classList.remove('show');
        const hint = h('smva-speak-hint'); if (hint) { hint.style.opacity = '0'; hint.style.display = 'none'; }
        // NEW: hide text input panel
        const textPanel = h('smva-text-panel'); if (textPanel) textPanel.classList.remove('show');
        const textInput = h('smva-text-input'); if (textInput) { textInput.value = ''; textInput.disabled = false; }
        const textSend  = h('smva-text-send');  if (textSend)  textSend.disabled = false;
        if (callTimer) { clearInterval(callTimer); callTimer = null; }
        stopPlayback();
        if (ws) { try { ws.send(JSON.stringify({ type: 'stop' })); } catch(e){} try { ws.close(); } catch(e){} ws = null; }
        if (audioCaptureNode) { try { audioCaptureNode.disconnect(); } catch(e) {} if (audioCaptureNode.port) { try { audioCaptureNode.port.onmessage = null; } catch(e) {} } audioCaptureNode = null; }
        if (audioCaptureSource) { try { audioCaptureSource.disconnect(); } catch(e) {} audioCaptureSource = null; }
        if (mediaStream) { mediaStream.getTracks().forEach(tr => tr.stop()); mediaStream = null; }
        if (audioContext) { try { audioContext.suspend(); } catch(e) {} try { audioContext.close(); } catch(e) {} audioContext = null; }
        callSeconds = 0;
        setTimeout(refreshQuota, 1500);
    }

    async function startAudioCapture() {
        if (!mediaStream || !ws || ws.readyState !== WebSocket.OPEN) return;
        if (audioCaptureNode) return;

        const TARGET_SAMPLE_RATE = 16000;
        const TARGET_CHUNK_SIZE = 320; // 20ms at 16kHz. Keeps WebSocket audio packets stable.

        // Levels are peak amplitude of a frame, PCM16 so full scale is 32768.
        const VOICE_ACTIVITY_LEVEL = 800;   // ~2.4% — any sound, used only for the UI hint
        const BARGE_IN_LEVEL       = 2600;  // ~8% — deliberate speech, not room noise or echo residue
        const BARGE_IN_FRAMES      = 6;     // 120ms of sustained level before believing it
        const BARGE_IN_GRACE_MS    = 400;   // let a reply get going before it can be cut off
        const BARGE_IN_COOLDOWN_MS = 1000;  // one interrupt per second at most

        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: TARGET_SAMPLE_RATE });
        if (audioContext.state === 'suspended') { try { await audioContext.resume(); } catch(e) {} }
        audioCaptureSource = audioContext.createMediaStreamSource(mediaStream);

        // Exposed for troubleshooting from the browser console:
        // window.SMVAAudioDebug
        window.SMVAAudioDebug = window.SMVAAudioDebug || {};
        window.SMVAAudioDebug.inputSampleRate = audioContext.sampleRate;
        window.SMVAAudioDebug.targetSampleRate = TARGET_SAMPLE_RATE;
        window.SMVAAudioDebug.targetChunkSize = TARGET_CHUNK_SIZE;
        window.SMVAAudioDebug.chunksSent = 0;
        window.SMVAAudioDebug.lastChunkLength = 0;
        window.SMVAAudioDebug.lastMaxVal = 0;

        const handleCapturedAudio = (pcmBuffer, maxVal, samplesLength) => {
            if (!ws || ws.readyState !== WebSocket.OPEN || !pcmBuffer) return;
            if (micMuted) return;
            window.SMVAAudioDebug.chunksSent += 1;
            window.SMVAAudioDebug.lastChunkLength = samplesLength || (pcmBuffer.byteLength / 2);
            window.SMVAAudioDebug.lastMaxVal = maxVal || 0;
            window.SMVAAudioDebug.lastSentAt = Date.now();
            // Bucketed to 500ms: at 50 frames/sec, one event per frame would
            // fill the ring in a minute and drown out everything else.
            traceMicChunk(maxVal);

            const bytes = new Uint8Array(pcmBuffer);
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }
            ws.send(JSON.stringify({ type: 'audio', audio: btoa(binary), sampleRate: TARGET_SAMPLE_RATE }));

            // Any sound at all is enough to retire the "speak now" hint.
            if (maxVal > VOICE_ACTIVITY_LEVEL) {
                const hint = h('smva-speak-hint');
                if (hint && hint.style.display !== 'none') { hint.style.opacity = '0'; setTimeout(function(){ hint.style.display = 'none'; }, 1000); }
            }

            // Interrupting the agent is destructive: it stops playback here and
            // makes the backend discard the rest of the generated reply. It must
            // therefore take real speech, not one loud frame. Each frame is 20ms,
            // so a single spike — a cough, a keystroke, or the agent's own voice
            // leaking back through imperfect echo cancellation — used to cut the
            // reply off. Require sustained level, leave the opening of a reply
            // alone, and rate-limit so one noisy moment cannot fire repeatedly.
            if (maxVal > BARGE_IN_LEVEL) { bargeInFrames += 1; } else { bargeInFrames = 0; }

            const nowMs = Date.now();
            const sustained     = bargeInFrames >= BARGE_IN_FRAMES;
            const pastGrace     = playbackStartedAt && (nowMs - playbackStartedAt) > BARGE_IN_GRACE_MS;
            const pastCooldown  = (nowMs - lastInterruptAt) > BARGE_IN_COOLDOWN_MS;

            window.SMVAAudioDebug.bargeInFrames = bargeInFrames;
            window.SMVAAudioDebug.bargeInLevel = BARGE_IN_LEVEL;

            if (sustained && isPlayingAudio && pastGrace && pastCooldown) {
                lastInterruptAt = nowMs;
                bargeInFrames = 0;
                window.SMVAAudioDebug.interruptsSent = (window.SMVAAudioDebug.interruptsSent || 0) + 1;
                window.SMVAAudioDebug.lastInterruptMaxVal = maxVal;
                if (traceReply) traceReply.interrupts += 1;
                traceAdd('interrupt', { maxVal: maxVal, sincePlaybackMs: Math.round(nowMs - playbackStartedAt) });
                stopPlayback();
                try { if (ws) ws.send(JSON.stringify({ type: 'interrupt' })); } catch(e) {}
            }
        };

        if (audioContext.audioWorklet && window.AudioWorkletNode) {
            const workletCode = `
                class SMVARecorderProcessor extends AudioWorkletProcessor {
                    constructor() {
                        super();
                        this.targetSampleRate = 16000;
                        this.targetChunkSize = 320;
                        this.inputSampleRate = sampleRate;
                        this.ratio = this.inputSampleRate / this.targetSampleRate;
                        this.sourceOffset = 0;
                        this.pending = [];
                    }
                    flush(maxVal) {
                        while (this.pending.length >= this.targetChunkSize) {
                            const pcm16 = new Int16Array(this.targetChunkSize);
                            for (let i = 0; i < this.targetChunkSize; i++) {
                                pcm16[i] = this.pending.shift();
                            }
                            this.port.postMessage({ pcm: pcm16.buffer, maxVal, samples: pcm16.length, inputSampleRate: this.inputSampleRate }, [pcm16.buffer]);
                        }
                    }
                    process(inputs) {
                        const input = inputs && inputs[0] && inputs[0][0];
                        if (!input || !input.length) return true;

                        let maxVal = 0;
                        // Downsample from the real AudioContext rate (often 48kHz) to 16kHz.
                        while (this.sourceOffset < input.length) {
                            const idx = Math.floor(this.sourceOffset);
                            const sample = Math.max(-1, Math.min(1, input[idx] || 0));
                            const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                            const intVal = value | 0;
                            this.pending.push(intVal);
                            const abs = Math.abs(intVal);
                            if (abs > maxVal) maxVal = abs;
                            this.sourceOffset += this.ratio;
                        }
                        this.sourceOffset -= input.length;
                        this.flush(maxVal);
                        return true;
                    }
                }
                registerProcessor('smva-recorder-processor', SMVARecorderProcessor);
            `;
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const workletUrl = URL.createObjectURL(blob);
            try {
                await audioContext.audioWorklet.addModule(workletUrl);
                audioCaptureNode = new AudioWorkletNode(audioContext, 'smva-recorder-processor');
                audioCaptureNode.port.onmessage = (event) => {
                    const data = event.data || {};
                    if (data.inputSampleRate) window.SMVAAudioDebug.inputSampleRate = data.inputSampleRate;
                    handleCapturedAudio(data.pcm, data.maxVal || 0, data.samples || 0);
                };
                const silentGain = audioContext.createGain();
                silentGain.gain.value = 0;
                audioCaptureSource.connect(audioCaptureNode);
                audioCaptureNode.connect(silentGain);
                silentGain.connect(audioContext.destination);
                audioCaptureNode._smvaSilentGain = silentGain;
            } catch (err) {
                window.SMVAAudioDebug.workletError = err && err.message ? err.message : String(err);
                try { if (audioCaptureNode) audioCaptureNode.disconnect(); } catch(e) {}
                audioCaptureNode = null;
            } finally {
                URL.revokeObjectURL(workletUrl);
            }
            if (audioCaptureNode) return;
        }

        // Legacy fallback for older browsers only. Modern browsers use AudioWorkletNode above.
        const downsampleTo16k = (inputData, inputRate) => {
            const ratio = inputRate / TARGET_SAMPLE_RATE;
            const outputLength = Math.floor(inputData.length / ratio);
            const pcm16 = new Int16Array(outputLength);
            let maxVal = 0;
            for (let i = 0; i < outputLength; i++) {
                const start = Math.floor(i * ratio);
                const end = Math.min(Math.floor((i + 1) * ratio), inputData.length);
                let sum = 0;
                let count = 0;
                for (let j = start; j < end; j++) { sum += inputData[j]; count++; }
                const sample = Math.max(-1, Math.min(1, count ? (sum / count) : inputData[start] || 0));
                const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                pcm16[i] = value;
                const abs = Math.abs(value);
                if (abs > maxVal) maxVal = abs;
            }
            return { pcm16, maxVal };
        };
        let fallbackPending = [];
        audioCaptureNode = audioContext.createScriptProcessor(4096, 1, 1);
        audioCaptureNode.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const converted = downsampleTo16k(inputData, audioContext.sampleRate);
            for (let i = 0; i < converted.pcm16.length; i++) fallbackPending.push(converted.pcm16[i]);
            while (fallbackPending.length >= TARGET_CHUNK_SIZE) {
                const chunk = new Int16Array(TARGET_CHUNK_SIZE);
                for (let i = 0; i < TARGET_CHUNK_SIZE; i++) chunk[i] = fallbackPending.shift();
                handleCapturedAudio(chunk.buffer, converted.maxVal, chunk.length);
            }
        };
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        audioCaptureSource.connect(audioCaptureNode);
        audioCaptureNode.connect(silentGain);
        silentGain.connect(audioContext.destination);
        audioCaptureNode._smvaSilentGain = silentGain;
    }

    // Duration of everything queued, estimated from the base64 length so the
    // pre-roll check doesn't have to decode audio it may not schedule yet.
    function estimateQueuedSeconds() {
        let seconds = 0;
        for (let i = 0; i < audioQueue.length; i++) {
            const item = audioQueue[i];
            const b64 = (item && typeof item === 'object') ? item.audio : item;
            if (!b64) continue;
            const mimeType = (item && typeof item === 'object' && item.mimeType) ? item.mimeType : 'audio/pcm;rate=24000';
            const rateMatch = /rate=(\d+)/i.exec(String(mimeType || ''));
            const rate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
            const bytes = Math.floor(String(b64).length * 3 / 4);
            seconds += (bytes / 2) / rate;   // PCM16 mono
        }
        return seconds;
    }

    // Arm the pre-roll for the next reply. Only safe once nothing is queued or
    // still scheduled, otherwise mid-reply chunks would be held back and create
    // the very gap the pre-roll exists to prevent.
    function markPlaybackIdle() {
        // The reply is fully played out — close its statistics here, where the
        // arrival window is genuinely over.
        traceReplyEnd();
        isPlayingAudio = false;
        playbackPrimed = false;
        playbackPrimeStartedAt = 0;
        // Everything queued has played, so the next reply starts a fresh
        // timeline. Leaving a stale time here would look like an underrun.
        nextPlaybackTime = 0;
        playbackStartedAt = 0;
        // Ease the cushion back down after clean replies so one bad moment
        // doesn't leave every later reply needlessly delayed.
        if (!playbackReplyUnderran) {
            playbackStartBuffer = Math.max(0.24, playbackStartBuffer - 0.02);
        }
        playbackReplyUnderran = false;
        if (playbackPrimeTimer) { clearTimeout(playbackPrimeTimer); playbackPrimeTimer = null; }
    }

    async function playNextAudio() {
        if (!audioQueue.length) {
            if (!playbackSources.length) markPlaybackIdle();
            return;
        }

        isPlayingAudio = true;
        const generationAtStart = playbackGeneration;

        // The first chunk of a reply usually arrives alone, so scheduling it
        // immediately leaves almost nothing buffered — one late chunk then
        // underruns and is heard as a break. Wait for a cushion to build first.
        // This is why the stutter only happened at the start of speech: by
        // mid-reply enough audio is queued to ride out the same jitter.
        if (!playbackPrimed) {
            const PRIME_TARGET_SECONDS = 0.35;
            const PRIME_MAX_WAIT_MS = 300;
            if (!playbackPrimeStartedAt) playbackPrimeStartedAt = Date.now();
            const waited = Date.now() - playbackPrimeStartedAt;
            if (estimateQueuedSeconds() < PRIME_TARGET_SECONDS && waited < PRIME_MAX_WAIT_MS) {
                if (playbackPrimeTimer) clearTimeout(playbackPrimeTimer);
                playbackPrimeTimer = setTimeout(function () {
                    playbackPrimeTimer = null;
                    if (generationAtStart === playbackGeneration) playNextAudio();
                }, 40);
                return;
            }
            playbackPrimed = true;
            playbackStartedAt = Date.now();
            window.SMVAAudioDebug = window.SMVAAudioDebug || {};
            window.SMVAAudioDebug.playbackPrimeWaitMs = waited;
            // Whether the pre-roll reached its target or timed out is the
            // difference between a cushion that works and one that only looks
            // like it does. queuedMs well under the target means it gave up.
            const primeQueuedMs = Math.round(estimateQueuedSeconds() * 1000);
            if (traceReply) { traceReply.primeWaitMs = waited; traceReply.primeQueuedMs = primeQueuedMs; }
            traceAdd('prime', { waitMs: waited, queuedMs: primeQueuedMs, targetMs: Math.round(PRIME_TARGET_SECONDS * 1000), timedOut: waited >= PRIME_MAX_WAIT_MS });
        }

        if (!playbackAudioContext) {
            // Dedicated playback context for the engine's audio output.
            // Output is PCM16 at 24kHz; keep mic capture and playback separate.
            playbackAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            nextPlaybackTime = 0;
        }
        if (playbackAudioContext.state === 'suspended') {
            try { await playbackAudioContext.resume(); } catch (e) {}
        }

        window.SMVAAudioDebug = window.SMVAAudioDebug || {};
        window.SMVAAudioDebug.playbackContextSampleRate = playbackAudioContext.sampleRate;

        const OUTPUT_RATE_DEFAULT = 24000;
        const START_BUFFER_SECONDS = playbackStartBuffer;  // adaptive jitter buffer; grows after an underrun
        const START_BUFFER_MAX = 0.60;
        const START_BUFFER_STEP = 0.10;
        const MAX_SCHEDULE_AHEAD_SECONDS = 1.20; // cap latency without cutting every small burst
        const HARD_RESET_DELAY_SECONDS = 2.50;   // only recover from truly bad backlog
        const MAX_COMBINED_MS = 480;             // combine chunks into fewer BufferSource nodes
        const MIN_FADE_SECONDS = 0.006;          // tiny fade to prevent clicks between chunks
        const UNDERRUN_MIN_SECONDS = 0.05;       // below this the timeline seam is inaudible
        const RESUME_OFFSET_SECONDS = 0.06;      // lead time when picking a seam back up

        const decodeItem = (item) => {
            const base64Audio = (item && typeof item === 'object') ? item.audio : item;
            const mimeType = (item && typeof item === 'object' && item.mimeType) ? item.mimeType : 'audio/pcm;rate=24000';
            const rateMatch = /rate=(\d+)/i.exec(String(mimeType || ''));
            const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : OUTPUT_RATE_DEFAULT;
            const binaryString = atob(base64Audio || '');
            if (!binaryString) return null;
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            const cleanBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
            const pcm16 = new Int16Array(cleanBuffer);
            if (!pcm16.length) return null;
            return { pcm16, sampleRate, bytesLength: bytes.byteLength };
        };

        try {
            const now = playbackAudioContext.currentTime;

            // If the previous schedule somehow drifted too far into the future, reset timing.
            // Important: do NOT drop audio for normal small jitter; dropping caused the "tr-tr" sound.
            if (!nextPlaybackTime || nextPlaybackTime < now) {
                // A non-zero nextPlaybackTime now in the past means the
                // scheduled timeline has been passed. That is only a real
                // underrun if it fell meaningfully behind. Audio arrives in
                // bursts well ahead of realtime, so the ordinary case is a
                // seam: the previous burst finished playing microseconds
                // before the next was scheduled, with plenty still queued.
                //
                // Treating that seam as starvation was the stutter. It re-armed
                // the full start cushion mid-sentence — inserting 240ms or more
                // of silence to "recover" from being 1ms late — and ratcheted
                // the cushion up each time, so every later seam inserted more
                // silence than the last. Traces showed six such events in one
                // call, every one with 10+ chunks still waiting in the queue.
                const shortfall = nextPlaybackTime ? (now - nextPlaybackTime) : 0;
                const starved   = shortfall > UNDERRUN_MIN_SECONDS;

                if (starved) {
                    playbackReplyUnderran = true;
                    playbackStartBuffer = Math.min(playbackStartBuffer + START_BUFFER_STEP, START_BUFFER_MAX);
                    window.SMVAAudioDebug.playbackUnderruns = (window.SMVAAudioDebug.playbackUnderruns || 0) + 1;
                    window.SMVAAudioDebug.playbackStartBufferMs = Math.round(playbackStartBuffer * 1000);
                    if (traceReply) traceReply.underruns += 1;
                    traceAdd('underrun', {
                        reply: traceReply ? traceReply.index : null,
                        shortfallMs: Math.round(shortfall * 1000),
                        queueDepth: audioQueue.length,
                        newBufferMs: Math.round(playbackStartBuffer * 1000),
                    });
                } else if (nextPlaybackTime) {
                    // Recorded so a trace still shows these happening, but
                    // nothing is adjusted — there is nothing wrong.
                    if (traceReply) traceReply.seams = (traceReply.seams || 0) + 1;
                    traceAdd('seam', {
                        reply: traceReply ? traceReply.index : null,
                        shortfallMs: Math.round(shortfall * 1000),
                        queueDepth: audioQueue.length,
                    });
                }

                // Resuming mid-reply needs only enough lead time to schedule
                // safely. The full cushion belongs at the start of a reply,
                // where nextPlaybackTime is zero.
                nextPlaybackTime = now + ((nextPlaybackTime && !starved)
                    ? RESUME_OFFSET_SECONDS
                    : Math.max(START_BUFFER_SECONDS, playbackStartBuffer));
            } else if ((nextPlaybackTime - now) > HARD_RESET_DELAY_SECONDS) {
                nextPlaybackTime = now + START_BUFFER_SECONDS;
                window.SMVAAudioDebug.playbackHardResets = (window.SMVAAudioDebug.playbackHardResets || 0) + 1;
            }

            // Keep scheduling until we have enough lookahead. Combine queued chunks by sample rate
            // so the browser plays fewer, longer buffers instead of many tiny BufferSource nodes.
            while (audioQueue.length && generationAtStart === playbackGeneration) {
                const currentNow = playbackAudioContext.currentTime;
                if ((nextPlaybackTime - currentNow) > MAX_SCHEDULE_AHEAD_SECONDS) break;

                const first = decodeItem(audioQueue.shift());
                if (!first) continue;

                const sampleRate = first.sampleRate || OUTPUT_RATE_DEFAULT;
                const maxCombinedSamples = Math.max(first.pcm16.length, Math.floor(sampleRate * (MAX_COMBINED_MS / 1000)));
                const parts = [first.pcm16];
                let totalSamples = first.pcm16.length;
                let totalBytes = first.bytesLength;

                while (audioQueue.length && totalSamples < maxCombinedSamples) {
                    const peek = audioQueue[0];
                    const mimeType = (peek && typeof peek === 'object' && peek.mimeType) ? peek.mimeType : 'audio/pcm;rate=24000';
                    const rateMatch = /rate=(\d+)/i.exec(String(mimeType || ''));
                    const peekRate = rateMatch ? parseInt(rateMatch[1], 10) : OUTPUT_RATE_DEFAULT;
                    if (peekRate !== sampleRate) break;
                    const decoded = decodeItem(audioQueue.shift());
                    if (!decoded) continue;
                    parts.push(decoded.pcm16);
                    totalSamples += decoded.pcm16.length;
                    totalBytes += decoded.bytesLength;
                }

                const merged = new Int16Array(totalSamples);
                let offset = 0;
                for (let i = 0; i < parts.length; i++) {
                    merged.set(parts[i], offset);
                    offset += parts[i].length;
                }

                const audioBuffer = playbackAudioContext.createBuffer(1, merged.length, sampleRate);
                const channelData = audioBuffer.getChannelData(0);
                for (let i = 0; i < merged.length; i++) {
                    channelData[i] = Math.max(-1, Math.min(1, merged[i] / 32768));
                }

                const source = playbackAudioContext.createBufferSource();
                source.buffer = audioBuffer;

                // Small fade-in/out prevents boundary clicks without causing audible gaps.
                const gain = playbackAudioContext.createGain();
                const startAt = Math.max(playbackAudioContext.currentTime + 0.03, nextPlaybackTime);
                const duration = audioBuffer.duration;
                const fade = Math.min(MIN_FADE_SECONDS, duration / 4);
                try {
                    gain.gain.setValueAtTime(0.0001, startAt);
                    gain.gain.linearRampToValueAtTime(1, startAt + fade);
                    gain.gain.setValueAtTime(1, Math.max(startAt + fade, startAt + duration - fade));
                    gain.gain.linearRampToValueAtTime(0.0001, startAt + duration);
                } catch (e) {
                    gain.gain.value = 1;
                }

                source.connect(gain);
                gain.connect(playbackAudioContext.destination);

                nextPlaybackTime = startAt + duration;
                currentPlaybackSource = source;
                playbackSources.push(source);

                window.SMVAAudioDebug.outputSampleRate = sampleRate;
                window.SMVAAudioDebug.lastOutputSamples = merged.length;
                window.SMVAAudioDebug.lastOutputBytes = totalBytes;
                window.SMVAAudioDebug.lastOutputDurationMs = Math.round(duration * 1000);
                window.SMVAAudioDebug.playbackQueueDepth = audioQueue.length;
                window.SMVAAudioDebug.playbackScheduledSources = playbackSources.length;
                window.SMVAAudioDebug.nextPlaybackDelayMs = Math.round(Math.max(0, startAt - playbackAudioContext.currentTime) * 1000);
                window.SMVAAudioDebug.playbackLookaheadMs = Math.round(Math.max(0, nextPlaybackTime - playbackAudioContext.currentTime) * 1000);
                window.SMVAAudioDebug.playbackCombinedChunks = parts.length;
                window.SMVAAudioDebug.playbackDroppedChunks = window.SMVAAudioDebug.playbackDroppedChunks || 0;

                // Lookahead is how much scheduled audio is still ahead of the
                // playhead. Its low-water mark over a reply says how close that
                // reply came to running dry, including the times it did not.
                if (traceReply) {
                    const lookaheadMs = Math.round(Math.max(0, nextPlaybackTime - playbackAudioContext.currentTime) * 1000);
                    traceReply.schedCount += 1;
                    if (traceReply.minLookaheadMs === null || lookaheadMs < traceReply.minLookaheadMs) {
                        traceReply.minLookaheadMs = lookaheadMs;
                    }
                }

                source.onended = () => {
                    playbackSources = playbackSources.filter(s => s !== source);
                    try { source.disconnect(); } catch (e) {}
                    try { gain.disconnect(); } catch (e) {}
                    if (currentPlaybackSource === source) currentPlaybackSource = null;
                    if (generationAtStart !== playbackGeneration) return;
                    if (audioQueue.length) playNextAudio();
                    else if (!playbackSources.length) markPlaybackIdle();
                };

                source.start(startAt);
            }

            if (audioQueue.length && generationAtStart === playbackGeneration) {
                setTimeout(function(){ playNextAudio(); }, 80);
            }
        } catch (err) {
            console.error('[SMVA] Audio playback error:', err);
            window.SMVAAudioDebug.playbackError = err && err.message ? err.message : String(err);
            if (audioQueue.length) setTimeout(function(){ playNextAudio(); }, 80);
            else if (!playbackSources.length) markPlaybackIdle();
        }
    }

    function stopPlayback() {
        // An interrupted reply still has statistics worth keeping — close it
        // here so its numbers are not merged into the next one. No-op once the
        // call itself has already ended.
        traceReplyEnd();
        playbackGeneration++;
        audioQueue = [];
        isPlayingAudio = false;
        nextPlaybackTime = 0;

        // Re-prime for the next reply. playbackStartBuffer deliberately keeps
        // whatever it learned about this connection's jitter.
        playbackPrimed = false;
        playbackPrimeStartedAt = 0;
        playbackReplyUnderran = false;
        playbackStartedAt = 0;
        bargeInFrames = 0;
        if (playbackPrimeTimer) { clearTimeout(playbackPrimeTimer); playbackPrimeTimer = null; }

        playbackSources.forEach(function(source) {
            try { source.onended = null; } catch (e) {}
            try { source.stop(0); } catch (e) {}
            try { source.disconnect(); } catch (e) {}
        });
        playbackSources = [];

        if (currentPlaybackSource) {
            try { currentPlaybackSource.onended = null; } catch (e) {}
            try { currentPlaybackSource.stop(0); } catch (e) {}
            try { currentPlaybackSource.disconnect(); } catch (e) {}
            currentPlaybackSource = null;
        }

        if (playbackAudioContext) {
            try { playbackAudioContext.close(); } catch (e) {}
            playbackAudioContext = null;
        }
    }

    /**
     * Green through amber to red across the life of the call.
     *
     * `ratio` is the share of the call still remaining, so it runs 1 → 0. Two
     * linear segments meeting at amber rather than one green→red ramp, which
     * would spend the middle of every call an alarming muddy brown.
     */
    function progressColor(ratio) {
        var GREEN = [34, 197, 94], AMBER = [245, 158, 11], RED = [239, 68, 68];
        var from, to, t;
        if (ratio > 0.4) { from = GREEN; to = AMBER; t = (1 - ratio) / 0.6; }
        else             { from = AMBER; to = RED;   t = (0.4 - ratio) / 0.4; }
        t = Math.max(0, Math.min(1, t));
        return 'rgb(' + Math.round(from[0] + (to[0] - from[0]) * t) + ','
                      + Math.round(from[1] + (to[1] - from[1]) * t) + ','
                      + Math.round(from[2] + (to[2] - from[2]) * t) + ')';
    }

    function updateTimer() {
        callSeconds++;
        // Backend-supplied where available. Its own timer fires marginally
        // earlier (it starts at session setup, this starts at socket open), so
        // in practice the backend ends the call and this is the fallback for
        // when that message never arrives.
        const maxSecs = callLimitSecs;
        if (maxSecs > 0 && callSeconds >= maxSecs) { endCall('max_duration'); return; }
        const mins = Math.floor(callSeconds / 60);
        const secs = callSeconds % 60;
        const el = h('smva-timer');
        if (el) {
            var timeStr = String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');
            if (maxSecs > 0) {
                var remaining = maxSecs - callSeconds;
                if (remaining <= 60) { el.style.color = '#ef4444'; timeStr = '⚠ ' + timeStr; } else { el.style.color = ''; }
            }
            el.textContent = timeStr;
        }
        const wrap = h('smva-progress'), fill = h('smva-progress-fill');
        if (maxSecs > 0) {
            var ratio = Math.max(0, 1 - callSeconds / maxSecs);
            if (wrap) wrap.classList.add('show');
            if (fill) {
                fill.style.width = (ratio * 100).toFixed(2) + '%';
                fill.style.backgroundColor = progressColor(ratio);
            }
        } else if (wrap) {
            // No limit configured — an empty track would imply one.
            wrap.classList.remove('show');
        }
    }

    /**
     * Tap routing for a check_availability chip. renderOptions() is a global
     * function (declared outside this closure, alongside renderDisplayText) so
     * it has no access to ws/chatWs/chatHistory — it calls this bridge instead.
     *
     * Deliberately NOT sendChatMessage(): that function sends {type:'chat'} on
     * `ws` whenever a voice call is live (line below), which the backend's
     * router treats as a brand-new REST conversation on the SAME socket,
     * completely disconnected from the live realtime turn the visitor is
     * actually having. A tap during a voice call must instead become
     * `text_input`, injected into that same live turn via session.provider.sendText().
     * Only when there is no live call is it safe to fall through to the
     * ordinary chat path.
     */
    /**
     * Add a non-text card (options, display_text) to the transcript.
     *
     * The bridge that lets the two globals outside this closure put something
     * in chatMessages, which is the only array updateChatUI rebuilds from and
     * therefore the only place a card survives the next message.
     *
     * Dedupe lives here rather than on a DOM attribute, as it used to: the
     * nodes are transient now, so "have I already shown this?" cannot be
     * answered by looking at the panel. Providers do re-deliver a tool result
     * on a reconnect, and two identical slot pickers stacked in the transcript
     * is the visible symptom.
     */
    window.__smvaPushCard = function (kind, payload) {
        const sig = kind === 'options'
            ? (payload.title || '') + '|' + payload.options.map(function (o) { return o.label; }).join('|')
            : String(payload.text);
        if (chatMessages.some(function (m) { return m.kind === kind && m.sig === sig; })) return;
        chatMessages.push({ kind: kind, payload: payload, sig: sig, picked: null });
        updateChatUI();
    };

    window.__smvaOptionTap = function (label) {
        addChatMessage('user', label);
        chatHistory.push({ role: 'user', content: label });
        isTyping = true;
        updateChatUI();
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'text_input', text: label }));
            return;
        }
        if (!chatWs || chatWs.readyState !== WebSocket.OPEN) { connectChatSession(label); }
        else { chatWs.send(JSON.stringify({ type: 'chat', text: label })); }
    };

    function sendChatMessage() {
        if (!caps.chat) return;
        const input = h('smva-input');
        const text = input.value.trim();
        if (!text) return;
        if (suggestionsShown) hideSuggestions();
        addChatMessage('user', text);
        chatHistory.push({ role: 'user', content: text });
        input.value = '';
        isTyping = true;
        updateChatUI();
        if (ws && ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: 'chat', text })); return; }
        if (!chatWs || chatWs.readyState !== WebSocket.OPEN) { connectChatSession(text); } else { chatWs.send(JSON.stringify({ type: 'chat', text })); }
    }

    async function connectChatSession(firstMessage) {
        try {
            if (chatWs) { chatWs.close(); chatWs = null; }
            chatWs = new WebSocket(CONFIG.wsUrl + '?token=' + CONFIG.internalToken);
            let pendingMessage = firstMessage;
            chatWs.onopen = () => { chatWs.send(JSON.stringify({ type: 'start', licenseKey: CONFIG.internalToken, sessionType: 'chat', isChatOnly: true })); };
            chatWs.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.type === 'setup_complete' && pendingMessage) { chatWs.send(JSON.stringify({ type: 'chat', text: pendingMessage })); pendingMessage = null; }
                    if (data.type === 'lead_captured' && data.lead) { saveLeadComplete(data.lead, 'Chat lead capture'); }
                    if (data.type === 'chat_response') { isTyping = false; addChatMessage('bot', data.text); chatHistory.push({ role: 'bot', content: data.text }); saveChatHistory();
                    // Chat-only mode never wired display_text or options — a tool
                    // that renders either (booking's slot picker, or any site tool
                    // using display_text) showed nothing at all in chat-only mode.
                    } else if (data.type === 'display_text') { renderDisplayText(data);
                    } else if (data.type === 'options') { renderOptions(data);
                    } else if (data.type === 'error' && data.code === 'quota_exceeded') { isTyping = false; addChatMessage('bot', '⚠️ ' + t('chat_unavailable')); setTimeout(refreshQuota, 500);
                    } else if (data.type === 'error') { isTyping = false; var msg = data.message || 'Error'; addChatMessage('bot', '⚠️ ' + msg); }
                } catch (err) { console.error('[SMVA] Chat parse error:', err); }
            };
            chatWs.onerror = () => { isTyping = false; addChatMessage('bot', '⚠️ Connection error'); };
            chatWs.onclose = () => { chatWs = null; };
        } catch (err) { isTyping = false; addChatMessage('bot', '⚠️ Failed to connect'); }
    }

    function addChatMessage(role, text) {
        if (chatMessages.length > 0) { const last = chatMessages[chatMessages.length - 1]; if (last.role === role && last.text === text) return; }
        chatMessages.push({ kind: 'text', role, text });
        updateChatUI();
    }

    // Char codes rather than a \uXXXX regex literal: several editors/tools in
    // this pipeline re-render \u escapes for RTL code points as the literal
    // characters themselves, which then corrupts the source file with raw
    // bidi text sitting inside a regex -- exactly what happened building this
    // function the first time. RegExp() from codes sidesteps that entirely.
    var RTL_RANGES = [[0x0591,0x07FF],[0x200F,0x200F],[0xFB1D,0xFDFF],[0xFE70,0xFEFF]];
    var RTL_RE = new RegExp('[' + RTL_RANGES.map(function(r){
      return String.fromCharCode(r[0]) + '-' + String.fromCharCode(r[1]);
    }).join('') + ']');
    function isRTLText(str) {
      // Arabic-script ranges (covers Persian and Arabic -- the two languages
      // isRTL, above, already recognizes) plus Hebrew, Syriac, and Thaana.
      // Deliberately per-string rather than reusing the module-level isRTL:
      // that constant is fixed at widget load from the site's CONFIGURED
      // language, but the agent detects and replies in whatever language the
      // VISITOR actually used, per message -- a site configured for English
      // still needs a Persian reply rendered right-to-left, and a single
      // conversation can legitimately switch scripts turn to turn.
      return RTL_RE.test(str || '');
    }
    function persianToWestern(str) {
      var persian = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
      var arabic  = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
      for (var i = 0; i < 10; i++) {
        str = str.split(persian[i]).join(i);
        str = str.split(arabic[i]).join(i);
      }
      return str;
    }
    function formatMsg(text) {
      text = persianToWestern(text);
      // Wrap phone numbers with LTR marks to prevent RTL reversal
      text = text.replace(/(\d{3}[-\s]\d{3}[-\s]\d{4})/g, '‎$1‎');
      var escaped = esc(text);
      // Step 1: markdown links [text](url) → <a>
      escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;word-break:break-all;">$1</a>');
      // Step 2: plain https?:// URLs not already in href
      escaped = escaped.replace(/(?<!href=["'])(https?:\/\/[^\s<>"\)]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;word-break:break-all;">$1</a>');
      // Step 3: bare domains (e.g. aarenocare.ca) not already linked
      escaped = escaped.replace(/(?<![\/"\'=@])((?:[a-zA-Z0-9-]+\.)+(?:ca|com|net|org|io|co|info|biz)(?:\/[^\s<>"\)]*)?)/g, function(m, p1, offset, str) { var before = str.substring(Math.max(0,offset-20),offset); if (/href=|https?:\/\/|@[a-zA-Z]/.test(before)) return m; return '<a href="https://' + m + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;word-break:break-all;">' + m + '</a>'; });
      // **bold**
      escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // *italic*
      escaped = escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // newlines → <br>
      escaped = escaped.replace(/\n/g, '<br>');
      return escaped;
    }
    function updateChatUI() {
        const container = h('smva-msgs');
        if (!container) return;
        let html = '';
        chatMessages.forEach((msg, idx) => {
            // Cards -- booking's slot picker, and display_text -- live in this
            // array rather than being appendChild'd straight into the panel.
            // This function rebuilds the panel with innerHTML on every new
            // message, so a card that was not in chatMessages survived only
            // until the agent's next reply: the slot chips appeared and then
            // vanished a second later, as soon as the model said "I've put the
            // rest on screen". Anything rendered here survives every rebuild.
            if (msg.kind === 'options') { html += smvaOptionsCardHtml(msg.payload, idx, msg.picked); return; }
            if (msg.kind === 'display_text') { html += smvaDisplayTextCardHtml(msg.payload); return; }
            const cls = msg.role === 'user' ? 'smva-msg-user' : 'smva-msg-bot';
            // Per-message, not the widget-wide isRTL: the agent replies in
            // whatever language the visitor used, per turn, so a Persian
            // reply needs its own text right-aligned even on a site
            // configured lang="en", and a conversation can switch scripts
            // turn to turn. The bubble stays on its usual side (bot left,
            // user right) -- only the text inside follows its own script,
            // same as ChatGPT/Claude's own web UI handles RTL replies.
            const dirAttr = isRTLText(msg.text) ? ' dir="rtl" style="text-align:right"' : '';
            html += '<div class="smva-msg ' + cls + '"' + dirAttr + '>' + formatMsg(msg.text) + '</div>';
        });
        if (isTyping) html += '<div class="smva-typing"><span></span><span></span><span></span></div>';
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
        bindCards(container);
    }

    /**
     * Card clicks, delegated once onto the panel itself.
     *
     * Per-button listeners cannot work here: innerHTML above destroys every
     * node it replaces, listeners included, so a chip bound at render time is
     * dead the moment anything else is said. The panel element is never itself
     * replaced, so one listener on it outlives every rebuild.
     */
    function bindCards(container) {
        if (container.__smvaCardsBound) return;
        container.__smvaCardsBound = true;
        container.addEventListener('click', function (e) {
            if (!e.target || !e.target.closest) return;

            const chip = e.target.closest('.smva-opt-chip');
            if (chip) {
                const entry = chatMessages[Number(chip.getAttribute('data-smva-card'))];
                if (!entry || entry.picked) return;
                const opt = entry.payload.options[Number(chip.getAttribute('data-smva-opt'))];
                if (!opt) return;
                // Recorded on the entry, not as a class on the button: the
                // re-render that follows the tap rebuilds these chips from
                // scratch, and the picked/disabled state has to come back with
                // them or every slot becomes tappable again.
                entry.picked = opt.label;
                if (typeof window.__smvaOptionTap === 'function') window.__smvaOptionTap(opt.label);
                return;
            }

            const copyBtn = e.target.closest('.smva-dt-copy');
            if (copyBtn) smvaCopyCardValue(copyBtn);
        });
    }

    injectStyles();
    // expose t() for use outside closure
    window.smvaT = t;
    buildWidget();
    injectThemeStyles(CONFIG.widgetTheme, CONFIG.primaryColor);

    /* ── Attention: the launcher rings ────────────────────────────────────
       A chat widget that pulses is wallpaper by now. This one is a phone and
       the visitor can genuinely talk to it, so it rings like a phone and
       offers a card. Everything below exists to keep that from becoming
       obnoxious: it rings twice at most, forgets nothing the visitor tells it,
       and a dismissal ends it for the whole session. */
    var TEASE_KEY = 'smva_teased';
    var teaseTimer = null;

    /** Two soft notes, synthesised so no audio file ships with the plugin.
     *  Opt-in and default off: a business site that makes noise unprompted
     *  reads as cheap, and most visitors have not asked for it. Browsers also
     *  refuse to play anything before a real gesture, so this stays silent on
     *  a page nobody has touched — by design, not by accident. */
    function chime() {
        if (!CONFIG.teaseSound) return;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            var ac = new AC();
            if (ac.state === 'suspended') { ac.close(); return; }
            [[880, 0], [1174.66, 0.14]].forEach(function (n) {
                var o = ac.createOscillator(), g = ac.createGain(), at = ac.currentTime + n[1];
                o.type = 'sine'; o.frequency.value = n[0];
                g.gain.setValueAtTime(0, at);
                g.gain.linearRampToValueAtTime(0.05, at + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
                o.connect(g); g.connect(ac.destination); o.start(at); o.stop(at + 0.55);
            });
            setTimeout(function () { try { ac.close(); } catch (e) {} }, 1200);
        } catch (e) {}
    }

    function endTease(permanent) {
        var fab = h('smva-fab'), fab2 = h('smva-fab-2'), card = h('smva-call');
        if (fab)  fab.classList.remove('smva-ring');
        if (fab2) fab2.classList.remove('smva-nudge', 'smva-waiting');
        if (card) card.classList.remove('show');
        if (teaseTimer) { clearTimeout(teaseTimer); teaseTimer = null; }
        if (permanent) { teaseStep = 99; try { sessionStorage.setItem(TEASE_KEY, '1'); } catch (e) {} }
    }

    /* The order is the argument: offer the call first, because talking is the
       thing worth discovering, and only then offer typing as the easier way
       out. Two moments total — after that the dock stays quiet for good. */
    var teaseStep = 0;
    var teaseQueue = [];
    if (caps.voice) teaseQueue.push('voice');
    if (caps.chat)  teaseQueue.push('chat');

    function tease() {
        var panel = h('smva-panel'), card = h('smva-call');
        var mode  = teaseQueue[teaseStep];
        if (!card || !mode) return;
        // Never talk over something the visitor is already doing.
        if (panel && !panel.classList.contains('hide')) return;
        if (voiceState && voiceState !== 'idle') return;

        var isVoice = mode === 'voice';
        var fab = isVoice ? h('smva-fab') : (h('smva-fab-2') || h('smva-fab'));
        if (!fab) return;
        teaseStep += 1;
        setCardMode(mode);

        if (isVoice) {
            fab.classList.add('smva-ring');
            chime();
            setTimeout(function () { fab.classList.remove('smva-ring'); }, 2600);
        } else {
            fab.classList.add('smva-nudge');
            setTimeout(function () {
                fab.classList.remove('smva-nudge');
                // The dot stays behind as a quiet marker once the card is gone.
                fab.classList.add('smva-waiting');
            }, 3100);
        }
        setTimeout(function () { card.classList.add('show'); }, 420);

        // Ignored is not refused: retract, wait, then make the other offer.
        teaseTimer = setTimeout(function () {
            card.classList.remove('show');
            if (teaseQueue[teaseStep]) teaseTimer = setTimeout(tease, 22000);
        }, 13000);
    }

    /** One card, re-dressed for whichever offer is being made. Rebuilding it
     *  per turn would restart the entrance animation mid-flight. */
    var cardMode = 'voice';
    function setCardMode(mode) {
        var card = h('smva-call');
        if (!card) return;
        cardMode = mode;
        var isVoice = mode === 'voice';
        var mark    = isVoice ? PHONE_IC : CHAT_IC;
        var small   = mark.replace(/width="2[02]" height="2[02]"/, 'width="15" height="15"')
                          .replace(/width="18" height="18"/, 'width="15" height="15"');
        h('smva-call-av').innerHTML      = mark;
        h('smva-call-eyebrow').textContent = isVoice ? t('voice_assistant') : t('chat');
        h('smva-call-go').innerHTML      = small + '<span>' + esc(isVoice ? t('start_call') : t('start_chat')) + '</span>';
        card.setAttribute('aria-label', isVoice ? t('voice_assistant') : t('chat'));
    }

    (function buildCallCard() {
        var fab = h('smva-fab');
        if (!fab || !teaseQueue.length) return;
        try { if (sessionStorage.getItem(TEASE_KEY)) return; } catch (e) {}

        var card = document.createElement('div');
        card.id = 'smva-call';
        card.setAttribute('role', 'dialog');
        card.innerHTML = ''
            + '<div id="smva-call-top">'
                + '<div id="smva-call-av"></div>'
                + '<div id="smva-call-tx">'
                    + '<span id="smva-call-eyebrow"></span>'
                    + '<span id="smva-call-name">' + esc(CONFIG.businessName) + '</span>'
                + '</div>'
            + '</div>'
            + '<span id="smva-call-sub">' + esc(CONFIG.greeting || '') + '</span>'
            + '<div id="smva-call-acts">'
                + '<button id="smva-call-go" type="button"></button>'
                + '<button id="smva-call-no" type="button">' + esc(t('not_now')) + '</button>'
            + '</div>';
        // Must land in #smva (the positioned ancestor the card is offset
        // against), and beside the dock rather than inside it — the dock is a
        // column and would lay the card out as a third button. The pill style
        // has no dock, so the fab's own parent is already #smva.
        (h('smva-dock') || fab).parentElement.appendChild(card);
        setCardMode(teaseQueue[0]);

        h('smva-call-go').addEventListener('click', function () {
            var wantVoice = cardMode === 'voice';
            endTease(true);
            var panel = h('smva-panel');
            if (!panel) return;
            if (caps.voice && caps.chat) switchTab(wantVoice ? 'voice' : 'chat');
            panel.classList.remove('hide');
            if (wantVoice) { startCall(); }
            else { panel.style.height = '520px'; }
        });
        h('smva-call-no').addEventListener('click', function () { endTease(true); });
        fab.addEventListener('click', function () { endTease(true); });
        if (h('smva-fab-2')) h('smva-fab-2').addEventListener('click', function () { endTease(true); });

        teaseTimer = setTimeout(tease, 4000);
    })();

    if (CONFIG.greeting && caps.chat) { addChatMessage('bot', CONFIG.greeting); }

})();


/* === Feature C: display_text ===
 * And Feature D: options (the tappable slot picker).
 *
 * These two are the widget's only non-text messages, and both used to render
 * by appendChild into .smva-msgs. That panel is rebuilt wholesale by
 * updateChatUI (innerHTML from the chatMessages array) on every new message,
 * so a card appended directly lasted exactly until the agent's next sentence.
 * For booking that was ~one second: the slot chips arrived with the tool
 * result, the model's reply followed immediately, and the visitor watched the
 * times disappear.
 *
 * So these entry points no longer touch the DOM. They surface the panel, then
 * hand the payload to the closure via __smvaPushCard, which appends it to
 * chatMessages like any other message. The Html builders below are what
 * updateChatUI calls while rebuilding, and they are pure string functions on
 * purpose: they run again on every rebuild, so they must hold no state and
 * bind no listeners (clicks are delegated once, in bindCards).
 */

function smvaEscHtml(x){return String(x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

/** Bring the chat tab forward so a card is not rendered into a hidden panel. */
function smvaSurfaceChatPanel(){
  var panel=document.querySelector('.smva-msgs')||document.querySelector('.smva-chat-messages')||document.querySelector('.smva-messages');
  if(!panel)return null;
  var tabs=document.querySelectorAll('.smva-tab-btn');
  var contents=document.querySelectorAll('.smva-tab-content');
  var chatTabIdx=-1;
  contents.forEach(function(c,i){if(c.contains(panel)||c.querySelector('.smva-msgs'))chatTabIdx=i;});
  var smvaPanel=document.getElementById('smva-panel');
  if(smvaPanel&&smvaPanel.classList.contains('hide')){smvaPanel.classList.remove('hide');}
  if(chatTabIdx>=0){
    tabs.forEach(function(t){t.classList.remove('active');});
    contents.forEach(function(c){c.classList.remove('active');});
    if(tabs[chatTabIdx])tabs[chatTabIdx].classList.add('active');
    contents[chatTabIdx].classList.add('active');
  }
  return panel;
}

function renderDisplayText(p){
  if(!p||!p.text)return;
  if(!smvaSurfaceChatPanel())return;
  if(typeof window.__smvaPushCard==='function')window.__smvaPushCard('display_text',p);
}

function renderOptions(p){
  if(!p||!Array.isArray(p.options)||!p.options.length)return;
  if(!smvaSurfaceChatPanel())return;
  if(typeof window.__smvaPushCard==='function')window.__smvaPushCard('options',p);
}

function smvaDisplayTextCardHtml(p){
  var text=String(p.text), kind=(p.kind||'text').toLowerCase();
  var label=p.label||({email:'Email',phone:'Phone',url:'Link',address:'Address',text:'Info'}[kind]||'Info');
  var href=null,icon='\ud83d\udccb',primary='';
  if(kind==='email'){href='mailto:'+text;icon='\u2709\ufe0f';primary='Email';}
  else if(kind==='phone'){href='tel:'+text.replace(/[^\d+]/g,'');icon='\ud83d\udcde';primary='Call';}
  else if(kind==='url'){href=/^https?:\/\//i.test(text)?text:'https://'+text;icon='\ud83d\udd17';primary='Open';}
  else if(kind==='address'){href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(text);icon='\ud83d\udccd';primary='Map';}
  var esc=smvaEscHtml;
  // The value rides on the element as a data attribute rather than in a
  // closure, because the copy handler is delegated and only ever sees the DOM.
  return '<div class="smva-dt smva-dt-'+esc(kind)+'" data-smva-dt="'+esc(text)+'">'+
    '<div class="smva-dt-icon">'+icon+'</div>'+
    '<div class="smva-dt-body"><div class="smva-dt-label">'+esc(label)+'</div><div class="smva-dt-value">'+esc(text)+'</div></div>'+
    '<div class="smva-dt-actions">'+
      (href?'<a class="smva-dt-btn smva-dt-primary" href="'+esc(href)+'" target="_blank" rel="noopener">'+esc(primary)+'</a>':'')+
      '<button class="smva-dt-btn smva-dt-copy" type="button">Copy</button>'+
    '</div>'+
  '</div>';
}

function smvaOptionsCardHtml(p,cardIdx,picked){
  var esc=smvaEscHtml;
  var title=p.title?('<div class="smva-opts-title">'+esc(p.title)+'</div>'):'';
  return '<div class="smva-opts">'+title+'<div class="smva-opts-row">'+p.options.map(function(o,i){
    // Once one slot is taken the rest are spent: re-offering them would let a
    // visitor book twice from one list, and the second slot_id may well be
    // stale by then.
    var isPicked=picked!=null&&o.label===picked;
    return '<button type="button" class="smva-chip smva-opt-chip'+(isPicked?' smva-opt-picked':'')+'"'+
      ' data-smva-card="'+cardIdx+'" data-smva-opt="'+i+'"'+(picked!=null?' disabled':'')+'>'+
      esc(o.label)+'</button>';
  }).join('')+'</div></div>';
}

/** Copy handler for a display_text card, reached through the delegated listener. */
function smvaCopyCardValue(btn){
  var card=btn.closest('.smva-dt');
  if(!card)return;
  var text=card.getAttribute('data-smva-dt')||'';
  var orig=btn.textContent;
  var done=function(){btn.textContent='Copied!';setTimeout(function(){btn.textContent=orig;},1500);};
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(done).catch(function(){smvaDtFallbackCopy(text,done);});}
  else{smvaDtFallbackCopy(text,done);}
}

function smvaDtFallbackCopy(t,done){try{var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);done();}catch(e){}}

(function(){if(document.getElementById('smva-opts-css'))return;var s=document.createElement('style');s.id='smva-opts-css';
s.textContent='.smva-opts{margin:8px 0}.smva-opts-title{font-size:12px;color:#6b7280;margin-bottom:6px}.smva-opts-row{display:flex;flex-wrap:wrap;gap:6px}.smva-opt-chip:disabled{opacity:.5;cursor:default}.smva-opt-picked{background:var(--smva-accent,#2563eb)!important;color:#fff!important;border-color:transparent!important}';
(document.head||document.documentElement).appendChild(s);})();
(function(){if(document.getElementById('smva-dt-css'))return;var s=document.createElement('style');s.id='smva-dt-css';
s.textContent='.smva-dt{display:flex;gap:10px;align-items:center;padding:10px 12px;margin:8px 0;border-radius:12px;background:var(--smva-card-bg,rgba(0,0,0,0.05));border:1px solid var(--smva-border,rgba(0,0,0,0.08))}.smva-dt-icon{font-size:20px;line-height:1}.smva-dt-body{flex:1;min-width:0}.smva-dt-label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}.smva-dt-value{font-size:14px;font-weight:600;word-break:break-all;line-height:1.3;color:#111827}.smva-dt-actions{display:flex;gap:6px;flex-shrink:0}.smva-dt-btn{padding:6px 10px;font-size:12px;border-radius:8px;cursor:pointer;border:1px solid var(--smva-border,rgba(0,0,0,.15));background:#fff;color:#111;text-decoration:none;font-family:inherit}.smva-dt-primary{background:var(--smva-accent,#2563eb);color:#fff;border-color:transparent}.smva-dt-btn:hover{opacity:.9}[dir="rtl"] .smva-dt-label{letter-spacing:0}';
(document.head||document.documentElement).appendChild(s);})();


/* === Feature C addon: sticky call-bar in chat tab === */
// expose i18n strings for call-bar (outside closure)
// smvaCallBarI18n is set inside closure by buildWidget()
(function(){
  function initCallBar(){
    var chatContent = null;
    document.querySelectorAll('.smva-tab-content').forEach(function(c){
      if(c.querySelector('.smva-msgs')) chatContent = c;
    });
    if(!chatContent) return;

    // inject bar before smva-msgs
    var bar = document.createElement('div');
    bar.id = 'smva-call-bar';
    var _t = window.smvaT || function(k){return k;};
    var _cbI18n = {on_call: _t('on_call'), end_call: _t('end_call')};
    bar.innerHTML =
      '<span class="smva-cb-dot"></span>' +
      '<span class="smva-cb-lbl" id="smva-cb-lbl">' + _cbI18n.on_call + '</span>' +
      '<span class="smva-cb-timer" id="smva-cb-timer"></span>' +
      '<span class="smva-cb-progress" id="smva-cb-progress"><span class="smva-cb-progress-fill" id="smva-cb-progress-fill"></span></span>' +
      '<button class="smva-cb-end" id="smva-cb-end" type="button">' + _cbI18n.end_call + '</button>';
    var msgs = chatContent.querySelector('.smva-msgs');
    chatContent.appendChild(bar);

    // style
    if(!document.getElementById('smva-cb-css')){
      var st = document.createElement('style');
      st.id = 'smva-cb-css';
      st.textContent =
        '#smva-call-bar{display:none;align-items:center;gap:8px;padding:8px 12px;position:sticky;bottom:0;z-index:10;' +
        'background:rgba(220,38,38,.08);border-bottom:1px solid rgba(220,38,38,.15);' +
        'font-size:13px;flex-shrink:0;}' +
        '#smva-call-bar.active{display:flex;}' +
        '.smva-cb-dot{width:8px;height:8px;border-radius:50%;background:#ef4444;' +
        'animation:smva-cb-pulse 1.2s ease-in-out infinite;flex-shrink:0;}' +
        '@keyframes smva-cb-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}' +
        '.smva-cb-lbl{color:#b91c1c;font-weight:600;}' +
        '.smva-cb-timer{color:#b91c1c;opacity:.8;font-variant-numeric:tabular-nums;}' +
        '.smva-cb-progress{display:none;flex:1;height:4px;border-radius:3px;background:rgba(0,0,0,.1);overflow:hidden;margin:0 4px;}' +
        '.smva-cb-progress.show{display:block;}' +
        '.smva-cb-progress-fill{display:block;height:100%;width:100%;border-radius:3px;background:#22c55e;' +
        'transition:width 1s linear,background-color 1s linear;}' +
        '.smva-cb-end{margin-left:auto;padding:5px 12px;border-radius:8px;border:none;cursor:pointer;' +
        'background:#ef4444;color:#fff;font-size:12px;font-weight:600;font-family:inherit;}' +
        '.smva-cb-end:hover{background:#dc2626;}';
      (document.head||document.documentElement).appendChild(st);
    }

    // sync timer from voice tab
    function syncTimer(){
      var voiceTimer = document.getElementById('smva-timer');
      var cbTimer = document.getElementById('smva-cb-timer');
      if(voiceTimer && cbTimer) cbTimer.textContent = voiceTimer.textContent;
      // Mirrored from the voice tab's bar rather than recomputed: this runs in
      // its own closure with no access to the call clock, and one source for
      // the countdown means the two bars cannot drift apart.
      var srcWrap = document.getElementById('smva-progress');
      var srcFill = document.getElementById('smva-progress-fill');
      var cbWrap  = document.getElementById('smva-cb-progress');
      var cbFill  = document.getElementById('smva-cb-progress-fill');
      if(srcWrap && srcFill && cbWrap && cbFill){
        if(srcWrap.classList.contains('show')){
          cbWrap.classList.add('show');
          cbFill.style.width = srcFill.style.width;
          cbFill.style.backgroundColor = srcFill.style.backgroundColor;
        } else {
          cbWrap.classList.remove('show');
        }
      }
    }
    setInterval(syncTimer, 500);

    // end call button
    document.getElementById('smva-cb-end').addEventListener('click', function(){
      var endBtn = document.getElementById('smva-end');
      if(endBtn) endBtn.click();
    });

    // observe #smva-end for hide class changes
    var endBtn = document.getElementById('smva-end');
    if(!endBtn) return;
    function syncBar(){
      var active = !endBtn.classList.contains('hide');
      bar.classList.toggle('active', active);
    }
    syncBar();
    new MutationObserver(syncBar).observe(endBtn, {attributes:true, attributeFilter:['class']});
  }

  // wait for widget DOM to be ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){setTimeout(initCallBar, 500);});
  } else {
    setTimeout(initCallBar, 800);
  }
  // fallback: also try after smva-panel first opens
  var panelObs = new MutationObserver(function(mutations, obs){
    var panel = document.getElementById('smva-panel');
    if(panel && !panel.classList.contains('hide')){
      setTimeout(function(){ if(!document.getElementById('smva-call-bar')) initCallBar(); }, 300);
    }
  });
  var panel = document.getElementById('smva-panel');
  if(panel) panelObs.observe(panel, {attributes:true, attributeFilter:['class']});
})();

