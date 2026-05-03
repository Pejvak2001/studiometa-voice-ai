(async function() {
    'use strict';

    const cfg = window.smvaConfig || {};
    if (!cfg.internalToken) { console.warn('[SMVA] No token'); return; }

    const CONFIG = {
        internalToken: cfg.internalToken,
        licenseKey: cfg.licenseKey || '',
        wsUrl: cfg.wsUrl || 'wss://api2.studiometa.io/voice',
        apiUrl: cfg.apiUrl || 'https://api2.studiometa.io',
        ajaxUrl: cfg.ajaxUrl || '',
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
        callCooldown: parseInt(cfg.callCooldown) || 20,
        maxCallDuration: parseInt(cfg.maxCallDuration) || 600,
        silenceTimeout: parseInt(cfg.silenceTimeout) || 60,
        widgetTheme: cfg.widgetTheme || 'classic',
        agentLogo: cfg.agentLogo || '',
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
        },
        fa: {
            online: 'آنلاین', ready: 'آماده', on_call: 'در حال مکالمه',
            connecting: 'در حال اتصال...', typing: 'در حال تایپ...',
            voice: 'صوتی', chat: 'چت',
            start_call: 'شروع تماس', end_call: 'پایان تماس',
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
        },
        ar: {
            online: 'متصل', ready: 'جاهز', on_call: 'في مكالمة',
            connecting: 'جار الاتصال...', typing: 'يكتب...',
            voice: 'صوت', chat: 'دردشة',
            start_call: 'بدء المكالمة', end_call: 'إنهاء المكالمة',
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
        },
        fr: {
            online: 'En ligne', ready: 'Prêt', on_call: 'En appel',
            connecting: 'Connexion...', typing: 'En train d\'écrire...',
            voice: 'Voix', chat: 'Chat',
            start_call: 'Démarrer', end_call: 'Terminer',
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
        },
        es: {
            online: 'En línea', ready: 'Listo', on_call: 'En llamada',
            connecting: 'Conectando...', typing: 'Escribiendo...',
            voice: 'Voz', chat: 'Chat',
            start_call: 'Iniciar llamada', end_call: 'Terminar',
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
    let mediaStream = null;
    let activeTab = CONFIG.defaultTab;
    if (activeTab === 'voice' && !caps.voice) activeTab = 'chat';
    if (activeTab === 'chat' && !caps.chat)   activeTab = 'voice';

    let voiceState = 'idle';
    let chatMessages = [];
    let isTyping = false;
    let callSeconds = 0;
    let callTimer = null;
    let lastCallEnd = 0;
    let chatSessionId = null;
    let chatHistory = [];
    let chatSavedCount = 0;
    let audioQueue = [];
    let isPlayingAudio = false;
    let currentPlaybackSource = null;
    let playbackGeneration = 0;
    let suggestionsShown = true;
    let agentEndedCall = false;

    const MIC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    const CHAT_IC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    const AI_IC = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>';
    const END_IC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const SEND_IC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    const CLOSE_IC = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    function h(id) { return document.getElementById(id); }
    function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
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
            css = ['#smva-panel{background:#0f172a!important;border:0.5px solid rgba(99,102,241,.3)!important}','.smva-hdr{background:#0f172a!important;border-bottom:0.5px solid rgba(255,255,255,.06)!important}','.smva-hn{color:#e0e7ff!important}.smva-hs{color:#4ade80!important}','.smva-hs::before{background:#4ade80!important}','.smva-x{background:rgba(255,255,255,.1)!important;color:#e0e7ff!important}','.smva-tabs{background:#0f172a!important;border-bottom:0.5px solid rgba(255,255,255,.08)!important}','.smva-tab-btn{color:rgba(255,255,255,.4)!important}','.smva-tab-btn.active{color:#818cf8!important;border-bottom-color:#818cf8!important;background:#1e293b!important}','.smva-msgs{background:#0f172a!important}','.smva-msg-bot{background:rgba(255,255,255,.06)!important;color:#e2e8f0!important;border:0.5px solid rgba(255,255,255,.1)!important}','.smva-msg-user{background:rgba(99,102,241,.4)!important;color:#c7d2fe!important}','.smva-voice-body{background:#0a0f1e!important}','.smva-status-text{color:rgba(255,255,255,.4)!important}','.smva-timer{color:#e0e7ff!important}','.smva-voice-ft,.smva-chat-ft{background:#0f172a!important;border-top:0.5px solid rgba(255,255,255,.06)!important}','.smva-input{background:rgba(255,255,255,.06)!important;border:0.5px solid rgba(255,255,255,.12)!important;color:#e2e8f0!important}','.smva-send{background:rgba(99,102,241,.5)!important}','.smva-suggestions{border-top:0.5px solid rgba(255,255,255,.06)!important;background:#0f172a!important}','.smva-chip{background:rgba(255,255,255,.06)!important;border-color:rgba(99,102,241,.4)!important;color:#818cf8!important}','.smva-btn-start{background:#6366f1!important}','#smva-text-panel{background:#1e293b!important;border-top:0.5px solid rgba(255,255,255,.08)!important}','#smva-text-label{color:#818cf8!important}','#smva-text-input{background:rgba(255,255,255,.06)!important;border-color:rgba(99,102,241,.4)!important;color:#e2e8f0!important}'].join('');
        } else if (theme === 'glass') {
            css = ['#smva-panel{background:rgba(255,255,255,.55)!important;border:1px solid rgba(255,255,255,.8)!important;backdrop-filter:blur(20px) saturate(160%)!important;-webkit-backdrop-filter:blur(20px) saturate(160%)!important;box-shadow:0 8px 32px rgba(0,0,0,.12),inset 0 0.5px 0 rgba(255,255,255,.9)!important;border-radius:20px!important}','.smva-hdr{background:rgba(255,255,255,.35)!important;border-bottom:0.5px solid rgba(255,255,255,.6)!important}','.smva-hn{color:#1e293b!important}','.smva-hs{color:#475569!important}','.smva-hs::before{background:#10b981!important}','.smva-x{background:rgba(0,0,0,.06)!important;color:#374151!important;border:0.5px solid rgba(0,0,0,.1)!important}','.smva-tabs{background:rgba(255,255,255,.25)!important;border-bottom:0.5px solid rgba(0,0,0,.06)!important}','.smva-tab-btn{color:#64748b!important}','.smva-tab-btn.active{color:#1e293b!important;border-bottom-color:#1e293b!important;background:rgba(255,255,255,.4)!important}','.smva-msgs{background:transparent!important}','.smva-msg-bot{background:rgba(255,255,255,.6)!important;color:#1e293b!important;border:0.5px solid rgba(255,255,255,.9)!important;backdrop-filter:blur(8px)!important}','.smva-msg-user{background:rgba(30,41,59,.75)!important;color:#fff!important;backdrop-filter:blur(8px)!important}','.smva-voice-body{background:rgba(255,255,255,.2)!important}','.smva-status-text{color:#64748b!important}','.smva-timer{color:#1e293b!important}','.smva-btn-start{background:rgba(30,41,59,.8)!important;color:#fff!important;border:none!important}','.smva-btn-end{background:rgba(220,38,38,.15)!important;color:#b91c1c!important}','.smva-voice-ft,.smva-chat-ft{background:rgba(255,255,255,.3)!important;border-top:0.5px solid rgba(0,0,0,.06)!important}','.smva-input{background:rgba(255,255,255,.6)!important;border:0.5px solid rgba(0,0,0,.1)!important;color:#1e293b!important}','.smva-input::placeholder{color:#94a3b8!important}','.smva-send{background:rgba(30,41,59,.8)!important;border:none!important}','.smva-suggestions{background:rgba(255,255,255,.2)!important;border-top:0.5px solid rgba(0,0,0,.05)!important}','.smva-chip{background:rgba(255,255,255,.5)!important;border-color:rgba(0,0,0,.1)!important;color:#374151!important}','.smva-chip:hover{background:rgba(30,41,59,.8)!important;color:#fff!important;border-color:transparent!important}','#smva-text-panel{background:rgba(255,255,255,.4)!important;backdrop-filter:blur(8px)!important}'].join('');
        } else if (theme === 'gradient') {
            css = ['#smva-panel{border-radius:20px!important}','.smva-hdr{background:linear-gradient(135deg,#667eea,#764ba2)!important}','.smva-msg-user{background:linear-gradient(135deg,#667eea,#764ba2)!important}','.smva-send{background:linear-gradient(135deg,#667eea,#764ba2)!important}','.smva-btn-start{background:linear-gradient(135deg,#667eea,#764ba2)!important}','.smva-tab-btn.active{color:#764ba2!important;border-bottom-color:#764ba2!important}','.smva-chip{color:#764ba2!important;border-color:rgba(118,75,162,.3)!important}','.smva-chip:hover{background:#764ba2!important}','#smva-text-send{background:linear-gradient(135deg,#667eea,#764ba2)!important}'].join('');
        }
        if (css) { ts.textContent = css; document.head.appendChild(ts); }
    }

    function injectStyles() {
        const s = document.createElement('style');
        s.textContent = [
            '#smva{position:fixed!important;bottom:22px!important;'+side+':22px!important;z-index:999999!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
            (CONFIG.widgetStyle==="pill" ? '#smva-fab{border:none;cursor:pointer;transition:all .2s;padding:0}' : '#smva-fab{width:54px;height:54px;border-radius:50%;background:'+c+';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 16px '+c+'66;transition:all .2s;position:relative}'),
            '#smva-fab:hover{transform:scale(1.08);box-shadow:0 6px 20px '+c+'88}#smva-fab:active{transform:scale(.94)}',
            '@keyframes smva-pulse{0%,100%{box-shadow:0 4px 16px '+c+'66,0 0 0 0 '+c+'44}70%{box-shadow:0 4px 16px '+c+'66,0 0 0 12px rgba(0,0,0,0)}}',
            '#smva-fab.smva-pulse{animation:smva-pulse 1.8s ease-in-out 3}',
            '#smva-bubble{position:absolute;bottom:64px;right:0;background:#fff;border-radius:12px 12px 0 12px;padding:10px 14px;font-size:13px;color:#111827;box-shadow:0 4px 16px rgba(0,0,0,.12);white-space:normal;max-width:200px;width:max-content;line-height:1.4;opacity:0;transform:translateY(6px);transition:opacity .3s,transform .3s;pointer-events:none}',
            '#smva-bubble.show{opacity:1;transform:translateY(0);pointer-events:auto}',
            '#smva-bubble::after{content:"";position:absolute;bottom:-6px;right:14px;width:12px;height:12px;background:#fff;clip-path:polygon(0 0,100% 0,100% 100%)}',
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
            '.smva-status-text{font-size:12px;color:#9ca3af;text-align:center;font-weight:500}',
            '.smva-voice-ft{padding:12px 16px;border-top:1px solid #f0f0f0;display:flex;gap:8px;background:#fff}',
            '.smva-btn{flex:1;padding:11px;border-radius:10px;border:none;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s;letter-spacing:-.01em}',
            '.smva-btn-start{background:'+c+';color:#fff;box-shadow:0 2px 8px '+c+'44}.smva-btn-start:hover{filter:brightness(1.08);box-shadow:0 4px 12px '+c+'55}',
            '.smva-btn-end{background:#fee2e2;color:#b91c1c}.smva-btn-end:hover{background:#fecaca}',
            '.smva-btn.hide{display:none}',
            // NEW: text input panel
            '#smva-text-panel{display:none;padding:12px 16px 14px;border-top:1px solid #e8f0fe;background:#f0f4ff;flex-direction:column;gap:8px}',
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
            '.smva-chip:hover{background:'+c+';color:#fff;border-color:'+c+';transform:translateY(-1px)}',
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

    function buildWidget() {
        if (!caps.voice && !caps.chat) { buildCTA(); return; }

        const questions = Array.isArray(CONFIG.suggestedQuestions) ? CONFIG.suggestedQuestions : [];
        const chipsHtml = questions.length > 0
            ? '<div class="smva-suggestions" id="smva-suggestions">' + questions.map(q => '<button class="smva-chip" data-q="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div>'
            : '';

        const tabsBar = (caps.voice && caps.chat)
            ? '<div class="smva-tabs"><button class="smva-tab-btn ' + (activeTab==='voice'?'active':'') + '" id="smva-tab-voice">' + MIC.replace('18','14') + ' ' + t('voice') + '</button><button class="smva-tab-btn ' + (activeTab==='chat'?'active':'') + '" id="smva-tab-chat">' + CHAT_IC.replace('18','14') + ' ' + t('chat') + '</button></div>'
            : '';

        const voicePanel = caps.voice
            ? '<div class="smva-tab-content ' + (activeTab==='voice'?'active':'') + '" id="smva-voice-tab">'
                + '<div class="smva-voice-body">'
                    + '<div class="smva-viz" id="smva-viz"><span class="smva-bar"></span><span class="smva-bar" style="animation-delay:.1s"></span><span class="smva-bar" style="animation-delay:.2s"></span><span class="smva-bar" style="animation-delay:.3s"></span><span class="smva-bar" style="animation-delay:.4s"></span></div>'
                    + '<div class="smva-timer" id="smva-timer">00:00</div>'
                    + '<div class="smva-status-text" id="smva-voice-status">' + t('ready') + '</div>'
                    + '<div class="smva-speak-hint" id="smva-speak-hint" style="display:none;font-size:11px;color:' + c + ';background:' + c + '11;border:1px solid ' + c + '33;border-radius:20px;padding:5px 14px;margin-top:4px;text-align:center;opacity:0;transition:opacity 1s ease">' + t('speak_hint') + '</div>'
                + '</div>'
                + '<div class="smva-voice-ft">'
                    + '<button class="smva-btn smva-btn-start" id="smva-start">' + MIC + ' ' + t('start_call') + '</button>'
                    + '<button class="smva-btn smva-btn-end hide" id="smva-end">' + END_IC + ' ' + t('end_call') + '</button>'
                + '</div>'
                // NEW: text input panel — hidden by default, shown when agent requests typed input
                + '<div id="smva-text-panel">'
                    + '<div id="smva-text-label">' + t('type_response') + '</div>'
                    + '<div class="smva-text-input-row">'
                        + '<input type="text" id="smva-text-input" placeholder="" autocomplete="off">'
                        + '<button id="smva-text-send">' + SEND_IC + '</button>'
                    + '</div>'
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
                + tabsBar + voicePanel + chatPanel
            + '</div>'
            + (CONFIG.widgetStyle === 'pill'
                ? '<button id="smva-fab" style="display:flex!important;align-items:center;gap:10px;background:#fff!important;border-radius:50px;padding:8px 14px 8px 8px;box-shadow:0 2px 16px rgba(0,0,0,0.12);cursor:pointer;min-width:200px;position:fixed!important;bottom:22px!important;'+side+':22px!important;z-index:999999!important"><div style="width:36px;height:36px;border-radius:50%;background:'+c+';display:flex;align-items:center;justify-content:center">' + AI_IC + '</div><span style="flex:1;font-size:13px;font-weight:500;color:#374151">' + esc(CONFIG.pillText) + '</span><div style="width:32px;height:32px;border-radius:50%;background:'+c+';display:flex;align-items:center;justify-content:center">' + CHAT_IC.replace('18','15') + '</div></button>'
                : '<button id="smva-fab">' + AI_IC + '</button>');

        document.body.appendChild(w);

        h('smva-fab').addEventListener('click', function() {
            var panel = h('smva-panel');
            panel.classList.toggle('hide');
            if (!panel.classList.contains('hide') && activeTab === 'chat') {
                panel.style.height = '520px';
                var msgs = h('smva-msgs');
                if (msgs) setTimeout(function(){ msgs.scrollTop = msgs.scrollHeight; }, 50);
            }
        });
        h('smva-x').addEventListener('click', function() {
            var panel = h('smva-panel');
            panel.classList.add('hide');
            panel.style.height = '';
        });

        if (caps.voice && caps.chat) {
            h('smva-tab-voice').addEventListener('click', () => switchTab('voice'));
            h('smva-tab-chat').addEventListener('click',  () => switchTab('chat'));
        }

        if (caps.voice) {
            h('smva-start').addEventListener('click', startCall);
            h('smva-end').addEventListener('click', endCall);

            // Text input panel submit
            const textSendBtn = h('smva-text-send');
            const textInput   = h('smva-text-input');
            if (textSendBtn && textInput) {
                function submitTextInput() {
                    const val = textInput.value.trim();
                    console.log('[SUBMIT] val:', val, 'ws:', ws ? ws.readyState : 'null');
                    if (!val || !ws || ws.readyState !== WebSocket.OPEN) return;
                    ws.send(JSON.stringify({ type: 'text_input', text: val, field: textInput.dataset.field || '' }));
                    textInput.value = '';
                    textInput.disabled = true;
                    textSendBtn.disabled = true;
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
        h('smva-tab-voice').classList.toggle('active', tab === 'voice');
        h('smva-tab-chat').classList.toggle('active', tab === 'chat');
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

            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
            ws = new WebSocket(CONFIG.wsUrl + '?token=' + CONFIG.internalToken);

            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'start', licenseKey: CONFIG.internalToken, sessionType: 'voice', isChatOnly: false, callCooldown: CONFIG.callCooldown || 20, maxCallDuration: CONFIG.maxCallDuration || 10, silenceTimeout: CONFIG.silenceTimeout || 60 }));
                voiceState = 'active';
                setSt(t('on_call'));
                h('smva-voice-status').textContent = t('on_call');
                h('smva-viz').classList.add('show', 'active');
                h('smva-timer').classList.add('show');
                const hintEl = h('smva-speak-hint');
                if (hintEl) { hintEl.style.opacity = '0'; hintEl.style.display = 'block'; setTimeout(function(){ hintEl.style.opacity = '1'; }, 50); }
                callSeconds = 0;
                updateTimer();
                callTimer = setInterval(updateTimer, 1000);
                startAudioCapture();
            };

            ws.onmessage = async (e) => {
                try {
                    const data = JSON.parse(e.data);

                    if (data.type === 'thinking') {
                        const el = h('smva-voice-status');
                        if (el) { el.textContent = data.text; setTimeout(() => { if (voiceState === 'active') el.textContent = t('on_call'); }, 4000); }
                    }

                    if (data.type === 'audio') {
                        audioQueue.push({ audio: data.audio, mimeType: data.mimeType || 'audio/pcm;rate=24000' });
                        if (!isPlayingAudio) playNextAudio();
                    } else if (data.type === 'chat_response') {
                        isTyping = false;
                        addChatMessage('bot', data.text);
                        chatHistory.push({ role: 'bot', content: data.text });
                        saveChatHistory();

                    // ── Feature A: agent said goodbye → close call + widget ──
                    } else if (data.type === 'end_call') {
                        const delay = typeof data.delay === 'number' ? data.delay : 2000;
                        const vs = h('smva-voice-status');
                        if (vs) vs.textContent = data.message || t('call_ended_by_agent');
                        agentEndedCall = true;
                        setTimeout(() => {
                            endCall();
                            const panel = h('smva-panel');
                            if (panel) panel.classList.add('hide');
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
                            input.disabled      = false;
                            if (sendBtn) sendBtn.disabled = false;
                            panel.classList.add('show');
                            setTimeout(() => input.focus(), 100);
                        }

                    // ── Feature B: backend confirmed receipt → re-enable input ──
                    } else if (data.type === 'display_text') { renderDisplayText(data); } else if (data.type === 'text_input_received') {
                        const input   = h('smva-text-input');
                        const sendBtn = h('smva-text-send');
                        if (input)   { input.disabled = false; input.value = ''; }
                        if (sendBtn) sendBtn.disabled = false;
                        // Uncomment to auto-close panel after submit:
                        // const panel = h('smva-text-panel');
                        // if (panel) panel.classList.remove('show');

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

            ws.onerror = () => endCall();
            ws.onclose = (evt) => {
                if (agentEndedCall) { setTimeout(() => { const panel = h('smva-panel'); if (panel) panel.classList.add('hide'); agentEndedCall = false; }, 500); }
                if (evt.code === 4004) { endCall(); setSt('Your trial has expired. Please upgrade your plan.');
                } else if (evt.code === 4003) { endCall(); setSt('Monthly usage limit reached. Please upgrade.');
                } else if (evt.code === 4001 || evt.code === 4002) { endCall(); setSt('License inactive. Please check your plan.');
                } else if (voiceState !== 'idle') { endCall(); }
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

    function endCall() {
        if (agentEndedCall) { const panel = h('smva-panel'); if (panel) panel.classList.add('hide'); agentEndedCall = false; }
        voiceState = 'idle';
        lastCallEnd = Date.now();
        setSt(t('ready'));
        const vs = h('smva-voice-status'); if (vs) vs.textContent = t('ready');
        const st = h('smva-start'); if (st) { st.classList.remove('hide'); st.disabled = false; st.style.opacity = ''; }
        const en = h('smva-end'); if (en) en.classList.add('hide');
        const vz = h('smva-viz'); if (vz) vz.classList.remove('show', 'active');
        const tm = h('smva-timer'); if (tm) tm.classList.remove('show');
        const hint = h('smva-speak-hint'); if (hint) { hint.style.opacity = '0'; hint.style.display = 'none'; }
        // NEW: hide text input panel
        const textPanel = h('smva-text-panel'); if (textPanel) textPanel.classList.remove('show');
        const textInput = h('smva-text-input'); if (textInput) { textInput.value = ''; textInput.disabled = false; }
        const textSend  = h('smva-text-send');  if (textSend)  textSend.disabled = false;
        if (callTimer) { clearInterval(callTimer); callTimer = null; }
        stopPlayback();
        if (ws) { try { ws.send(JSON.stringify({ type: 'stop' })); } catch(e){} try { ws.close(); } catch(e){} ws = null; }
        if (mediaStream) { mediaStream.getTracks().forEach(tr => tr.stop()); mediaStream = null; }
        if (audioContext) { try { audioContext.suspend(); } catch(e) {} try { audioContext.close(); } catch(e) {} audioContext = null; }
        callSeconds = 0;
        setTimeout(refreshQuota, 1500);
    }

    function startAudioCapture() {
        if (!mediaStream || !ws || ws.readyState !== WebSocket.OPEN) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(mediaStream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) { const s = Math.max(-1, Math.min(1, inputData[i])); pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF; }
            const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(pcm16.buffer)));
            ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
            let maxVal = 0;
            for (let j = 0; j < pcm16.length; j++) { const v = Math.abs(pcm16[j]); if (v > maxVal) maxVal = v; }
            if (maxVal > 800) {
                if (isPlayingAudio) { stopPlayback(); try { if (ws) ws.send(JSON.stringify({ type: 'interrupt' })); } catch(e) {} }
                const hint = h('smva-speak-hint');
                if (hint && hint.style.display !== 'none') { hint.style.opacity = '0'; setTimeout(function(){ hint.style.display = 'none'; }, 1000); }
            }
        };
        source.connect(processor);
        processor.connect(audioContext.destination);
    }

    async function playNextAudio() {
        if (audioQueue.length === 0) { isPlayingAudio = false; return; }
        isPlayingAudio = true;
        const generationAtStart = playbackGeneration;
        const item = audioQueue.shift();
        const base64Audio = (item && typeof item === 'object') ? item.audio : item;
        const mimeType = (item && typeof item === 'object' && item.mimeType) ? item.mimeType : 'audio/pcm;rate=24000';
        const rateMatch = /rate=(\d+)/i.exec(String(mimeType || ''));
        const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
        if (audioContext.state === 'suspended') { try { await audioContext.resume(); } catch (e) {} }
        try {
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            const pcm16 = new Int16Array(bytes.buffer);
            if (pcm16.length === 0 || generationAtStart !== playbackGeneration) { playNextAudio(); return; }
            const audioBuffer = audioContext.createBuffer(1, pcm16.length, sampleRate);
            const channelData = audioBuffer.getChannelData(0);
            for (let i = 0; i < pcm16.length; i++) channelData[i] = pcm16[i] / 32768.0;
            const source = audioContext.createBufferSource();
            currentPlaybackSource = source;
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onended = () => {
                if (currentPlaybackSource === source) currentPlaybackSource = null;
                if (generationAtStart !== playbackGeneration) { isPlayingAudio = false; return; }
                playNextAudio();
            };
            source.start(0);
        } catch (err) { console.error('[SMVA] Audio error:', err); if (generationAtStart === playbackGeneration) playNextAudio(); }
    }

    function stopPlayback() {
        playbackGeneration++;
        audioQueue = [];
        isPlayingAudio = false;
        if (currentPlaybackSource) {
            try { currentPlaybackSource.onended = null; } catch (e) {}
            try { currentPlaybackSource.stop(0); } catch (e) {}
            try { currentPlaybackSource.disconnect(); } catch (e) {}
            currentPlaybackSource = null;
        }
    }

    function updateTimer() {
        callSeconds++;
        const maxSecs = CONFIG.maxCallDuration ? parseInt(CONFIG.maxCallDuration,10) * 60 : 0;
        if (maxSecs > 0 && callSeconds >= maxSecs) { endCall(); return; }
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
    }

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
                    if (data.type === 'chat_response') { isTyping = false; addChatMessage('bot', data.text); chatHistory.push({ role: 'bot', content: data.text }); saveChatHistory();
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
        chatMessages.push({ role, text });
        updateChatUI();
    }

    function formatMsg(text) {
      var escaped = esc(text);
      // URLs → clickable links (http/https)
      escaped = escaped.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;word-break:break-all;">$1</a>');
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
        chatMessages.forEach(msg => { const cls = msg.role === 'user' ? 'smva-msg-user' : 'smva-msg-bot'; html += '<div class="smva-msg ' + cls + '">' + formatMsg(msg.text) + '</div>'; });
        if (isTyping) html += '<div class="smva-typing"><span></span><span></span><span></span></div>';
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    injectStyles();
    buildWidget();
    injectThemeStyles(CONFIG.widgetTheme, CONFIG.primaryColor);

    setTimeout(function() {
        var fab = h('smva-fab');
        var panel = h('smva-panel');
        if (!fab || (panel && !panel.classList.contains('hide'))) return;
        var bubble = document.createElement('div');
        bubble.id = 'smva-bubble';
        bubble.textContent = CONFIG.greeting || 'Hi! Need help?';
        fab.parentElement.appendChild(bubble);
        fab.classList.add('smva-pulse');
        setTimeout(function() { bubble.classList.add('show'); }, 300);
        setTimeout(function() { bubble.classList.remove('show'); fab.classList.remove('smva-pulse'); }, 6000);
        fab.addEventListener('click', function() { bubble.classList.remove('show'); }, { once: true });
    }, 3000);

    if (CONFIG.greeting && caps.chat) { addChatMessage('bot', CONFIG.greeting); }

})();


/* === Feature C: display_text === */
function renderDisplayText(p){
  if(!p||!p.text)return;
  var existing=document.querySelector('.smva-msgs');
  if(existing&&existing.querySelector('[data-smva-dt="'+String(p.text).replace(/"/g,'&quot;')+'"]'))return;
  var panel=document.querySelector('.smva-msgs')||document.querySelector('.smva-chat-messages')||document.querySelector('.smva-messages');
  if(!panel)return;
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
  var text=String(p.text), kind=(p.kind||'text').toLowerCase();
  var label=p.label||({email:'Email',phone:'Phone',url:'Link',address:'Address',text:'Info'}[kind]||'Info');
  var href=null,icon='📋',primary='';
  if(kind==='email'){href='mailto:'+text;icon='✉️';primary='Email';}
  else if(kind==='phone'){href='tel:'+text.replace(/[^\d+]/g,'');icon='📞';primary='Call';}
  else if(kind==='url'){href=/^https?:\/\//i.test(text)?text:'https://'+text;icon='🔗';primary='Open';}
  else if(kind==='address'){href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(text);icon='📍';primary='Map';}
  var esc=function(x){return String(x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var card=document.createElement('div');
  card.className='smva-dt smva-dt-'+kind;
  card.setAttribute('data-smva-dt', text);
  card.innerHTML='<div class="smva-dt-icon">'+icon+'</div>'+
    '<div class="smva-dt-body"><div class="smva-dt-label">'+esc(label)+'</div><div class="smva-dt-value">'+esc(text)+'</div></div>'+
    '<div class="smva-dt-actions">'+
      (href?'<a class="smva-dt-btn smva-dt-primary" href="'+href+'" target="_blank" rel="noopener">'+primary+'</a>':'')+
      '<button class="smva-dt-btn smva-dt-copy" type="button">Copy</button>'+
    '</div>';
  panel.appendChild(card);
  panel.scrollTop=panel.scrollHeight;
  card.querySelector('.smva-dt-copy').addEventListener('click',function(){
    var btn=card.querySelector('.smva-dt-copy'),orig=btn.textContent;
    var done=function(){btn.textContent='Copied!';setTimeout(function(){btn.textContent=orig;},1500);};
    if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(done).catch(function(){smvaDtFallbackCopy(text,done);});}
    else{smvaDtFallbackCopy(text,done);}
  });
}
function smvaDtFallbackCopy(t,done){try{var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);done();}catch(e){}}
(function(){if(document.getElementById('smva-dt-css'))return;var s=document.createElement('style');s.id='smva-dt-css';
s.textContent='.smva-dt{display:flex;gap:10px;align-items:center;padding:10px 12px;margin:8px 0;border-radius:12px;background:var(--smva-card-bg,rgba(0,0,0,0.05));border:1px solid var(--smva-border,rgba(0,0,0,0.08))}.smva-dt-icon{font-size:20px;line-height:1}.smva-dt-body{flex:1;min-width:0}.smva-dt-label{font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}.smva-dt-value{font-size:14px;font-weight:600;word-break:break-all;line-height:1.3}.smva-dt-actions{display:flex;gap:6px;flex-shrink:0}.smva-dt-btn{padding:6px 10px;font-size:12px;border-radius:8px;cursor:pointer;border:1px solid var(--smva-border,rgba(0,0,0,.15));background:#fff;color:#111;text-decoration:none;font-family:inherit}.smva-dt-primary{background:var(--smva-accent,#2563eb);color:#fff;border-color:transparent}.smva-dt-btn:hover{opacity:.9}[dir="rtl"] .smva-dt-label{letter-spacing:0}';
(document.head||document.documentElement).appendChild(s);})();


/* === Feature C addon: sticky call-bar in chat tab === */
// expose i18n strings for call-bar (outside closure)
var smvaCallBarI18n = {
  on_call:  (document.documentElement.lang && document.documentElement.lang.startsWith('fa')) ? 'در حال مکالمه' : 'On call',
  end_call: (document.documentElement.lang && document.documentElement.lang.startsWith('fa')) ? 'پایان تماس' : 'End Call'
};
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
    var _cbI18n = (typeof smvaCallBarI18n !== 'undefined') ? smvaCallBarI18n : {on_call:'On call', end_call:'End Call'};
    bar.innerHTML =
      '<span class="smva-cb-dot"></span>' +
      '<span class="smva-cb-lbl" id="smva-cb-lbl">' + _cbI18n.on_call + '</span>' +
      '<span class="smva-cb-timer" id="smva-cb-timer"></span>' +
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
        '.smva-cb-timer{color:#b91c1c;opacity:.8;font-variant-numeric:tabular-nums;margin-right:auto;}' +
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

