/* StudioMeta Voice AI - Admin JS */
jQuery(function($) {
  function smvaLimStep(id, step) {
    var el = document.getElementById(id);
    if (!el) return;
    var val = parseInt(el.value) || 0;
    var min = parseInt(el.min) || 0;
    var max = parseInt(el.max) || 9999;
    el.value = Math.min(max, Math.max(min, val + step));
  }
  window.smvaLimStep = smvaLimStep;

    window.SMVAAdminDebug = window.SMVAAdminDebug || {};
    window.SMVAAdminDebug.version = '1.3.59';
    window.SMVAAdminDebug.context = 'wp-admin';
    window.SMVAAdminDebug.loadedAt = Date.now();
    window.SMVAAdminDebug.hasAdminConfig = !!window.smvaAdmin;

    var nonce = window.smvaAdmin ? window.smvaAdmin.nonce : '';

    function showLoading(msg) {
        $('#smva-agent-loading').show();
        $('#smva-loading-text').text(msg || 'Processing...');
        $('#smva-agent-msg').text('').css('color','');
    }
    function hideLoading() {
        $('#smva-agent-loading').hide();
    }
    var ajaxUrl = window.smvaAdmin ? window.smvaAdmin.ajaxUrl : '';
    window.SMVAAdminDebug.ajaxUrl = ajaxUrl;
    window.SMVAAdminDebug.hasNonce = !!nonce;

    // ── License Activation (with confirm-replace flow) ─────────────────────
    function performActivation(key, confirmReplace) {
        var $btn = $('#smva-activate-btn').text('Activating...').prop('disabled', true);
        var $msg = $('#smva-license-msg').removeClass('smva-msg-success smva-msg-error').hide();

        var payload = {
            action: 'smva_activate_license',
            nonce: nonce,
            license_key: key
        };
        if (confirmReplace) payload.confirm_replace = '1';

        $.post(ajaxUrl, payload)
            .done(function(res) {
                if (res.success) {
                    // Backend asks for confirmation (license active elsewhere)
                    if (res.data && res.data.needs_confirmation) {
                        showReplaceConfirmDialog(key, res.data);
                        $btn.text(smvaAdmin.i18n.activate).prop('disabled', false);
                        return;
                    }
                    // Normal success
                    $msg.addClass('smva-msg-success').text(res.data.message).show();
                    if (res.data.reload) setTimeout(function() { location.reload(); }, 1200);
                } else {
                    var errData = res.data || {};
                    $msg.addClass('smva-msg-error').text(errData.message || 'Error').show();
                    $btn.text(smvaAdmin.i18n.activate).prop('disabled', false);
                }
            })
            .fail(function() {
                $msg.addClass('smva-msg-error').text(smvaAdmin.i18n.connectionError).show();
                $btn.text(smvaAdmin.i18n.activate).prop('disabled', false);
            });
    }

    $('#smva-activate-btn').on('click', function() {
        var key = $('#smva-license-input').val().trim();
        if (!key) return;
        performActivation(key, false);
    });


    $('#smva-start-trial-btn').on('click', function() {
        var $btn = $(this).text('Starting trial...').prop('disabled', true);
        var $msg = $('#smva-trial-msg').removeClass('smva-msg-success smva-msg-error').hide();
        $.post(ajaxUrl, { action: 'smva_start_trial', nonce: nonce })
            .done(function(res) {
                if (res.success) {
                    $msg.addClass('smva-msg-success').text((res.data && res.data.message) || 'Trial activated.').show();
                    if (res.data && res.data.reload) setTimeout(function() { location.reload(); }, 1000);
                } else {
                    var errData = res.data || {};
                    $msg.addClass('smva-msg-error').text(errData.message || 'Could not start trial.').show();
                    $btn.text(smvaAdmin.i18n.startFreeTrial).prop('disabled', false);
                }
            })
            .fail(function() {
                $msg.addClass('smva-msg-error').text(smvaAdmin.i18n.connectionError).show();
                $btn.text(smvaAdmin.i18n.startFreeTrial).prop('disabled', false);
            });
    });

    // ── Dialog: Confirm replacing other site ─────────────────────────────
    function showReplaceConfirmDialog(key, data) {
        var currentSite = data.current_active_site || 'another site';
        var html = ''
            + '<div class="smva-modal-overlay" id="smva-replace-modal">'
            + '<div class="smva-modal">'
            +   '<h3 style="margin:0 0 12px;font-size:18px">⚠ License is in use elsewhere</h3>'
            +   '<p style="font-size:14px;color:#374151;margin:0 0 12px">'
            +     'This license is currently active on:'
            +   '</p>'
            +   '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-family:monospace;font-size:13px;color:#111827;word-break:break-all">'
            +     esc(currentSite)
            +   '</div>'
            +   '<p style="font-size:13px;color:#6b7280;margin:0 0 8px">'
            +     'Activating here will <strong>deactivate the widget on that site</strong>. '
            +     'The agent settings on this site will start blank.'
            +   '</p>'
            +   '<p style="font-size:12px;color:#9ca3af;margin:0 0 20px">'
            +     'If you need the widget on multiple sites, please purchase additional licenses at '
            +     '<a href="' + esc(window.smvaAdmin.pricingUrl || 'https://studiometa.io/pricing/') + '" target="_blank">studiometa.io/pricing</a>.'
            +   '</p>'
            +   '<div style="display:flex;gap:8px;justify-content:flex-end">'
            +     '<button type="button" id="smva-cancel-replace" class="smva-btn">Cancel</button>'
            +     '<button type="button" id="smva-confirm-replace" class="smva-btn smva-btn-danger" style="background:#dc2626;color:#fff;border-color:#dc2626">Yes, deactivate other site</button>'
            +   '</div>'
            + '</div></div>';

        $('body').append(html);

        $('#smva-cancel-replace').on('click', function() {
            $('#smva-replace-modal').remove();
        });
        $('#smva-confirm-replace').on('click', function() {
            $('#smva-replace-modal').remove();
            performActivation(key, true);
        });
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    $('#smva-deactivate-btn').on('click', function() {
        if (!confirm('Remove license from this site?\n\nThis will disconnect the AI widget. Your license key will be removed from this site — you can re-enter it anytime or use it on a different site.\n\nYour agent settings (KB, prompts, voice) are saved in the cloud and will be restored when you re-activate.')) return;
        $.post(ajaxUrl, {action:'smva_deactivate_license', nonce:nonce}).done(function(res) { if(res.success && res.data.reload) location.reload(); });
    });

    // Refresh quota (Dashboard / License tabs)
    $(document).on('click', '#smva-refresh-quota', function() {
        var $btn = $(this).prop('disabled', true).text('Refreshing…');
        $.post(ajaxUrl, { action: 'smva_refresh_quota', nonce: nonce })
            .done(function(res) {
                if (!res.success || !res.data) { return; }
                var q = res.data;
                var vUsed  = parseFloat(q.voice_minutes_used  || 0);
                var vLimit = parseInt(q.voice_minutes_limit || 0, 10);
                var cUsed  = parseInt(q.chat_messages_used  || 0, 10);
                var cLimit = parseInt(q.chat_messages_limit || 0, 10);
                var vPct = vLimit > 0 ? Math.min(100, (vUsed / vLimit) * 100) : 0;
                var cPct = cLimit > 0 ? Math.min(100, (cUsed / cLimit) * 100) : 0;

                // Thresholds must match the server-side render in admin-page.php,
                // otherwise a refresh recolours a bar the page load drew differently.
                $('#smva-voice-fill').css('width', vPct + '%')
                    .removeClass('warn danger')
                    .addClass(vPct > 90 ? 'danger' : (vPct > 70 ? 'warn' : ''));
                $('#smva-chat-fill').css('width', cPct + '%')
                    .removeClass('warn danger')
                    .addClass(cPct > 90 ? 'danger' : (cPct > 70 ? 'warn' : ''));
                $('#smva-voice-num').text(vUsed.toFixed(1));
                $('#smva-voice-limit').text('of ' + vLimit);
                $('#smva-chat-num').text(cUsed);
                $('#smva-chat-limit').text('of ' + cLimit);

                // If the plan or engine changed (e.g. trial → paid), reload so the
                // badge and the voice list reflect it immediately rather than
                // staying stale until someone refreshes by hand.
                var known = window.smvaAdmin || {};
                if ((q.plan && known.plan && q.plan !== known.plan) ||
                    (q.engine && known.engine && q.engine !== known.engine)) {
                    location.reload();
                }
            })
            .always(function() { $btn.prop('disabled', false).text(smvaAdmin.i18n.refresh); });
    });

    // Auto-refresh quota every 30s on Dashboard tab
    if (/[?&]tab=dashboard/.test(window.location.search)) {
        setInterval(function() { $('#smva-refresh-quota').trigger('click'); }, 30000);
    }

    // Auto-refresh quota on page load if values appear to be zero/empty
    // Handles: (a) post-reinstall when cache is empty (b) first-load timing
    (function() {
        var $voiceNum = $('#smva-voice-num');
        var $chatNum  = $('#smva-chat-num');
        if (!$voiceNum.length || !$chatNum.length) return;

        function looksEmpty() {
            // A zero limit means the quota has not been fetched yet — the used
            // value alone is ambiguous, since 0 used is legitimate on a fresh plan.
            var vLimit = $('#smva-voice-limit').text().trim();
            var cLimit = $('#smva-chat-limit').text().trim();
            var emptyLimits = ['of 0', ''];
            return emptyLimits.indexOf(vLimit) > -1 || emptyLimits.indexOf(cLimit) > -1;
        }

        // Try 1: after 800ms (backend should be cached by now)
        if (looksEmpty()) {
            setTimeout(function() {
                $('#smva-refresh-quota').trigger('click');
                // Try 2: after 3s if still empty (backend still computing)
                setTimeout(function() {
                    if (looksEmpty()) $('#smva-refresh-quota').trigger('click');
                }, 3000);
            }, 800);
        }
    })();

    $('#smva-color-input').on('input', function() { $('#smva-color-val').text($(this).val()); });


    var smvaPreviewUtterance = null;
    var smvaPreviewAudio = null;
    var smvaPreviewSynth = window.speechSynthesis || null;

    function getSelectedVoiceMeta() {
        var $opt = $('#smva-voice-select option:selected');
        return {
            label: $opt.data('label') || $opt.val() || 'Aoede',
            tone: $opt.data('tone') || '',
            bestFor: $opt.data('best-for') || '',
            previewRate: parseFloat($opt.data('preview-rate') || 1),
            previewPitch: parseFloat($opt.data('preview-pitch') || 1)
        };
    }

    function updateVoiceMetaCard() {
        if (!$('#smva-voice-meta-card').length) return;
        var meta = getSelectedVoiceMeta();
        $('#smva-voice-meta-name').text(meta.label);
        $('#smva-voice-meta-tone').text(meta.tone);
        $('#smva-voice-meta-best').text(meta.bestFor);
    }

    function getPreviewLanguage() {
        var lang = $('[name=smva_lang]').val() || 'en';
        if (lang === 'fa') return 'fa-IR';
        if (lang === 'ar') return 'ar-SA';
        if (lang === 'fr') return 'fr-FR';
        if (lang === 'es') return 'es-ES';
        return 'en-US';
    }

    function pickBrowserVoice(lang) {
        if (!smvaPreviewSynth || !smvaPreviewSynth.getVoices) return null;
        var voices = smvaPreviewSynth.getVoices() || [];
        if (!voices.length) return null;
        var base = (lang || 'en').split('-')[0].toLowerCase();
        var exact = voices.find(function(v){ return (v.lang || '').toLowerCase() === (lang || '').toLowerCase(); });
        if (exact) return exact;
        var partial = voices.find(function(v){ return (v.lang || '').toLowerCase().indexOf(base) === 0; });
        return partial || voices[0] || null;
    }

    function setPreviewStatus(text, isError) {
        $('#smva-preview-status').text(text || '').toggleClass('is-error', !!isError);
    }

    // Pre-load browser voices at page start; Chrome delivers them async via onvoiceschanged.
    var smvaBrowserVoices = (smvaPreviewSynth && smvaPreviewSynth.getVoices) ? smvaPreviewSynth.getVoices() : [];

    function pickBrowserVoiceFromCache(lang) {
        var voices = smvaBrowserVoices;
        if (!voices || !voices.length) return null;
        var base = (lang || 'en').split('-')[0].toLowerCase();
        var exact = voices.find(function(v){ return (v.lang || '').toLowerCase() === (lang || '').toLowerCase(); });
        if (exact) return exact;
        var partial = voices.find(function(v){ return (v.lang || '').toLowerCase().indexOf(base) === 0; });
        return partial || voices[0] || null;
    }

    function loadBrowserVoices(callback) {
        if (!smvaPreviewSynth || !smvaPreviewSynth.getVoices) {
            callback([]);
            return;
        }
        var voices = smvaPreviewSynth.getVoices() || [];
        if (voices.length) {
            callback(voices);
            return;
        }
        // Voices not ready yet — poll until available (async load in Chrome/Firefox)
        var tries = 0;
        function poll() {
            var v = smvaPreviewSynth.getVoices() || [];
            if (v.length || tries >= 20) {
                callback(v);
                return;
            }
            tries += 1;
            setTimeout(poll, 150);
        }
        poll();
    }

    function stopGreetingPreview() {
        if (smvaPreviewAudio) {
            smvaPreviewAudio.pause();
            smvaPreviewAudio = null;
        }
        if (smvaPreviewSynth && smvaPreviewSynth.speaking) {
            smvaPreviewSynth.cancel();
        }
        smvaPreviewUtterance = null;
        $('#smva-preview-greeting-btn').prop('disabled', false).text('▶ Preview Greeting');
        $('#smva-stop-preview-btn').hide();
    }

    function startGreetingPreview() {
        var $input = $('#smva-first-message');
        var text = ($input.val() || $input.attr('placeholder') || '').trim();
        if (!text) {
            setPreviewStatus('Enter a Voice Greeting first.', true);
            return;
        }

        var meta = getSelectedVoiceMeta();
        var voiceId = $('#smva-voice-select').val() || 'Aoede';

        // Stop any ongoing playback
        if (smvaPreviewAudio) {
            smvaPreviewAudio.pause();
            smvaPreviewAudio = null;
        }

        setPreviewStatus('Loading preview...', false);
        $('#smva-preview-greeting-btn').prop('disabled', true).text('Loading...');
        $('#smva-stop-preview-btn').hide();

        // Use the StudioMeta AI Engine TTS via backend — supports all languages and all 30 voices
        $.ajax({
            url: window.smvaAdmin.ajaxUrl,
            method: 'POST',
            data: {
                action: 'smva_tts_preview',
                nonce: window.smvaAdmin.nonce,
                text: text,
                voice_id: voiceId
            },
            xhrFields: { responseType: 'blob' },
            success: function(blob) {
                if (!blob || !blob.size) {
                    $('#smva-preview-greeting-btn').prop('disabled', false).text('▶ Preview Greeting');
                    setPreviewStatus('Preview returned an empty audio file.', true);
                    return;
                }
                if (blob.type && blob.type.indexOf('audio/') !== 0) {
                    $('#smva-preview-greeting-btn').prop('disabled', false).text('▶ Preview Greeting');
                    setPreviewStatus('Preview returned a non-audio response. Please check the backend TTS settings.', true);
                    return;
                }
                var url = URL.createObjectURL(blob);
                var audio = new Audio(url);
                smvaPreviewAudio = audio;
                audio.onplay = function() {
                    $('#smva-preview-greeting-btn').prop('disabled', true).text('Playing...');
                    $('#smva-stop-preview-btn').show();
                    setPreviewStatus('Previewing ' + meta.label + ' — ' + meta.tone + '.', false);
                };
                audio.onended = function() {
                    smvaPreviewAudio = null;
                    URL.revokeObjectURL(url);
                    $('#smva-preview-greeting-btn').prop('disabled', false).text('▶ Preview Greeting');
                    $('#smva-stop-preview-btn').hide();
                    setPreviewStatus('Preview finished.', false);
                };
                audio.onerror = function() {
                    smvaPreviewAudio = null;
                    URL.revokeObjectURL(url);
                    $('#smva-preview-greeting-btn').prop('disabled', false).text('▶ Preview Greeting');
                    $('#smva-stop-preview-btn').hide();
                    setPreviewStatus('Preview could not be played.', true);
                };
                audio.play().catch(function(err) {
                    setPreviewStatus('Playback blocked by browser: ' + err.message, true);
                    $('#smva-preview-greeting-btn').prop('disabled', false).text('▶ Preview Greeting');
                });
            },
            error: function() {
                $('#smva-preview-greeting-btn').prop('disabled', false).text('▶ Preview Greeting');
                setPreviewStatus('Could not load preview. Please try again.', true);
            }
        });
    }

    if ($('#smva-voice-select').length) {
        updateVoiceMetaCard();
        $('#smva-voice-select').on('change', function() {
            updateVoiceMetaCard();
            setPreviewStatus('', false);
        });
    }
    $(window).on('beforeunload', stopGreetingPreview);
    $('#smva-preview-greeting-btn').on('click', startGreetingPreview);
    $('#smva-stop-preview-btn').on('click', function() {
        stopGreetingPreview();
        setPreviewStatus('Preview stopped.', false);
    });
    if (smvaPreviewSynth && smvaPreviewSynth.onvoiceschanged !== undefined) {
        smvaPreviewSynth.onvoiceschanged = function() {
            smvaBrowserVoices = smvaPreviewSynth.getVoices() || [];
            updateVoiceMetaCard();
        };
    }

    window.smvaSelectStyle = function(val) {
        $('[name=response_style]').each(function() {
            this.checked = this.value === val;
            $(this).closest('label').css('border-color', this.value === val ? '#2563eb' : '#e5e7eb');
        });
    };

    // Save Agent — never sends agent_tools, only Automation tab manages tools
    $('#smva-agent-form').on('submit', function(e) {
        e.preventDefault();
        var $btn = $(this).find('button[type=submit]').prop('disabled', true).text(smvaAdmin.i18n.saving);
        var $msg = $('#smva-agent-msg').text('').css('color', '');
        $.post(window.smvaAdmin.ajaxUrl, {
            action: 'smva_save_agent',
            nonce: window.smvaAdmin.nonce,
            agent_name: $('[name=agent_name]').val(),
            first_message: $('[name=first_message]').val(),
            system_prompt_b64: btoa(unescape(encodeURIComponent($('[name=system_prompt]').val()||''))),
            knowledge_base_b64: btoa(unescape(encodeURIComponent($('[name=knowledge_base]').val()||''))),
            language: $('[name=language]').val(),
            voice_id: $('[name=voice_id]').val(),
            response_style: $('[name=response_style]:checked').val(),
            agent_timezone: $('[name=agent_timezone]').val(),
            smva_suggested_questions: $('[name=smva_suggested_questions]').val()
        }).done(function(res) {
            if (res.success) $msg.text(res.data && res.data.message ? res.data.message : 'Saved').css('color', '#059669');
            else $msg.text(res.data && res.data.message ? res.data.message : 'Error').css('color', '#dc2626');
        }).fail(function() { $msg.text(smvaAdmin.i18n.connectionError).css('color', '#dc2626'); })
        .always(function() { $btn.prop('disabled', false).text('💾 Save & Sync Agent'); setTimeout(function() { $msg.text('').css('color', ''); }, 4000); });
    });

    // Save General Settings — never sends agent_tools
    $('#smva-settings-form').on('submit', function(e) {
        e.preventDefault();
        var $btn = $(this).find('button[type=submit]').prop('disabled', true).text(smvaAdmin.i18n.saving);
        var $msg = $('#smva-save-msg').text('').css('color', '');

        // Collect extra languages
        var extraLangs = [];
        $('input[name="smva_extra_langs[]"]:checked').each(function() {
            extraLangs.push($(this).val());
        });

        // Save agent identity fields (no agent_tools)
        $.post(window.smvaAdmin.ajaxUrl, {
            action: 'smva_save_agent',
            nonce: window.smvaAdmin.nonce,
            agent_name: $('[name=agent_name]').val(),
            voice_id: $('[name=voice_id]').val(),
            agent_timezone: $('[name=agent_timezone]').val(),
            response_style: $('[name=response_style]:checked').val(),
            first_message: $('[name=first_message]').val(),
            extra_langs: JSON.stringify(extraLangs),
        });

        // Save WordPress settings
        $.post(window.smvaAdmin.ajaxUrl, {
            action: 'smva_save_settings',
            nonce: window.smvaAdmin.nonce,
            smva_lang: $('[name=smva_lang]').val(),
            smva_business_name: $('[name=smva_business_name]').val(),
            smva_greeting: $('[name=smva_greeting]').val(),
            smva_widget_color: $('[name=smva_widget_color]').val(),
            smva_widget_position: $('[name=smva_widget_position]').val(),
            smva_widget_style: $('[name=smva_widget_style]').val(),
            smva_extra_langs: JSON.stringify(extraLangs),
        }).done(function(res) {
            $msg.text(res.success ? 'Saved!' : 'Error').css('color', res.success ? '#059669' : '#dc2626');
        }).fail(function() { $msg.text(smvaAdmin.i18n.connectionError).css('color', '#dc2626'); })
        .always(function() { $btn.prop('disabled', false).text(smvaAdmin.i18n.saveGeneralSettings); setTimeout(function() { $msg.text(''); }, 3000); });
    });

    // Save Widget Settings
    $('#smva-widget-form').on('submit', function(e) {
        e.preventDefault();
        var $btn = $(this).find('button[type=submit]').prop('disabled', true).text(smvaAdmin.i18n.saving);
        var $msg = $('#smva-widget-save-msg').text('').css('color', '');
        $.post(window.smvaAdmin.ajaxUrl, {
            action: 'smva_save_settings',
            nonce: window.smvaAdmin.nonce,
            smva_widget_color: $('[name=smva_widget_color]').val(),
            smva_widget_style: $('[name=smva_widget_style]').val(),
            smva_widget_position: $('[name=smva_widget_position]').val(),
            smva_default_tab: $('[name=smva_default_tab]').val(),
            smva_voice_enabled: $('[name=smva_voice_enabled]').is(':checked') ? '1' : '0',
            smva_chat_enabled: $('[name=smva_chat_enabled]').is(':checked') ? '1' : '0',
            smva_max_call_duration: $('[name=smva_max_call_duration]').val(),
            smva_silence_timeout: $('[name=smva_silence_timeout]').val(),
            smva_call_cooldown: $('[name=smva_call_cooldown]').val(),
            smva_widget_theme: $('#smva_widget_theme').val(),
            smva_agent_logo: $('[name=smva_agent_logo]').val(),
            smva_lazy_load_widget: $('[name=smva_lazy_load_widget]').is(':checked') ? '1' : '0',
            smva_debug_events: $('[name=smva_debug_events]').is(':checked') ? '1' : '0',
            smva_workflow_buttons: $('[name=smva_workflow_buttons]').val()
        }).done(function(res) {
            $msg.text(res.success ? 'Saved!' : 'Error').css('color', res.success ? '#059669' : '#dc2626');
        }).fail(function() { $msg.text(smvaAdmin.i18n.connectionError).css('color', '#dc2626'); })
        .always(function() { $btn.prop('disabled', false).text(smvaAdmin.i18n.saveWidgetSettings); setTimeout(function() { $msg.text(''); }, 3000); });
    });

    // Crawl Site
    $('#smva-crawl-btn').on('click', function() {
        var $btn = $(this);
        var $msg = $('#smva-agent-msg');
        var siteUrl = $('#smva-crawl-url').val().trim() || (window.smvaAdmin && window.smvaAdmin.siteUrl) || window.location.origin;
        if (!confirm('Import KB from:\n' + siteUrl)) return;
        $btn.prop('disabled', true).text('🔄 Crawling...');
        showLoading('Crawling website pages, this may take up to 60 seconds...');
        $.post(window.smvaAdmin.ajaxUrl, {action:'smva_crawl_site', nonce:window.smvaAdmin.nonce, site_url_b64:btoa(unescape(encodeURIComponent(siteUrl)))})
        .done(function(res) {
            if (res.success && res.data.knowledge_base) { $('[name=knowledge_base]').val(res.data.knowledge_base); $msg.text('Imported from ' + (res.data.pages_crawled||'?') + ' pages!').css('color', '#059669'); }
            else $msg.text('Error: ' + (res.data && res.data.message ? res.data.message : 'Failed')).css('color', '#dc2626');
        }).fail(function() { hideLoading(); $msg.text(smvaAdmin.i18n.connectionError).css('color', '#dc2626'); })
        .always(function() { hideLoading(); $btn.prop('disabled', false).text('🌐 Import KB from Website'); setTimeout(function() { $msg.text('').css('color', ''); }, 6000); });
    });

    // Save Lead Notification Settings (Leads tab)
    $('#smva-leads-settings-form').on('submit', function(e) {
        e.preventDefault();
        var $btn = $(this).find('button[type=submit]').prop('disabled', true).text(smvaAdmin.i18n.saving);
        var $msg = $('#smva-leads-settings-msg').text('').css('color', '');
        $.post(ajaxUrl, {
            action: 'smva_save_settings',
            nonce: nonce,
            smva_lead_email_notify: $('[name=smva_lead_email_notify]').is(':checked') ? '1' : '0',
            smva_lead_email_to: $('[name=smva_lead_email_to]').val()
        }).done(function(res) {
            $msg.text(res.success ? 'Saved!' : 'Error').css('color', res.success ? '#059669' : '#dc2626');
        }).fail(function() { $msg.text(smvaAdmin.i18n.connectionError).css('color', '#dc2626'); })
        .always(function() { $btn.prop('disabled', false).text(smvaAdmin.i18n.saveNotificationSettings); setTimeout(function() { $msg.text(''); }, 3000); });
    });

    // ── KB page picker ─────────────────────────────────────────────────────
    // Builds the knowledge base from content read straight out of WordPress,
    // so the admin can exclude things like news posts that the crawler would
    // otherwise sweep up.

    function smvaUpdatePagesCount() {
        var n = $('#smva-pages-list input[type=checkbox]:checked').length;
        $('#smva-pages-count').text(n + ' selected');
        $('#smva-pages-apply').prop('disabled', n === 0)
            .text(n ? 'Build Knowledge Base (' + n + ')' : 'Build Knowledge Base');
    }

    function smvaRenderPagesList(groups) {
        var html = '';
        (groups || []).forEach(function(group) {
            // Pages are evergreen business content, so default them on. Posts
            // and custom types stay off until the admin opts in.
            var onByDefault = group.type === 'page';
            html += '<div style="margin-bottom:14px">';
            html += '<label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;cursor:pointer">';
            html += '<input type="checkbox" class="smva-pages-group" data-group="' + group.type + '"' + (onByDefault ? ' checked' : '') + ' style="width:15px;height:15px;cursor:pointer"> ';
            html += '<span>' + $('<div>').text(group.label).html() + ' (' + group.items.length + ')</span></label>';
            html += '<div style="display:flex;flex-direction:column;gap:5px;padding-left:8px">';
            group.items.forEach(function(item) {
                html += '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;cursor:pointer;padding:6px 9px;background:#fff;border:1px solid #e2e8f0;border-radius:7px">';
                html += '<input type="checkbox" class="smva-page-item" data-group="' + group.type + '" value="' + parseInt(item.id, 10) + '"' + (onByDefault ? ' checked' : '') + ' style="width:15px;height:15px;cursor:pointer;flex:none"> ';
                html += '<span style="flex:1">' + $('<div>').text(item.title).html() + '</span>';
                html += '<span style="font-size:11px;color:#9ca3af;flex:none">' + $('<div>').text(item.date || '').html() + '</span></label>';
            });
            html += '</div></div>';
        });
        $('#smva-pages-list').html(html || '<p style="font-size:13px;color:#9ca3af;margin:0">No published content found.</p>');
        smvaUpdatePagesCount();
    }

    $('#smva-select-pages-btn').on('click', function() {
        $('#smva-pages-error').hide();
        $('#smva-pages-list').empty();
        $('#smva-pages-loading').show();
        $('#smva-pages-count').text('');
        $('#smva-pages-modal').css('display', 'flex');

        $.post(ajaxUrl, {action: 'smva_list_content', nonce: nonce})
        .done(function(res) {
            if (res.success && res.data) smvaRenderPagesList(res.data.groups);
            else $('#smva-pages-error').text(res.data && res.data.message ? res.data.message : 'Could not load your content.').show();
        })
        .fail(function() { $('#smva-pages-error').text(smvaAdmin.i18n.connectionError).show(); })
        .always(function() { $('#smva-pages-loading').hide(); });
    });

    // Group checkbox toggles every item beneath it.
    $(document).on('change', '.smva-pages-group', function() {
        var g = $(this).data('group');
        $('#smva-pages-list .smva-page-item[data-group="' + g + '"]').prop('checked', $(this).prop('checked'));
        smvaUpdatePagesCount();
    });

    // Keep each group checkbox in sync when items are toggled individually.
    $(document).on('change', '.smva-page-item', function() {
        var g = $(this).data('group');
        var $items = $('#smva-pages-list .smva-page-item[data-group="' + g + '"]');
        $('#smva-pages-list .smva-pages-group[data-group="' + g + '"]')
            .prop('checked', $items.length === $items.filter(':checked').length);
        smvaUpdatePagesCount();
    });

    $('#smva-pages-cancel').on('click', function() { $('#smva-pages-modal').hide(); });
    $('#smva-pages-modal').on('click', function(e) {
        if ($(e.target).is('#smva-pages-modal')) $(this).hide();
    });

    $('#smva-pages-apply').on('click', function() {
        var ids = $('#smva-pages-list input.smva-page-item:checked').map(function() {
            return parseInt($(this).val(), 10);
        }).get();
        if (!ids.length) return;

        var $btn = $(this).prop('disabled', true).text('Building...');
        var $msg = $('#smva-agent-msg');
        showLoading('Reading selected pages and building the knowledge base...');

        $.post(ajaxUrl, {action: 'smva_build_kb_from_pages', nonce: nonce, post_ids: JSON.stringify(ids)})
        .done(function(res) {
            if (res.success && res.data.knowledge_base) {
                $('[name=knowledge_base]').val(res.data.knowledge_base);
                $('#smva-pages-modal').hide();
                $msg.text('Built from ' + (res.data.pages_used || ids.length) + ' pages!').css('color', '#059669');
                setTimeout(function() { $msg.text('').css('color', ''); }, 6000);
            } else {
                $('#smva-pages-error').text(res.data && res.data.message ? res.data.message : 'Failed to build knowledge base.').show();
            }
        })
        .fail(function() { $('#smva-pages-error').text(smvaAdmin.i18n.connectionError).show(); })
        .always(function() { hideLoading(); $btn.prop('disabled', false); smvaUpdatePagesCount(); });
    });

    // Optimize
    $('#smva-optimize-btn').on('click', function() {
        var $btn = $(this);
        var $msg = $('#smva-agent-msg');
        var sp = $('[name=system_prompt]').val();
        var kb = $('[name=knowledge_base]').val();
        if (!sp && !kb) { $msg.text('Enter system prompt or KB first.').css('color', '#dc2626'); return; }
        $btn.prop('disabled', true).text('✨ Optimizing...');
        showLoading('AI is analyzing and improving your system prompt and knowledge base...');
        $.post(window.smvaAdmin.ajaxUrl, {action:'smva_optimize_agent', nonce:window.smvaAdmin.nonce, system_prompt_b64:btoa(unescape(encodeURIComponent(sp||''))), knowledge_base_b64:btoa(unescape(encodeURIComponent(kb||'')))})
        .done(function(res) {
            if (res.success) {
                if (res.data.system_prompt) $('[name=system_prompt]').val(res.data.system_prompt);
                if (res.data.knowledge_base) $('[name=knowledge_base]').val(res.data.knowledge_base);
                $msg.text('Optimized!').css('color', '#059669');
            } else $msg.text('Error: ' + (res.data && res.data.message ? res.data.message : 'Failed')).css('color', '#dc2626');
        }).fail(function() { hideLoading(); $msg.text(smvaAdmin.i18n.connectionError).css('color', '#dc2626'); })
        .always(function() { hideLoading(); $btn.prop('disabled', false).text('✨ Optimize System Prompt & KB'); setTimeout(function() { $msg.text('').css('color', ''); }, 6000); });
    });

    // ── Auto-train Wizard ──────────────────────────────────────────────
    var trainResult = {};

    function smvaShowTrainStep(step) {
        $('#smva-train-step1, #smva-train-step2, #smva-train-step3').hide();
        $('#smva-train-step' + step).show();
    }

    $('#smva-auto-train-open').on('click', function() {
        trainResult = {};
        smvaShowTrainStep(1);
        $('#smva-train-modal').css('display', 'flex');
    });

    $('#smva-train-cancel1, #smva-train-cancel3').on('click', function() {
        $('#smva-train-modal').hide();
    });

    $('#smva-train-modal').on('click', function(e) {
        if ($(e.target).is('#smva-train-modal')) $(this).hide();
    });

    $('#smva-train-start').on('click', function() {
        var siteUrl = $('#smva-train-url').val().trim();
        if (!siteUrl) { alert('Please enter a website URL.'); return; }
        smvaShowTrainStep(2);
        $('#smva-train-progress-bar').css('width', '10%');
        $('#smva-train-progress-text').text('📥 Reading your website...');

        // Animate progress
        var prog = 10;
        var progMessages = [
            [30, '📥 Pages crawled, analyzing content...'],
            [55, '🧠 Writing system prompt...'],
            [75, '📚 Building knowledge base...'],
            [90, '💡 Generating suggested questions...'],
        ];
        var progTimer = setInterval(function() {
            if (prog < 88) {
                prog += 3;
                $('#smva-train-progress-bar').css('width', prog + '%');
                progMessages.forEach(function(m) {
                    if (prog >= m[0] && prog < m[0] + 4) $('#smva-train-progress-text').text(m[1]);
                });
            }
        }, 1200);

        $.post(window.smvaAdmin.ajaxUrl, {
            action: 'smva_auto_train',
            nonce: window.smvaAdmin.nonce,
            site_url_b64: btoa(unescape(encodeURIComponent(siteUrl)))
        }).done(function(res) {
            clearInterval(progTimer);
            $('#smva-train-progress-bar').css('width', '100%');
            if (res.success && res.data) {
                trainResult = res.data;
                setTimeout(function() {
                    // Populate step 3
                    $('#smva-train-result-prompt').val(res.data.system_prompt || '');
                    $('#smva-train-result-kb').val(res.data.knowledge_base || '');
                    $('#smva-train-pages-info').text('Read ' + (res.data.pages_crawled || '?') + ' pages from your website.');
                    // Render suggested questions as checkboxes
                    var qs = res.data.suggested_questions || [];
                    var html = '';
                    qs.forEach(function(q, i) {
                        html += '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;cursor:pointer;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">';
                        html += '<input type="checkbox" checked data-q="' + i + '" style="width:16px;height:16px;cursor:pointer"> ';
                        html += '<span>' + $('<div>').text(q).html() + '</span></label>';
                    });
                    $('#smva-train-result-questions').html(html || '<p style="font-size:13px;color:#9ca3af">No suggestions generated.</p>');
                    $('#smva-train-error').hide();
                    smvaShowTrainStep(3);
                }, 400);
            } else {
                smvaShowTrainStep(1);
                alert('Error: ' + (res.data && res.data.message ? res.data.message : 'Training failed. Please try again.'));
            }
        }).fail(function() {
            clearInterval(progTimer);
            smvaShowTrainStep(1);
            alert('Connection error. Please try again.');
        });
    });

    $('#smva-train-apply').on('click', function() {
        var $btn = $(this).prop('disabled', true).text(smvaAdmin.i18n.saving);
        // Apply to form fields
        var sp = $('#smva-train-result-prompt').val();
        var kb = $('#smva-train-result-kb').val();
        $('[name=system_prompt]').val(sp);
        $('[name=knowledge_base]').val(kb);
        // Apply selected suggested questions
        var qs = [];
        $('#smva-train-result-questions input[type=checkbox]:checked').each(function() {
            var idx = parseInt($(this).data('q'));
            if (trainResult.suggested_questions && trainResult.suggested_questions[idx]) {
                qs.push(trainResult.suggested_questions[idx]);
            }
        });
        if (qs.length) $('[name=smva_suggested_questions]').val(qs.join('\n'));
        // Auto-save
        $('#smva-agent-form').trigger('submit');
        $('#smva-train-modal').hide();
        $btn.prop('disabled', false).text('✓ Apply & Save');
    });

    // Webhook
    $('#smva-save-webhook-btn').on('click', function() {
        var $btn = $(this).prop('disabled', true).text(smvaAdmin.i18n.saving);
        var $msg = $('#smva-webhook-msg').text('').css('color', '');
        $.post(window.smvaAdmin.ajaxUrl, {action:'smva_save_agent', nonce:window.smvaAdmin.nonce, webhook_url:$('#smva-webhook-url').val()})
        .done(function(res) { $msg.text(res.success ? 'Saved!' : 'Error').css('color', res.success ? '#059669' : '#dc2626'); })
        .fail(function() { $msg.text(smvaAdmin.i18n.connectionError).css('color', '#dc2626'); })
        .always(function() { $btn.prop('disabled', false).text(smvaAdmin.i18n.saveWebhookUrl); setTimeout(function() { $msg.text(''); }, 3000); });
    });

    // Quick Action Buttons (option key smva_workflow_buttons is unchanged — only the admin-facing label was renamed)
    $('#smva-save-workflow-buttons-btn').on('click', function() {
        var $btn = $(this).prop('disabled', true).text(smvaAdmin.i18n.saving);
        var $msg = $('#smva-workflow-buttons-msg').text('').css('color', '');
        $.post(window.smvaAdmin.ajaxUrl, {action:'smva_save_settings', nonce:window.smvaAdmin.nonce, smva_workflow_buttons:$('#smva-workflow-buttons').val()})
        .done(function(res) { $msg.text(res.success ? 'Saved!' : 'Error').css('color', res.success ? '#059669' : '#dc2626'); })
        .fail(function() { $msg.text(smvaAdmin.i18n.connectionError).css('color', '#dc2626'); })
        .always(function() { $btn.prop('disabled', false).text(smvaAdmin.i18n.saveQuickActionButtons); setTimeout(function() { $msg.text(''); }, 3000); });
    });

    // Tools
    var toolsList = [];
    try { toolsList = JSON.parse($('#smva-tools-json').val() || '[]'); } catch(e) { toolsList = []; }
    if (toolsList.length && $('#smva-tools-list').length) renderTools();

    window.smvaRemoveTool = function(idx) { toolsList.splice(idx, 1); renderTools(); };

    function renderTools() {
        $('#smva-tools-json').val(JSON.stringify(toolsList));
        var html = '';
        if (!toolsList.length) {
            html = '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:16px 0">No tools defined yet.</p>';
        } else {
            for (var i = 0; i < toolsList.length; i++) {
                var t = toolsList[i];
                html += '<div style="background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:8px">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
                html += '<code style="font-size:13px;font-weight:600">' + t.name + '</code>';
                html += '<div style="display:flex;gap:6px">';
                html += '<button type="button" class="smva-btn" style="padding:4px 10px;font-size:12px;flex:none;background:#e0f2fe;color:#0369a1" onclick="smvaEditTool(' + i + ')">Edit</button>';
                html += '<button type="button" class="smva-btn smva-btn-danger" style="padding:4px 10px;font-size:12px;flex:none" onclick="smvaRemoveTool(' + i + ')">Remove</button>';
                html += '</div>';
                html += '</div><div style="font-size:12px;color:#6b7280">' + (t.description || '') + '</div></div>';
            }
        }
        $('#smva-tools-list').html(html);
    }

    // Tool Modal
    var editParams = [];

    window.smvaRemoveParam = function(idx) { editParams.splice(idx, 1); renderParams(); };

    function renderParams() {
        var html = '';
        if (!editParams.length) {
            html = '<p style="color:#9ca3af;font-size:12px;margin:0">No parameters yet.</p>';
        } else {
            for (var i = 0; i < editParams.length; i++) {
                var p = editParams[i];
                html += '<div style="display:flex;gap:8px;margin-bottom:6px;align-items:center">';
                html += '<input type="text" class="smva-input param-name" style="flex:2" placeholder="param_name" data-i="' + i + '" value="' + (p.name || '') + '">';
                html += '<select class="smva-select param-type" style="flex:1" data-i="' + i + '">';
                html += '<option value="string"' + (p.type === 'string' ? ' selected' : '') + '>string</option>';
                html += '<option value="number"' + (p.type === 'number' ? ' selected' : '') + '>number</option>';
                html += '<option value="boolean"' + (p.type === 'boolean' ? ' selected' : '') + '>boolean</option>';
                html += '</select>';
                html += '<button type="button" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:18px" onclick="smvaRemoveParam(' + i + ')">x</button>';
                html += '</div>';
            }
        }
        $('#smva-params-list').html(html);
    }

    $(document).on('change', '.param-name', function() { var i = parseInt($(this).data('i')); if(editParams[i]) editParams[i].name = $(this).val(); });
    $(document).on('change', '.param-type', function() { var i = parseInt($(this).data('i')); if(editParams[i]) editParams[i].type = $(this).val(); });

    var editIndex = -1;

    window.smvaEditTool = function(idx) {
        editIndex = idx;
        var t = toolsList[idx];
        $('#smva-tool-name').val(t.name || '');
        $('#smva-tool-desc').val(t.description || '');
        $('#smva-tool-thinking').val(t.thinking_message || '');
        editParams = [];
        if (t.parameters && t.parameters.properties) {
            var req = t.parameters.required || [];
            $.each(t.parameters.properties, function(pname, pval) {
                editParams.push({name: pname, type: pval.type || 'string'});
            });
        }
        renderParams();
        $('#smva-save-tool-btn').text(smvaAdmin.i18n.updateTool);
        $('#smva-tool-modal').css('display', 'flex');
    };

    $('#smva-add-tool-btn').on('click', function() {
        editIndex = -1;
        $('#smva-save-tool-btn').text(smvaAdmin.i18n.saveTool);
        editParams = [];
        $('#smva-tool-name, #smva-tool-desc, #smva-tool-thinking').val('');
        renderParams();
        $('#smva-tool-modal').css('display', 'flex');
    });

    $('#smva-cancel-tool-btn').on('click', function() { editIndex=-1; $('#smva-save-tool-btn').text(smvaAdmin.i18n.saveTool); $('#smva-tool-modal').css('display', 'none'); });
    $('#smva-tool-modal').on('click', function(e) { if (e.target === this) $('#smva-tool-modal').css('display', 'none'); });

    $('#smva-add-param-btn').on('click', function() { editParams.push({name:'', type:'string'}); renderParams(); });

    $('#smva-save-tool-btn').on('click', function() {
        var name = $('#smva-tool-name').val().trim().replace(/\s+/g, '_').toLowerCase();
        var desc = $('#smva-tool-desc').val().trim();
        var thinking = $('#smva-tool-thinking').val().trim();
        if (!name) { alert('Tool name required'); return; }
        // Read current values from DOM
        $('#smva-params-list .param-name').each(function() { var i=parseInt($(this).data('i')); if(editParams[i]) editParams[i].name=$(this).val(); });
        $('#smva-params-list .param-type').each(function() { var i=parseInt($(this).data('i')); if(editParams[i]) editParams[i].type=$(this).val(); });
        var props = {}, req = [];
        for (var i = 0; i < editParams.length; i++) {
            var p = editParams[i];
            if (p.name) { props[p.name] = {type: p.type || 'string'}; req.push(p.name); }
        }
        var toolData = {name:name, description:desc, thinking_message:thinking||'Let me check...', parameters:{type:'object', properties:props, required:req}};
        if (editIndex >= 0) { toolsList[editIndex] = toolData; }
        else { toolsList.push(toolData); }
        editIndex = -1;
        renderTools();
        $('#smva-tool-modal').css('display', 'none');
    });


    // ── Upgrade Modal ────────────────────────────────────────────────────

    var smvaPlansCache = null;

    function smvaOpenUpgradeModal() {
        jQuery('#smva-upgrade-modal').show();
        if (smvaPlansCache) return;

        // Load plans via WordPress AJAX (avoids CORS)
        jQuery.post(window.smvaAdmin.ajaxUrl, {
            action: 'smva_get_plans',
            nonce: window.smvaAdmin.nonce,
        }).done(function(res) {
            if (res.success && res.data && res.data.plans) {
                smvaPlansCache = res.data.plans;
                smvaRenderPlans(res.data.plans);
            } else {
                jQuery('#smva-plans-grid').html('<div style="grid-column:1/-1;text-align:center;padding:20px;color:#dc2626">Could not load plans. Please try again.</div>');
            }
        }).fail(function() {
            jQuery('#smva-plans-grid').html('<div style="grid-column:1/-1;text-align:center;padding:20px;color:#dc2626">Could not load plans. Please try again.</div>');
        });
    }

    function smvaRenderPlans(plans) {
        var planDesigns = {
            voice_starter:  { icon: '🎙️', color: '#2563eb', bg: '#eff6ff' },
            voice_pro:      { icon: '🎙️', color: '#1d4ed8', bg: '#dbeafe', popular: false },
            chat_starter:   { icon: '💬', color: '#059669', bg: '#ecfdf5' },
            chat_pro:       { icon: '💬', color: '#047857', bg: '#d1fae5' },
            bundle_starter: { icon: '⚡', color: '#7c3aed', bg: '#f5f3ff' },
            bundle_pro:     { icon: '⚡', color: '#6d28d9', bg: '#ede9fe', popular: true },
            voice_premium:    { icon: '💎', color: '#0e7490', bg: '#ecfeff' },
            voice_enterprise: { icon: '👑', color: '#b45309', bg: '#fffbeb' },
        };

        var html = '';
        plans.forEach(function(plan) {
            var d = planDesigns[plan.id] || { icon: '📦', color: '#374151', bg: '#f9fafb' };
            var minutesRow = plan.minutes > 0
                ? '<div style="font-size:12px;color:#475569;margin-bottom:4px">🎙️ ' + plan.minutes + ' voice minutes/mo</div>'
                : '';
            var popular = d.popular
                ? '<div style="font-size:10px;font-weight:700;background:' + d.color + ';color:#fff;padding:2px 8px;border-radius:99px;display:inline-block;margin-bottom:8px;letter-spacing:.05em">MOST POPULAR</div>'
                : '';

            html += '<div style="border:' + (d.popular ? '2px solid ' + d.color : '1.5px solid #e2e8f0') + ';border-radius:12px;padding:16px;background:#fff;display:flex;flex-direction:column;gap:4px;cursor:pointer;transition:box-shadow .15s" class="smva-plan-card" data-plan="' + plan.id + '">';
            html += popular;
            html += '<div style="font-size:22px;margin-bottom:4px">' + d.icon + '</div>';
            html += '<div style="font-size:14px;font-weight:700;color:#0f172a">' + plan.label + '</div>';
            html += '<div style="font-size:22px;font-weight:800;color:' + d.color + ';margin:6px 0">$' + (plan.price_usd || plan.price_cad) + '<span style="font-size:12px;font-weight:500;color:#94a3b8"> USD/mo</span></div>';
            html += minutesRow;
            html += '<div style="font-size:12px;color:#475569;margin-bottom:8px">💬 ' + plan.chat.toLocaleString() + ' chat messages/mo</div>';
            // Without this the higher tiers just look more expensive for the
            // same allowance — the engine is the whole reason for the price.
            if (plan.engine_badge && plan.engine_badge !== 'Standard') {
                html += '<div style="font-size:12px;font-weight:600;color:' + d.color + ';margin-bottom:8px">✨ ' + plan.engine_badge + ' AI Engine</div>';
            }
            html += '<button class="smva-btn smva-btn-primary smva-plan-select-btn" data-plan="' + plan.id + '" style="width:100%;justify-content:center;margin-top:auto">Select →</button>';
            html += '</div>';
        });

        jQuery('#smva-plans-grid').html(html);
    }

    function smvaSelectPlan(planId) {
        var $btn = jQuery('.smva-plan-select-btn[data-plan="' + planId + '"]');
        $btn.prop('disabled', true).text('Loading...');

        jQuery.post(window.smvaAdmin.ajaxUrl, {
            action: 'smva_stripe_checkout',
            nonce: window.smvaAdmin.nonce,
            plan_id: planId,
            success_url: window.location.origin + window.location.pathname + '?page=smva&tab=license&upgraded=1',
            cancel_url: window.location.origin + window.location.pathname + '?page=smva&tab=license',
        }).done(function(res) {
            if (res.success && res.data && res.data.url) {
                window.location.href = res.data.url;
            } else {
                alert('Could not start checkout. Please try again.');
                $btn.prop('disabled', false).text(smvaAdmin.i18n.selectArrow);
            }
        }).fail(function() {
            alert('Connection error. Please try again.');
            $btn.prop('disabled', false).text(smvaAdmin.i18n.selectArrow);
        });
    }

    jQuery(document).on('click', '#smva-upgrade-btn', smvaOpenUpgradeModal);

    // Theme card selection
    jQuery(document).on('click', '.smva-theme-card', function() {
        var theme = jQuery(this).data('theme');
        jQuery('#smva_widget_theme').val(theme);
        jQuery('.smva-theme-card').each(function() {
            jQuery(this)[0].style.setProperty('border', '1.5px solid #e2e8f0', 'important');
            jQuery(this)[0].style.setProperty('background', '#fff', 'important');
            jQuery(this).find('.smva-theme-check').hide();
        });
        jQuery(this)[0].style.setProperty('border', '2px solid #2563eb', 'important');
        jQuery(this)[0].style.setProperty('background', '#eff6ff', 'important');
        jQuery(this).find('.smva-theme-check').show();
    });

    // Manage Subscription → Stripe Customer Portal
    jQuery(document).on('click', '#smva-manage-subscription-btn', function() {
        var $btn = jQuery(this).prop('disabled', true).text('Loading...');
        jQuery.post(window.smvaAdmin.ajaxUrl, {
            action: 'smva_manage_subscription',
            nonce: window.smvaAdmin.nonce,
            return_url: window.location.origin + window.location.pathname + '?page=smva&tab=license',
        }).done(function(res) {
            if (res.success && res.data && res.data.url) {
                window.location.href = res.data.url;
            } else {
                alert(res.data && res.data.message ? res.data.message : 'Could not open subscription portal. Please try again.');
                $btn.prop('disabled', false).text('⚙️ Manage Subscription');
            }
        }).fail(function() {
            alert('Connection error. Please try again.');
            $btn.prop('disabled', false).text('⚙️ Manage Subscription');
        });
    });
    jQuery('#smva-upgrade-modal-close').on('click', function() { jQuery('#smva-upgrade-modal').hide(); });
    jQuery('#smva-upgrade-modal').on('click', function(e) {
        if (jQuery(e.target).is('#smva-upgrade-modal')) jQuery('#smva-upgrade-modal').hide();
    });
    jQuery(document).on('click', '.smva-plan-select-btn', function() {
        smvaSelectPlan(jQuery(this).data('plan'));
    });

    // After successful payment, poll backend for new license key and auto-activate
    (function() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('upgraded') !== '1') return;

        // Clean URL immediately
        window.history.replaceState({}, '', window.location.pathname + '?page=smva&tab=license');

        var $banner = jQuery('<div id="smva-auto-activating" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 20px;margin-bottom:16px;font-size:14px;color:#1d4ed8;font-weight:500">⏳ Payment received! Activating your license...</div>');
        jQuery('.smva-tab-content').prepend($banner);

        function checkForNewLicense() {
            jQuery.post(window.smvaAdmin.ajaxUrl, {
                action: 'smva_poll_new_license',
                nonce: window.smvaAdmin.nonce,
            }).done(function(res) {
                if (res.success && res.data && res.data.license_key) {
                    $banner.html('⏳ Activating your new license...').css({'background':'#eff6ff','border-color':'#bfdbfe','color':'#1d4ed8'});
                    jQuery.post(window.smvaAdmin.ajaxUrl, {
                        action: 'smva_activate_license',
                        nonce: window.smvaAdmin.nonce,
                        license_key: res.data.license_key,
                    }).done(function(r) {
                        if (r.success) {
                            $banner.html('✅ License activated! Loading your dashboard...').css({'background':'#d1fae5','border-color':'#6ee7b7','color':'#065f46'});
                            setTimeout(function() {
                                window.location.href = window.location.pathname + '?page=smva&tab=dashboard';
                            }, 1500);
                        } else {
                            showManualFallback(res.data.license_key);
                        }
                    }).fail(function() { showManualFallback(res.data.license_key); });
                } else {
                    // Webhook not arrived yet — try once more after 5s, then fallback
                    setTimeout(function() {
                        jQuery.post(window.smvaAdmin.ajaxUrl, {
                            action: 'smva_poll_new_license',
                            nonce: window.smvaAdmin.nonce,
                        }).done(function(res2) {
                            if (res2.success && res2.data && res2.data.license_key) {
                                checkForNewLicense(); // reuse activate logic
                            } else {
                                showEmailFallback();
                            }
                        }).fail(showEmailFallback);
                    }, 5000);
                }
            }).fail(showEmailFallback);
        }

        function showManualFallback(key) {
            $banner.html('✅ Payment successful! Your key: <strong>' + key + '</strong> — paste it below and click Upgrade.').css({'background':'#fffbeb','border-color':'#fde68a','color':'#92400e'});
            jQuery('#smva-license-input').val(key);
        }

        function showEmailFallback() {
            $banner.html('✅ Payment successful! Your license key has been sent to your email. Paste it below and click Upgrade.').css({'background':'#fffbeb','border-color':'#fde68a','color':'#92400e'});
        }

        // Wait 5s for webhook to arrive, then check once
        setTimeout(checkForNewLicense, 5000);
    })();

    // Language chip toggle
    $(document).on('change', '.smva-lang-chip input[type=checkbox]', function() {
        var $label = $(this).closest('.smva-lang-chip');
        $label.css('border-color', this.checked ? '#2563eb' : '#e5e7eb');
    });

    $('#smva-save-tools-btn').on('click', function() {
        var $btn = $(this).prop('disabled', true).text(smvaAdmin.i18n.saving);
        var $msg = $('#smva-tools-msg').text('').css('color', '');
        $.post(window.smvaAdmin.ajaxUrl, {
            action: 'smva_save_agent',
            nonce: window.smvaAdmin.nonce,
            agent_tools: JSON.stringify(toolsList),
            webhook_url: $('#smva-webhook-url').val(),
            agent_name: $('[name=agent_name]').val() || '',
            voice_id: $('[name=voice_id]').val() || '',
        })
        .done(function(res) { $msg.text(res.success ? 'Tools saved!' : 'Error').css('color', res.success ? '#059669' : '#dc2626'); })
        .fail(function() { $msg.text(smvaAdmin.i18n.connectionError).css('color', '#dc2626'); })
        .always(function() { $btn.prop('disabled', false).text(smvaAdmin.i18n.saveSyncTools); setTimeout(function() { $msg.text(''); }, 3000); });
    });

});

/* ── Agent Logo Media Uploader ─────────────────────────────────────────────── */
(function($) {
    $(document).ready(function() {
        $('#smva-logo-upload').on('click', function(e) {
            e.preventDefault();
            var frame = wp.media({
                title: 'Select Agent Logo',
                button: { text: 'Use this image' },
                multiple: false,
                library: { type: 'image' }
            });
            frame.on('select', function() {
                var attachment = frame.state().get('selection').first().toJSON();
                $('#smva_agent_logo').val(attachment.url);
                var preview = $('#smva-logo-preview');
                preview.html('<img src="' + attachment.url + '" style="width:100%;height:100%;object-fit:cover;" id="smva-logo-img" />');
                if (!$('#smva-logo-remove').length) {
                    $('#smva-logo-upload').after('<button type="button" id="smva-logo-remove" class="button" style="margin-left:6px;color:#dc2626;">Remove</button>');
                    bindRemove();
                }
            });
            frame.open();
        });

        function bindRemove() {
            $(document).on('click', '#smva-logo-remove', function() {
                $('#smva_agent_logo').val('');
                $('#smva-logo-preview').html('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>');
                $(this).remove();
            });
        }
        bindRemove();
    });
}(jQuery));

/* ── Voice Summary Tab ────────────────────────────────────────────────────── */
(function ($) {
  'use strict';

  window.SMVAAdminDebug = window.SMVAAdminDebug || {};
  window.SMVAAdminDebug.voiceSummary = window.SMVAAdminDebug.voiceSummary || { loadedAt: Date.now() };

  var VS = { currentPage: 1, totalPages: 1, activeSession: null };
  var smvaVoiceSummaryTimezone = (window.smvaAdmin && smvaAdmin.timezone) || (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
  var smvaVoiceSummaryRangeDays = parseInt((window.smvaAdmin && smvaAdmin.dateRangeDays) || 30, 10);
  if (!smvaVoiceSummaryRangeDays || smvaVoiceSummaryRangeDays < 1) smvaVoiceSummaryRangeDays = 30;

  function smvaPad2(n) { return String(n).padStart(2, '0'); }

  function smvaDatePartsInTimezone(date, timezone) {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date);
      var out = {};
      parts.forEach(function (p) { if (p.type !== 'literal') out[p.type] = p.value; });
      return { year: out.year, month: out.month, day: out.day };
    } catch (e) {
      return { year: date.getFullYear(), month: smvaPad2(date.getMonth() + 1), day: smvaPad2(date.getDate()) };
    }
  }

  function smvaLocalDateInputValue(date) {
    var p = smvaDatePartsInTimezone(date, smvaVoiceSummaryTimezone);
    return p.year + '-' + p.month + '-' + p.day;
  }

  function smvaFormatSessionDate(rawDate) {
    if (!rawDate) return '—';
    var value = String(rawDate).trim();
    var d;

    if (/^\d+$/.test(value)) {
      var num = parseInt(value, 10);
      d = new Date(num < 100000000000 ? num * 1000 : num);
    } else {
      // Convert common MySQL UTC datetime values to ISO-ish values before parsing.
      // If the backend already sends a timezone (Z or +/-hh:mm), leave it intact.
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) {
        value = value.replace(' ', 'T');
        if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) value += 'Z';
      }
      d = new Date(value);
    }

    return d && !isNaN(d.getTime()) ? d.toLocaleString([], { timeZone: smvaVoiceSummaryTimezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : escHtml(String(rawDate));
  }

  function vsInit() {
    $('#smva-vs-search-btn').on('click', function () { VS.currentPage = 1; vsLoadSessions(); });
    $(document).on('click', '#smva-vs-modal-close', vsCloseModal);
    $('#smva-vs-modal').on('click', function (e) { if ($(e.target).is('#smva-vs-modal')) vsCloseModal(); });
    $(document).on('click', '#smva-vs-summarize-btn', vsGenerateSummary);
    var today = new Date();
    var from = new Date(today.getTime() - (smvaVoiceSummaryRangeDays * 24 * 60 * 60 * 1000));
    $('#smva-vs-date-to').val(smvaLocalDateInputValue(today));
    $('#smva-vs-date-from').val(smvaLocalDateInputValue(from));
    $('#smva-vs-timezone-label').text(smvaAdmin.i18n.timezoneLabel.replace('%s', smvaVoiceSummaryTimezone));
    $('#smva-vs-range-label').text(smvaAdmin.i18n.showingLastDays.replace('%d', smvaVoiceSummaryRangeDays));
    window.SMVAAdminDebug.voiceSummary.timezone = smvaVoiceSummaryTimezone;
    window.SMVAAdminDebug.voiceSummary.rangeDays = smvaVoiceSummaryRangeDays;
    window.SMVAAdminDebug.voiceSummary.localToday = smvaLocalDateInputValue(today);
    window.SMVAAdminDebug.voiceSummary.localDateFrom = smvaLocalDateInputValue(from);
    window.SMVAAdminDebug.voiceSummary.timezoneOffsetMinutes = today.getTimezoneOffset();
    if ($('#smva-vs-tbody').length) { vsLoadSessions(); }
  }

  function vsLoadSessions() {
    var $tbody = $('#smva-vs-tbody');
    $tbody.html('<tr><td colspan="5" style="text-align:center;padding:20px;">Loading…</td></tr>');
    window.SMVAAdminDebug.voiceSummary.lastRequest = {
      action: 'smva_voice_sessions',
      page_num: VS.currentPage,
      date_from: $('#smva-vs-date-from').val(),
      date_to: $('#smva-vs-date-to').val(),
      timezone: smvaVoiceSummaryTimezone,
      requestedAt: Date.now()
    };
    $.ajax({
      url: smvaAdmin.ajaxUrl,
      data: { action: 'smva_voice_sessions', nonce: smvaAdmin.nonce, page_num: VS.currentPage, date_from: $('#smva-vs-date-from').val(), date_to: $('#smva-vs-date-to').val(), timezone: smvaVoiceSummaryTimezone },
      success: function (res) {
        window.SMVAAdminDebug.voiceSummary.lastResponse = res;
        window.SMVAAdminDebug.voiceSummary.lastResponseAt = Date.now();
        if (!res.success) { $tbody.html('<tr><td colspan="5">' + (res.data || 'Error') + '</td></tr>'); return; }
        var payload = res.data || {};
        var sessions = payload.sessions || (payload.data && payload.data.sessions) || payload.items || payload.records || payload.results || payload.conversations || (Array.isArray(payload.data) ? payload.data : []) || [];
        if (!Array.isArray(sessions) && sessions && typeof sessions === 'object') { sessions = Object.keys(sessions).map(function(k){ return sessions[k]; }); }
        var pagination = payload.pagination || payload.meta || payload.paging || {};
        window.SMVAAdminDebug.voiceSummary.parsedSessionCount = sessions.length;
        window.SMVAAdminDebug.voiceSummary.parsedPagination = pagination;
        VS.totalPages = pagination.pages || 1;
        if (!sessions.length) { $tbody.html('<tr><td colspan="5" style="text-align:center;padding:20px;">No sessions found for the selected date range.</td></tr>'); vsBuildPagination(pagination); return; }
        var rows = '';
        // Returns the first value the backend actually sent. Unlike ||, a real 0
        // is kept, and "nothing was sent" stays distinguishable from "the value is 0".
        function smvaFirstPresent(values) {
          for (var i = 0; i < values.length; i++) {
            if (values[i] !== undefined && values[i] !== null && values[i] !== '') return values[i];
          }
          return undefined;
        }
        sessions.forEach(function (s) {
          var rawDate = s.started_at || s.created_at || s.startedAt || s.createdAt || s.timestamp || s.date || s.created || s.time || '';
          var date = smvaFormatSessionDate(rawDate);
          var durVal = smvaFirstPresent([s.duration_minutes, s.durationMinutes]);
          if (durVal === undefined) {
            var durSecs = smvaFirstPresent([s.duration_seconds, s.durationSeconds]);
            if (durSecs !== undefined) durVal = parseFloat(durSecs) / 60;
          }
          // An unknown duration must not be printed as a measured "0.0 min".
          var dur = (durVal === undefined || isNaN(parseFloat(durVal))) ? '—' : parseFloat(durVal).toFixed(1) + ' min';
          var turnsVal = smvaFirstPresent([s.turn_count, s.turns, s.message_count, s.messageCount]);
          var turns = (turnsVal === undefined) ? '—' : escHtml(String(turnsVal));
          var summaryText = s.ai_summary || s.summary || s.aiSummary || '';
          var summBadge = summaryText ? '<span style="background:#d4edda;color:#155724;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">✓ Summary</span>' : '<span style="background:#e9ecef;color:#6c757d;padding:2px 8px;border-radius:10px;font-size:11px;">No summary</span>';
          var btns = '';
          var sid = s.session_id || s.id || s.sessionId || s.uuid || s.call_id || s.callId || '';
          var recordingUrl = s.recording_url || s.recordingUrl || s.audio_url || s.audioUrl || s.recording || s.recording_link || s.recordingLink || '';
          function smvaTruthyFlag(v) {
            return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'yes';
          }
          var hasRecording = !!recordingUrl || smvaTruthyFlag(s.has_recording) || smvaTruthyFlag(s.hasRecording) || smvaTruthyFlag(s.recording_available) || smvaTruthyFlag(s.recordingAvailable);
          if (sid) { btns += '<button class="smva-btn smva-btn-sm smva-vs-view-btn" data-session="' + escAttr(sid) + '" data-summary="' + escAttr(summaryText) + '">View</button> '; }
          if (sid && hasRecording) {
            btns += '<button class="smva-btn smva-btn-sm smva-vs-play-btn" data-session="' + escAttr(sid) + '" data-recording-url="' + escAttr(recordingUrl) + '">&#9654; Play</button>';
          } else if (sid) {
            btns += '<span style="color:#8c8f94;font-size:12px;">No recording</span>';
          }
          if (!btns) { btns = '<span style="color:#999;font-size:12px;">No session id</span>'; }
          rows += '<tr data-session-id="' + escAttr(sid) + '" data-raw-date="' + escAttr(rawDate) + '"><td>' + date + '<div style="font-size:11px;color:#8c8f94;">Raw: ' + escHtml(String(rawDate || '—')) + '</div></td><td>' + dur + '</td><td>' + turns + '</td><td>' + summBadge + '</td><td>' + btns + '</td></tr>';
        });
        $tbody.html(rows);
        vsBuildPagination(pagination);
        $('.smva-vs-view-btn').on('click', function () { vsOpenModal($(this).data('session'), $(this).data('summary')); });
        $('.smva-vs-play-btn').on('click', function () { vsPlayRecording($(this).data('session'), $(this).attr('data-recording-url') || ''); });
      },
      error: function (xhr, status, err) {
        window.SMVAAdminDebug.voiceSummary.lastError = { status: status, error: err, httpStatus: xhr && xhr.status, responseText: xhr && xhr.responseText, at: Date.now() };
        $tbody.html('<tr><td colspan="5">Request failed.</td></tr>');
      }
    });
  }

  function vsBuildPagination(p) {
    var $pag = $('#smva-vs-pagination');
    if (!p || p.pages <= 1) { $pag.empty(); return; }
    var html = '<div style="margin-top:12px;display:flex;gap:4px;align-items:center;flex-wrap:wrap;">';
    for (var i = 1; i <= p.pages; i++) {
      var style = i === VS.currentPage ? 'background:#2271b1;color:#fff;border-color:#2271b1;' : '';
      html += '<button class="button smva-page-btn" data-page="' + i + '" style="min-width:34px;' + style + '">' + i + '</button>';
    }
    html += '<span style="margin-left:8px;color:#666;font-size:13px;">Page ' + p.page + ' of ' + p.pages + ' (' + p.total + ' sessions)</span></div>';
    $pag.html(html);
    $('.smva-page-btn').on('click', function () { VS.currentPage = parseInt($(this).data('page')); vsLoadSessions(); });
  }

  function vsOpenModal(sessionId, existingSummary) {
    VS.activeSession = sessionId;
    $('#smva-vs-modal-title').text('Session: ' + sessionId.substring(0, 8) + '…');
    $('#smva-vs-transcript-body').html('<p>Loading transcript…</p>');
    $('#smva-vs-summarize-btn').prop('disabled', false).text(existingSummary ? 'Regenerate Summary' : 'Generate Summary');
    $('#smva-vs-summary-text').html(existingSummary ? '<p>' + escHtml(existingSummary) + '</p>' : '<em>No summary yet.</em>');
    $('#smva-vs-modal').css('display', 'flex');
    $.ajax({
      url: smvaAdmin.ajaxUrl,
      data: { action: 'smva_voice_transcript', nonce: smvaAdmin.nonce, session_id: sessionId },
      success: function (res) {
        window.SMVAAdminDebug.voiceSummary.lastTranscriptResponse = res;
        window.SMVAAdminDebug.voiceSummary.lastTranscriptAt = Date.now();
        if (!res.success) { $('#smva-vs-transcript-body').html('<p>Error: ' + (res.data || 'Failed') + '</p>'); return; }
        var turns = res.data.transcript || [];
        if (!turns.length) { $('#smva-vs-transcript-body').html('<p><em>No transcript recorded.</em></p>'); return; }
        var html = '<div style="display:flex;flex-direction:column;gap:10px;">';
        turns.forEach(function (t) {
          var isUser = t.role === 'user';
          var align = isUser ? 'flex-end' : 'flex-start';
          var bg = isUser ? '#dbeafe' : '#f0f0f1';
          var radius = isUser ? '12px 12px 0 12px' : '12px 12px 12px 0';
          html += '<div style="display:flex;flex-direction:column;align-items:' + align + ';max-width:85%;">';
          html += '<span style="font-size:11px;font-weight:600;color:#888;margin-bottom:3px;">' + (isUser ? 'User' : 'Assistant') + '</span>';
          html += '<p style="margin:0;padding:8px 12px;background:' + bg + ';border-radius:' + radius + ';font-size:13px;line-height:1.5;">' + escHtml(t.text) + '</p></div>';
        });
        html += '</div>';
        $('#smva-vs-transcript-body').html(html);
      },
      error: function (xhr, status, err) { window.SMVAAdminDebug.voiceSummary.lastTranscriptError = { status: status, error: err, httpStatus: xhr && xhr.status, at: Date.now() }; $('#smva-vs-transcript-body').html('<p>Request failed.</p>'); }
    });
  }

  function vsShowRecordingPlayer(sessionId, audioUrl, statusText) {
    var $popup = $('<div style="position:fixed;bottom:20px;right:20px;background:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.2);padding:16px;z-index:999999;min-width:340px;max-width:420px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
      '<strong style="font-size:13px;">Recording: ' + escHtml(sessionId.substring(0,8)) + '…</strong>' +
      '<button class="smva-close-player" style="background:none;border:none;cursor:pointer;font-size:18px;">&times;</button></div>' +
      '<div class="smva-player-status" style="font-size:12px;color:#666;margin-bottom:8px;">' + escHtml(statusText || 'Ready to play.') + '</div>' +
      '<audio controls preload="metadata" style="width:100%;" src="' + escAttr(audioUrl) + '"></audio>' +
      '<div class="smva-player-error" style="display:none;margin-top:8px;color:#b32d2e;font-size:12px;line-height:1.45;"></div>' +
      '</div>');
    $('#smva-audio-player').remove();
    $popup.attr('id', 'smva-audio-player').appendTo('body');
    var audio = $popup.find('audio').get(0);
    audio.addEventListener('loadedmetadata', function(){ $popup.find('.smva-player-status').text('Ready to play.'); });
    audio.addEventListener('error', function(){
      var text = 'Recording could not be played. The browser could not read the returned audio file.';
      $popup.find('.smva-player-status').text('Recording failed.');
      $popup.find('.smva-player-error').text(text).show();
      window.SMVAAdminDebug.voiceSummary.lastAudioError = { sessionId: sessionId, src: audio.currentSrc || audioUrl, at: Date.now() };
    });
    $popup.find('.smva-close-player').on('click', function() {
      if (audioUrl && audioUrl.indexOf('blob:') === 0) { URL.revokeObjectURL(audioUrl); }
      $popup.remove();
    });
  }

  function vsShowRecordingError(sessionId, message, detail) {
    var $popup = $('<div style="position:fixed;bottom:20px;right:20px;background:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.2);padding:16px;z-index:999999;min-width:340px;max-width:420px;border-left:4px solid #d63638;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '<strong style="font-size:13px;">Recording unavailable</strong>' +
      '<button class="smva-close-player" style="background:none;border:none;cursor:pointer;font-size:18px;">&times;</button></div>' +
      '<p style="margin:0 0 8px;color:#3c434a;font-size:13px;line-height:1.45;">' + escHtml(message || 'No audio recording was returned for this session.') + '</p>' +
      '<p style="margin:0;color:#646970;font-size:11px;line-height:1.45;">Session: ' + escHtml(sessionId) + '</p>' +
      (detail ? '<pre style="white-space:pre-wrap;background:#f6f7f7;border:1px solid #dcdcde;padding:8px;margin:8px 0 0;max-height:120px;overflow:auto;font-size:11px;">' + escHtml(detail) + '</pre>' : '') +
      '</div>');
    $('#smva-audio-player').remove();
    $popup.attr('id', 'smva-audio-player').appendTo('body');
    $popup.find('.smva-close-player').on('click', function() { $popup.remove(); });
  }

  function vsPlayRecording(sessionId, recordingUrl) {
    window.SMVAAdminDebug.voiceSummary.lastPlayRequest = {
      sessionId: sessionId,
      recordingUrl: recordingUrl || '',
      requestedAt: Date.now()
    };

    $.ajax({
      url: smvaAdmin.ajaxUrl,
      data: {
        action: 'smva_voice_recording_url',
        nonce: smvaAdmin.nonce,
        session_id: sessionId,
        recording_url: recordingUrl || ''
      },
      success: function(res) {
        window.SMVAAdminDebug.voiceSummary.lastRecordingUrlResponse = res;
        window.SMVAAdminDebug.voiceSummary.lastRecordingUrlAt = Date.now();
        if (!res.success || !res.data || !res.data.url) {
          var msg = (res.data && (res.data.message || res.data)) || 'Recording not available for this session yet.';
          vsShowRecordingError(sessionId, msg, '');
          return;
        }

        // If the backend/session gave us a direct recording URL, let the browser play it directly.
        // This avoids CORS issues that can happen when fetching signed storage URLs in JS first.
        if (res.data.direct) {
          window.SMVAAdminDebug.voiceSummary.lastRecordingDirectUrl = res.data.url;
          vsShowRecordingPlayer(sessionId, res.data.url, 'Loading direct recording…');
          return;
        }

        // For the WordPress proxy URL, fetch first so a missing backend recording shows a friendly
        // admin message instead of only a red 404 in the browser console/audio element.
        window.SMVAAdminDebug.voiceSummary.lastRecordingFetchStart = Date.now();
        fetch(res.data.url, { credentials: 'same-origin', cache: 'no-store' })
          .then(function(response) {
            window.SMVAAdminDebug.voiceSummary.lastRecordingFetchStatus = response.status;
            window.SMVAAdminDebug.voiceSummary.lastRecordingFetchContentType = response.headers.get('content-type') || '';
            if (!response.ok) {
              return response.text().then(function(text) {
                throw { status: response.status, text: text };
              });
            }
            return response.blob();
          })
          .then(function(blob) {
            window.SMVAAdminDebug.voiceSummary.lastRecordingBlob = { size: blob.size, type: blob.type || '', at: Date.now() };
            if (!blob || !blob.size) {
              throw { status: 0, text: 'The recording response was empty.' };
            }
            var blobUrl = URL.createObjectURL(blob);
            vsShowRecordingPlayer(sessionId, blobUrl, 'Recording loaded.');
          })
          .catch(function(error) {
            var detail = error && error.text ? String(error.text).substring(0, 1000) : '';
            var msg = 'Recording was not returned by the voice backend for this session. This usually means call recording is not being stored/enabled on the backend, or this session has no saved audio file yet.';
            window.SMVAAdminDebug.voiceSummary.lastRecordingFetchError = { sessionId: sessionId, status: error && error.status, text: detail, at: Date.now() };
            vsShowRecordingError(sessionId, msg, detail);
          });
      },
      error: function(xhr, status, err) {
        window.SMVAAdminDebug.voiceSummary.lastRecordingUrlError = { status: status, error: err, httpStatus: xhr && xhr.status, responseText: xhr && xhr.responseText, at: Date.now() };
        vsShowRecordingError(sessionId, 'Failed to prepare recording playback URL.', xhr && xhr.responseText ? xhr.responseText : '');
      }
    });
  }

  function vsCloseModal() {
    $('#smva-vs-modal').hide();
    VS.activeSession = null;
  }

  function vsGenerateSummary() {
    if (!VS.activeSession) return;
    var $btn = $('#smva-vs-summarize-btn');
    $btn.prop('disabled', true).text('Generating…');
    $('#smva-vs-summary-text').html('<em>Generating summary with AI…</em>');
    $.ajax({
      url: smvaAdmin.ajaxUrl, method: 'POST',
      data: { action: 'smva_voice_summarize', nonce: smvaAdmin.nonce, session_id: VS.activeSession },
      success: function (res) {
        if (!res.success) { $('#smva-vs-summary-text').html('<p style="color:red;">Error: ' + (res.data || 'Failed') + '</p>'); $btn.prop('disabled', false).text('Retry'); return; }
        var summary = res.data.summary || '';
        $('#smva-vs-summary-text').html('<p>' + escHtml(summary) + '</p>');
        $btn.prop('disabled', false).text('Regenerate Summary');
        $('[data-session-id="' + VS.activeSession + '"] td:nth-child(4)').html('<span style="background:#d4edda;color:#155724;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">✓ Summary</span>');
        $('[data-session-id="' + VS.activeSession + '"] .smva-vs-view-btn').data('summary', summary);
      },
      error: function () { $('#smva-vs-summary-text').html('<p style="color:red;">Request failed.</p>'); $btn.prop('disabled', false).text('Retry'); }
    });
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(str) {
    return String(str).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  $(document).ready(function () {
    if ($('#smva-vs-search-btn').length) { vsInit(); vsLoadSessions(); }
  });


  // ── HubSpot Integration ──────────────────────────────────────────────────
  (function () {

    // Save token
    var saveBtn = document.getElementById('smva-hubspot-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var token = (document.getElementById('smva-hubspot-token') || {}).value || '';
        var msg   = document.getElementById('smva-hs-msg');
        var label = saveBtn.querySelector('.smva-hs-label');
        var spin  = saveBtn.querySelector('.smva-hs-spinner');

        if (!token) { msg.className = 'smva-int-msg err'; msg.textContent = 'Please enter your Private App Token.'; return; }

        label.style.display = 'none';
        spin.style.display  = '';
        saveBtn.disabled    = true;
        msg.className       = 'smva-int-msg';
        msg.textContent     = '';

        fetch(smvaAdmin.ajaxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ action: 'smva_hubspot_save_token', nonce: smvaAdmin.nonce, token: token }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) {
            msg.className   = 'smva-int-msg ok';
            msg.textContent = 'Connected successfully! Reloading...';
            setTimeout(function() { window.location.reload(); }, 1200);
          } else {
            msg.className   = 'smva-int-msg err';
            msg.textContent = (data.data && data.data.message) || 'Connection failed. Check your token.';
            label.style.display = '';
            spin.style.display  = 'none';
            saveBtn.disabled    = false;
          }
        })
        .catch(function() {
          msg.className   = 'smva-int-msg err';
          msg.textContent = 'Network error. Please try again.';
          label.style.display = '';
          spin.style.display  = 'none';
          saveBtn.disabled    = false;
        });
      });
    }

    // Disconnect
    var disconnectBtn = document.getElementById('smva-hubspot-disconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', function () {
        if (!confirm('Disconnect HubSpot? Leads will no longer sync automatically.')) return;
        disconnectBtn.textContent = 'Disconnecting...';
        disconnectBtn.disabled    = true;
        fetch(smvaAdmin.ajaxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ action: 'smva_hubspot_disconnect', nonce: smvaAdmin.nonce }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.success) { window.location.reload(); }
          else {
            alert('Error disconnecting. Please try again.');
            disconnectBtn.textContent = 'Disconnect';
            disconnectBtn.disabled    = false;
          }
        });
      });
    }

  })();


  // ── Phone (Twilio) Integration ───────────────────────────────────────────
  // The auth token is posted once and never round-tripped back: the backend
  // stores it encrypted and only ever returns a masked SID, so there is no
  // path by which the secret reaches this page again.
  (function () {
    var saveBtn = document.getElementById('smva-phone-save');
    var msg     = document.getElementById('smva-phone-msg');

    function setMsg(kind, text) {
      if (!msg) return;
      msg.className   = kind ? 'smva-int-msg ' + kind : 'smva-int-msg';
      msg.textContent = text || '';
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var sid    = (document.getElementById('smva-phone-sid')    || {}).value || '';
        var token  = (document.getElementById('smva-phone-token')  || {}).value || '';
        var number = (document.getElementById('smva-phone-number') || {}).value || '';
        var label  = saveBtn.querySelector('.smva-phone-label-text');
        var spin   = saveBtn.querySelector('.smva-phone-spinner');

        sid = sid.trim(); token = token.trim(); number = number.trim();

        if (!sid || !token || !number) {
          setMsg('err', 'Account SID, Auth Token, and phone number are all required.');
          return;
        }
        // Mirrors the backend's E.164 check so an obvious typo is caught
        // before it costs a round trip to Twilio.
        if (!/^\+[1-9]\d{6,14}$/.test(number)) {
          setMsg('err', 'Phone number must be in E.164 format, e.g. +15551234567.');
          return;
        }

        label.classList.add('smva-hidden');
        spin.classList.remove('smva-hidden');
        saveBtn.disabled = true;
        setMsg('', '');

        fetch(smvaAdmin.ajaxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'smva_phone_connect',
            nonce: smvaAdmin.nonce,
            account_sid: sid,
            auth_token: token,
            phone_number: number,
          }),
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success) {
            setMsg('ok', 'Connected. Reloading...');
            setTimeout(function () { window.location.reload(); }, 1200);
          } else {
            setMsg('err', (data.data && data.data.message) || 'Connection failed. Check your Twilio credentials.');
            label.classList.remove('smva-hidden');
            spin.classList.add('smva-hidden');
            saveBtn.disabled = false;
          }
        })
        .catch(function () {
          setMsg('err', 'Network error. Please try again.');
          label.classList.remove('smva-hidden');
          spin.classList.add('smva-hidden');
          saveBtn.disabled = false;
        });
      });
    }

    var disconnectBtn = document.getElementById('smva-phone-disconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', function () {
        if (!confirm('Disconnect this number? Calls to it will no longer be answered by your agent.')) return;
        disconnectBtn.textContent = 'Disconnecting...';
        disconnectBtn.disabled    = true;
        fetch(smvaAdmin.ajaxUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ action: 'smva_phone_disconnect', nonce: smvaAdmin.nonce }),
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success) { window.location.reload(); }
          else {
            setMsg('err', (data.data && data.data.message) || 'Error disconnecting. Please try again.');
            disconnectBtn.textContent = 'Disconnect';
            disconnectBtn.disabled    = false;
          }
        })
        .catch(function () {
          setMsg('err', 'Network error. Please try again.');
          disconnectBtn.textContent = 'Disconnect';
          disconnectBtn.disabled    = false;
        });
      });
    }

    var copyBtn = document.getElementById('smva-phone-copy-webhook');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var input = document.getElementById('smva-phone-webhook-url');
        if (!input) return;
        // Left selected on every path, so Ctrl+C still works when the
        // clipboard API is unavailable or refuses (it rejects with
        // NotAllowedError whenever the document is not focused).
        input.select();
        input.setSelectionRange(0, 99999);

        var flash = function (label) {
          copyBtn.textContent = label;
          setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500);
        };
        var fallback = function () {
          var copied = false;
          try { copied = document.execCommand('copy'); } catch (_) {}
          // Don't claim success we didn't get — point at the selection instead.
          flash(copied ? 'Copied' : 'Press Ctrl+C');
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(input.value).then(function () { flash('Copied'); }, fallback);
        } else {
          fallback();
        }
      });
    }
  })();


  // ── Transfer to a human ───────────────────────────────────────────────────
  // Departments live on the backend beside the rest of the agent config, so
  // this only ever sends a proposal: whatever the backend accepts after its own
  // E.164 validation is what the agent will actually dial.
  (function () {
    var card = document.getElementById('smva-transfer-card');
    if (!card) return; // Not on the Integrations tab, or no number connected.

    var listEl    = document.getElementById('smva-transfer-list');
    var bodyEl    = document.getElementById('smva-transfer-body');
    var enabledEl = document.getElementById('smva-transfer-enabled');
    var timeoutEl = document.getElementById('smva-transfer-timeout');
    var saveBtn   = document.getElementById('smva-transfer-save');
    var msg       = document.getElementById('smva-transfer-msg');

    var E164 = /^\+[1-9]\d{6,14}$/;

    var departments = [];
    try {
      var seed = JSON.parse(document.getElementById('smva-transfer-json').value || '{}');
      if (seed && Array.isArray(seed.departments)) departments = seed.departments;
    } catch (_) { departments = []; }

    function setMsg(kind, text) {
      if (!msg) return;
      msg.className   = kind ? 'smva-int-msg ' + kind : 'smva-int-msg';
      msg.textContent = text || '';
    }

    // textContent, never innerHTML — these strings came back from the backend
    // and end up next to a phone number the operator is about to trust.
    function field(row, cls, label, placeholder, value) {
      var wrap = document.createElement('label');
      wrap.className = 'smva-transfer-field';
      var span = document.createElement('span');
      span.className = 'smva-phone-label';
      span.textContent = label;
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'smva-int-token-input ' + cls;
      input.placeholder = placeholder;
      input.value = value || '';
      wrap.appendChild(span);
      wrap.appendChild(input);
      row.appendChild(wrap);
      return input;
    }

    function render() {
      listEl.textContent = '';

      if (!departments.length) {
        var empty = document.createElement('p');
        empty.className = 'smva-transfer-empty';
        empty.textContent = 'No departments yet. Add one to let the agent transfer callers.';
        listEl.appendChild(empty);
        return;
      }

      departments.forEach(function (dept, i) {
        var row = document.createElement('div');
        row.className = 'smva-transfer-row';

        var head = document.createElement('div');
        head.className = 'smva-transfer-row-head';
        var title = document.createElement('strong');
        title.textContent = dept.name || 'New department';
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'smva-btn smva-btn-ghost smva-btn-sm';
        remove.textContent = 'Remove';
        remove.addEventListener('click', function () { departments.splice(i, 1); render(); });
        head.appendChild(title);
        head.appendChild(remove);
        row.appendChild(head);

        var grid = document.createElement('div');
        grid.className = 'smva-transfer-grid';
        var nameIn = field(grid, 'smva-transfer-name', 'Department', 'Sales', dept.name);
        var numIn  = field(grid, 'smva-transfer-number', 'Phone number', '+15551234567', dept.number);
        row.appendChild(grid);

        var descIn = field(row, 'smva-transfer-desc', 'When to transfer here',
          'pricing, quotes, new orders', dept.description);
        var hoursIn = field(row, 'smva-transfer-hours', 'Hours (optional)',
          'Mon-Fri 9-5', dept.hours);

        nameIn.addEventListener('input',  function () { dept.name = this.value; title.textContent = this.value || 'New department'; });
        numIn.addEventListener('input',   function () { dept.number = this.value; });
        descIn.addEventListener('input',  function () { dept.description = this.value; });
        hoursIn.addEventListener('input', function () { dept.hours = this.value; });

        listEl.appendChild(row);
      });
    }

    enabledEl.addEventListener('change', function () {
      bodyEl.classList.toggle('smva-hidden', !this.checked);
    });

    document.getElementById('smva-transfer-add').addEventListener('click', function () {
      // The backend caps this at 8; stopping here keeps the message specific
      // instead of silently dropping the ninth on save.
      if (departments.length >= 8) {
        setMsg('err', 'You can configure up to 8 departments.');
        return;
      }
      setMsg('', '');
      departments.push({ name: '', number: '', description: '', hours: '' });
      render();
    });

    saveBtn.addEventListener('click', function () {
      var label = saveBtn.querySelector('.smva-transfer-label-text');
      var spin  = saveBtn.querySelector('.smva-transfer-spinner');
      var wantEnabled = enabledEl.checked;

      var clean = [];
      for (var i = 0; i < departments.length; i++) {
        var d = departments[i];
        var name   = (d.name || '').trim();
        var number = (d.number || '').replace(/[\s()\-.]/g, '');
        if (!name && !number) continue; // an untouched blank row is not an error
        if (!name) { setMsg('err', 'Every department needs a name.'); return; }
        // Mirrors the backend check so a typo is caught here rather than
        // silently vanishing from the saved list.
        if (!E164.test(number)) {
          setMsg('err', '"' + name + '" needs a phone number in E.164 format, e.g. +15551234567.');
          return;
        }
        clean.push({
          name: name,
          number: number,
          description: (d.description || '').trim(),
          hours: (d.hours || '').trim(),
        });
      }

      if (wantEnabled && !clean.length) {
        setMsg('err', 'Add at least one department, or turn transfers off.');
        return;
      }

      var timeout = parseInt(timeoutEl.value, 10);
      if (!isFinite(timeout)) timeout = 25;
      timeout = Math.min(60, Math.max(10, timeout));
      timeoutEl.value = timeout;

      label.classList.add('smva-hidden');
      spin.classList.remove('smva-hidden');
      saveBtn.disabled = true;
      setMsg('', '');

      fetch(smvaAdmin.ajaxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'smva_save_transfer',
          nonce: smvaAdmin.nonce,
          transfer_config: JSON.stringify({
            enabled: wantEnabled,
            ring_timeout: timeout,
            departments: clean,
          }),
        }),
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          // Re-seed from what the backend actually stored, so a department it
          // rejected does not keep showing here as if it were live.
          if (data.data && Array.isArray(data.data.departments)) {
            departments = data.data.departments;
            render();
          }
          setMsg('ok', 'Transfer settings saved.');
        } else {
          setMsg('err', (data.data && data.data.message) || 'Could not save. Please try again.');
        }
      })
      .catch(function () { setMsg('err', 'Network error. Please try again.'); })
      .finally(function () {
        label.classList.remove('smva-hidden');
        spin.classList.add('smva-hidden');
        saveBtn.disabled = false;
      });
    });

    render();
  })();


  // ── Email a caller, and returning-caller recall ────────────────────────────
  // The documents live on the backend: it composes the email mid-call and its
  // answer is what decides whether the agent may tell the caller anything was
  // sent. What is edited here is only ever a proposal.
  (function () {
    var listEl = document.getElementById('smva-infodoc-list');
    if (!listEl) return; // Not on the Automation tab.

    var jsonEl   = document.getElementById('smva-infodoc-json');
    var modal    = document.getElementById('smva-infodoc-modal');
    var titleEl  = document.getElementById('smva-infodoc-title');
    var kwEl     = document.getElementById('smva-infodoc-keywords');
    var bodyEl   = document.getElementById('smva-infodoc-body');
    var msgEl    = document.getElementById('smva-infodoc-msg');
    var saveBtn  = document.getElementById('smva-infodoc-save');
    var memoryEl = document.getElementById('smva-caller-memory');

    var docs = [];
    var editing = -1; // -1 means "adding", otherwise the index being edited.

    try { docs = JSON.parse(jsonEl.value) || []; } catch (e) { docs = []; }
    if (!Array.isArray(docs)) docs = [];

    function post(action, data) {
      return fetch(smvaAdmin.ajaxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(Object.assign({ action: action, nonce: smvaAdmin.nonce }, data || {})),
      }).then(function (r) { return r.json(); });
    }

    function setMsg(ok, text) {
      msgEl.textContent = text || '';
      msgEl.style.color = text ? (ok ? '#059669' : '#dc2626') : '';
    }

    function render() {
      if (!docs.length) {
        listEl.innerHTML = '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:16px 0">' +
          smvaAdmin.i18n.infodocEmpty + '</p>';
        return;
      }
      listEl.innerHTML = '';
      docs.forEach(function (doc, i) {
        var item = document.createElement('div');
        item.className = 'smva-tool-item';
        item.style.cssText = 'background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:8px';

        var head = document.createElement('div');
        head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px';

        var name = document.createElement('code');
        name.style.cssText = 'font-size:13px;font-weight:600';
        name.textContent = doc.title || '';

        var actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:6px';

        var edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'smva-btn';
        edit.style.cssText = 'padding:4px 10px;font-size:12px;flex:none;background:#e0f2fe;color:#0369a1';
        edit.textContent = 'Edit';
        edit.addEventListener('click', function () { openModal(i); });

        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'smva-btn smva-btn-danger';
        del.style.cssText = 'padding:4px 10px;font-size:12px;flex:none';
        del.textContent = 'Remove';
        del.addEventListener('click', function () {
          docs.splice(i, 1);
          render();
          setMsg(true, 'Removed — press Save to apply.');
        });

        actions.appendChild(edit);
        actions.appendChild(del);
        head.appendChild(name);
        head.appendChild(actions);

        var preview = document.createElement('div');
        preview.style.cssText = 'font-size:12px;color:#6b7280;white-space:pre-wrap';
        var body = String(doc.body || '');
        preview.textContent = body.length > 140 ? body.slice(0, 140) + '…' : body;

        item.appendChild(head);
        item.appendChild(preview);

        if (doc.keywords && doc.keywords.length) {
          var kw = document.createElement('div');
          kw.style.cssText = 'font-size:11px;color:#9ca3af;margin-top:6px';
          kw.textContent = 'also matches: ' + doc.keywords.join(', ');
          item.appendChild(kw);
        }
        listEl.appendChild(item);
      });
    }

    function openModal(index) {
      editing = typeof index === 'number' ? index : -1;
      var doc = editing >= 0 ? docs[editing] : { title: '', keywords: [], body: '' };
      document.getElementById('smva-infodoc-modal-title').textContent =
        editing >= 0 ? 'Edit Document' : 'Add Document';
      titleEl.value = doc.title || '';
      kwEl.value = (doc.keywords || []).join(', ');
      bodyEl.value = doc.body || '';
      modal.style.display = 'flex';
      titleEl.focus();
    }

    function closeModal() { modal.style.display = 'none'; editing = -1; }

    document.getElementById('smva-infodoc-add').addEventListener('click', function () { openModal(); });
    document.getElementById('smva-infodoc-modal-cancel').addEventListener('click', closeModal);

    document.getElementById('smva-infodoc-modal-save').addEventListener('click', function () {
      var title = titleEl.value.trim();
      var body  = bodyEl.value.trim();
      // The backend drops a document missing either, which would look like the
      // save silently ignoring it. Say so here instead.
      if (!title || !body) {
        window.alert('A document needs both a title and something to send.');
        return;
      }
      var doc = {
        title: title,
        keywords: kwEl.value.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean),
        body: body,
      };
      if (editing >= 0) docs[editing] = doc; else docs.push(doc);
      closeModal();
      render();
      setMsg(true, 'Press Save to apply.');
    });

    saveBtn.addEventListener('click', function () {
      saveBtn.disabled = true;
      setMsg(true, 'Saving…');
      post('smva_info_docs_save', {
        info_documents: JSON.stringify(docs),
        caller_memory_enabled: memoryEl.checked ? '1' : '0',
      }).then(function (res) {
        saveBtn.disabled = false;
        if (res.success) {
          // Re-sync to what the backend actually kept, so the list can never
          // show a document the agent does not have.
          if (Array.isArray(res.data.info_documents)) { docs = res.data.info_documents; render(); }
          setMsg(true, 'Saved.');
        } else {
          setMsg(false, (res.data && res.data.message) || 'Could not save.');
        }
      }).catch(function () {
        saveBtn.disabled = false;
        setMsg(false, 'Network error. Please try again.');
      });
    });

    // Backend is the source of truth; the markup rendered from the local mirror.
    post('smva_info_docs_get').then(function (res) {
      if (!res.success) return; // No license yet — leave what the mirror gave us.
      if (Array.isArray(res.data.info_documents)) { docs = res.data.info_documents; render(); }
      memoryEl.checked = !!res.data.caller_memory_enabled;
      if (!res.data.email_delivery_available) {
        setMsg(false, 'Email delivery is not configured for this account yet — contact support.');
      }
    });

    render();
  })();


  // ── Appointments ──────────────────────────────────────────────────────────
  // Working hours are validated and stored on the backend — the availability
  // engine and the agent both read from there mid-call. What is built here is
  // only ever a proposal sent to /plugin/booking/config/save; the grid re-syncs
  // to whatever the backend actually accepted, so the two cannot drift apart.
  (function () {
    var root = document.getElementById('smva-appt-hours');
    if (!root) return; // Not on the Appointments tab.

    var DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    function post(action, data) {
      return fetch(smvaAdmin.ajaxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(Object.assign({ action: action, nonce: smvaAdmin.nonce }, data || {})),
      }).then(function (r) { return r.json(); });
    }

    function dayRow(day) {
      return root.querySelector('.smva-appt-day[data-day="' + day + '"]');
    }

    function setDayOpen(day, open, start, end) {
      var row = dayRow(day);
      if (!row) return;
      row.classList.toggle('is-open', !!open);
      row.querySelector('.smva-appt-day-open').checked = !!open;
      var startEl = row.querySelector('.smva-appt-start');
      var endEl   = row.querySelector('.smva-appt-end');
      startEl.disabled = endEl.disabled = !open;
      if (start) startEl.value = start;
      if (end) endEl.value = end;
    }

    // Every open day becomes exactly one window. The plugin UI keeps to one
    // window per day on purpose — split days (e.g. a lunch break) are a config
    // the backend already supports, but adding a second row per day here is a
    // v2, not part of this stage.
    function readConfigFromUI() {
      var hours = {};
      DAY_KEYS.forEach(function (day) {
        var row = dayRow(day);
        if (!row || !row.classList.contains('is-open')) return;
        var start = row.querySelector('.smva-appt-start').value || '09:00';
        var end   = row.querySelector('.smva-appt-end').value || '17:00';
        hours[day] = [{ start: start, end: end }];
      });
      return {
        slot_minutes: parseInt(document.getElementById('smva-appt-slot').value, 10) || 30,
        buffer_minutes: parseInt(document.getElementById('smva-appt-buffer').value, 10) || 0,
        min_notice_minutes: parseInt(document.getElementById('smva-appt-notice').value, 10) || 0,
        horizon_days: parseInt(document.getElementById('smva-appt-horizon').value, 10) || 30,
        meeting_type: document.getElementById('smva-appt-meeting-type').value || 'phone',
        location: document.getElementById('smva-appt-location').value || '',
        description: document.getElementById('smva-appt-description').value || '',
        hours: hours,
      };
    }

    function applyConfigToUI(config) {
      config = config || {};
      var hours = config.hours || {};
      DAY_KEYS.forEach(function (day) {
        var windows = hours[day];
        if (windows && windows.length) {
          setDayOpen(day, true, windows[0].start, windows[0].end);
        } else {
          setDayOpen(day, false);
        }
      });
      if (config.slot_minutes) document.getElementById('smva-appt-slot').value = String(config.slot_minutes);
      document.getElementById('smva-appt-buffer').value = String(config.buffer_minutes || 0);
      if (config.min_notice_minutes !== undefined) document.getElementById('smva-appt-notice').value = String(config.min_notice_minutes);
      if (config.horizon_days) document.getElementById('smva-appt-horizon').value = String(config.horizon_days);
      if (config.meeting_type) document.getElementById('smva-appt-meeting-type').value = config.meeting_type;
      document.getElementById('smva-appt-location').value = config.location || '';
      document.getElementById('smva-appt-description').value = config.description || '';
      applyMeetingType();
    }

    /**
     * What the Address field means depends entirely on the meeting type, and
     * one static label cannot say it. In person it is the only thing that gets
     * the visitor to the door; for video the joining link is minted by Google
     * per appointment and anything typed here is a fallback at best; on a phone
     * appointment there is nothing to fill in at all.
     *
     * Relabelling rather than hiding: an owner who switches to Phone should
     * still see the address they typed is still stored, not watch it vanish.
     */
    function applyMeetingType() {
      var type    = (document.getElementById('smva-appt-meeting-type') || {}).value || 'phone';
      var input   = document.getElementById('smva-appt-location');
      var hint    = document.getElementById('smva-appt-location-hint');
      var labelEl = document.querySelector('label[for="smva-appt-location"]');
      if (!input || !hint || !labelEl) return;

      if (type === 'in_person') {
        labelEl.textContent = 'Address';
        input.placeholder   = 'e.g. 12 High Street, Toronto';
        hint.textContent    = 'Required. This is what the agent tells the visitor and what goes on the calendar event.';
      } else if (type === 'video') {
        labelEl.textContent = 'Fallback joining link';
        input.placeholder   = 'e.g. https://zoom.us/j/your-room';
        hint.textContent    = 'Optional. With a calendar connected below, a Google Meet link is created per appointment and used instead of this.';
      } else {
        labelEl.textContent = 'Location';
        input.placeholder   = 'Not needed for phone appointments';
        hint.textContent    = 'Nothing to fill in — the business calls the visitor on the number they leave.';
      }
      if (type !== 'in_person') clearLocationError();
    }

    function clearLocationError() {
      var input = document.getElementById('smva-appt-location');
      var hint  = document.getElementById('smva-appt-location-hint');
      if (input) input.classList.remove('smva-field-invalid');
      if (hint) hint.classList.remove('smva-field-warn');
    }

    var meetingTypeEl = document.getElementById('smva-appt-meeting-type');
    if (meetingTypeEl) meetingTypeEl.addEventListener('change', applyMeetingType);
    var locationEl = document.getElementById('smva-appt-location');
    if (locationEl) locationEl.addEventListener('input', function () {
      if (locationEl.value.trim()) clearLocationError();
    });

    // Day-row open/closed toggle.
    root.addEventListener('change', function (e) {
      if (!e.target.classList.contains('smva-appt-day-open')) return;
      var row = e.target.closest('.smva-appt-day');
      setDayOpen(row.getAttribute('data-day'), e.target.checked);
    });

    var copyBtn = document.getElementById('smva-appt-copy-mon');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var mon = dayRow('mon');
        var start = mon.querySelector('.smva-appt-start').value;
        var end   = mon.querySelector('.smva-appt-end').value;
        var open  = mon.classList.contains('is-open');
        DAY_KEYS.forEach(function (day) {
          if (day === 'mon') return;
          setDayOpen(day, open, start, end);
        });
      });
    }

    function setMsg(el, ok, text) {
      el.className = 'smva-int-msg' + (text ? (ok ? ' ok' : ' err') : '');
      el.textContent = text || '';
    }

    function loadConfig() {
      post('smva_booking_get_config').then(function (res) {
        if (!res.success) return; // No license yet — leave the resting defaults.
        var enabled = document.getElementById('smva-booking-enabled');
        enabled.checked = !!res.data.booking_enabled;
        if (res.data.booking_config && Object.keys(res.data.booking_config).length) {
          applyConfigToUI(res.data.booking_config);
        }
        // The page rendered from the local mirror, which can lag the backend.
        // Correct it, so the owner is never told their hours are in a zone the
        // agent isn't actually using.
        var tzEl = document.getElementById('smva-appt-tz');
        if (tzEl && res.data.timezone) tzEl.textContent = res.data.timezone;
        refreshPreview();
      });
    }

    var saveBtn = document.getElementById('smva-appt-save');
    if (saveBtn) {
      var saveLabel = saveBtn.querySelector('.smva-appt-save-label');
      var saveSpin  = saveBtn.querySelector('.smva-appt-save-spinner');
      var msg       = document.getElementById('smva-appt-msg');

      saveBtn.addEventListener('click', function () {
        // Caught here rather than by the backend, which accepts an empty
        // location for any meeting type: an in-person business that saves
        // without an address gets a booking flow that confirms a time and
        // never tells anyone where to go, and nothing anywhere reports it.
        var cfg = readConfigFromUI();
        if (cfg.meeting_type === 'in_person' && !String(cfg.location).trim()) {
          var input = document.getElementById('smva-appt-location');
          var hint  = document.getElementById('smva-appt-location-hint');
          if (input) { input.classList.add('smva-field-invalid'); input.focus(); }
          if (hint) hint.classList.add('smva-field-warn');
          setMsg(msg, false, 'Add the address visitors should come to, or change the meeting type.');
          return;
        }

        saveBtn.disabled = true;
        saveLabel.classList.add('smva-hidden');
        saveSpin.classList.remove('smva-hidden');
        setMsg(msg, true, '');

        post('smva_booking_save_config', {
          booking_enabled: document.getElementById('smva-booking-enabled').checked ? '1' : '0',
          booking_config: JSON.stringify(cfg),
        }).then(function (res) {
          saveBtn.disabled = false;
          saveLabel.classList.remove('smva-hidden');
          saveSpin.classList.add('smva-hidden');
          if (res.success) {
            setMsg(msg, true, 'Saved.');
            refreshPreview();
          } else {
            var detail = res.data && res.data.details ? ' (' + res.data.details + ')' : '';
            setMsg(msg, false, ((res.data && res.data.message) || 'Could not save.') + detail);
          }
        }).catch(function () {
          saveBtn.disabled = false;
          saveLabel.classList.remove('smva-hidden');
          saveSpin.classList.add('smva-hidden');
          setMsg(msg, false, 'Network error. Please try again.');
        });
      });
    }

    // Renders the slot's own localTime (a plain "HH:MM" the backend already
    // computed in the site's agent_timezone) rather than reformatting
    // s.startUtc through the browser's Intl — which renders in whatever
    // timezone the admin's own browser happens to be in. An owner in Tehran
    // previewing a Paris business's hours must see Paris time, not Tehran time.
    function formatSlotTime(hhmm) {
      var m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
      if (!m) return hhmm;
      var h = parseInt(m[1], 10);
      var period = h >= 12 ? 'PM' : 'AM';
      var h12 = h % 12 || 12;
      return h12 + ':' + m[2] + ' ' + period;
    }

    // day.date is already the site's local calendar date. Formatting it in UTC
    // keeps it that date: passing it through the browser's zone can shift it a
    // day for any admin west of UTC.
    function formatSlotDate(dateStr) {
      try {
        return new Date(dateStr + 'T12:00:00Z').toLocaleDateString([], {
          weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
        });
      } catch (e) { return dateStr; }
    }

    function renderPreview(data) {
      var el = document.getElementById('smva-appt-preview');
      var summary = document.getElementById('smva-appt-preview-summary');
      if (!el) return;

      if (!data || !data.days || !data.days.length) {
        el.innerHTML = '<div class="smva-appt-preview-empty">No availability in the next 7 days with your current hours.</div>';
        if (summary) summary.textContent = '';
        return;
      }

      if (summary) summary.textContent = data.total + ' open slot' + (data.total === 1 ? '' : 's') + ' · ' + data.timezone;

      el.innerHTML = data.days.map(function (day) {
        var chips = day.slots.map(function (s) {
          return '<span class="smva-appt-slot-chip">' + formatSlotTime(s.localTime) + '</span>';
        }).join('');
        return '<div class="smva-appt-preview-day">'
          + '<div class="smva-appt-preview-date">' + formatSlotDate(day.date) + '</div>'
          + '<div class="smva-appt-preview-slots">' + chips + '</div>'
          + '</div>';
      }).join('');
    }

    function refreshPreview() {
      var el = document.getElementById('smva-appt-preview');
      if (el) el.innerHTML = '<div class="smva-appt-preview-empty">Loading...</div>';
      post('smva_booking_slots', { booking_config: JSON.stringify(readConfigFromUI()) }).then(function (res) {
        if (res.success) renderPreview(res.data);
        else if (el) el.innerHTML = '<div class="smva-appt-preview-empty">Could not load availability.</div>';
      });
    }

    var refreshBtn = document.getElementById('smva-appt-refresh');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshPreview);

    // ── Google Calendar connection ──────────────────────────────────────────
    var gcalSub    = document.getElementById('smva-gcal-sub');
    var gcalBadge  = document.getElementById('smva-gcal-badge');
    var gcalHint   = document.getElementById('smva-gcal-hint');
    var gcalMsg    = document.getElementById('smva-gcal-msg');
    var gcalConn   = document.getElementById('smva-gcal-connect');
    var gcalDisc   = document.getElementById('smva-gcal-disconnect');

    function renderCalendarStatus(res) {
      if (!res.success) {
        gcalSub.textContent = 'Could not check calendar status.';
        return;
      }
      var d = res.data;
      gcalConn.classList.toggle('smva-hidden', !!d.connected);
      gcalDisc.classList.toggle('smva-hidden', !d.connected);

      if (d.connected && d.needs_reauth) {
        gcalBadge.className   = 'smva-int-badge-warn';
        gcalBadge.textContent = 'Reconnect needed';
        gcalBadge.classList.remove('smva-hidden');
        gcalSub.textContent = d.account_email ? d.account_email : 'Connection needs to be renewed.';
        gcalHint.textContent = 'Google access expired or was revoked. Booking still works off your working hours; reconnect to resume calendar sync.';
        gcalConn.classList.remove('smva-hidden'); // Reconnect uses the same button.
        gcalConn.textContent = 'Reconnect Google Calendar';
      } else if (d.connected) {
        gcalBadge.className   = 'smva-int-badge-connected';
        gcalBadge.textContent = '✓ Connected';
        gcalBadge.classList.remove('smva-hidden');
        gcalSub.textContent = d.account_email || 'Connected';
        gcalHint.textContent = 'New appointments are added to this calendar, and busy times are kept off the availability shown to visitors.';
      } else {
        gcalBadge.classList.add('smva-hidden');
        gcalSub.textContent = d.available === false ? 'Not available yet' : 'Not connected';
        gcalHint.textContent = 'Booking works from your working hours alone until you connect a calendar.';
        gcalConn.textContent = 'Connect Google Calendar';
      }
    }

    function loadCalendarStatus() {
      post('smva_calendar_status').then(renderCalendarStatus);
    }

    if (gcalConn) {
      gcalConn.addEventListener('click', function () {
        gcalConn.disabled = true;
        setMsg(gcalMsg, true, '');
        post('smva_calendar_connect_url').then(function (res) {
          if (res.success && res.data.url) {
            // Full navigation, not a popup: the consent screen needs the whole
            // tab, and the callback lands back on this same wp-admin page.
            window.location.href = res.data.url;
          } else {
            gcalConn.disabled = false;
            setMsg(gcalMsg, false, (res.data && res.data.message) || 'Could not start the connection.');
          }
        }).catch(function () {
          gcalConn.disabled = false;
          setMsg(gcalMsg, false, 'Network error. Please try again.');
        });
      });
    }

    if (gcalDisc) {
      gcalDisc.addEventListener('click', function () {
        if (!confirm('Disconnect Google Calendar? Booking will keep working from your working hours alone.')) return;
        gcalDisc.disabled = true;
        gcalDisc.textContent = 'Disconnecting...';
        post('smva_calendar_disconnect').then(function (res) {
          gcalDisc.disabled = false;
          gcalDisc.textContent = 'Disconnect';
          if (res.success) { loadCalendarStatus(); refreshPreview(); }
          else setMsg(gcalMsg, false, (res.data && res.data.message) || 'Could not disconnect.');
        });
      });
    }

    // The OAuth callback 302-redirects here with ?calendar=connected|denied|...
    // rather than rendering its own page (see routes/oauth/google.ts) — this is
    // where that outcome actually gets shown to the owner.
    var calParam = new URLSearchParams(window.location.search).get('calendar');
    if (calParam) {
      var messages = {
        connected: ['ok', 'Google Calendar connected.'],
        denied: ['err', 'Calendar connection was cancelled.'],
        expired: ['err', 'That connection link expired. Please try again.'],
        invalid_state: ['err', 'Could not verify that request. Please try again.'],
        exchange_failed: ['err', 'Google did not confirm the connection. Please try again.'],
      };
      var m = messages[calParam] || ['err', 'Calendar connection could not be completed.'];
      setMsg(gcalMsg, m[0] === 'ok', m[1]);
      var url = new URL(window.location.href);
      url.searchParams.delete('calendar');
      window.history.replaceState({}, '', url.toString());
    }

    // Before loadConfig answers, and whatever it answers: a site with no
    // license yet keeps the resting defaults, and those still need the Address
    // field to say which of its three meanings is in force.
    applyMeetingType();

    loadConfig();
    loadCalendarStatus();
  })();


  // ── Knowledge Base File Upload ───────────────────────────────────────────
  (function () {
    var uploadBtn = document.getElementById('smva-kb-upload-btn');
    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', function () {
      var fileInput = document.getElementById('smva-kb-file');
      var msgEl     = document.getElementById('smva-kb-upload-msg');
      var label     = document.getElementById('smva-kb-upload-label');
      var spinner   = document.getElementById('smva-kb-upload-spinner');

      if (!fileInput.files || !fileInput.files[0]) {
        msgEl.style.display = 'block';
        msgEl.style.color   = '#b91c1c';
        msgEl.textContent   = 'Please select a file first.';
        return;
      }

      var formData = new FormData();
      formData.append('action', 'smva_upload_knowledge_file');
      formData.append('nonce', smvaAdmin.nonce);
      formData.append('file', fileInput.files[0]);

      label.style.display   = 'none';
      spinner.style.display = '';
      uploadBtn.disabled    = true;
      msgEl.style.display   = 'none';

      fetch(smvaAdmin.ajaxUrl, {
        method: 'POST',
        body: formData,
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        msgEl.style.display = 'block';
        if (data.success) {
          msgEl.style.color = '#15803d';
          msgEl.textContent = (data.data && data.data.message) || 'File processed successfully.';
          fileInput.value   = '';
        } else {
          msgEl.style.color = '#b91c1c';
          msgEl.textContent = (data.data && data.data.message) || 'Upload failed. Please try again.';
        }
        label.style.display   = '';
        spinner.style.display = 'none';
        uploadBtn.disabled    = false;
      })
      .catch(function() {
        msgEl.style.display = 'block';
        msgEl.style.color   = '#b91c1c';
        msgEl.textContent   = 'Network error. Please try again.';
        label.style.display   = '';
        spinner.style.display = 'none';
        uploadBtn.disabled    = false;
      });
    });
  })();



  // ── Migrated from admin-page.php ──────────────────────────────────────────

(function(){
                        function filterVoices(gender){
                            var sel = document.getElementById('smva-voice-select');
                            if(!sel) return;
                            var opts = sel.options;
                            var firstVisible = null;
                            for(var i=0;i<opts.length;i++){
                                var show = opts[i].dataset.gender === gender;
                                opts[i].style.display = show ? '' : 'none';
                                if(show && firstVisible===null) firstVisible = opts[i].value;
                            }
                            // if current selection is hidden, switch to first visible
                            if(sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].style.display==='none'){
                                sel.value = firstVisible || sel.options[0].value;
                                sel.dispatchEvent(new Event('change'));
                            }
                        }
                        document.addEventListener('DOMContentLoaded', function(){
                            var tabs = document.querySelectorAll('.smva-gender-btn');
                            var sel  = document.getElementById('smva-voice-select');
                            // init — hide voices of opposite gender
                            var initGender = sel ? (sel.options[sel.selectedIndex]?.dataset.gender || 'f') : 'f';
                            filterVoices(initGender);
                            tabs.forEach(function(btn){
                                btn.addEventListener('click', function(){
                                    tabs.forEach(function(b){b.classList.remove('active');});
                                    btn.classList.add('active');
                                    filterVoices(btn.dataset.gender);
                                });
                            });
                        });
                    })();

document.addEventListener('DOMContentLoaded', function(){
        var quick = document.getElementById('smva-preview-greeting-btn-quick');
        if (quick) {
            quick.addEventListener('click', function(){
                var preview = document.getElementById('smva-preview-greeting-btn');
                if (preview) { preview.click(); }
            });
        }
    });

function smvaSelectStyle(val) {
        document.querySelectorAll('[name=response_style]').forEach(function(r) {
            r.checked = r.value === val;
            var lbl = r.closest('label');
            if (lbl) lbl.style.borderColor = r.value === val ? '#2563eb' : '#e5e7eb';
        });
    }


jQuery(function($){
        var allSessions = {};
        function loadHistory(){
            $('#smva-history-loading').show();
            $('#smva-history-list, #smva-history-empty').hide();
            $.post(smvaAdmin.ajaxUrl,{action:'smva_chat_history',nonce:smvaAdmin.nonce,limit:100})
            .done(function(res){
                $('#smva-history-loading').hide();
                if(!res.success||!res.data||!res.data.sessions){$('#smva-history-empty').show();return;}
                allSessions = res.data.sessions;
                renderSessions(allSessions);
            }).fail(function(){$('#smva-history-loading').hide();$('#smva-history-empty').text('Error.').show();});
        }
        function esc(s){return $('<div>').text(s).html();}
        function parseMarkdown(text) {
            return esc(text)
                .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                .replace(/\*(.+?)\*/g,'<em>$1</em>')
                .replace(/^\* (.+)$/gm,'<li style="margin-left:16px">$1</li>')
                .replace(/\n/g,'<br>');
        }
        function renderSessions(sessions){
            var keys=Object.keys(sessions);
            if(!keys.length){$('#smva-history-empty').show();$('#smva-history-list').hide();return;}
            // Sort sessions by most recent first
            keys.sort(function(a,b){
                var aDate=sessions[a][0]?new Date(sessions[a][0].created_at):0;
                var bDate=sessions[b][0]?new Date(sessions[b][0].created_at):0;
                return bDate-aDate;
            });
            var html='';
            keys.forEach(function(sid,idx){
                var msgs=sessions[sid];
                // Sort messages by created_at ascending
                var sorted=msgs.slice().sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at);});
                var firstUser=sorted.find(function(m){return m.role==='user';});
                var preview=firstUser?firstUser.content:'(no user message)';
                var date=new Date(sorted[0].created_at).toLocaleString();
                var bubbles='';
                sorted.forEach(function(m){
                    var isUser=m.role==='user';
                    var time=new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
                    var content=isUser?esc(m.content):parseMarkdown(m.content);
                    bubbles+='<div class="smva-bubble-wrap" style="align-items:'+(isUser?'flex-end':'flex-start')+';display:flex;flex-direction:column;margin-bottom:4px">'
                        +'<div class="smva-bubble smva-bubble-'+(isUser?'user':'bot')+'">'+content+'</div>'
                        +'<div class="smva-bubble-time" style="text-align:'+(isUser?'right':'left')+'">'+time+'</div></div>';
                });
                var isFirst = idx === 0;
                html+='<div class="smva-session-card">'
                    +'<div class="smva-session-hdr" data-idx="'+idx+'">'
                    +'<div style="flex:1;min-width:0"><div class="smva-session-preview">'+esc(preview)+'</div>'
                    +'<div class="smva-session-meta">'+date+' · '+sorted.length+' messages</div></div>'
                    +'<span class="smva-tog" style="color:#9ca3af;font-size:18px;transition:transform .2s;flex-shrink:0">'+(isFirst?'▴':'▾')+'</span></div>'
                    +'<div class="smva-session-msgs'+(isFirst?' open':'')+'" id="smva-msgs-'+idx+'">'+bubbles+'</div></div>';
            });
            $('#smva-history-list').html(html).css('display','flex').show();
        }
        $(document).on('click','.smva-session-hdr',function(){
            var idx=$(this).data('idx');
            var m=$('#smva-msgs-'+idx);
            m.toggleClass('open');
            $(this).find('.smva-tog').css('transform',m.hasClass('open')?'rotate(180deg)':'');
        });
        $('#smva-history-search').on('input',function(){
            var q=$(this).val().toLowerCase();
            if(!q){renderSessions(allSessions);return;}
            var f={};
            Object.keys(allSessions).forEach(function(sid){
                if(allSessions[sid].some(function(m){return m.content.toLowerCase().indexOf(q)>-1;}))f[sid]=allSessions[sid];
            });
            renderSessions(f);
        });
        $('#smva-history-refresh').on('click',loadHistory);
        loadHistory();
    });

jQuery(function($){
    function esc(s){return $('<div>').text(s || '').html();}
    function renderHealth(data){
        var html=''; Object.keys(data||{}).forEach(function(k){var it=data[k]||{}; var cls=it.ok?'ok':'bad'; var icon=it.ok?'✓':'!'; html+='<div class="smva-health-item '+cls+'"><div class="smva-health-icon">'+icon+'</div><div><div class="smva-health-title">'+esc(it.label)+'</div><div class="smva-health-detail">'+esc(it.detail)+'</div></div><div class="smva-health-state">'+(it.ok?'OK':'Check')+'</div></div>';});
        $('#smva-health-results').attr('class','smva-health-grid').html(html || '<div>No result.</div>');
    }
    function loadLogs(){
        $('#smva-event-logs').html('<div style="color:#94a3b8">Loading...</div>');
        $.post(smvaAdmin.ajaxUrl,{action:'smva_get_event_logs',nonce:smvaAdmin.nonce},function(r){
            var logs=(r.success&&r.data)||[]; if(!logs.length){$('#smva-event-logs').html('<div style="color:#94a3b8">No events yet.</div>');return;}
            $('#smva-event-logs').html(logs.map(function(l){return '<div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;direction:ltr!important;text-align:left!important;unicode-bidi:isolate"><div style="display:flex;justify-content:space-between;align-items:center;direction:ltr;text-align:left"><strong style="font-size:12px;color:#334155;font-family:monospace">'+esc(l.type)+'</strong><span style="color:#94a3b8;font-size:11px;font-family:monospace">'+esc(l.time)+'</span></div><div style="font-size:13px;color:#475569;margin-top:3px;direction:ltr;text-align:left">'+esc(l.message)+'</div></div>';}).join(''));
        });
    }
    $('#smva-run-health').on('click',function(){var b=$(this);b.prop('disabled',true).text('Checking...');$.post(smvaAdmin.ajaxUrl,{action:'smva_health_check',nonce:smvaAdmin.nonce},function(r){if(r.success)renderHealth(r.data);else $('#smva-health-results').html('<div style="color:#b91c1c">Health check failed.</div>');loadLogs();}).always(function(){b.prop('disabled',false).text(smvaAdmin.i18n.runCheck);});});
    $('#smva-refresh-logs').on('click',loadLogs);
    $('#smva-clear-logs').on('click',function(){if(!confirm('Clear event logs?'))return;$.post(smvaAdmin.ajaxUrl,{action:'smva_clear_event_logs',nonce:smvaAdmin.nonce},loadLogs);});
    loadLogs();
});



  // ── Leads tab ───────────────────────────────────────────────────────────────
  (function(){
      if(!document.getElementById('smva-leads-tbody'))return; // not on the Leads tab
      var page=1,total=0,limit=20,allLeads=[];
      var smvaLeadsAjaxUrl = smvaAdmin.ajaxUrl;
      var smvaLeadsNonce   = smvaAdmin.nonce;
      function load(p){
          page=p||1;
          jQuery.post(smvaLeadsAjaxUrl,{action:'smva_get_leads',nonce:smvaLeadsNonce,page:page,limit:limit},function(r){
              if(!r || !r.success){
                  var tb=document.getElementById('smva-leads-tbody');
                  if(tb){ tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:24px;color:#b91c1c">Could not load leads.</td></tr>'; }
                  return;
              }
              allLeads=(r.data&&r.data.leads)?r.data.leads:[];total=(r.data&&r.data.total)?r.data.total:0;
              render(allLeads);renderPagination();
              document.getElementById('smva-leads-count').textContent=total+' leads total';
          }).fail(function(){
              var tb=document.getElementById('smva-leads-tbody');
              if(tb){ tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:24px;color:#b91c1c">Could not load leads.</td></tr>'; }
          });
      }
      function esc(v){
          return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});
      }
      function render(leads){
          var tb=document.getElementById('smva-leads-tbody');
          if(!leads||!leads.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:24px;color:#9ca3af">No leads yet.</td></tr>';return;}
          tb.innerHTML=leads.map(function(l){
              var created = l.created_at ? new Date(l.created_at).toLocaleString() : '—';
              var email = l.email ? String(l.email) : '';
              var phone = l.phone ? String(l.phone) : '';
              return '<tr><td style="font-size:12px;white-space:nowrap">'+esc(created)+'</td>'+ 
              '<td>'+esc(l.name||'—')+'</td>'+ 
              '<td>'+(email?'<a href="mailto:'+esc(email)+'">'+esc(email)+'</a>':'—')+'</td>'+ 
              '<td>'+(phone?'<a href="tel:'+esc(phone)+'">'+esc(phone)+'</a>':'—')+'</td>'+ 
              '<td><span style="font-size:11px;padding:2px 8px;background:#eff6ff;color:#1d4ed8;border-radius:10px">'+esc(l.source||'—')+'</span></td>'+ 
              '<td style="font-size:12px;color:#6b7280;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(l.notes||'—')+'</td>'+ 
              '<td><button class="button button-small smva-lead-del" data-id="'+esc(l.id||'')+'">Delete</button></td></tr>';
          }).join('');
          document.querySelectorAll('.smva-lead-del').forEach(function(b){
              b.addEventListener('click',function(){
                  if(!confirm('Delete this lead?'))return;
                  var id=this.dataset.id;
                  jQuery.post(smvaLeadsAjaxUrl,{action:'smva_delete_lead',nonce:smvaLeadsNonce,lead_id:id},function(r){if(r.success)load(page);});
              });
          });
      }
      function renderPagination(){
          var pages=Math.ceil(total/limit),el=document.getElementById('smva-leads-pagination');
          if(pages<=1){el.innerHTML='';return;}
          var h='';for(var i=1;i<=pages;i++)h+='<button type="button" class="button'+(i===page?' button-primary':'')+'" onclick="smvaLP('+i+')">'+i+'</button>';
          el.innerHTML=h;
      }
      window.smvaLP=function(p){load(p);};
      var exportBtn=document.getElementById('smva-leads-export-btn');
      if(exportBtn)exportBtn.addEventListener('click',function(){
          if(!allLeads.length){alert('No leads to export');return;}
          var csv=['Date,Name,Email,Phone,Source,Notes'];
          allLeads.forEach(function(l){csv.push(['"'+(l.created_at||'')+'"','"'+(l.name||'')+'"','"'+(l.email||'')+'"','"'+(l.phone||'')+'"','"'+(l.source||'')+'"','"'+(l.notes||'').replace(/"/g,"'")+'"'].join(','));});
          var a=document.createElement('a');
          a.href=URL.createObjectURL(new Blob([csv.join('\n')],{type:'text/csv'}));
          a.download='leads-'+new Date().toISOString().slice(0,10)+'.csv';
          a.click();
      });
      load(1);
  })();


  // ── Reactivate license on this site ─────────────────────────────────────
  (function(){
    var btn = document.getElementById('smva-reactivate-here-btn');
    if (!btn) return;
    btn.addEventListener('click', function() {
      btn.disabled = true;
      btn.textContent = 'Reactivating...';
      var msg = document.getElementById('smva-reactivate-msg');
      var params = new URLSearchParams({
        action: 'smva_reactivate_here',
        nonce: smvaAdmin.nonce
      });
      fetch(smvaAdmin.ajaxUrl, { method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'}, body: params })
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (data.success) {
          if (msg) { msg.style.color='#16a34a'; msg.textContent='✓ Reactivated! Reloading...'; }
          setTimeout(function(){ location.reload(); }, 1200);
        } else {
          btn.disabled = false;
          btn.textContent = 'Reactivate on this site';
          if (msg) { msg.style.color='#dc2626'; msg.textContent = (data.data && data.data.message) ? data.data.message : 'Error. Please try again.'; }
        }
      })
      .catch(function(){
        btn.disabled = false;
        btn.textContent = 'Reactivate on this site';
        if (msg) { msg.style.color='#dc2626'; msg.textContent='Connection error.'; }
      });
    });
  })();

  // ── Dismiss trial notice ─────────────────────────────────────────────────
  (function(){
    var n = document.getElementById('smva-trial-notice');
    if (!n) return;
    n.addEventListener('click', function(e){
      if (!e.target.classList.contains('notice-dismiss')) return;
      jQuery.post(smvaAdmin.ajaxUrl, {
        action: 'smva_dismiss_trial_notice',
        nonce: smvaAdmin.nonce
      });
    });
  })();

  // ── Review request notice ────────────────────────────────────────────────
  (function(){
    var n = document.getElementById('smva-review-notice');
    if (!n) return;
    function send(mode){
      jQuery.post(smvaAdmin.ajaxUrl, {
        action: 'smva_dismiss_review_notice',
        nonce: smvaAdmin.nonce,
        mode: mode
      });
    }
    var yes = document.getElementById('smva-review-yes');
    if (yes) yes.addEventListener('click', function(){ send('done'); });
    var done = document.getElementById('smva-review-done');
    if (done) done.addEventListener('click', function(){ send('done'); n.style.display = 'none'; });
    // The X (is-dismissible) just snoozes for another week. Use closest() so a
    // click on the button's inner <span> still counts as dismissing.
    n.addEventListener('click', function(e){
      if (!e.target.closest || !e.target.closest('.notice-dismiss')) return;
      send('later');
    });
  })();

}(jQuery));