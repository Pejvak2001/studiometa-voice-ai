<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class SMVA_Plugin {

    const QUOTA_CACHE_KEY = 'smva_quota_cache';
    const QUOTA_CACHE_KEY_PREFIX = 'smva_quota_cache_v2_';
    const QUOTA_CACHE_TTL = 300; // 5 minutes
    const VOICE_CACHE_KEY_PREFIX = 'smva_voices_cache_';
    const VOICE_CACHE_TTL = 21600; // 6 hours — the catalog changes rarely

    // Knowledge base page picker limits.
    const KB_PICKER_MAX_LISTED = 300;          // per post type, keeps the picker payload sane
    const KB_PICKER_MAX_SELECTED = 60;         // pages that can feed one knowledge base
    const KB_PICKER_MAX_CHARS_PER_PAGE = 4000; // per-page truncation

    private static $instance = null;

    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Decode a base64-encoded POST field (used to bypass WAF on long content).
     */
    private function decode_b64_field( $key ) {
        // Nonce + capability are verified by the calling AJAX handler before invoking this helper.
        // Returned raw bytes are sanitized by the caller after base64_decode (cannot sanitize encoded blob).
        // phpcs:ignore WordPress.Security.NonceVerification.Missing
        if ( isset( $_POST[ $key . '_b64' ] ) ) {
            // phpcs:ignore WordPress.Security.NonceVerification.Missing
            $raw = sanitize_text_field( wp_unslash( $_POST[ $key . '_b64' ] ) );
            $decoded = base64_decode( $raw, true );
            return false === $decoded ? null : $decoded;
        }
        // phpcs:ignore WordPress.Security.NonceVerification.Missing
        if ( isset( $_POST[ $key ] ) ) {
            // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
            return wp_unslash( $_POST[ $key ] );
        }
        return null;
    }

    /**
     * Ensure only site administrators can run admin-only AJAX handlers.
     */
    private function require_admin_capability() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
        }
    }

    /**
     * Very small public rate limit for widget quota checks.
     */
    private function check_public_rate_limit( $action, $ttl = 5 ) {
        $ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
        $key = 'smva_rl_' . md5( $action . '|' . $ip );
        if ( get_transient( $key ) ) {
            wp_send_json_error( array( 'message' => 'Too many requests. Please try again shortly.' ), 429 );
        }
        set_transient( $key, 1, absint( $ttl ) );
    }

    private function get_local_leads() {
        $leads = get_option( 'smva_local_leads', array() );
        return is_array( $leads ) ? $leads : array();
    }

    private function save_local_leads( $leads ) {
        if ( ! is_array( $leads ) ) {
            $leads = array();
        }
        // Keep the local fallback lightweight.
        $leads = array_slice( array_values( $leads ), -200 );
        update_option( 'smva_local_leads', $leads, false );
    }

    private function normalize_lead_field_key( $field, $label, $value ) {
        $haystack = strtolower( trim( (string) $field . ' ' . (string) $label ) );
        $value_l  = strtolower( trim( (string) $value ) );

        if ( false !== strpos( $haystack, 'email' ) || is_email( $value ) ) return 'email';
        if ( preg_match( '/phone|tel|mobile|cell|number|شماره|تلفن|موبایل/', $haystack ) || preg_match( '/^[+()\-\s0-9]{7,}$/', $value_l ) ) return 'phone';
        if ( preg_match( '/name|full_name|firstname|last_name|نام/', $haystack ) ) return 'name';
        if ( preg_match( '/company|business|clinic|شرکت|کسب/', $haystack ) ) return 'company';
        if ( preg_match( '/project|service|message|note|needs|goal|work|پروژه|خدمت|کار|نیاز|پیام/', $haystack ) ) return 'notes';
        return 'notes';
    }

    private function upsert_local_lead_fragment( $session_id, $field, $label, $value, $source = 'widget' ) {
        $session_id = sanitize_key( $session_id ? $session_id : 'session_' . wp_generate_uuid4() );
        $field      = sanitize_text_field( $field );
        $label      = sanitize_text_field( $label );
        $value      = sanitize_text_field( $value );
        $source     = sanitize_text_field( $source );

        if ( '' === $value ) {
            return false;
        }

        $key   = $this->normalize_lead_field_key( $field, $label, $value );
        $id    = 'local_' . md5( $session_id );
        $leads = $this->get_local_leads();
        $found = false;

        foreach ( $leads as &$lead ) {
            if ( isset( $lead['id'] ) && $lead['id'] === $id ) {
                $found = true;
                $lead[ $key ] = 'notes' === $key && ! empty( $lead['notes'] ) ? trim( $lead['notes'] . "\n" . $value ) : $value;
                $lead['updated_at'] = current_time( 'mysql' );
                $lead['source'] = $source ?: ( $lead['source'] ?? 'Widget local fallback' );
                break;
            }
        }
        unset( $lead );

        if ( ! $found ) {
            $leads[] = array(
                'id'         => $id,
                'created_at' => current_time( 'mysql' ),
                'updated_at' => current_time( 'mysql' ),
                'name'       => 'name' === $key ? $value : '',
                'email'      => 'email' === $key ? $value : '',
                'phone'      => 'phone' === $key ? $value : '',
                'company'    => 'company' === $key ? $value : '',
                'notes'      => 'notes' === $key ? $value : '',
                'source'     => $source ?: 'Widget local fallback',
                'session_id' => $session_id,
                'local'      => true,
            );
        }

        $this->save_local_leads( $leads );
        return $id;
    }

    /**
     * Upsert a full lead in one shot (name/email/phone/company/notes together),
     * keyed by session so it merges with any fragments already stored for the
     * same conversation. Only non-empty incoming fields overwrite existing ones.
     *
     * @return string Local lead id.
     */
    private function upsert_local_lead_complete( $session_id, $fields, $source = 'widget' ) {
        $session_id = sanitize_key( $session_id ? $session_id : 'session_' . wp_generate_uuid4() );
        $source     = sanitize_text_field( $source );
        $id         = 'local_' . md5( $session_id );

        $incoming = array();
        foreach ( array( 'name', 'email', 'phone', 'company', 'notes' ) as $k ) {
            $incoming[ $k ] = isset( $fields[ $k ] ) ? sanitize_text_field( $fields[ $k ] ) : '';
        }

        $leads = $this->get_local_leads();
        $found = false;
        foreach ( $leads as &$lead ) {
            if ( isset( $lead['id'] ) && $lead['id'] === $id ) {
                $found = true;
                foreach ( $incoming as $k => $v ) {
                    if ( '' === $v ) { continue; }
                    if ( 'notes' === $k && ! empty( $lead['notes'] ) && false === strpos( $lead['notes'], $v ) ) {
                        $lead['notes'] = trim( $lead['notes'] . "\n" . $v );
                    } else {
                        $lead[ $k ] = $v;
                    }
                }
                $lead['updated_at'] = current_time( 'mysql' );
                $lead['source']     = $source ?: ( $lead['source'] ?? 'Widget' );
                break;
            }
        }
        unset( $lead );

        if ( ! $found ) {
            $leads[] = array(
                'id'         => $id,
                'created_at' => current_time( 'mysql' ),
                'updated_at' => current_time( 'mysql' ),
                'name'       => $incoming['name'],
                'email'      => $incoming['email'],
                'phone'      => $incoming['phone'],
                'company'    => $incoming['company'],
                'notes'      => $incoming['notes'],
                'source'     => $source ?: 'Widget',
                'session_id' => $session_id,
                'local'      => true,
            );
        }

        $this->save_local_leads( $leads );
        return $id;
    }

    /**
     * Email the site owner about a newly captured lead. Runs from the deferred
     * 'smva_lead_notify_event' cron event so the name/phone/email fragment burst
     * has coalesced into one complete record. Sends at most one email per lead
     * (tracked via a 'notified_at' marker on the stored lead) and only when the
     * lead carries a reachable contact channel (email or phone).
     *
     * @param string $lead_id Local lead id (e.g. "local_<md5>").
     */
    public function maybe_notify_owner_of_lead( $lead_id ) {
        if ( get_option( 'smva_lead_email_notify', '1' ) !== '1' ) {
            return;
        }

        $lead_id = sanitize_text_field( $lead_id );
        $leads   = $this->get_local_leads();

        $target = null;
        $index  = null;
        foreach ( $leads as $i => $lead ) {
            if ( isset( $lead['id'] ) && $lead['id'] === $lead_id ) {
                $target = $lead;
                $index  = $i;
                break;
            }
        }

        if ( null === $target ) {
            return;
        }
        // Already emailed for this lead — never send twice.
        if ( ! empty( $target['notified_at'] ) ) {
            return;
        }

        $email   = isset( $target['email'] ) ? trim( (string) $target['email'] ) : '';
        $phone   = isset( $target['phone'] ) ? trim( (string) $target['phone'] ) : '';
        $request = isset( $target['notes'] ) ? trim( (string) $target['notes'] ) : '';
        // Only notify for a "valuable" lead: one we can reply to (email or phone)
        // AND that carries an actual request. This prevents a premature email on a
        // bare greeting/introduction with no stated question — the notification
        // fires once the visitor has said what they want.
        if ( '' === $email && '' === $phone ) {
            return;
        }
        if ( '' === $request ) {
            return;
        }

        // Hourly ceiling so a scripted flood of sessions cannot mail-bomb the owner.
        $cap_key = 'smva_lead_notify_count_' . gmdate( 'YmdH' );
        $sent    = (int) get_transient( $cap_key );
        if ( $sent >= 50 ) {
            return;
        }

        $to = sanitize_email( get_option( 'smva_lead_email_to', '' ) );
        if ( ! is_email( $to ) ) {
            $to = get_option( 'admin_email', '' );
        }
        if ( ! is_email( $to ) ) {
            return;
        }

        $site_name = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
        $name      = isset( $target['name'] ) ? trim( (string) $target['name'] ) : '';
        $company   = isset( $target['company'] ) ? trim( (string) $target['company'] ) : '';
        $notes     = isset( $target['notes'] ) ? trim( (string) $target['notes'] ) : '';
        $source    = isset( $target['source'] ) ? trim( (string) $target['source'] ) : '';
        $when      = isset( $target['created_at'] ) ? (string) $target['created_at'] : current_time( 'mysql' );

        /* translators: %s: website name */
        $subject = sprintf( __( 'New lead from %s', 'studiometa-voice-ai' ), $site_name );

        $lines = array();
        $lines[] = __( 'A visitor asked to be contacted through your Voice AI assistant.', 'studiometa-voice-ai' );
        $lines[] = '';
        $lines[] = __( 'Their request:', 'studiometa-voice-ai' );
        $lines[] = $notes;
        $lines[] = '';
        $lines[] = __( 'Contact details:', 'studiometa-voice-ai' );
        if ( '' !== $name )    { $lines[] = __( 'Name:', 'studiometa-voice-ai' ) . '    ' . $name; }
        if ( '' !== $email )   { $lines[] = __( 'Email:', 'studiometa-voice-ai' ) . '   ' . $email; }
        if ( '' !== $phone )   { $lines[] = __( 'Phone:', 'studiometa-voice-ai' ) . '   ' . $phone; }
        if ( '' !== $company ) { $lines[] = __( 'Company:', 'studiometa-voice-ai' ) . ' ' . $company; }
        $lines[] = '';
        if ( '' !== $source )  { $lines[] = __( 'Source:', 'studiometa-voice-ai' ) . '  ' . $source; }
        $lines[] = __( 'Received:', 'studiometa-voice-ai' ) . ' ' . $when;
        $lines[] = '';
        $lines[] = __( 'View all leads:', 'studiometa-voice-ai' ) . ' ' . admin_url( 'admin.php?page=smva&tab=leads' );

        $body = implode( "\n", $lines );
        $sent_ok = wp_mail( $to, $subject, $body );

        if ( $sent_ok ) {
            set_transient( $cap_key, $sent + 1, HOUR_IN_SECONDS );
            // Mark the lead so we never email about it again.
            $leads[ $index ]['notified_at'] = current_time( 'mysql' );
            $this->save_local_leads( $leads );
        }
    }

    /**
     * Without this, every __()/_e()/esc_html__() call in the plugin resolves
     * to its English fallback regardless of site language — WordPress has no
     * other way to find this plugin's .mo files.
     */
    public function load_textdomain() {
        load_plugin_textdomain( 'studiometa-voice-ai', false, dirname( plugin_basename( SMVA_PATH . 'studiometa-voice-ai.php' ) ) . '/languages' );
    }

    private function __construct() {
        add_action( 'init',                  array( $this, 'load_textdomain' ) );
        add_action( 'admin_menu',            array( $this, 'admin_menu' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'admin_assets' ) );
        add_action( 'wp_enqueue_scripts',    array( $this, 'widget_assets' ) );
        add_action( 'wp_footer',             array( $this, 'inject_widget' ) );
        add_shortcode( 'smva_widget',        array( $this, 'render_widget_shortcode' ) );
        add_action( 'admin_notices',         array( $this, 'maybe_trial_notice' ) );
        add_action( 'admin_notices',         array( $this, 'maybe_review_notice' ) );

        // Existing-license maintenance hook: refreshes quota/settings without starting a trial automatically.
        add_action( 'admin_init',            array( $this, 'maybe_retry_trial_activation' ) );

        // AJAX — admin only
        add_action( 'wp_ajax_smva_activate_license',   array( $this, 'ajax_activate' ) );
        add_action( 'wp_ajax_smva_deactivate_license', array( $this, 'ajax_deactivate' ) );
        add_action( 'wp_ajax_smva_save_settings',      array( $this, 'ajax_save_settings' ) );
        add_action( 'wp_ajax_smva_save_agent',         array( $this, 'ajax_save_agent' ) );
        add_action( 'wp_ajax_smva_crawl_site',         array( $this, 'ajax_crawl_site' ) );
        add_action( 'wp_ajax_smva_list_content',       array( $this, 'ajax_list_content' ) );
        add_action( 'wp_ajax_smva_build_kb_from_pages', array( $this, 'ajax_build_kb_from_pages' ) );
        add_action( 'wp_ajax_smva_optimize_agent',     array( $this, 'ajax_optimize_agent' ) );
        add_action( 'wp_ajax_smva_auto_train',         array( $this, 'ajax_auto_train' ) );
        add_action( 'wp_ajax_smva_refresh_quota',      array( $this, 'ajax_refresh_quota' ) );
        add_action( 'wp_ajax_smva_tts_preview',        array( $this, 'ajax_tts_preview' ) );
        add_action( 'wp_ajax_smva_get_voices',         array( $this, 'ajax_get_voices' ) );
        add_action( 'wp_ajax_smva_get_agent_tools',    array( $this, 'ajax_get_agent_tools' ) );
        add_action( 'wp_ajax_smva_get_plans',          array( $this, 'ajax_get_plans' ) );
        add_action( 'wp_ajax_smva_chat_history',       array( $this, 'ajax_chat_history' ) );
        add_action( 'wp_ajax_smva_stripe_checkout',    array( $this, 'ajax_stripe_checkout' ) );
        add_action( 'wp_ajax_smva_poll_new_license',   array( $this, 'ajax_poll_new_license' ) );
        add_action( 'wp_ajax_smva_manage_subscription', array( $this, 'ajax_manage_subscription' ) );
        add_action( 'wp_ajax_smva_dismiss_trial_notice', array( $this, 'ajax_dismiss_trial_notice' ) );
        add_action( 'wp_ajax_smva_dismiss_review_notice', array( $this, 'ajax_dismiss_review_notice' ) );
        add_action( 'wp_ajax_smva_start_trial', array( $this, 'ajax_start_trial' ) );
        add_action( 'wp_ajax_smva_get_leads',   array( $this, 'ajax_get_leads' ) );
        add_action( 'wp_ajax_smva_delete_lead', array( $this, 'ajax_delete_lead' ) );
        add_action( 'wp_ajax_smva_capture_lead_fragment', array( $this, 'ajax_capture_lead_fragment' ) );
        add_action( 'wp_ajax_nopriv_smva_capture_lead_fragment', array( $this, 'ajax_capture_lead_fragment' ) );
        add_action( 'wp_ajax_smva_capture_lead', array( $this, 'ajax_capture_lead' ) );
        add_action( 'wp_ajax_nopriv_smva_capture_lead', array( $this, 'ajax_capture_lead' ) );

        // Back-compat: any lead-notification events still queued on older installs
        // are handled synchronously here so they don't get lost after the upgrade.
        add_action( 'smva_lead_notify_event', array( $this, 'maybe_notify_owner_of_lead' ) );
        add_action( 'wp_ajax_smva_reactivate_here',     array( $this, 'ajax_reactivate_here' ) );
        add_action( 'wp_ajax_smva_health_check',       array( $this, 'ajax_health_check' ) );
        add_action( 'wp_ajax_smva_get_event_logs',     array( $this, 'ajax_get_event_logs' ) );
        add_action( 'wp_ajax_smva_clear_event_logs',   array( $this, 'ajax_clear_event_logs' ) );

        // AJAX — public (widget quota check)
        add_action( 'wp_ajax_nopriv_smva_widget_quota', array( $this, 'ajax_widget_quota' ) );
        add_action( 'wp_ajax_smva_widget_quota',        array( $this, 'ajax_widget_quota' ) );
        add_action( 'wp_ajax_smva_voice_sessions',   array( $this, 'ajax_voice_sessions' ) );
        add_action( 'wp_ajax_smva_voice_transcript', array( $this, 'ajax_voice_transcript' ) );
        add_action( 'wp_ajax_smva_voice_summarize',  array( $this, 'ajax_voice_summarize' ) );
        add_action( 'wp_ajax_smva_voice_recording_url', array( $this, 'ajax_voice_recording_url' ) );
        add_action( 'wp_ajax_smva_voice_recording_proxy', array( $this, 'ajax_voice_recording_proxy' ) );

        // ── Knowledge Base Upload ────────────────────────────────────────────
        add_action( 'wp_ajax_smva_upload_knowledge_file', array( $this, 'ajax_upload_knowledge_file' ) );

        // ── HubSpot Integration ──────────────────────────────────────────────
        add_action( 'wp_ajax_smva_hubspot_save_token', array( $this, 'ajax_hubspot_save_token' ) );
        add_action( 'wp_ajax_smva_hubspot_disconnect', array( $this, 'ajax_hubspot_disconnect' ) );
        add_action( 'wp_ajax_smva_phone_connect',      array( $this, 'ajax_phone_connect' ) );
        add_action( 'wp_ajax_smva_phone_disconnect',   array( $this, 'ajax_phone_disconnect' ) );
        add_action( 'wp_ajax_smva_save_transfer',      array( $this, 'ajax_save_transfer' ) );
        add_action( 'wp_ajax_smva_hubspot_status',     array( $this, 'ajax_hubspot_status' ) );

        // Appointments
        add_action( 'wp_ajax_smva_booking_get_config',      array( $this, 'ajax_booking_get_config' ) );
        add_action( 'wp_ajax_smva_booking_save_config',     array( $this, 'ajax_booking_save_config' ) );
        add_action( 'wp_ajax_smva_info_docs_get',           array( $this, 'ajax_info_docs_get' ) );
        add_action( 'wp_ajax_smva_info_docs_save',          array( $this, 'ajax_info_docs_save' ) );
        add_action( 'wp_ajax_smva_booking_slots',           array( $this, 'ajax_booking_slots' ) );
        add_action( 'wp_ajax_smva_calendar_status',         array( $this, 'ajax_calendar_status' ) );
        add_action( 'wp_ajax_smva_calendar_connect_url',    array( $this, 'ajax_calendar_connect_url' ) );
        add_action( 'wp_ajax_smva_calendar_disconnect',     array( $this, 'ajax_calendar_disconnect' ) );
    }

    // ── Activation / Auto-Trial ─────────────────────────────────────────────

    public static function activate() {
        // Defaults
        add_option( 'smva_license_key', '' );
        add_option( 'smva_internal_token', '' );
        add_option( 'smva_plan', '' );
        add_option( 'smva_widget_color', '#2563eb' );
        add_option( 'smva_widget_position', 'bottom-right' );
        add_option( 'smva_widget_style', 'fab' );
        add_option( 'smva_default_tab', 'voice' );
        add_option( 'smva_lang', 'en' );
        add_option( 'smva_extra_langs', '[]' );
        add_option( 'smva_greeting', 'Hello! How can I help you?' );
        add_option( 'smva_business_name', get_bloginfo( 'name' ) );
        add_option( 'smva_voice_enabled', '1' );
        add_option( 'smva_chat_enabled', '1' );
        add_option( 'smva_suggested_questions', '[]' );
        add_option( 'smva_max_call_duration', 10 );
        add_option( 'smva_silence_timeout', 60 );
        add_option( 'smva_call_cooldown', 30 );
        add_option( 'smva_display_mode', 'sitewide' );
        add_option( 'smva_lazy_load_widget', '1' );
        add_option( 'smva_debug_events', '1' );

        // Lead notification email (on by default; recipient falls back to admin_email when blank)
        add_option( 'smva_lead_email_notify', '1' );
        add_option( 'smva_lead_email_to', '' );
        add_option( 'smva_workflow_buttons', wp_json_encode( array(
            array( 'label' => 'Book Appointment', 'message' => 'I would like to book an appointment.' ),
            array( 'label' => 'Request Callback', 'message' => 'Please help me request a callback.' ),
            array( 'label' => 'Ask About Services', 'message' => 'Can you tell me about your services?' ),
        ) ) );
        add_option( 'smva_event_logs', array() );

        // Appointments. Off by default: a site that has not set its hours must
        // not have an agent offering 9-5 on its behalf. Both are local mirrors
        // of the backend, which owns the real working hours.
        add_option( 'smva_booking_enabled', '0' );
        add_option( 'smva_booking_config', '' );
        add_option( 'smva_info_documents', '[]' );
        add_option( 'smva_caller_memory_enabled', '0' );

        // Trial state
        add_option( 'smva_trial_attempted', '0' );
        add_option( 'smva_trial_last_attempt', 0 );
        add_option( 'smva_trial_notice_dismissed', '0' );

        // Review-request notice state (shown once the install has been active a while)
        add_option( 'smva_review_notice_dismissed', '0' );
        add_option( 'smva_review_first_seen', 0 );
        add_option( 'smva_review_notice_next', 0 );

        // Site-replaced state (set when this site is auto-deactivated by another)
        add_option( 'smva_site_replaced_notice', '0' );
        add_option( 'smva_site_replaced_message', '' );

        // Do not call the licensing server during plugin activation.
        // Trial activation is started by the admin from the plugin page so external data sharing is explicit.
    }

    public static function deactivate() {
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        if ( ! empty( $license_key ) || ! empty( $internal_token ) ) {
            delete_transient( self::QUOTA_CACHE_KEY_PREFIX . md5( $license_key . '|' . $internal_token ) );
        }
        delete_transient( self::QUOTA_CACHE_KEY );
        // Reset sync flag so settings are re-synced from backend after reinstall
        delete_option( 'smva_synced_from_backend' );
    }

    /**
     * Generate stable site fingerprint. Used so re-installing the plugin
     * on the same site does NOT grant a fresh trial.
     */
    /**
     * Recursively sanitize a decoded JSON structure.
     *
     * json_decode() does not sanitize. Both the KEYS and the VALUES of the
     * decoded structure are attacker-controlled, as is its depth, so every
     * level is walked and cleaned. Non-scalar leaves are dropped, depth is
     * capped, and integer keys are preserved as integers so list arrays stay
     * lists.
     *
     * @param mixed $data  Decoded JSON data.
     * @param int   $depth Current recursion depth.
     * @return mixed Sanitized data.
     */
    private function sanitize_json_recursive( $data, $depth = 0 ) {
        if ( $depth > 10 ) {
            return '';
        }

        if ( is_array( $data ) ) {
            $clean = array();
            foreach ( $data as $key => $value ) {
                $clean_key = is_int( $key )
                    ? $key
                    : sanitize_key( (string) $key );
                if ( '' === $clean_key && ! is_int( $clean_key ) ) {
                    continue;
                }
                $clean[ $clean_key ] = $this->sanitize_json_recursive( $value, $depth + 1 );
            }
            return $clean;
        }

        if ( is_bool( $data ) || is_int( $data ) || is_float( $data ) ) {
            return $data;
        }

        if ( is_string( $data ) ) {
            return sanitize_textarea_field( $data );
        }

        // null, objects, resources, anything unexpected.
        return '';
    }

    /**
     * Stable, non-secret identifier for this site.
     *
     * Deliberately derived only from public site data. WordPress authentication
     * secrets (AUTH_KEY and friends) must never leave the site, so they are not
     * used here. This value is an identifier only - it carries no authority and
     * must not be treated as a shared secret by any consumer.
     */
    private function site_fingerprint() {
        $site_url    = get_site_url();
        $admin_email = get_option( 'admin_email', '' );
        return hash( 'sha256', $site_url . '|' . $admin_email );
    }

    /**
     * Call backend /plugin/license/trial-activate. Safe to call multiple times.
     * Backend is expected to return the SAME trial license for the same fingerprint.
     */
    public function auto_trial_activate() {
        // Already have a license token? Validate it's still active.
        // If valid → nothing to do. If invalid (site_replaced, expired, etc.) → re-activate.
        $existing_token = get_option( 'smva_internal_token', '' );
        if ( $existing_token ) {
            $license_key = get_option( 'smva_license_key', '' );
            if ( $license_key ) {
                $check = wp_remote_post( SMVA_API_URL . '/plugin/license/quota-status', array(
                    'headers' => array( 'Content-Type' => 'application/json' ),
                    'body'    => wp_json_encode( array(
                        'license_key'    => $license_key,
                        'internal_token' => $existing_token,
                        'plugin_version' => SMVA_VERSION,
                    ) ),
                    'timeout' => 5,
                ) );
                $check_code = is_wp_error( $check ) ? 0 : wp_remote_retrieve_response_code( $check );
                // 200 = still valid, update quota cache and return
                if ( $check_code === 200 ) {
                    $quota_data = json_decode( wp_remote_retrieve_body( $check ), true );
                    if ( ! empty( $quota_data ) && empty( $quota_data['error'] ) ) {
                        $this->set_quota_cache( $quota_data );
                    }
                    return true;
                }
                // Token invalid/expired/replaced — clear and re-activate
                update_option( 'smva_internal_token', '' );
                update_option( 'smva_license_key', '' );
                update_option( 'smva_plan', '' );
                update_option( 'smva_trial_attempted', '0' );
            } else {
                update_option( 'smva_internal_token', '' );
                update_option( 'smva_license_key', '' );
                update_option( 'smva_plan', '' );
                update_option( 'smva_trial_attempted', '0' );
            }
        }

        update_option( 'smva_trial_last_attempt', time() );

        $response = wp_remote_post( SMVA_API_URL . '/plugin/license/trial-activate', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'site_url'         => get_site_url(),
                'admin_email'      => get_option( 'admin_email', '' ),
                'business_name'    => get_bloginfo( 'name' ),
                'site_fingerprint' => $this->site_fingerprint(),
                'wp_version'       => get_bloginfo( 'version' ),
                'plugin_version'   => SMVA_VERSION,
                'language'         => get_option( 'smva_lang', 'en' ),
            ) ),
            'timeout' => 15,
        ) );

        if ( is_wp_error( $response ) ) {
            return array(
                'success' => false,
                'error'   => 'connection_error',
                'message' => 'Could not reach the licensing server. Please try again.',
            );
        }

        $code = wp_remote_retrieve_response_code( $response );
        $data = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code !== 200 || empty( $data['internal_token'] ) ) {
            return array(
                'success' => false,
                'error'   => $data['error'] ?? 'activation_failed',
                'message' => $data['message'] ?? 'Could not activate trial.',
            );
        }

        update_option( 'smva_license_key',    $data['license_key'] ?? '' );
        update_option( 'smva_internal_token', $data['internal_token'] );
        update_option( 'smva_plan',           $data['plan'] ?? 'trial' );
        update_option( 'smva_trial_attempted', '1' );

        // Seed quota cache from response if provided
        if ( ! empty( $data['quota'] ) ) {
            $this->set_quota_cache( array(
                'voice_minutes_used'  => 0,
                'voice_minutes_limit' => intval( $data['quota']['voice_minutes'] ?? SMVA_TRIAL_VOICE_MINUTES ),
                'chat_messages_used'  => 0,
                'chat_messages_limit' => intval( $data['quota']['chat_messages'] ?? SMVA_TRIAL_CHAT_MESSAGES ),
                'plan'                => $data['plan'] ?? 'trial',
                'voice_available'     => true,
                'chat_available'      => true,
                'expires_at'          => $data['expires_at'] ?? null,
            ) );
        }

        // Fire welcome email via n8n (best-effort, non-blocking)
        $this->fire_webhook( SMVA_N8N_ACTIVATED, array(
            'event'     => 'license_activated',
            'email'     => get_option( 'admin_email', '' ),
            'name'      => get_bloginfo( 'name' ),
            'site_url'  => get_site_url(),
            'plan'      => $data['plan'] ?? 'trial',
        ) );

        return true;
    }

    /**
     * Sync language, suggested_questions, and other agent settings from backend.
     * Called after reinstall to restore settings that were stored only in WP options.
     */
    private function sync_settings_from_backend() {
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        if ( empty( $license_key ) || empty( $internal_token ) ) return;

        $r = wp_remote_post( SMVA_API_URL . '/plugin/license/agent/get', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'license_key'    => $license_key,
                'internal_token' => $internal_token,
            ) ),
            'timeout' => 10,
        ) );

        if ( is_wp_error( $r ) ) return;
        $agent = json_decode( wp_remote_retrieve_body( $r ), true );
        if ( empty( $agent ) || ! is_array( $agent ) ) return;

        // Restore language
        if ( ! empty( $agent['language'] ) ) {
            update_option( 'smva_lang', $agent['language'] );
        }

        // Restore extra languages
        if ( isset( $agent['extra_langs'] ) && is_array( $agent['extra_langs'] ) ) {
            update_option( 'smva_extra_langs', wp_json_encode( $agent['extra_langs'] ) );
        }

        // Restore suggested questions
        if ( isset( $agent['suggested_questions'] ) ) {
            $sq = $agent['suggested_questions'];
            if ( is_array( $sq ) ) {
                update_option( 'smva_suggested_questions', wp_json_encode( $sq ) );
            } elseif ( is_string( $sq ) && ! empty( $sq ) ) {
                update_option( 'smva_suggested_questions', $sq );
            }
        }

        // Restore greeting
        if ( ! empty( $agent['first_message'] ) ) {
            update_option( 'smva_greeting', $agent['first_message'] );
        }

        // Restore agent identity settings
        if ( ! empty( $agent['agent_name'] ) ) {
            update_option( 'smva_agent_name', $agent['agent_name'] );
        }
        if ( ! empty( $agent['voice_id'] ) ) {
            update_option( 'smva_voice_id', $agent['voice_id'] );
        }
        if ( ! empty( $agent['agent_timezone'] ) ) {
            update_option( 'smva_agent_timezone', $agent['agent_timezone'] );
        }
        if ( ! empty( $agent['response_style'] ) ) {
            update_option( 'smva_response_style', $agent['response_style'] );
        }
        if ( ! empty( $agent['webhook_url'] ) ) {
            update_option( 'smva_webhook_url', $agent['webhook_url'] );
        }
        if ( ! empty( $agent['widget_position'] ) ) {
            update_option( 'smva_widget_position', $agent['widget_position'] );
        }
        if ( ! empty( $agent['widget_style'] ) ) {
            update_option( 'smva_widget_style', $agent['widget_style'] );
        }
        if ( ! empty( $agent['primary_color'] ) ) {
            update_option( 'smva_widget_color', $agent['primary_color'] );
        }

        // Mark as synced
        update_option( 'smva_synced_from_backend', '1' );
    }

    public function maybe_retry_trial_activation() {
        // If we have a token, just make sure quota cache is fresh
        if ( get_option( 'smva_internal_token', '' ) ) {
            // Refresh quota cache if it's empty (e.g. after reinstall)
            $cached = get_transient( $this->quota_cache_key() );
            if ( empty( $cached ) ) {
                $this->get_quota_status( true ); // force refresh
            }
            // Sync settings from backend if not done yet (e.g. after reinstall)
            if ( get_option( 'smva_synced_from_backend', '0' ) !== '1' ) {
                $this->sync_settings_from_backend();
            }
            return;
        }
        // No token yet: wait for an explicit admin action to start the free trial.
        return;
    }

    /**
     * Fire-and-forget webhook call (does not block).
     */
    private function fire_webhook( $url, $payload ) {
        if ( empty( $url ) ) return;
        wp_remote_post( $url, array(
            'headers'  => array( 'Content-Type' => 'application/json' ),
            'body'     => wp_json_encode( $payload ),
            'timeout'  => 3,
            'blocking' => false,
        ) );
    }

    // ── Admin Notices ───────────────────────────────────────────────────────

    public function maybe_trial_notice() {
        if ( ! current_user_can( 'manage_options' ) ) return;

        // ── Site replaced notice (highest priority) ──
        if ( get_option( 'smva_site_replaced_notice', '0' ) === '1' ) {
            $msg = get_option( 'smva_site_replaced_message', '' );
            ?>
            <div class="notice notice-error" style="border-left-color:#dc2626">
                <p>
                    <strong>⚠ StudioMeta AI: Widget disabled on this site</strong><br>
                    <?php echo esc_html( $msg ?: 'This license is now active on a different site. The widget has been disabled here.' ); ?>
                </p>
                <p>
                    <button id="smva-reactivate-here-btn" class="button button-primary">Reactivate on this site</button>
                    <a href="<?php echo esc_url( SMVA_PRICING_URL ); ?>" target="_blank" class="button">Buy another license</a>
                    <span id="smva-reactivate-msg" style="margin-left:10px;font-style:italic;color:#6b7280"></span>
                </p>
            </div>

            <?php
            return; // Don't show trial notice on top
        }

        if ( get_option( 'smva_trial_notice_dismissed', '0' ) === '1' ) return;

        $plan = get_option( 'smva_plan', '' );
        if ( $plan !== 'trial' ) return;

        $quota = $this->get_quota_status();
        if ( empty( $quota ) || ! empty( $quota['error'] ) ) return;

        $voice_left = max( 0, ( $quota['voice_minutes_limit'] ?? 0 ) - ( $quota['voice_minutes_used'] ?? 0 ) );
        $chat_left  = max( 0, ( $quota['chat_messages_limit'] ?? 0 ) - ( $quota['chat_messages_used'] ?? 0 ) );
        ?>
        <div class="notice notice-info is-dismissible" id="smva-trial-notice" style="border-left-color:#2563eb">
            <p>
                <strong>🎉 StudioMeta AI Trial Active</strong> —
                You have <strong><?php echo number_format( $voice_left, 1 ); ?> voice minutes</strong>
                and <strong><?php echo intval( $chat_left ); ?> chat messages</strong> remaining.
                <a href="<?php echo esc_url( admin_url( 'admin.php?page=smva&tab=license' ) ); ?>" class="button button-primary" style="margin-left:8px">⬆ Upgrade Plan</a>
            </p>

        </div>
        <?php
    }

    public function ajax_dismiss_trial_notice() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();
        update_option( 'smva_trial_notice_dismissed', '1' );
        wp_send_json_success();
    }

    /**
     * Gentle, one-time "leave a review" nudge in the admin.
     *
     * Only shown to admins of an active install, and only after the install
     * has been active for a while (so we never ask someone who just installed
     * the plugin). It never stacks on the site-replaced error, and it can be
     * snoozed (remind later) or dismissed for good.
     */
    public function maybe_review_notice() {
        if ( ! current_user_can( 'manage_options' ) ) return;

        // Only ask active installs, and never on top of the site-replaced error.
        if ( empty( get_option( 'smva_internal_token', '' ) ) ) return;
        if ( get_option( 'smva_site_replaced_notice', '0' ) === '1' ) return;
        if ( get_option( 'smva_review_notice_dismissed', '0' ) === '1' ) return;

        // Anchor the countdown the first time we see this install active
        // (also covers installs that predate this feature).
        $first_seen = (int) get_option( 'smva_review_first_seen', 0 );
        if ( $first_seen <= 0 ) {
            $first_seen = time();
            update_option( 'smva_review_first_seen', $first_seen, false );
        }

        $snooze_until = (int) get_option( 'smva_review_notice_next', 0 );
        $due          = $snooze_until > 0 ? $snooze_until : ( $first_seen + ( 7 * DAY_IN_SECONDS ) );
        if ( time() < $due ) return;

        $review_url = 'https://wordpress.org/support/plugin/studiometa-voice-ai/reviews/#new-post';
        ?>
        <div class="notice notice-info is-dismissible" id="smva-review-notice" style="border-left-color:#f59e0b">
            <p>
                <strong>⭐ Enjoying StudioMeta Voice AI?</strong>
                If the widget is helping your visitors, a quick five-star review would mean a lot — and it helps other site owners discover it.
            </p>
            <p>
                <a href="<?php echo esc_url( $review_url ); ?>" target="_blank" rel="noopener" class="button button-primary" id="smva-review-yes">★ Leave a 5-star review</a>
                <button type="button" class="button" id="smva-review-done">I already did</button>
                <span style="margin-left:6px;color:#6b7280;font-style:italic">or dismiss to be reminded later</span>
            </p>
        </div>
        <?php
    }

    public function ajax_dismiss_review_notice() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();
        $mode = isset( $_POST['mode'] ) ? sanitize_key( wp_unslash( $_POST['mode'] ) ) : 'later';
        if ( 'done' === $mode ) {
            // Clicked the review button or "I already did" — never ask again.
            update_option( 'smva_review_notice_dismissed', '1' );
        } else {
            // Plain dismiss (X) — remind again in a week.
            update_option( 'smva_review_notice_next', time() + ( 7 * DAY_IN_SECONDS ), false );
        }
        wp_send_json_success();
    }

    public function ajax_start_trial() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        if ( get_option( 'smva_internal_token', '' ) ) {
            wp_send_json_success( array( 'message' => 'Trial is already active.', 'reload' => true ) );
        }

        $result = $this->auto_trial_activate();

        // auto_trial_activate() signals success either as boolean true or as an
        // array with a truthy 'success' key — accept both, otherwise a genuinely
        // activated trial gets reported to the user as a connection failure.
        $succeeded = ( true === $result ) || ( is_array( $result ) && ! empty( $result['success'] ) );
        if ( $succeeded ) {
            wp_send_json_success( array( 'message' => '✓ Free trial activated.', 'reload' => true ) );
        }
        $error   = is_array( $result ) ? ( $result['error'] ?? '' ) : '';
        $message = is_array( $result ) ? ( $result['message'] ?? '' ) : '';
        if ( $error === 'trial_exists' ) {
            wp_send_json_error( array(
                'message' => '⚠️ A free trial has already been used for this domain. To continue, please <a href="' . esc_url( SMVA_PRICING_URL ) . '" target="_blank">purchase a plan</a> and enter your license key below.',
                'code'    => 'trial_exists',
            ) );
        }
        wp_send_json_error( array( 'message' => $message ?: 'Could not reach the licensing server. Please try again or enter a license key.' ) );
    }

    // ── Admin Menu ──────────────────────────────────────────────────────────

    public function admin_menu() {
        add_menu_page(
            'Voice AI',
            'Voice AI',
            'manage_options',
            'smva',
            array( $this, 'page_main' ),
            'dashicons-microphone',
            58
        );
    }

    public function admin_assets( $hook ) {
        if ( strpos( $hook, 'smva' ) === false ) return;
        wp_enqueue_media();
        wp_enqueue_style( 'smva-admin',  SMVA_URL . 'assets/admin.css', array(), SMVA_VERSION );
        // Hide WP footer and adjust layout on plugin page
        $screen = get_current_screen();
        if ( $screen && $screen->id === 'toplevel_page_smva' ) {
            wp_add_inline_style( 'smva-admin', '#wpfooter{display:none!important}#wpcontent{padding-bottom:0!important}' );
        }
        wp_enqueue_script( 'smva-admin', SMVA_URL . 'assets/admin.js',  array( 'jquery' ), SMVA_VERSION, true );
        $smva_admin_timezone = get_option( 'smva_agent_timezone', '' );
        if ( empty( $smva_admin_timezone ) ) {
            $smva_admin_timezone = wp_timezone_string();
        }
        wp_localize_script( 'smva-admin', 'smvaAdmin', array(
            'ajaxUrl'       => admin_url( 'admin-ajax.php' ),
            'nonce'         => esc_attr( wp_create_nonce( 'smva_nonce' ) ),
            'apiUrl'        => SMVA_API_URL,
            'pricingUrl'    => SMVA_PRICING_URL,
            'siteUrl'       => get_site_url(),
            'timezone'      => $smva_admin_timezone ?: 'UTC',
            'dateRangeDays' => 30,
            // The quota poller compares these to decide whether an upgrade has
            // landed and the page needs reloading. It guarded on window.smvaPlan
            // before, which was never assigned, so the check never fired.
            'plan'          => get_option( 'smva_plan', '' ),
            'engine'        => get_option( 'smva_engine', '' ),
            // admin.js resets a button's own label after every save/request —
            // without these, that reset would silently overwrite the translated
            // label PHP already rendered with a hardcoded English string.
            'i18n'          => array(
                'connectionError'          => __( 'Connection error.', 'studiometa-voice-ai' ),
                'saving'                   => __( 'Saving...', 'studiometa-voice-ai' ),
                'activate'                 => __( 'Activate', 'studiometa-voice-ai' ),
                'startFreeTrial'           => __( 'Start Free Trial', 'studiometa-voice-ai' ),
                'refresh'                  => __( 'Refresh', 'studiometa-voice-ai' ),
                'saveGeneralSettings'      => __( 'Save General Settings', 'studiometa-voice-ai' ),
                'saveWidgetSettings'       => __( 'Save Widget Settings', 'studiometa-voice-ai' ),
                'saveNotificationSettings' => __( 'Save Notification Settings', 'studiometa-voice-ai' ),
                'saveWebhookUrl'           => __( 'Save Webhook URL', 'studiometa-voice-ai' ),
                'saveQuickActionButtons'   => __( 'Save Quick Action Buttons', 'studiometa-voice-ai' ),
                'saveTool'                 => __( 'Save Tool', 'studiometa-voice-ai' ),
                'saveSyncTools'            => __( 'Save & Sync Tools', 'studiometa-voice-ai' ),
                'runCheck'                 => __( 'Run Check', 'studiometa-voice-ai' ),
                'infodocEmpty'             => __( 'Nothing yet. Until you add something, the agent will not offer to email anyone.', 'studiometa-voice-ai' ),
                'updateTool'               => __( 'Update Tool', 'studiometa-voice-ai' ),
                'selectArrow'              => __( 'Select →', 'studiometa-voice-ai' ),
                /* translators: %s: IANA timezone name, e.g. "America/Toronto" */
                'timezoneLabel'            => __( 'Timezone: %s', 'studiometa-voice-ai' ),
                /* translators: %d: number of days */
                'showingLastDays'          => __( 'Showing last %d days by default', 'studiometa-voice-ai' ),

                // Appointments -> the Address field, which means a different
                // thing per meeting type and is relabelled by admin.js as the
                // owner switches. PHP renders the resting label; every other
                // state comes from here, so without these the field would drop
                // back to English the moment it was touched.
                'apptAddress'              => __( 'Address', 'studiometa-voice-ai' ),
                'apptAddressPh'            => __( 'e.g. 12 High Street, Toronto', 'studiometa-voice-ai' ),
                'apptAddressHint'          => __( 'Required. This is what the agent tells the visitor and what goes on the calendar event.', 'studiometa-voice-ai' ),
                'apptJoinLink'             => __( 'Fallback joining link', 'studiometa-voice-ai' ),
                'apptJoinLinkPh'           => __( 'e.g. https://zoom.us/j/your-room', 'studiometa-voice-ai' ),
                'apptJoinLinkHint'         => __( 'Optional. With a calendar connected below, a Google Meet link is created per appointment and used instead of this.', 'studiometa-voice-ai' ),
                'apptLocation'             => __( 'Location', 'studiometa-voice-ai' ),
                'apptLocationPh'           => __( 'Not needed for phone appointments', 'studiometa-voice-ai' ),
                'apptLocationHint'         => __( 'Nothing to fill in — the business calls the visitor on the number they leave.', 'studiometa-voice-ai' ),
                'apptAddressRequired'      => __( 'Add the address visitors should come to, or change the meeting type.', 'studiometa-voice-ai' ),
                'saved'                    => __( 'Saved.', 'studiometa-voice-ai' ),
                'couldNotSave'             => __( 'Could not save.', 'studiometa-voice-ai' ),
                'networkErrorRetry'        => __( 'Network error. Please try again.', 'studiometa-voice-ai' ),
                'saveWorkingHours'         => __( 'Save Working Hours', 'studiometa-voice-ai' ),
            ),
        ) );
    }

    // ── Widget ──────────────────────────────────────────────────────────────

    public function widget_assets() {
        $token = get_option( 'smva_internal_token', '' );
        if ( empty( $token ) ) return;

        $display_mode = get_option( 'smva_display_mode', 'sitewide' );
        if ( $display_mode === 'shortcode' && ! is_singular() ) return;

        // Don't render widget if both voice & chat exhausted AND plan is trial
        $mode = $this->get_widget_mode();
        if ( $mode === 'hidden' ) return;

        wp_enqueue_script( 'smva-widget', SMVA_URL . 'assets/widget.js', array(), SMVA_VERSION, true );
    }

    /**
     * Determine widget mode based on quota availability.
     * Returns: 'full' | 'voice_only' | 'chat_only' | 'cta' | 'hidden'
     */
    private function get_widget_mode() {
        $voice_enabled = get_option( 'smva_voice_enabled', '1' ) === '1';
        $chat_enabled  = get_option( 'smva_chat_enabled', '1' ) === '1';

        if ( ! $voice_enabled && ! $chat_enabled ) return 'hidden';

        $quota = $this->get_quota_status();

        // If backend unavailable, assume everything is fine (graceful)
        if ( empty( $quota ) || ! empty( $quota['error'] ) ) {
            if ( $voice_enabled && $chat_enabled ) return 'full';
            if ( $voice_enabled ) return 'voice_only';
            if ( $chat_enabled )  return 'chat_only';
            return 'hidden';
        }

        $voice_ok = $voice_enabled && ! empty( $quota['voice_available'] );
        $chat_ok  = $chat_enabled  && ! empty( $quota['chat_available'] );

        if ( $voice_ok && $chat_ok )  return 'full';
        if ( $voice_ok && ! $chat_ok ) return 'voice_only';
        if ( ! $voice_ok && $chat_ok ) return 'chat_only';

        // Both exhausted → show CTA upgrade button
        return 'cta';
    }

    private function render_widget_bootstrap() {
        $token = get_option( 'smva_internal_token', '' );
        if ( empty( $token ) ) return '';

        $mode = $this->get_widget_mode();
        if ( $mode === 'hidden' ) return '';

        $quota    = $this->get_quota_status();
        $sq       = get_option( 'smva_suggested_questions', '[]' );
        $sq_arr   = json_decode( $sq, true );
        $wb       = json_decode( get_option( 'smva_workflow_buttons', '[]' ), true );

        wp_localize_script( 'smva-widget', 'smvaConfig', array(
            'pluginVersion'     => SMVA_VERSION,
            'internalToken'     => $token,
            'licenseKey'        => get_option( 'smva_license_key', '' ),
            'wsUrl'             => SMVA_WS_URL,
            'apiUrl'            => SMVA_API_URL,
            'ajaxUrl'           => admin_url( 'admin-ajax.php' ),
            'widgetNonce'       => wp_create_nonce( 'smva_widget_nonce' ),
            'pricingUrl'        => SMVA_PRICING_URL,
            'widgetMode'        => $mode,
            'plan'              => get_option( 'smva_plan', '' ),
            'quota'             => ( is_array( $quota ) && empty( $quota['error'] ) ) ? $quota : null,
            'primaryColor'      => get_option( 'smva_widget_color', '#2563eb' ),
            'position'          => get_option( 'smva_widget_position', 'bottom-right' ),
            'widgetStyle'       => get_option( 'smva_widget_style', 'fab' ),
            'widgetTheme'       => get_option( 'smva_widget_theme', 'classic' ),
            'agentLogo'         => esc_url( get_option( 'smva_agent_logo', '' ) ),
            'lang'              => get_option( 'smva_lang', 'en' ),
            'extraLangs'        => json_decode( get_option( 'smva_extra_langs', '[]' ), true ) ?: array(),
            'businessName'      => get_option( 'smva_business_name', '' ),
            'greeting'          => get_option( 'smva_greeting', 'Hello! How can I help you?' ),
            'defaultTab'        => get_option( 'smva_default_tab', 'voice' ),
            'voiceEnabled'      => get_option( 'smva_voice_enabled', '1' ) === '1',
            'chatEnabled'       => get_option( 'smva_chat_enabled', '1' ) === '1',
            'maxCallDuration'   => intval( get_option( 'smva_max_call_duration', 10 ) ),
            'silenceTimeout'    => intval( get_option( 'smva_silence_timeout', 60 ) ),
            'callCooldown'      => intval( get_option( 'smva_call_cooldown', 30 ) ),
            'suggestedQuestions' => is_array( $sq_arr ) ? $sq_arr : array(),
            'workflowButtons'   => is_array( $wb ) ? $wb : array(),
            'lazyLoadWidget'    => get_option( 'smva_lazy_load_widget', '1' ) === '1',
        ) );
        return '';
    }

    public function inject_widget() {
        if ( get_option( 'smva_display_mode', 'sitewide' ) === 'shortcode' ) return;
        echo $this->render_widget_bootstrap(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    }

    public function render_widget_shortcode() {
        return $this->render_widget_bootstrap();
    }

    // ── API / Cache Helpers ───────────────────────────────────────────────────

    private function quota_cache_key() {
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        if ( empty( $license_key ) && empty( $internal_token ) ) {
            return self::QUOTA_CACHE_KEY;
        }
        return self::QUOTA_CACHE_KEY_PREFIX . md5( $license_key . '|' . $internal_token );
    }

    /** Keyed like the quota cache, so activating a different licence busts it. */
    private function voice_cache_key() {
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        return self::VOICE_CACHE_KEY_PREFIX . md5( $license_key . '|' . $internal_token );
    }

    /**
     * Voice catalog for this licence's engine, fetched from the backend.
     *
     * Returns an empty array on any failure; callers fall back to the built-in
     * list. Fetching rather than hardcoding means adding a voice no longer
     * requires a plugin release and a WordPress.org review.
     */
    public function get_voice_catalog( $force_refresh = false ) {
        $creds = $this->get_api_credentials();
        if ( empty( $creds['license_key'] ) || empty( $creds['internal_token'] ) ) {
            return array();
        }

        $cache_key = $this->voice_cache_key();
        if ( ! $force_refresh ) {
            $cached = get_transient( $cache_key );
            if ( is_array( $cached ) ) {
                return $cached;
            }
        }

        $response = wp_remote_post( SMVA_API_URL . '/plugin/voices', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'license_key'    => $creds['license_key'],
                'internal_token' => $creds['internal_token'],
            ) ),
            'timeout' => 8,
        ) );

        if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
            return array();
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( ! is_array( $data ) || empty( $data['voices'] ) || ! is_array( $data['voices'] ) ) {
            return array();
        }

        $voices = array();
        foreach ( $data['voices'] as $voice ) {
            if ( empty( $voice['id'] ) ) {
                continue;
            }
            $voices[] = array(
                'id'            => sanitize_text_field( $voice['id'] ),
                'label'         => sanitize_text_field( $voice['label'] ?? $voice['id'] ),
                'gender'        => ( isset( $voice['gender'] ) && 'm' === $voice['gender'] ) ? 'm' : 'f',
                'tone'          => sanitize_text_field( $voice['tone'] ?? '' ),
                'best_for'      => sanitize_text_field( $voice['best_for'] ?? '' ),
                'preview_rate'  => sanitize_text_field( $voice['preview_rate'] ?? '1.00' ),
                'preview_pitch' => sanitize_text_field( $voice['preview_pitch'] ?? '1.00' ),
            );
        }
        if ( empty( $voices ) ) {
            return array();
        }

        $catalog = array(
            'voices'        => $voices,
            'engine_label'  => sanitize_text_field( $data['engine']['display_name'] ?? '' ),
            'engine_badge'  => sanitize_text_field( $data['engine']['badge'] ?? '' ),
            'default_voice' => sanitize_text_field( $data['default_voice'] ?? '' ),
            'current_voice' => sanitize_text_field( $data['current_voice'] ?? '' ),
            'remapped_from' => sanitize_text_field( $data['remapped_from'] ?? '' ),
        );

        set_transient( $cache_key, $catalog, self::VOICE_CACHE_TTL );
        return $catalog;
    }

    public function ajax_get_voices() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => 'Unauthorized' ), 403 );
        }
        $catalog = $this->get_voice_catalog( true );
        if ( empty( $catalog['voices'] ) ) {
            wp_send_json_error( array( 'message' => 'Could not load the voice list. Showing the built-in list instead.' ) );
        }
        wp_send_json_success( $catalog );
    }

    private function get_api_credentials() {
        return array(
            'license_key'    => get_option( 'smva_license_key', '' ),
            'internal_token' => get_option( 'smva_internal_token', '' ),
        );
    }

    private function api_post_json( $path, $payload, $timeout = 8 ) {
        return wp_remote_post( SMVA_API_URL . $path, array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( $payload ),
            'timeout' => $timeout,
        ) );
    }

    private function normalize_quota_payload( $data ) {
        $voice_used  = $data['voice_minutes_used']  ?? $data['usage']['voice_minutes_used']  ?? $data['usage']['voice_minutes']  ?? 0;
        $voice_limit = $data['voice_minutes_limit'] ?? $data['quota']['voice_minutes_limit'] ?? $data['quota']['voice_minutes'] ?? $data['usage']['voice_minutes_limit'] ?? 0;
        $chat_used   = $data['chat_messages_used']  ?? $data['usage']['chat_messages_used']  ?? $data['usage']['chat_messages']  ?? 0;
        $chat_limit  = $data['chat_messages_limit'] ?? $data['quota']['chat_messages_limit'] ?? $data['quota']['chat_messages'] ?? $data['usage']['chat_messages_limit'] ?? 0;

        return array(
            'voice_minutes_used'  => floatval( $voice_used ),
            'voice_minutes_limit' => intval( $voice_limit ),
            'voice_available'     => array_key_exists( 'voice_available', $data ) ? ! empty( $data['voice_available'] ) : ( intval( $voice_limit ) > 0 ? floatval( $voice_used ) < floatval( $voice_limit ) : false ),
            'chat_messages_used'  => intval( $chat_used ),
            'chat_messages_limit' => intval( $chat_limit ),
            'chat_available'      => array_key_exists( 'chat_available', $data ) ? ! empty( $data['chat_available'] ) : ( intval( $chat_limit ) > 0 ? intval( $chat_used ) < intval( $chat_limit ) : false ),
            'plan'                => sanitize_text_field( $data['plan'] ?? $data['license']['plan'] ?? get_option( 'smva_plan', '' ) ),
            // This array is the only gate through which backend fields reach the
            // plugin — anything not listed here is silently dropped.
            'engine'              => sanitize_text_field( $data['engine']['badge'] ?? get_option( 'smva_engine', '' ) ),
            'engine_label'        => sanitize_text_field( $data['engine']['display_name'] ?? get_option( 'smva_engine_label', '' ) ),
            'expires_at'          => $data['expires_at'] ?? $data['license']['expires_at'] ?? null,
        );
    }

    private function apply_quota_usage_to_dashboard( $dashboard, $quota ) {
        $dashboard['usage']    = is_array( $dashboard['usage'] ?? null ) ? $dashboard['usage'] : array();
        $dashboard['license']  = is_array( $dashboard['license'] ?? null ) ? $dashboard['license'] : array();
        $dashboard['recent_sessions'] = is_array( $dashboard['recent_sessions'] ?? null ) ? $dashboard['recent_sessions'] : array();
        $dashboard['daily_usage']     = is_array( $dashboard['daily_usage'] ?? null ) ? $dashboard['daily_usage'] : array();

        if ( is_array( $quota ) && empty( $quota['error'] ) ) {
            $dashboard['usage']['voice_minutes_used']  = floatval( $quota['voice_minutes_used'] ?? 0 );
            $dashboard['usage']['voice_minutes_limit'] = intval( $quota['voice_minutes_limit'] ?? 0 );
            $dashboard['usage']['voice_available']     = ! empty( $quota['voice_available'] );
            $dashboard['usage']['chat_messages_used']  = intval( $quota['chat_messages_used'] ?? 0 );
            $dashboard['usage']['chat_messages_limit'] = intval( $quota['chat_messages_limit'] ?? 0 );
            $dashboard['usage']['chat_available']      = ! empty( $quota['chat_available'] );
            if ( empty( $dashboard['license']['plan'] ) && ! empty( $quota['plan'] ) ) {
                $dashboard['license']['plan'] = $quota['plan'];
            }
            if ( empty( $dashboard['license']['expires_at'] ) && ! empty( $quota['expires_at'] ) ) {
                $dashboard['license']['expires_at'] = $quota['expires_at'];
            }
        }

        // The backend normally supplies days_remaining, but it is absent whenever
        // the dashboard endpoint is unreachable and we fall back to the quota
        // cache alone. Derive it from the expiry date so the figure can never
        // contradict the "Expires <date>" line rendered next to it.
        if ( ! isset( $dashboard['usage']['days_remaining'] ) ) {
            $expires_at = $dashboard['license']['expires_at'] ?? ( $quota['expires_at'] ?? '' );
            $expires_ts = $expires_at ? strtotime( $expires_at ) : false;
            if ( $expires_ts ) {
                $dashboard['usage']['days_remaining'] = max( 0, (int) ceil( ( $expires_ts - time() ) / DAY_IN_SECONDS ) );
            }
        }

        return $dashboard;
    }

    // ── Quota Status (cached) ───────────────────────────────────────────────

    /**
     * Get quota status with 5-minute transient cache.
     * Structure:
     *   array(
     *     'voice_minutes_used'  => float,
     *     'voice_minutes_limit' => int,
     *     'voice_available'     => bool,
     *     'chat_messages_used'  => int,
     *     'chat_messages_limit' => int,
     *     'chat_available'      => bool,
     *     'plan'                => string,
     *     'expires_at'          => string|null,
     *   )
     */
    public function get_quota_status( $force_refresh = false ) {
        if ( ! $force_refresh ) {
            $cached = get_transient( $this->quota_cache_key() );
            if ( is_array( $cached ) ) return $cached;
        }

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );

        if ( empty( $license_key ) || empty( $internal_token ) ) {
            return array( 'error' => 'No license' );
        }

        $response = wp_remote_post( SMVA_API_URL . '/plugin/license/quota-status', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'license_key'    => $license_key,
                'internal_token' => $internal_token,
                'plugin_version' => SMVA_VERSION,
            ) ),
            'timeout' => 8,
        ) );

        if ( is_wp_error( $response ) ) {
            return array( 'error' => 'Connection error' );
        }

        $code = wp_remote_retrieve_response_code( $response );
        $data = json_decode( wp_remote_retrieve_body( $response ), true );

        // ── Site has been auto-deactivated (license used elsewhere) ──
        // Backend returns HTTP 410 with code='site_replaced'.
        if ( $code === 410 ) {
            $detail = isset( $data['detail'] ) && is_array( $data['detail'] ) ? $data['detail'] : $data;
            $reason_code = $detail['code'] ?? 'site_replaced';

            if ( $reason_code === 'site_replaced' ) {
                // Mark site as replaced. Widget will hide. Admin notice will show.
                update_option( 'smva_site_replaced_notice', '1' );
                update_option( 'smva_site_replaced_message', sanitize_text_field(
                    $detail['message'] ?? 'This license is now active on a different site.'
                ) );
                // Also clear the internal_token so widget stops loading on frontend
                update_option( 'smva_internal_token', '' );
                $this->invalidate_quota_cache();
                return array( 'error' => 'site_replaced', 'message' => $detail['message'] ?? '' );
            }
        }

        // License deleted or invalid — clear local options so widget hides
        if ( $code === 401 || $code === 404 ) {
            $error_code = $data['code'] ?? $data['error'] ?? '';
            if ( in_array( $error_code, array( 'invalid_token', 'not_found' ), true ) ) {
                update_option( 'smva_license_key', '' );
                update_option( 'smva_internal_token', '' );
                update_option( 'smva_plan', '' );
                update_option( 'smva_trial_attempted', '0' );
                $this->invalidate_quota_cache();
                return array( 'error' => 'license_deleted', 'message' => 'This license has been removed.' );
            }
        }
        if ( $code !== 200 || ! is_array( $data ) ) {
            return array( 'error' => $data['error'] ?? 'API error ' . $code );
        }

        $normalized = $this->normalize_quota_payload( $data );

        // If plan upgraded in backend (e.g. user bought subscription),
        // sync local option so admin UI reflects it.
        if ( $normalized['plan'] && $normalized['plan'] !== get_option( 'smva_plan', '' ) ) {
            update_option( 'smva_plan', $normalized['plan'] );
            // Reset trial-notice if plan upgraded from trial → paid
            if ( $normalized['plan'] !== 'trial' ) {
                update_option( 'smva_trial_notice_dismissed', '0' );
            }
        }

        // Persist the engine so the badge still renders when the API is
        // unreachable, and drop the cached voice catalog when the tier changes —
        // the two engines share no voice names.
        if ( $normalized['engine'] && $normalized['engine'] !== get_option( 'smva_engine', '' ) ) {
            update_option( 'smva_engine', $normalized['engine'] );
            update_option( 'smva_engine_label', $normalized['engine_label'] );
            delete_transient( $this->voice_cache_key() );
        }

        $this->set_quota_cache( $normalized );
        return $normalized;
    }

    private function set_quota_cache( $data ) {
        set_transient( $this->quota_cache_key(), $data, self::QUOTA_CACHE_TTL );
        // Clean up legacy cache key if present.
        delete_transient( self::QUOTA_CACHE_KEY );
    }

    public function invalidate_quota_cache() {
        delete_transient( $this->quota_cache_key() );
        delete_transient( self::QUOTA_CACHE_KEY );
    }

    // ── AJAX: Refresh Quota (admin) ─────────────────────────────────────────

    public function ajax_refresh_quota() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();
        $quota = $this->get_quota_status( true );
        wp_send_json_success( $quota );
    }

    // ── AJAX: Reactivate this site (after being replaced by another) ────────

    public function ajax_reactivate_here() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $license_key = get_option( 'smva_license_key', '' );
        if ( empty( $license_key ) ) {
            wp_send_json_error( array( 'message' => 'No license key found. Please enter your license key manually.' ) );
        }

        // Clear old token so activation proceeds fresh
        update_option( 'smva_internal_token', '' );
        update_option( 'smva_site_replaced_notice', '0' );
        update_option( 'smva_site_replaced_message', '' );

        // Call activate with confirm_replace=true
        $response = wp_remote_post( SMVA_API_URL . '/plugin/license/activate', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'license_key'      => $license_key,
                'site_url'         => get_site_url(),
                'site_fingerprint' => $this->site_fingerprint(),
                'wp_version'       => get_bloginfo( 'version' ),
                'plugin_version'   => SMVA_VERSION,
                'confirm_replace'  => true,
            ) ),
            'timeout' => 15,
        ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => 'Connection error. Please try again.' ) );
        }

        $data   = json_decode( wp_remote_retrieve_body( $response ), true );
        $status = wp_remote_retrieve_response_code( $response );

        if ( $status === 200 && ! empty( $data['activated'] ) ) {
            update_option( 'smva_internal_token', $data['internal_token'] ?? '' );
            update_option( 'smva_plan',           $data['plan'] ?? '' );
            $this->invalidate_quota_cache();
            wp_send_json_success( array( 'message' => '✓ Reactivated!' ) );
        } else {
            // Restore notice if failed
            update_option( 'smva_site_replaced_notice', '1' );
            wp_send_json_error( array(
                'message' => $data['message'] ?? 'Reactivation failed. Please try again.',
            ) );
        }
    }

    // ── AJAX: Widget Quota Check (public) ───────────────────────────────────
    //
    // Called by widget.js every few minutes to refresh quota without
    // reloading the page. Uses transient cache so backend is not hit
    // more than once per QUOTA_CACHE_TTL.

    public function ajax_widget_quota() {
        $this->check_public_rate_limit( 'widget_quota', 5 );
        $quota = $this->get_quota_status();
        if ( empty( $quota ) || ! empty( $quota['error'] ) ) {
            wp_send_json_error( array( 'message' => $quota['error'] ?? 'Unavailable' ) );
        }

        // Expose only what the widget needs (no secrets)
        wp_send_json_success( array(
            'voice_available' => ! empty( $quota['voice_available'] ),
            'chat_available'  => ! empty( $quota['chat_available'] ),
            'voice_used'      => floatval( $quota['voice_minutes_used']  ?? 0 ),
            'voice_limit'     => intval(   $quota['voice_minutes_limit'] ?? 0 ),
            'chat_used'       => intval(   $quota['chat_messages_used']  ?? 0 ),
            'chat_limit'      => intval(   $quota['chat_messages_limit'] ?? 0 ),
            'plan'            => sanitize_text_field( $quota['plan'] ?? '' ),
        ) );
    }


    // ── Health / Event Logs ──────────────────────────────────────────────────

    private function add_event_log( $type, $message, $context = array() ) {
        if ( get_option( 'smva_debug_events', '1' ) !== '1' ) { return; }
        $logs = get_option( 'smva_event_logs', array() );
        if ( ! is_array( $logs ) ) { $logs = array(); }
        array_unshift( $logs, array(
            'time'    => current_time( 'mysql' ),
            'type'    => sanitize_key( $type ),
            'message' => sanitize_text_field( $message ),
            'context' => array_map( 'sanitize_text_field', is_array( $context ) ? $context : array() ),
        ) );
        $logs = array_slice( $logs, 0, 50 );
        update_option( 'smva_event_logs', $logs, false );
    }

    public function ajax_get_event_logs() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();
        $logs = get_option( 'smva_event_logs', array() );
        wp_send_json_success( is_array( $logs ) ? $logs : array() );
    }

    public function ajax_clear_event_logs() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();
        update_option( 'smva_event_logs', array(), false );
        wp_send_json_success( array( 'message' => 'Logs cleared.' ) );
    }

    public function ajax_health_check() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $started = microtime( true );
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $result = array(
            'plugin' => array( 'ok' => true, 'label' => 'Plugin loaded', 'detail' => SMVA_VERSION ),
            'license' => array( 'ok' => ! empty( $internal_token ), 'label' => 'License token', 'detail' => empty( $internal_token ) ? 'Missing' : 'Present' ),
            'quota_api' => array( 'ok' => false, 'label' => 'License / Quota API', 'detail' => 'Not checked' ),
            'voice_ws' => array( 'ok' => ! empty( $internal_token ), 'label' => 'Voice WebSocket config', 'detail' => SMVA_WS_URL ),
            'site' => array( 'ok' => true, 'label' => 'WordPress site', 'detail' => get_site_url() ),
        );

        if ( $license_key && $internal_token ) {
            $r = wp_remote_post( SMVA_API_URL . '/plugin/license/quota-status', array(
                'headers' => array( 'Content-Type' => 'application/json' ),
                'body'    => wp_json_encode( array( 'license_key' => $license_key, 'internal_token' => $internal_token, 'plugin_version' => SMVA_VERSION ) ),
                'timeout' => 8,
            ) );
            if ( is_wp_error( $r ) ) {
                $result['quota_api']['detail'] = $r->get_error_message();
            } else {
                $code = wp_remote_retrieve_response_code( $r );
                $result['quota_api']['ok'] = ( $code >= 200 && $code < 300 );
                $result['quota_api']['detail'] = 'HTTP ' . $code . ' · ' . round( ( microtime( true ) - $started ) * 1000 ) . 'ms';
            }
        } else {
            $result['quota_api']['detail'] = 'No active license yet';
        }

        $this->add_event_log( 'health_check', 'Health check completed.', array( 'api' => $result['quota_api']['detail'] ) );
        wp_send_json_success( $result );
    }

    // ── Admin Page ──────────────────────────────────────────────────────────

    public function page_main() {
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $plan           = get_option( 'smva_plan', '' );
        $is_active      = ! empty( $internal_token );
        $is_trial       = ( $plan === 'trial' );
        // Read-only tab switch in admin page render — no state change, capability already enforced by add_menu_page().
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $active_tab     = isset( $_GET['tab'] ) ? sanitize_text_field( wp_unslash( $_GET['tab'] ) ) : ( $is_active ? 'dashboard' : 'license' );
        if ( $active_tab === 'settings' ) $active_tab = 'general';

        include SMVA_PATH . 'views/admin-page.php';
    }

    // ── AJAX: Activate License (manual paste by user) ───────────────────────

    public function ajax_activate() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();
        $key = sanitize_text_field( wp_unslash( $_POST['license_key'] ?? '' ) );
        if ( empty( $key ) ) wp_send_json_error( array( 'message' => 'License key required.' ) );

        $confirm_replace = isset( $_POST['confirm_replace'] ) && $_POST['confirm_replace'] === '1';

        $body = array(
            'license_key'      => $key,
            'site_url'         => get_site_url(),
            'admin_email'      => get_option( 'admin_email', '' ),
            'site_fingerprint' => $this->site_fingerprint(),
            'wp_version'       => get_bloginfo( 'version' ),
            'plugin_version'   => SMVA_VERSION,
            'confirm_replace'  => $confirm_replace,
        );

        $response = wp_remote_post( SMVA_API_URL . '/plugin/license/activate', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( $body ),
            'timeout' => 15,
        ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => 'Connection error. Please try again.' ) );
        }

        $data   = json_decode( wp_remote_retrieve_body( $response ), true );
        $status = wp_remote_retrieve_response_code( $response );

        // Backend says: license is active elsewhere — confirm with user first
        if ( $status === 200 && ! empty( $data['needs_confirmation'] ) ) {
            wp_send_json_success( array(
                'needs_confirmation'  => true,
                'current_active_site' => $data['current_active_site'] ?? '',
                'message'             => $data['message'] ?? '',
                'plan'                => $data['plan'] ?? '',
            ) );
        }

        // Normal success
        if ( $status === 200 && ! empty( $data['activated'] ) ) {
            update_option( 'smva_license_key',    $key );
            update_option( 'smva_internal_token', $data['internal_token'] ?? '' );
            update_option( 'smva_plan',           $data['plan'] ?? '' );
            update_option( 'smva_business_name',  $data['business_name'] ?? get_bloginfo( 'name' ) );
            update_option( 'smva_trial_notice_dismissed', '1' );
            update_option( 'smva_site_replaced_notice', '0' );  // clear if previously set
            delete_option( 'smva_synced_from_backend' ); // force re-sync to load settings from new license

            $this->invalidate_quota_cache();

            $this->fire_webhook( SMVA_N8N_ACTIVATED, array(
                'event'    => 'license_activated',
                'email'    => get_option( 'admin_email', '' ),
                'name'     => get_bloginfo( 'name' ),
                'site_url' => get_site_url(),
                'plan'     => $data['plan'] ?? '',
            ) );

            wp_send_json_success( array( 'message' => '✓ License activated!', 'reload' => true ) );
        } else {
            wp_send_json_error( array(
                'message' => $data['message'] ?? 'Invalid license key.',
                'code'    => $data['code'] ?? '',
            ) );
        }
    }

    // ── AJAX: Deactivate License ────────────────────────────────────────────

    public function ajax_deactivate() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();
        $key      = get_option( 'smva_license_key', '' );
        $site_url = get_site_url();

        wp_remote_post( SMVA_API_URL . '/plugin/license/deactivate', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array( 'license_key' => $key, 'site_url' => $site_url ) ),
            'timeout' => 10,
        ) );

        delete_option( 'smva_license_key' );
        delete_option( 'smva_internal_token' );
        delete_option( 'smva_plan' );
        $this->invalidate_quota_cache();

        wp_send_json_success( array( 'reload' => true ) );
    }

    // ── AJAX: Save Settings ─────────────────────────────────────────────────

    public function ajax_save_settings() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $fields = array(
            'smva_widget_color'      => 'smva_widget_color',
            'smva_widget_position'   => 'smva_widget_position',
            'smva_widget_style'      => 'smva_widget_style',
            'smva_default_tab'       => 'smva_default_tab',
            'smva_lang'              => 'smva_lang',
            'smva_greeting'          => 'smva_greeting',
            'smva_business_name'     => 'smva_business_name',
            'smva_widget_theme'      => 'smva_widget_theme',
            'smva_agent_logo'        => 'smva_agent_logo',
        'smva_max_call_duration' => 'smva_max_call_duration',
            'smva_silence_timeout'   => 'smva_silence_timeout',
            'smva_call_cooldown'     => 'smva_call_cooldown',
            'smva_lazy_load_widget'   => 'smva_lazy_load_widget',
            'smva_debug_events'       => 'smva_debug_events',
        );

        foreach ( $fields as $post_key => $option_key ) {
            if ( isset( $_POST[ $post_key ] ) ) {
                update_option( $option_key, sanitize_text_field( wp_unslash( $_POST[ $post_key ] ) ) );
            }
        }

        if ( isset( $_POST['smva_voice_enabled'] ) ) update_option( 'smva_voice_enabled', $_POST['smva_voice_enabled'] === '1' ? '1' : '0' );
        if ( isset( $_POST['smva_chat_enabled'] ) )  update_option( 'smva_chat_enabled',  $_POST['smva_chat_enabled']  === '1' ? '1' : '0' );
        if ( isset( $_POST['smva_lead_email_notify'] ) ) update_option( 'smva_lead_email_notify', $_POST['smva_lead_email_notify'] === '1' ? '1' : '0' );
        if ( isset( $_POST['smva_lead_email_to'] ) ) {
            $lead_to = sanitize_email( wp_unslash( $_POST['smva_lead_email_to'] ) );
            update_option( 'smva_lead_email_to', is_email( $lead_to ) ? $lead_to : '' );
        }

        // Sync language and greeting to backend agent
        $lic_key = get_option( 'smva_license_key', '' );
        $lic_tok = get_option( 'smva_internal_token', '' );
        if ( $lic_key && $lic_tok && isset( $_POST['smva_lang'] ) ) {
            wp_remote_post( SMVA_API_URL . '/plugin/license/agent/settings', array(
                'headers' => array( 'Content-Type' => 'application/json' ),
                'body'    => wp_json_encode( array(
                    'license_key'    => $lic_key,
                    'internal_token' => $lic_tok,
                    'language'       => sanitize_text_field( wp_unslash( $_POST['smva_lang'] ) ),
                ) ),
                'timeout' => 10,
            ) );
        }
        if ( isset( $_POST['smva_greeting'] ) ) {
            update_option( 'smva_greeting', sanitize_text_field( wp_unslash( $_POST['smva_greeting'] ) ) );
        }

        if ( isset( $_POST['smva_extra_langs'] ) ) {
            // JSON blob: decoded, then keys, values and nested structure are all
            // sanitized by sanitize_json_recursive() before use.
            $extra = $this->sanitize_json_recursive(
                json_decode( sanitize_textarea_field( wp_unslash( $_POST['smva_extra_langs'] ) ), true )
            );
            if ( is_array( $extra ) ) {
                update_option( 'smva_extra_langs', wp_json_encode( array_values( array_map( 'sanitize_text_field', $extra ) ) ) );
            }
        }

        if ( isset( $_POST['smva_workflow_buttons'] ) ) {
            $raw_buttons = sanitize_textarea_field( wp_unslash( $_POST['smva_workflow_buttons'] ) );
            $buttons = array();
            foreach ( preg_split( '/\r?\n/', $raw_buttons ) as $line ) {
                $line = trim( $line );
                if ( '' === $line ) { continue; }
                $parts = array_map( 'trim', explode( '|', $line, 2 ) );
                $buttons[] = array(
                    'label' => sanitize_text_field( $parts[0] ),
                    'message' => sanitize_text_field( $parts[1] ?? $parts[0] ),
                );
                if ( count( $buttons ) >= 6 ) { break; }
            }
            update_option( 'smva_workflow_buttons', wp_json_encode( $buttons ) );
        }

        $this->add_event_log( 'settings_saved', 'Plugin settings saved.' );
        wp_send_json_success( array( 'message' => 'Settings saved.' ) );
    }

    // ── AJAX: Save Agent Settings ───────────────────────────────────────────

    public function ajax_save_agent() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );

        if ( empty( $license_key ) || empty( $internal_token ) ) {
            wp_send_json_error( array( 'message' => 'License not active.' ) );
        }

        // Build payload — only include fields that were actually submitted
        $payload = array(
            'license_key'    => $license_key,
            'internal_token' => $internal_token,
        );

        $text_fields = array(
            'agent_name'     => 'agent_name',
            'first_message'  => 'first_message',
            'language'       => 'language',
            'voice_id'       => 'voice_id',
            'response_style' => 'response_style',
            'agent_timezone' => 'agent_timezone',
            'webhook_url'    => 'webhook_url',
        );
        foreach ( $text_fields as $post_key => $api_key ) {
            if ( isset( $_POST[ $post_key ] ) ) {
                $payload[ $api_key ] = sanitize_text_field( wp_unslash( $_POST[ $post_key ] ) );
            }
        }

        // Textarea fields
        $sp = $this->decode_b64_field( 'system_prompt' );
        if ( $sp !== null ) {
            $payload['system_prompt'] = sanitize_textarea_field( $sp );
        }
        $kb = $this->decode_b64_field( 'knowledge_base' );
        if ( $kb !== null ) {
            $payload['knowledge_base'] = sanitize_textarea_field( $kb );
        }

        // Only send agent_tools if explicitly provided (Automation tab only)
        // Extra languages
        if ( isset( $_POST['extra_langs'] ) ) {
            // JSON blob: decoded, then keys, values and nested structure are all
            // sanitized by sanitize_json_recursive() before use.
            $el = $this->sanitize_json_recursive(
                json_decode( sanitize_textarea_field( wp_unslash( $_POST['extra_langs'] ) ), true )
            );
            if ( is_array( $el ) ) {
                $payload['extra_langs'] = array_values( array_map( 'sanitize_text_field', $el ) );
            }
        }

        if ( isset( $_POST['agent_tools'] ) ) {
            // JSON blob: decoded, then keys, values and nested structure are all
            // sanitized by sanitize_json_recursive() before being forwarded.
            $tools_raw = $this->sanitize_json_recursive(
                json_decode( sanitize_textarea_field( wp_unslash( $_POST['agent_tools'] ) ), true )
            );
            if ( is_array( $tools_raw ) ) {
                $payload['agent_tools'] = array_values( array_filter( $tools_raw, 'is_array' ) );
            }
        }

        // Only send suggested_questions if explicitly provided (Agent tab only)
        if ( isset( $_POST['smva_suggested_questions'] ) ) {
            // Multi-line text input — split by newline, trimmed, and filtered below.
            // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
            $raw = wp_unslash( $_POST['smva_suggested_questions'] );
            $payload['suggested_questions'] = array_values( array_filter( array_map( 'sanitize_text_field', explode( "\n", $raw ) ) ) );
        }

        $response = wp_remote_post( SMVA_API_URL . '/plugin/license/agent/settings', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( $payload ),
            'timeout' => 15,
        ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => 'Connection error.' ) );
        }

        $data   = json_decode( wp_remote_retrieve_body( $response ), true );
        $status = wp_remote_retrieve_response_code( $response );

        if ( $status === 200 && ! empty( $data['updated'] ) ) {
            if ( isset( $_POST['smva_suggested_questions'] ) ) {
                // Multi-line input — each line sanitized via array_map( 'sanitize_text_field', ... ) below.
                // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
                $raw   = wp_unslash( $_POST['smva_suggested_questions'] );
                $lines = array_filter( array_map( 'sanitize_text_field', explode( "\n", $raw ) ) );
                update_option( 'smva_suggested_questions', wp_json_encode( array_values( $lines ) ) );
            }
            wp_send_json_success( array( 'message' => '✓ Agent settings saved!' ) );
        } else {
            wp_send_json_error( array( 'message' => $data['error'] ?? 'Failed to save.' ) );
        }
    }

    // ── AJAX: Crawl Site ────────────────────────────────────────────────────

    public function ajax_crawl_site() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $site_url_raw   = sanitize_text_field( $this->decode_b64_field( 'site_url' ) ?? get_site_url() );
        if ( ! empty( $site_url_raw ) && ! preg_match( '/^https?:\/\//i', $site_url_raw ) ) {
            $site_url_raw = 'https://' . $site_url_raw;
        }
        $site_url = $site_url_raw;

        $response = wp_remote_post( SMVA_API_URL . '/plugin/license/crawl-site', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array( 'license_key' => $license_key, 'internal_token' => $internal_token, 'site_url' => $site_url ) ),
            'timeout' => 75,
        ) );

        if ( is_wp_error( $response ) ) wp_send_json_error( array( 'message' => 'Connection error.' ) );

        $data   = json_decode( wp_remote_retrieve_body( $response ), true );
        $status = wp_remote_retrieve_response_code( $response );

        if ( $status === 200 && ! empty( $data['knowledge_base'] ) ) {
            wp_send_json_success( array( 'knowledge_base' => $data['knowledge_base'], 'pages_crawled' => $data['pages_crawled'] ?? 0 ) );
        } else {
            wp_send_json_error( array( 'message' => $data['error'] ?? 'Failed to crawl site.' ) );
        }
    }

    // ── AJAX: List site content for the KB page picker ──────────────────────

    /**
     * Return published content grouped by post type, for the "Select Pages"
     * picker. Titles and IDs only — bodies are fetched later, and only for the
     * pages the admin actually selects.
     */
    public function ajax_list_content() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $groups = array();
        $types  = get_post_types( array( 'public' => true ), 'objects' );

        foreach ( $types as $type ) {
            if ( 'attachment' === $type->name ) {
                continue;
            }

            $posts = get_posts( array(
                'post_type'        => $type->name,
                'post_status'      => 'publish',
                'numberposts'      => self::KB_PICKER_MAX_LISTED,
                'orderby'          => 'title',
                'order'            => 'ASC',
                'suppress_filters' => false,
            ) );

            if ( empty( $posts ) ) {
                continue;
            }

            $items = array();
            foreach ( $posts as $post ) {
                $items[] = array(
                    'id'    => absint( $post->ID ),
                    'title' => sanitize_text_field( $post->post_title ) ?: '(no title)',
                    'date'  => mysql2date( 'Y-m-d', $post->post_date ),
                );
            }

            $groups[] = array(
                'type'  => sanitize_key( $type->name ),
                'label' => sanitize_text_field( $type->labels->name ?? $type->name ),
                'items' => $items,
            );
        }

        wp_send_json_success( array( 'groups' => $groups ) );
    }

    // ── AJAX: Build knowledge base from selected pages ──────────────────────

    /**
     * Assemble a knowledge base blob from the specific posts/pages the admin
     * picked, read straight out of WordPress rather than crawled over HTTP.
     */
    public function ajax_build_kb_from_pages() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $ids = array();
        if ( isset( $_POST['post_ids'] ) ) {
            // JSON blob: decoded, then keys, values and nested structure are all
            // sanitized by sanitize_json_recursive() before use.
            $decoded = $this->sanitize_json_recursive(
                json_decode( sanitize_textarea_field( wp_unslash( $_POST['post_ids'] ) ), true )
            );
            if ( is_array( $decoded ) ) {
                $ids = array_values( array_filter( array_map( 'absint', $decoded ) ) );
            }
        }

        $ids = array_slice( array_unique( $ids ), 0, self::KB_PICKER_MAX_SELECTED );

        if ( empty( $ids ) ) {
            wp_send_json_error( array( 'message' => 'No pages selected.' ) );
        }

        $blocks = array();
        foreach ( $ids as $id ) {
            // Never let unpublished content reach a visitor-facing agent, even
            // though only administrators can reach this handler.
            if ( 'publish' !== get_post_status( $id ) ) {
                continue;
            }

            $raw = get_post_field( 'post_content', $id );
            // Running core's own `the_content` filter (not declaring a new hook —
            // the sniff misreads it) so shortcodes and page-builder output resolve
            // to the text a visitor would actually read. Page builders such as
            // Elementor render entirely through this filter, and their pages would
            // otherwise come back empty.
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
            $text = wp_strip_all_tags( apply_filters( 'the_content', $raw ) );
            $text = trim( preg_replace( '/\n{3,}/', "\n\n", $text ) );

            if ( '' === $text ) {
                continue;
            }

            if ( strlen( $text ) > self::KB_PICKER_MAX_CHARS_PER_PAGE ) {
                $text = substr( $text, 0, self::KB_PICKER_MAX_CHARS_PER_PAGE ) . '…';
            }

            $title    = get_the_title( $id ) ?: '(no title)';
            $blocks[] = '## ' . sanitize_text_field( $title ) . "\n\n" . $text;
        }

        if ( empty( $blocks ) ) {
            wp_send_json_error( array( 'message' => 'Selected pages have no readable content.' ) );
        }

        wp_send_json_success( array(
            'knowledge_base' => implode( "\n\n", $blocks ),
            'pages_used'     => count( $blocks ),
        ) );
    }

    // ── AJAX: Optimize Agent ────────────────────────────────────────────────

    public function ajax_optimize_agent() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );

        $response = wp_remote_post( SMVA_API_URL . '/plugin/license/optimize-agent', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'license_key'    => $license_key,
                'internal_token' => $internal_token,
                'system_prompt'  => sanitize_textarea_field( $this->decode_b64_field( 'system_prompt' ) ?? '' ),
                'knowledge_base' => sanitize_textarea_field( $this->decode_b64_field( 'knowledge_base' ) ?? '' ),
            ) ),
            'timeout' => 30,
        ) );

        if ( is_wp_error( $response ) ) wp_send_json_error( array( 'message' => 'Connection error.' ) );

        $data   = json_decode( wp_remote_retrieve_body( $response ), true );
        $status = wp_remote_retrieve_response_code( $response );

        if ( $status === 200 && ( ! empty( $data['system_prompt'] ) || ! empty( $data['knowledge_base'] ) ) ) {
            wp_send_json_success( $data );
        } else {
            wp_send_json_error( array( 'message' => $data['error'] ?? 'Failed to optimize.' ) );
        }
    }

    // ── AJAX: Auto-train Agent (crawl + optimize + suggest questions) ──────
    public function ajax_auto_train() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $site_url_raw   = sanitize_text_field( $this->decode_b64_field( 'site_url' ) ?? get_site_url() );
        if ( ! empty( $site_url_raw ) && ! preg_match( '/^https?:\/\//i', $site_url_raw ) ) {
            $site_url_raw = 'https://' . $site_url_raw;
        }
        $response = wp_remote_post( SMVA_API_URL . '/plugin/license/auto-train', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'license_key'    => $license_key,
                'internal_token' => $internal_token,
                'site_url'       => $site_url_raw,
            ) ),
            'timeout' => 120,
        ) );
        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => 'Connection error.' ) );
        }
        $data   = json_decode( wp_remote_retrieve_body( $response ), true );
        $status = wp_remote_retrieve_response_code( $response );
        if ( $status === 200 && is_array( $data ) ) {
            wp_send_json_success( array(
                'system_prompt'        => $data['system_prompt'] ?? '',
                'knowledge_base'       => $data['knowledge_base'] ?? '',
                'suggested_questions'  => is_array( $data['suggested_questions'] ?? null ) ? $data['suggested_questions'] : array(),
                'pages_crawled'        => intval( $data['pages_crawled'] ?? 0 ),
            ) );
        }
        wp_send_json_error( array( 'message' => $data['error'] ?? 'Auto-train failed.' ) );
    }

    // ── Dashboard Data ──────────────────────────────────────────────────────

    public function get_dashboard_data() {
        $creds = $this->get_api_credentials();

        if ( empty( $creds['license_key'] ) || empty( $creds['internal_token'] ) ) {
            return array( 'error' => 'License not configured.' );
        }

        $quota = $this->get_quota_status();

        $response = $this->api_post_json( '/plugin/license/dashboard', $creds, 10 );

        if ( is_wp_error( $response ) ) {
            if ( is_array( $quota ) && empty( $quota['error'] ) ) {
                return $this->apply_quota_usage_to_dashboard( array(), $quota );
            }
            return array( 'error' => 'Could not connect to API: ' . $response->get_error_message() );
        }

        $code = wp_remote_retrieve_response_code( $response );
        $data = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code !== 200 || empty( $data ) || ! is_array( $data ) ) {
            if ( is_array( $quota ) && empty( $quota['error'] ) ) {
                return $this->apply_quota_usage_to_dashboard( array(), $quota );
            }
            return array( 'error' => is_array( $data ) ? ( $data['error'] ?? 'API returned error ' . $code ) : 'API returned error ' . $code );
        }

        return $this->apply_quota_usage_to_dashboard( $data, $quota );
    }
    // ── AJAX: TTS Preview ───────────────────────────────────────────────────

    public function ajax_tts_preview() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $text           = sanitize_text_field( wp_unslash( $_POST['text']     ?? '' ) );
        $voice_id       = sanitize_text_field( wp_unslash( $_POST['voice_id'] ?? 'Aoede' ) );

        if ( empty( $license_key ) || empty( $internal_token ) || empty( $text ) ) {
            wp_send_json_error( array( 'message' => 'Missing parameters.' ) );
        }

        $response = wp_remote_post( SMVA_API_URL . '/plugin/tts/preview', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'license_key'    => $license_key,
                'internal_token' => $internal_token,
                'text'           => $text,
                'voice_id'       => $voice_id,
            ) ),
            'timeout' => 20,
        ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => $response->get_error_message() ) );
        }

        $body = wp_remote_retrieve_body( $response );
        $code = wp_remote_retrieve_response_code( $response );

        if ( $code === 429 ) {
            wp_send_json_error( array( 'message' => 'Too many preview requests. Please wait a moment.' ) );
        }
        if ( $code !== 200 ) {
            wp_send_json_error( array( 'message' => 'TTS API error.', 'code' => $code ) );
        }

        // Stream verified WAV audio back to browser. Do not escape binary audio bytes.
        if ( strlen( $body ) < 12 || 'RIFF' !== substr( $body, 0, 4 ) || 'WAVE' !== substr( $body, 8, 4 ) ) {
            wp_send_json_error( array( 'message' => 'Invalid TTS audio returned by API.' ) );
        }

        while ( ob_get_level() ) {
            ob_end_clean();
        }

        status_header( 200 );
        header( 'Content-Type: audio/wav' );
        header( 'Content-Length: ' . strlen( $body ) );
        header( 'Cache-Control: no-store, no-cache, must-revalidate, max-age=0' );
        header( 'Pragma: no-cache' );
        header( 'X-Content-Type-Options: nosniff' );

        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Binary WAV audio must be streamed unchanged.
        echo $body;
        exit;
    }


    // ── AJAX: Get Agent Tools (used before save to preserve tools) ──────────

    public function ajax_get_agent_tools() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );

        if ( empty( $license_key ) || empty( $internal_token ) ) {
            wp_send_json_success( array( 'agent_tools' => array() ) );
        }

        $r = wp_remote_post( SMVA_API_URL . '/plugin/license/agent/get', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'license_key'    => $license_key,
                'internal_token' => $internal_token,
            ) ),
            'timeout' => 10,
        ) );

        if ( is_wp_error( $r ) ) {
            wp_send_json_success( array( 'agent_tools' => array() ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $r ), true );
        $tools = $data['agent_tools'] ?? array();
        if ( ! is_array( $tools ) ) $tools = array();

        wp_send_json_success( array( 'agent_tools' => $tools ) );
    }


    // ── AJAX: Appointments ───────────────────────────────────────────────
    //
    // The backend holds the working hours — the availability engine reads them
    // there, and the agent answers from them mid-call. The options written here
    // are a mirror of the last successful save, so the tab renders instantly and
    // survives a backend blip; they are never the source of truth, and the
    // backend value always wins on load.

    public function ajax_booking_get_config() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $creds = $this->get_api_credentials();
        if ( empty( $creds['license_key'] ) || empty( $creds['internal_token'] ) ) {
            wp_send_json_error( array( 'message' => __( 'Activate your license first.', 'studiometa-voice-ai' ) ) );
        }

        $response = $this->api_post_json( '/plugin/booking/config', $creds, 10 );
        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => __( 'Connection error.', 'studiometa-voice-ai' ) ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( wp_remote_retrieve_response_code( $response ) !== 200 || ! is_array( $data ) ) {
            wp_send_json_error( array( 'message' => $data['error'] ?? __( 'Could not load your working hours.', 'studiometa-voice-ai' ) ) );
        }

        // Keep the local mirror in step with whatever the backend just told us.
        update_option( 'smva_booking_enabled', ! empty( $data['booking_enabled'] ) ? '1' : '0' );
        if ( isset( $data['booking_config'] ) && is_array( $data['booking_config'] ) ) {
            update_option( 'smva_booking_config', wp_json_encode( $data['booking_config'] ) );
        }

        wp_send_json_success( array(
            'booking_enabled' => ! empty( $data['booking_enabled'] ),
            'booking_config'  => is_array( $data['booking_config'] ?? null ) ? $data['booking_config'] : array(),
            'timezone'        => sanitize_text_field( $data['timezone'] ?? 'UTC' ),
        ) );
    }

    public function ajax_booking_save_config() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $creds = $this->get_api_credentials();
        if ( empty( $creds['license_key'] ) || empty( $creds['internal_token'] ) ) {
            wp_send_json_error( array( 'message' => __( 'Activate your license first.', 'studiometa-voice-ai' ) ) );
        }

        // Hard rule: every json_decode of POST data goes through
        // sanitize_json_recursive(). It also lowercases every key via
        // sanitize_key(), which is exactly why the backend schema is snake_case.
        $raw    = isset( $_POST['booking_config'] ) ? sanitize_textarea_field( wp_unslash( $_POST['booking_config'] ) ) : '';
        $config = $this->sanitize_json_recursive( json_decode( $raw, true ) );
        if ( ! is_array( $config ) ) {
            wp_send_json_error( array( 'message' => __( 'Invalid working hours.', 'studiometa-voice-ai' ) ) );
        }

        $enabled = isset( $_POST['booking_enabled'] ) && '1' === sanitize_text_field( wp_unslash( $_POST['booking_enabled'] ) );

        $response = $this->api_post_json( '/plugin/booking/config/save', array_merge( $creds, array(
            'booking_enabled' => $enabled,
            'booking_config'  => $config,
        ) ), 12 );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => __( 'Connection error.', 'studiometa-voice-ai' ) ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( wp_remote_retrieve_response_code( $response ) !== 200 || empty( $data['success'] ) ) {
            // The backend validates these hours because they decide what the
            // agent says out loud; surface its reason rather than a generic one.
            $detail = is_array( $data['details'] ?? null ) ? implode( '; ', array_map( 'sanitize_text_field', $data['details'] ) ) : '';
            wp_send_json_error( array(
                'message' => $data['error'] ?? __( 'Could not save your working hours.', 'studiometa-voice-ai' ),
                'details' => $detail,
            ) );
        }

        // Mirror only after the backend accepted, so the two cannot diverge.
        update_option( 'smva_booking_enabled', $enabled ? '1' : '0' );
        update_option( 'smva_booking_config', wp_json_encode( $data['booking_config'] ?? $config ) );

        wp_send_json_success( array(
            'booking_enabled' => $enabled,
            'booking_config'  => $data['booking_config'] ?? $config,
        ) );
    }

    // ── Email a caller, and returning-caller recall ──────────────────────────
    //
    // The backend holds the documents because it is what composes the email
    // mid-call and what decides whether the agent may say it sent anything.
    // The options written here mirror the last successful save so the tab
    // renders instantly; the backend value always wins on load.
    //
    // Both settings save in one call. The backend endpoint writes both columns
    // every time, so sending one without the other would silently clear it.

    public function ajax_info_docs_get() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $creds = $this->get_api_credentials();
        if ( empty( $creds['license_key'] ) || empty( $creds['internal_token'] ) ) {
            wp_send_json_error( array( 'message' => __( 'Activate your license first.', 'studiometa-voice-ai' ) ) );
        }

        $response = $this->api_post_json( '/plugin/info-documents', $creds, 10 );
        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => __( 'Connection error.', 'studiometa-voice-ai' ) ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( wp_remote_retrieve_response_code( $response ) !== 200 || ! is_array( $data ) ) {
            wp_send_json_error( array( 'message' => $data['error'] ?? __( 'Could not load your email settings.', 'studiometa-voice-ai' ) ) );
        }

        $docs = is_array( $data['info_documents'] ?? null ) ? $data['info_documents'] : array();
        update_option( 'smva_info_documents', wp_json_encode( $docs ) );
        update_option( 'smva_caller_memory_enabled', ! empty( $data['caller_memory_enabled'] ) ? '1' : '0' );

        wp_send_json_success( array(
            'info_documents'        => $docs,
            'caller_memory_enabled' => ! empty( $data['caller_memory_enabled'] ),
            // False means no delivery workflow is wired on the backend, which
            // the owner cannot fix from here — the tab says so rather than
            // letting them write documents that will never be sent.
            'email_delivery_available' => ! empty( $data['email_delivery_available'] ),
        ) );
    }

    public function ajax_info_docs_save() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $creds = $this->get_api_credentials();
        if ( empty( $creds['license_key'] ) || empty( $creds['internal_token'] ) ) {
            wp_send_json_error( array( 'message' => __( 'Activate your license first.', 'studiometa-voice-ai' ) ) );
        }

        // Hard rule: every json_decode of POST data goes through
        // sanitize_json_recursive(). It sanitizes every leaf with
        // sanitize_textarea_field(), which keeps the line breaks a price list
        // depends on and strips markup — the workflow escapes it again on the
        // way into the email.
        //
        // Deliberately NOT sanitized before decoding, unlike the booking
        // handler. Verified against this WordPress build: running
        // sanitize_textarea_field() over the raw JSON turns "<" into "&lt;",
        // strips anything tag-shaped, and mangles the surrounding quotes badly
        // enough that json_decode() fails outright with a control-character
        // error. Harmless for a config of times and numbers; fatal for a
        // document body, which legitimately contains "<" ("groups <10 people")
        // and would take the whole save down with it.
        //
        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Decoded below and every leaf sanitized by sanitize_json_recursive(); sanitizing the raw JSON first corrupts it (see above).
        $raw  = isset( $_POST['info_documents'] ) ? wp_unslash( $_POST['info_documents'] ) : '';
        $docs = $this->sanitize_json_recursive( json_decode( $raw, true ) );
        if ( ! is_array( $docs ) ) {
            wp_send_json_error( array( 'message' => __( 'Invalid documents.', 'studiometa-voice-ai' ) ) );
        }

        $memory = isset( $_POST['caller_memory_enabled'] ) && '1' === sanitize_text_field( wp_unslash( $_POST['caller_memory_enabled'] ) );

        $response = $this->api_post_json( '/plugin/info-documents/save', array_merge( $creds, array(
            'info_documents'        => $docs,
            'caller_memory_enabled' => $memory,
        ) ), 12 );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => __( 'Connection error.', 'studiometa-voice-ai' ) ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( wp_remote_retrieve_response_code( $response ) !== 200 || empty( $data['success'] ) ) {
            wp_send_json_error( array( 'message' => $data['error'] ?? __( 'Could not save your email settings.', 'studiometa-voice-ai' ) ) );
        }

        // Mirror only after the backend accepted, so the two cannot diverge.
        $saved = is_array( $data['info_documents'] ?? null ) ? $data['info_documents'] : $docs;
        update_option( 'smva_info_documents', wp_json_encode( $saved ) );
        update_option( 'smva_caller_memory_enabled', $memory ? '1' : '0' );

        wp_send_json_success( array(
            'info_documents'        => $saved,
            'caller_memory_enabled' => $memory,
        ) );
    }

    public function ajax_booking_slots() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $creds = $this->get_api_credentials();
        if ( empty( $creds['license_key'] ) || empty( $creds['internal_token'] ) ) {
            wp_send_json_error( array( 'message' => __( 'Activate your license first.', 'studiometa-voice-ai' ) ) );
        }

        $payload = array_merge( $creds, array( 'days' => 7 ) );

        // Only an explicit press of Refresh bypasses the backend's busy-time
        // cache. Without this the button could return a 90-second-old answer,
        // which reads as "the plugin ignores my calendar" to an owner who has
        // just blocked out an afternoon and pressed it to check.
        if ( ! empty( $_POST['refresh'] ) ) {
            $payload['refresh'] = true;
        }

        // An unsaved config previews the effect of an edit before committing it.
        if ( ! empty( $_POST['booking_config'] ) ) {
            $raw     = sanitize_textarea_field( wp_unslash( $_POST['booking_config'] ) );
            $preview = $this->sanitize_json_recursive( json_decode( $raw, true ) );
            if ( is_array( $preview ) ) {
                $payload['booking_config'] = $preview;
            }
        }

        $response = $this->api_post_json( '/plugin/booking/slots', $payload, 15 );
        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => __( 'Connection error.', 'studiometa-voice-ai' ) ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( wp_remote_retrieve_response_code( $response ) !== 200 || ! is_array( $data ) ) {
            wp_send_json_error( array( 'message' => $data['error'] ?? __( 'Could not calculate availability.', 'studiometa-voice-ai' ) ) );
        }

        wp_send_json_success( array(
            'timezone' => sanitize_text_field( $data['timezone'] ?? 'UTC' ),
            'total'    => intval( $data['total'] ?? 0 ),
            'days'     => is_array( $data['days'] ?? null ) ? $data['days'] : array(),
        ) );
    }

    public function ajax_calendar_status() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $creds = $this->get_api_credentials();
        if ( empty( $creds['license_key'] ) || empty( $creds['internal_token'] ) ) {
            wp_send_json_error( array( 'message' => __( 'Activate your license first.', 'studiometa-voice-ai' ) ) );
        }

        $response = $this->api_post_json( '/plugin/booking/calendar/status', $creds, 10 );
        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => __( 'Connection error.', 'studiometa-voice-ai' ) ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( ! is_array( $data ) ) {
            wp_send_json_error( array( 'message' => __( 'Could not read the calendar status.', 'studiometa-voice-ai' ) ) );
        }

        wp_send_json_success( array(
            'connected'     => ! empty( $data['connected'] ),
            'available'     => ! empty( $data['available'] ),
            'needs_reauth'  => ! empty( $data['needs_reauth'] ),
            'account_email' => sanitize_text_field( $data['account_email'] ?? '' ),
        ) );
    }

    /**
     * Mint the Google consent URL.
     *
     * The plugin never sees a client id or a secret — StudioMeta owns the OAuth
     * app, the backend signs a short-lived state, and this handler only relays
     * the URL for the browser to follow.
     */
    public function ajax_calendar_connect_url() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $creds = $this->get_api_credentials();
        if ( empty( $creds['license_key'] ) || empty( $creds['internal_token'] ) ) {
            wp_send_json_error( array( 'message' => __( 'Activate your license first.', 'studiometa-voice-ai' ) ) );
        }

        $response = $this->api_post_json( '/plugin/booking/calendar/connect-url', $creds, 10 );
        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => __( 'Connection error.', 'studiometa-voice-ai' ) ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        $url  = isset( $data['url'] ) ? esc_url_raw( $data['url'] ) : '';

        // Only ever send the browser to Google. A URL from anywhere else means
        // the response was not what we think it was.
        if ( ! $url || 0 !== strpos( $url, 'https://accounts.google.com/' ) ) {
            wp_send_json_error( array( 'message' => $data['error'] ?? __( 'Calendar connection is not available yet.', 'studiometa-voice-ai' ) ) );
        }

        wp_send_json_success( array( 'url' => $url ) );
    }

    public function ajax_calendar_disconnect() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $creds = $this->get_api_credentials();
        if ( empty( $creds['license_key'] ) || empty( $creds['internal_token'] ) ) {
            wp_send_json_error( array( 'message' => __( 'Activate your license first.', 'studiometa-voice-ai' ) ) );
        }

        $response = $this->api_post_json( '/plugin/booking/calendar/disconnect', $creds, 12 );
        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => __( 'Connection error.', 'studiometa-voice-ai' ) ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( empty( $data['success'] ) ) {
            wp_send_json_error( array( 'message' => $data['error'] ?? __( 'Could not disconnect the calendar.', 'studiometa-voice-ai' ) ) );
        }

        wp_send_json_success( array( 'disconnected' => ! empty( $data['disconnected'] ) ) );
    }


    // ── AJAX: Stripe Checkout ────────────────────────────────────────────

    public function ajax_stripe_checkout() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $plan_id        = sanitize_text_field( wp_unslash( $_POST['plan_id']      ?? '' ) );
        $success_url    = esc_url_raw( wp_unslash( $_POST['success_url'] ?? admin_url( 'admin.php?page=smva&tab=license&upgraded=1' ) ) );
        $cancel_url     = esc_url_raw( wp_unslash( $_POST['cancel_url']  ?? admin_url( 'admin.php?page=smva&tab=license' ) ) );

        if ( empty( $license_key ) || empty( $internal_token ) || empty( $plan_id ) ) {
            wp_send_json_error( array( 'message' => 'Missing parameters.' ) );
        }

        $response = wp_remote_post( SMVA_API_URL . '/stripe/checkout', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'license_key'    => $license_key,
                'internal_token' => $internal_token,
                'plan_id'        => $plan_id,
                'success_url'    => $success_url,
                'cancel_url'     => $cancel_url,
            ) ),
            'timeout' => 20,
        ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => $response->get_error_message() ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        $code = wp_remote_retrieve_response_code( $response );

        if ( $code === 200 && ! empty( $data['url'] ) ) {
            wp_send_json_success( array( 'url' => $data['url'] ) );
        } else {
            wp_send_json_error( array( 'message' => $data['error'] ?? 'Checkout failed.' ) );
        }
    }


    // ── AJAX: Get Plans ──────────────────────────────────────────────────

    public function ajax_get_plans() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $response = wp_remote_get( SMVA_API_URL . '/stripe/plans', array( 'timeout' => 10 ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => 'Could not fetch plans.' ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( ! empty( $data['plans'] ) ) {
            wp_send_json_success( $data );
        } else {
            wp_send_json_error( array( 'message' => 'No plans found.' ) );
        }
    }


    // ── AJAX: Get Plans ──────────────────────────────────────────────────


    // ── AJAX: Poll for New License after Stripe Payment ─────────────────

    public function ajax_poll_new_license() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );

        if ( empty( $license_key ) || empty( $internal_token ) ) {
            wp_send_json_error( array( 'message' => 'No active license.' ) );
        }

        // Ask backend if a new license was created for this trial
        $response = wp_remote_post( SMVA_API_URL . '/stripe/poll-new-license', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'trial_license_key' => $license_key,
                'internal_token'    => $internal_token,
            ) ),
            'timeout' => 10,
        ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => 'Connection error.' ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        $code = wp_remote_retrieve_response_code( $response );

        if ( $code === 200 && ! empty( $data['license_key'] ) ) {
            wp_send_json_success( array( 'license_key' => $data['license_key'], 'plan' => $data['plan'] ?? '' ) );
        } else {
            wp_send_json_error( array( 'message' => 'Not ready yet.' ) );
        }
    }


    // ── AJAX: Manage Subscription (Stripe Customer Portal) ──────────────

    public function ajax_manage_subscription() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $return_url     = esc_url_raw( wp_unslash( $_POST['return_url'] ?? admin_url( 'admin.php?page=smva&tab=license' ) ) );

        if ( empty( $license_key ) || empty( $internal_token ) ) {
            wp_send_json_error( array( 'message' => 'No active license.' ) );
        }

        $response = wp_remote_post( SMVA_API_URL . '/stripe/portal', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'license_key'    => $license_key,
                'internal_token' => $internal_token,
                'return_url'     => $return_url,
            ) ),
            'timeout' => 15,
        ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => $response->get_error_message() ) );
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        $code = wp_remote_retrieve_response_code( $response );

        if ( $code === 200 && ! empty( $data['url'] ) ) {
            wp_send_json_success( array( 'url' => $data['url'] ) );
        } else {
            wp_send_json_error( array( 'message' => $data['message'] ?? $data['error'] ?? 'Could not open portal.' ) );
        }
    }


    // ── AJAX: Manage Subscription (Stripe Customer Portal) ──────────────


    // ── AJAX: Chat History ───────────────────────────────────────────────
    public function ajax_chat_history() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $limit          = intval( $_POST['limit'] ?? 100 );

        if ( empty( $license_key ) || empty( $internal_token ) ) {
            wp_send_json_error( [ 'message' => 'Not activated' ] );
        }

        $response = wp_remote_post( SMVA_API_URL . '/plugin/license/chat/history', [
            'timeout' => 15,
            'headers' => [ 'Content-Type' => 'application/json' ],
            'body'    => wp_json_encode( [
                'license_key'    => $license_key,
                'internal_token' => $internal_token,
                'limit'          => $limit,
            ] ),
        ] );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( [ 'message' => 'API error' ] );
        }

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        wp_send_json_success( $body );
    }


    public function ajax_voice_sessions() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized', 403 ); }
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $api_url        = SMVA_API_URL;
        $page        = isset( $_GET['page_num'] ) ? intval( $_GET['page_num'] ) : 1;
        $date_from   = sanitize_text_field( wp_unslash( $_GET['date_from'] ?? '' ) );
        $date_to     = sanitize_text_field( wp_unslash( $_GET['date_to']   ?? '' ) );
        $query = http_build_query( array_filter( [
            'license_key'    => $license_key,
            'internal_token' => $internal_token,
            'page'           => $page,
            'per_page'    => 20,
            'date_from'   => $date_from,
            'date_to'     => $date_to,
            'timezone'    => get_option( 'smva_agent_timezone', wp_timezone_string() ),
        ] ) );
        $response = wp_remote_get( "{$api_url}/plugin/voice-summary/sessions?{$query}", [
            'timeout' => 15,
            'headers' => [ 'x-license-key' => $license_key, 'x-internal-token' => $internal_token ],
        ] );
        if ( is_wp_error( $response ) ) { wp_send_json_error( $response->get_error_message() ); }
        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( ! is_array( $body ) ) { $body = array(); }
        $sessions = array();
        if ( isset( $body['sessions'] ) && is_array( $body['sessions'] ) ) { $sessions = $body['sessions']; }
        elseif ( isset( $body['data']['sessions'] ) && is_array( $body['data']['sessions'] ) ) { $sessions = $body['data']['sessions']; }
        elseif ( isset( $body['items'] ) && is_array( $body['items'] ) ) { $sessions = $body['items']; }
        elseif ( isset( $body['data'] ) && is_array( $body['data'] ) && array_keys( $body['data'] ) === range( 0, count( $body['data'] ) - 1 ) ) { $sessions = $body['data']; }
        elseif ( array_keys( $body ) === range( 0, count( $body ) - 1 ) ) { $sessions = $body; }
        $pagination = isset( $body['pagination'] ) && is_array( $body['pagination'] ) ? $body['pagination'] : array(
            'page'  => $page,
            'pages' => isset( $body['pages'] ) ? absint( $body['pages'] ) : 1,
            'total' => isset( $body['total'] ) ? absint( $body['total'] ) : count( $sessions ),
        );
        wp_send_json_success( array( 'sessions' => $sessions, 'pagination' => $pagination, 'raw' => $body ) );
    }

    public function ajax_voice_transcript() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized', 403 ); }
        $license_key = get_option( 'smva_license_key', '' );
        $api_url     = SMVA_API_URL;
        $session_id  = sanitize_text_field( wp_unslash( $_GET['session_id'] ?? '' ) );
        if ( ! $session_id ) { wp_send_json_error( 'Missing session_id' ); }
        $response = wp_remote_get(
            "{$api_url}/plugin/voice-summary/sessions/{$session_id}/transcript?license_key=" . urlencode( $license_key ),
            [ 'timeout' => 15, 'headers' => [ 'x-license-key' => $license_key ] ]
        );
        if ( is_wp_error( $response ) ) { wp_send_json_error( $response->get_error_message() ); }
        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        wp_send_json_success( $body );
    }

    public function ajax_voice_summarize() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized', 403 ); }
        $license_key = get_option( 'smva_license_key', '' );
        $api_url     = SMVA_API_URL;
        $session_id  = sanitize_text_field( wp_unslash( $_POST['session_id'] ?? '' ) );
        if ( ! $session_id ) { wp_send_json_error( 'Missing session_id' ); }
        $response = wp_remote_post(
            "{$api_url}/plugin/voice-summary/sessions/{$session_id}/summarize",
            [ 'timeout' => 30, 'headers' => [ 'x-license-key' => $license_key, 'Content-Type' => 'application/json' ], 'body' => '{}' ]
        );
        if ( is_wp_error( $response ) ) { wp_send_json_error( $response->get_error_message() ); }
        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( ! empty( $body['error'] ) ) { wp_send_json_error( $body['error'] ); }
        wp_send_json_success( $body );
    }
    public function ajax_voice_recording_url() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized', 403 ); }

        $session_id    = sanitize_text_field( wp_unslash( $_GET['session_id'] ?? '' ) );
        $recording_url = esc_url_raw( wp_unslash( $_GET['recording_url'] ?? '' ) );

        if ( ! $session_id ) {
            wp_send_json_error( array( 'message' => 'Missing session_id' ) );
        }

        // If the session already includes a direct HTTPS recording URL, return it to the admin UI.
        // Direct browser playback avoids unnecessary server-side proxying and supports signed storage URLs.
        if ( $this->is_safe_direct_playback_url( $recording_url ) ) {
            wp_send_json_success( array(
                'url'    => esc_url_raw( $recording_url ),
                'direct' => true,
            ) );
        }

        // Otherwise return a same-origin WordPress proxy URL. The JS now fetches this URL first
        // and shows a friendly message if the backend does not have an audio file for the session.
        $args = array(
            'action'     => 'smva_voice_recording_proxy',
            'nonce'      => wp_create_nonce( 'smva_nonce' ),
            'session_id' => $session_id,
        );

        if ( $this->is_allowed_api_url( $recording_url ) ) {
            $args['source_url'] = rawurlencode( $recording_url );
        }

        wp_send_json_success( array(
            'url'    => add_query_arg( $args, admin_url( 'admin-ajax.php' ) ),
            'direct' => false,
        ) );
    }

    private function is_safe_direct_playback_url( $url ) {
        if ( empty( $url ) ) {
            return false;
        }

        $scheme = wp_parse_url( $url, PHP_URL_SCHEME );
        $host   = wp_parse_url( $url, PHP_URL_HOST );

        if ( 'https' !== $scheme || empty( $host ) ) {
            return false;
        }

        $host = strtolower( $host );
        if ( in_array( $host, array( 'localhost', '127.0.0.1', '::1' ), true ) || '.local' === substr( $host, -6 ) ) {
            return false;
        }

        return true;
    }

    private function is_allowed_api_url( $url ) {
        if ( empty( $url ) ) {
            return false;
        }

        $api_host = wp_parse_url( SMVA_API_URL, PHP_URL_HOST );
        $url_host = wp_parse_url( $url, PHP_URL_HOST );
        $scheme   = wp_parse_url( $url, PHP_URL_SCHEME );

        return 'https' === $scheme && $api_host && $url_host && strtolower( $api_host ) === strtolower( $url_host );
    }

    private function voice_recording_candidates( $session_id, $track, $source_url = '' ) {
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $api_url        = untrailingslashit( SMVA_API_URL );
        $session_id_enc = rawurlencode( $session_id );
        $track_enc      = rawurlencode( $track );
        $license_qs     = 'license_key=' . rawurlencode( $license_key ) . '&internal_token=' . rawurlencode( $internal_token );

        $candidates = array();
        if ( $this->is_allowed_api_url( $source_url ) ) {
            $candidates[] = $source_url;
        }

        $candidates[] = "{$api_url}/plugin/voice-summary/sessions/{$session_id_enc}/recording?{$license_qs}&track={$track_enc}";
        $candidates[] = "{$api_url}/plugin/voice-summary/sessions/{$session_id_enc}/recording?{$license_qs}";
        $candidates[] = "{$api_url}/plugin/voice-summary/sessions/{$session_id_enc}/audio?{$license_qs}&track={$track_enc}";
        $candidates[] = "{$api_url}/plugin/voice-summary/sessions/{$session_id_enc}/audio?{$license_qs}";
        $candidates[] = "{$api_url}/plugin/voice-summary/recordings/{$session_id_enc}?{$license_qs}&track={$track_enc}";
        $candidates[] = "{$api_url}/plugin/voice-sessions/{$session_id_enc}/recording?{$license_qs}&track={$track_enc}";
        $candidates[] = "{$api_url}/plugin/voice-sessions/{$session_id_enc}/audio?{$license_qs}";

        return array_values( array_unique( $candidates ) );
    }

    public function ajax_voice_recording_proxy() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'Unauthorized', '', array( 'response' => 403 ) ); }

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $session_id     = sanitize_text_field( wp_unslash( $_GET['session_id'] ?? '' ) );
        $track          = sanitize_text_field( wp_unslash( $_GET['track'] ?? 'main' ) );
        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- esc_url_raw sanitizes the value
        $source_url     = esc_url_raw( rawurldecode( wp_unslash( $_GET['source_url'] ?? '' ) ) );

        if ( ! $session_id ) { wp_die( 'Missing session_id', '', array( 'response' => 400 ) ); }

        $last_code = 404;
        $last_body = '';
        $headers   = array(
            'x-license-key'    => $license_key,
            'x-internal-token' => $internal_token,
        );

        foreach ( $this->voice_recording_candidates( $session_id, $track, $source_url ) as $url ) {
            $response = wp_remote_get( $url, array( 'timeout' => 30, 'headers' => $headers ) );
            if ( is_wp_error( $response ) ) {
                continue;
            }

            $code      = (int) wp_remote_retrieve_response_code( $response );
            $body      = wp_remote_retrieve_body( $response );
            $last_code = $code;
            $last_body = $body;

            if ( 200 === $code && ! empty( $body ) ) {
                $content_type = wp_remote_retrieve_header( $response, 'content-type' );
                if ( empty( $content_type ) ) {
                    $content_type = 'audio/wav';
                }

                header( 'Content-Type: ' . sanitize_text_field( $content_type ) );
                header( 'Content-Length: ' . strlen( $body ) );
                header( 'Accept-Ranges: bytes' );
                header( 'Cache-Control: no-cache' );
                // Binary audio output. Escaping would corrupt the recording stream.
                // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                echo $body;
                exit;
            }
        }

        $message = 'Recording not found. The session exists, but the backend did not return an audio file for this session yet.';
        if ( ! empty( $last_body ) && strlen( $last_body ) < 500 ) {
            $message .= ' Backend response: ' . wp_strip_all_tags( $last_body );
        }
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- max() returns an integer
        wp_die( esc_html( $message ), '', array( 'response' => max( 404, absint( $last_code ) ) ) );
    }

    public function ajax_get_leads() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized' ); return; }
        $page  = max( 1, intval( isset( $_POST['page'] )  ? $_POST['page']  : 1 ) );
        $limit = min( 100, intval( isset( $_POST['limit'] ) ? $_POST['limit'] : 20 ) );

        $remote_leads = array();
        $remote_total = 0;
        $remote_error = '';
        // POST, not GET with a query string: leads are PII, and the credentials
        // that fetch them must not end up in the backend's access logs.
        $response = $this->api_post_json(
            '/plugin/leads/list',
            array_merge( $this->get_api_credentials(), array( 'page' => $page, 'limit' => $limit ) ),
            15
        );
        if ( is_wp_error( $response ) ) {
            $remote_error = $response->get_error_message();
        } else {
            $data = json_decode( wp_remote_retrieve_body( $response ), true );
            if ( is_array( $data ) ) {
                $remote_leads = $data['leads'] ?? $data['items'] ?? ( isset( $data['data'] ) && is_array( $data['data'] ) ? $data['data'] : array() );
                $remote_total = absint( $data['total'] ?? count( $remote_leads ) );
            }
        }

        $local_leads = array_reverse( $this->get_local_leads() );
        $all_leads   = array_merge( is_array( $local_leads ) ? $local_leads : array(), is_array( $remote_leads ) ? $remote_leads : array() );

        wp_send_json_success( array(
            'leads'        => array_slice( $all_leads, 0, $limit ),
            'total'        => count( $local_leads ) + $remote_total,
            'local_total'  => count( $local_leads ),
            'remote_total' => $remote_total,
            'remote_error' => $remote_error,
        ) );
    }

    public function ajax_capture_lead_fragment() {
        check_ajax_referer( 'smva_widget_nonce', 'nonce' );
        $field_rl = sanitize_text_field( wp_unslash( $_POST['field'] ?? 'x' ) );
        $this->check_public_rate_limit( 'capture_lead_fragment_' . $field_rl, 1 );

        $session_id = sanitize_text_field( wp_unslash( $_POST['session_id'] ?? '' ) );
        $field      = sanitize_text_field( wp_unslash( $_POST['field'] ?? '' ) );
        $label      = sanitize_text_field( wp_unslash( $_POST['label'] ?? '' ) );
        $value      = sanitize_text_field( wp_unslash( $_POST['value'] ?? '' ) );
        $source     = sanitize_text_field( wp_unslash( $_POST['source'] ?? 'Widget local fallback' ) );

        if ( '' === $value ) {
            wp_send_json_error( array( 'message' => 'Missing value' ), 400 );
        }

        $lead_id = $this->upsert_local_lead_fragment( $session_id, $field, $label, $value, $source );
        if ( ! $lead_id ) {
            wp_send_json_error( array( 'message' => 'Could not store lead fragment' ), 500 );
        }
        // Note: owner notification is NOT sent from here. Single typed fields arrive
        // one at a time and would produce partial emails. The complete lead is sent
        // as one payload to ajax_capture_lead(), which emails the full record.

        // Push to HubSpot if connected (non-blocking, best-effort)
        $hs_token = get_option( 'smva_hubspot_token', '' );
        if ( $hs_token && get_option( 'smva_hubspot_connected', '0' ) === '1' ) {
            $hs_prop = '';
            if ( $field === 'email' )     $hs_prop = 'email';
            elseif ( $field === 'phone' ) $hs_prop = 'phone';
            elseif ( $field === 'name' )  $hs_prop = 'firstname';

            if ( $hs_prop ) {
                if ( $field === 'email' ) {
                    $hs_endpoint = 'https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/' . rawurlencode( $value );
                    $hs_body     = array( 'properties' => array( array( 'property' => 'email', 'value' => $value ) ) );
                } else {
                    $hs_endpoint = 'https://api.hubapi.com/crm/v3/objects/contacts';
                    $hs_body     = array( 'properties' => array( $hs_prop => $value ) );
                }
                wp_remote_post( $hs_endpoint, array(
                    'headers'  => array(
                        'Content-Type'  => 'application/json',
                        'Authorization' => 'Bearer ' . $hs_token,
                    ),
                    'body'     => wp_json_encode( $hs_body ),
                    'timeout'  => 5,
                    'blocking' => false,
                ) );
            }
        }

        wp_send_json_success( array( 'lead_id' => $lead_id ) );
    }

    /**
     * Capture a COMPLETE lead in a single request (name + email + phone + notes
     * together) and email the site owner immediately. This is the path the widget
     * uses when the agent finishes collecting a lead, so the notification always
     * carries the full record and never depends on WP-Cron.
     */
    public function ajax_capture_lead() {
        check_ajax_referer( 'smva_widget_nonce', 'nonce' );
        $this->check_public_rate_limit( 'capture_lead', 2 );

        $session_id = sanitize_text_field( wp_unslash( $_POST['session_id'] ?? '' ) );
        $fields = array(
            'name'    => sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) ),
            'email'   => sanitize_email( wp_unslash( $_POST['email'] ?? '' ) ),
            'phone'   => sanitize_text_field( wp_unslash( $_POST['phone'] ?? '' ) ),
            'company' => sanitize_text_field( wp_unslash( $_POST['company'] ?? '' ) ),
            'notes'   => sanitize_textarea_field( wp_unslash( $_POST['notes'] ?? '' ) ),
        );
        if ( ! is_email( $fields['email'] ) ) { $fields['email'] = ''; }

        if ( '' === $fields['name'] && '' === $fields['email'] && '' === $fields['phone'] && '' === $fields['notes'] ) {
            wp_send_json_error( array( 'message' => 'Empty lead' ), 400 );
        }

        $source  = sanitize_text_field( wp_unslash( $_POST['source'] ?? 'Widget' ) );
        $lead_id = $this->upsert_local_lead_complete( $session_id, $fields, $source );
        if ( ! $lead_id ) {
            wp_send_json_error( array( 'message' => 'Could not store lead' ), 500 );
        }

        // Push to HubSpot if connected (non-blocking, best-effort).
        $hs_token = get_option( 'smva_hubspot_token', '' );
        if ( $hs_token && get_option( 'smva_hubspot_connected', '0' ) === '1'
             && ( '' !== $fields['email'] || '' !== $fields['phone'] || '' !== $fields['name'] ) ) {
            $props = array();
            if ( '' !== $fields['name'] )  { $props['firstname'] = $fields['name']; }
            if ( '' !== $fields['phone'] ) { $props['phone'] = $fields['phone']; }
            if ( '' !== $fields['email'] ) {
                $hs_endpoint = 'https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/' . rawurlencode( $fields['email'] );
                $hs_props    = array( array( 'property' => 'email', 'value' => $fields['email'] ) );
                foreach ( $props as $p => $v ) { $hs_props[] = array( 'property' => $p, 'value' => $v ); }
                $hs_body = array( 'properties' => $hs_props );
            } else {
                $hs_endpoint = 'https://api.hubapi.com/crm/v3/objects/contacts';
                $hs_body     = array( 'properties' => $props );
            }
            wp_remote_post( $hs_endpoint, array(
                'headers'  => array(
                    'Content-Type'  => 'application/json',
                    'Authorization' => 'Bearer ' . $hs_token,
                ),
                'body'     => wp_json_encode( $hs_body ),
                'timeout'  => 5,
                'blocking' => false,
            ) );
        }

        // Email the owner right now with the complete record — no WP-Cron needed.
        $this->maybe_notify_owner_of_lead( $lead_id );

        wp_send_json_success( array( 'lead_id' => $lead_id ) );
    }

    public function ajax_delete_lead() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized' ); return; }
        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
        $lead_id = sanitize_text_field( wp_unslash( isset( $_POST['lead_id'] ) ? $_POST['lead_id'] : '' ) );
        if ( ! $lead_id ) { wp_send_json_error( 'Missing lead_id' ); return; }

        if ( 0 === strpos( $lead_id, 'local_' ) ) {
            $leads = array_values( array_filter( $this->get_local_leads(), function( $lead ) use ( $lead_id ) {
                return ! isset( $lead['id'] ) || $lead['id'] !== $lead_id;
            } ) );
            $this->save_local_leads( $leads );
            wp_send_json_success();
        }

        $response = $this->api_post_json(
            '/plugin/leads/delete',
            array_merge( $this->get_api_credentials(), array( 'lead_id' => $lead_id ) ),
            15
        );
        if ( is_wp_error( $response ) ) { wp_send_json_error( 'Failed to delete lead' ); return; }
        wp_send_json_success();
    }

    // ── Knowledge Base File Upload ──────────────────────────────────────────

    public function ajax_upload_knowledge_file() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        if ( empty( $_FILES['file'] ) ) {
            wp_send_json_error( array( 'message' => 'No file uploaded.' ) );
            return;
        }

        $uploaded = $_FILES['file']; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- validated and sanitized below
        if ( ! isset( $uploaded['name'], $uploaded['type'], $uploaded['tmp_name'], $uploaded['error'], $uploaded['size'] ) ) {
            wp_send_json_error( array( 'message' => 'Incomplete file upload data.' ) );
            return;
        }
        $file = array(
            'name'     => sanitize_file_name( wp_unslash( $uploaded['name'] ) ),
            'type'     => sanitize_mime_type( wp_unslash( $uploaded['type'] ) ),
            'tmp_name' => sanitize_text_field( wp_unslash( $uploaded['tmp_name'] ) ),
            'error'    => (int) $uploaded['error'],
            'size'     => (int) $uploaded['size'],
        );
        $ext = strtolower( pathinfo( $file['name'], PATHINFO_EXTENSION ) );
        $allowed  = array( 'pdf', 'docx', 'csv', 'txt' );

        if ( ! in_array( $ext, $allowed, true ) ) {
            wp_send_json_error( array( 'message' => 'File type not allowed. Use PDF, DOCX, CSV, or TXT.' ) );
            return;
        }

        if ( $file['size'] > 10 * 1024 * 1024 ) {
            wp_send_json_error( array( 'message' => 'File too large. Maximum size is 10MB.' ) );
            return;
        }

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );

        if ( empty( $license_key ) ) {
            wp_send_json_error( array( 'message' => 'No active license found.' ) );
            return;
        }

        // Read file contents and encode as base64
        $file_data = base64_encode( file_get_contents( $file['tmp_name'] ) );

        $response = wp_remote_post( SMVA_API_URL . '/plugin/knowledge/upload', array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( array(
                'license_key'    => $license_key,
                'internal_token' => $internal_token,
                'filename'       => sanitize_file_name( $file['name'] ),
                'filetype'       => $ext,
                'filedata'       => $file_data,
            ) ),
            'timeout' => 60,
        ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => 'Connection error. Please try again.' ) );
            return;
        }

        $data   = json_decode( wp_remote_retrieve_body( $response ), true );
        $status = wp_remote_retrieve_response_code( $response );

        if ( $status === 200 && ! empty( $data['success'] ) ) {
            wp_send_json_success( array(
                'message'      => $data['message'] ?? 'File processed successfully.',
                'chars_added'  => $data['chars_added'] ?? 0,
            ) );
        } else {
            wp_send_json_error( array( 'message' => $data['error'] ?? 'Failed to process file.' ) );
        }
    }

    // ── HubSpot Integration ─────────────────────────────────────────────────

    public function ajax_hubspot_save_token() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized' ); return; }

        $token = sanitize_text_field( wp_unslash( $_POST['token'] ?? '' ) );
        if ( empty( $token ) ) {
            wp_send_json_error( array( 'message' => 'Token is required.' ) );
            return;
        }

        // Verify token works by calling HubSpot API
        $response = wp_remote_get( 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
            ),
            'timeout' => 10,
        ) );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => 'Could not reach HubSpot. Check your internet connection.' ) );
            return;
        }

        $code = wp_remote_retrieve_response_code( $response );
        if ( $code === 401 ) {
            wp_send_json_error( array( 'message' => 'Invalid token. Please check and try again.' ) );
            return;
        }
        if ( $code !== 200 ) {
            wp_send_json_error( array( 'message' => 'HubSpot returned an error (code ' . $code . '). Try again.' ) );
            return;
        }

        update_option( 'smva_hubspot_token',     $token );
        update_option( 'smva_hubspot_connected', '1' );

        wp_send_json_success( array( 'message' => 'HubSpot connected successfully.' ) );
    }

    public function ajax_hubspot_disconnect() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized' ); return; }

        update_option( 'smva_hubspot_connected', '0' );
        delete_option( 'smva_hubspot_token' );
        wp_send_json_success( array( 'message' => 'HubSpot disconnected.' ) );
    }

    /**
     * Connect the site owner's own Twilio account so their number reaches the agent.
     *
     * The auth token is deliberately NOT stored in WordPress: it is forwarded
     * once to the backend, which validates it against Twilio and keeps it
     * encrypted. Only non-secret display values are kept locally, so a database
     * dump of this site never yields a working Twilio credential.
     */
    public function ajax_phone_connect() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        if ( empty( $license_key ) || empty( $internal_token ) ) {
            wp_send_json_error( array( 'message' => 'License not active.' ) );
        }

        $account_sid  = sanitize_text_field( wp_unslash( $_POST['account_sid'] ?? '' ) );
        $auth_token   = sanitize_text_field( wp_unslash( $_POST['auth_token'] ?? '' ) );
        $phone_number = sanitize_text_field( wp_unslash( $_POST['phone_number'] ?? '' ) );

        if ( empty( $account_sid ) || empty( $auth_token ) || empty( $phone_number ) ) {
            wp_send_json_error( array( 'message' => 'Account SID, Auth Token, and phone number are all required.' ) );
        }
        if ( ! preg_match( '/^\+[1-9]\d{6,14}$/', $phone_number ) ) {
            wp_send_json_error( array( 'message' => 'Phone number must be in E.164 format, e.g. +15551234567.' ) );
        }

        $response = $this->api_post_json( '/plugin/phone/connect', array(
            'license_key'    => $license_key,
            'internal_token' => $internal_token,
            'account_sid'    => $account_sid,
            'auth_token'     => $auth_token,
            'phone_number'   => $phone_number,
        ), 20 );

        if ( is_wp_error( $response ) ) {
            wp_send_json_error( array( 'message' => 'Could not reach StudioMeta. Check your connection and try again.' ) );
        }

        $code = wp_remote_retrieve_response_code( $response );
        $data = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code !== 200 ) {
            wp_send_json_error( array(
                'message' => $data['message'] ?? 'Could not connect that Twilio account.',
            ) );
        }

        update_option( 'smva_phone_connected',  '1' );
        update_option( 'smva_phone_number',     $data['phone_number'] ?? $phone_number );
        // Masked here rather than trusting the backend to send it back, so the
        // displayed value cannot silently become the full SID.
        update_option( 'smva_phone_sid_masked', substr( $account_sid, 0, 2 ) . '••••' . substr( $account_sid, -4 ) );

        wp_send_json_success( array( 'message' => 'Phone number connected.' ) );
    }

    public function ajax_phone_disconnect() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        if ( empty( $license_key ) || empty( $internal_token ) ) {
            wp_send_json_error( array( 'message' => 'License not active.' ) );
        }

        $response = $this->api_post_json( '/plugin/phone/disconnect', array(
            'license_key'    => $license_key,
            'internal_token' => $internal_token,
        ) );

        if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
            // Leaving the local flags set keeps this page honest about the fact
            // that the number is still live on the backend.
            wp_send_json_error( array( 'message' => 'Could not disconnect. Please try again.' ) );
        }

        update_option( 'smva_phone_connected', '0' );
        delete_option( 'smva_phone_number' );
        delete_option( 'smva_phone_sid_masked' );

        wp_send_json_success( array( 'message' => 'Phone number disconnected.' ) );
    }

    /**
     * Save the departments a live phone call may be transferred to.
     *
     * Nothing is stored in WordPress: the list goes to the backend with the rest
     * of the agent config, because the agent reads it mid-call and a local copy
     * could only ever drift out of date. The backend re-validates every number
     * as E.164 before storing it, and what it returns is what is echoed back to
     * the screen — a number it rejected must not keep looking configured here.
     */
    public function ajax_save_transfer() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        $this->require_admin_capability();

        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        if ( empty( $license_key ) || empty( $internal_token ) ) {
            wp_send_json_error( array( 'message' => 'License not active.' ) );
        }

        // JSON blob: decoded, then keys, values and nested structure are all
        // sanitized by sanitize_json_recursive() before being forwarded.
        $config = $this->sanitize_json_recursive(
            json_decode( sanitize_textarea_field( wp_unslash( $_POST['transfer_config'] ?? '' ) ), true )
        );
        if ( ! is_array( $config ) ) {
            wp_send_json_error( array( 'message' => 'Could not read those transfer settings.' ) );
        }

        $departments = array();
        $raw_depts   = isset( $config['departments'] ) && is_array( $config['departments'] ) ? $config['departments'] : array();
        foreach ( $raw_depts as $dept ) {
            if ( ! is_array( $dept ) ) {
                continue;
            }
            $name   = sanitize_text_field( $dept['name'] ?? '' );
            $number = preg_replace( '/[\s()\-.]/', '', (string) ( $dept['number'] ?? '' ) );
            if ( '' === $name || ! preg_match( '/^\+[1-9]\d{6,14}$/', $number ) ) {
                // Dropped rather than repaired: a half-valid department is a
                // call routed to a number nobody meant to publish.
                continue;
            }
            $departments[] = array(
                'name'        => $name,
                'number'      => $number,
                'description' => sanitize_text_field( $dept['description'] ?? '' ),
                'hours'       => sanitize_text_field( $dept['hours'] ?? '' ),
            );
            if ( count( $departments ) >= 8 ) {
                break;
            }
        }

        $ring_timeout = (int) ( $config['ring_timeout'] ?? 25 );
        $ring_timeout = max( 10, min( 60, $ring_timeout ) );

        $response = $this->api_post_json( '/plugin/license/agent/settings', array(
            'license_key'     => $license_key,
            'internal_token'  => $internal_token,
            'transfer_config' => array(
                // Enabled with nothing to dial is the same as disabled; the
                // backend collapses this too, but saying so here keeps the
                // response the screen re-seeds from honest.
                'enabled'      => ! empty( $config['enabled'] ) && ! empty( $departments ),
                'ring_timeout' => $ring_timeout,
                'departments'  => $departments,
            ),
        ), 15 );

        if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
            wp_send_json_error( array( 'message' => 'Could not save transfer settings. Please try again.' ) );
        }

        wp_send_json_success( array(
            'message'     => 'Transfer settings saved.',
            'departments' => $departments,
        ) );
    }

    public function ajax_hubspot_status() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_send_json_error( 'Unauthorized' ); return; }

        wp_send_json_success( array(
            'connected' => get_option( 'smva_hubspot_connected', '0' ) === '1',
        ) );
    }

}