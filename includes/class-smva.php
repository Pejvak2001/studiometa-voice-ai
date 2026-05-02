<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class SMVA_Plugin {

    const QUOTA_CACHE_KEY = 'smva_quota_cache';
    const QUOTA_CACHE_KEY_PREFIX = 'smva_quota_cache_v2_';
    const QUOTA_CACHE_TTL = 300; // 5 minutes

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
        if ( isset( $_POST[ $key . '_b64' ] ) ) {
            $raw = wp_unslash( $_POST[ $key . '_b64' ] );
            return base64_decode( $raw );
        }
        if ( isset( $_POST[ $key ] ) ) {
            return wp_unslash( $_POST[ $key ] );
        }
        return null;
    }

    private function __construct() {
        add_action( 'admin_menu',            array( $this, 'admin_menu' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'admin_assets' ) );
        add_action( 'wp_enqueue_scripts',    array( $this, 'widget_assets' ) );
        add_action( 'wp_footer',             array( $this, 'inject_widget' ) );
        add_shortcode( 'smva_widget',        array( $this, 'render_widget_shortcode' ) );
        add_action( 'admin_notices',         array( $this, 'maybe_trial_notice' ) );

        // Auto-trial retry hook (runs on every admin load until trial succeeds)
        add_action( 'admin_init',            array( $this, 'maybe_retry_trial_activation' ) );

        // AJAX — admin only
        add_action( 'wp_ajax_smva_activate_license',   array( $this, 'ajax_activate' ) );
        add_action( 'wp_ajax_smva_deactivate_license', array( $this, 'ajax_deactivate' ) );
        add_action( 'wp_ajax_smva_save_settings',      array( $this, 'ajax_save_settings' ) );
        add_action( 'wp_ajax_smva_save_agent',         array( $this, 'ajax_save_agent' ) );
        add_action( 'wp_ajax_smva_crawl_site',         array( $this, 'ajax_crawl_site' ) );
        add_action( 'wp_ajax_smva_optimize_agent',     array( $this, 'ajax_optimize_agent' ) );
        add_action( 'wp_ajax_smva_refresh_quota',      array( $this, 'ajax_refresh_quota' ) );
        add_action( 'wp_ajax_smva_tts_preview',        array( $this, 'ajax_tts_preview' ) );
        add_action( 'wp_ajax_smva_get_agent_tools',    array( $this, 'ajax_get_agent_tools' ) );
        add_action( 'wp_ajax_smva_get_plans',          array( $this, 'ajax_get_plans' ) );
        add_action( 'wp_ajax_smva_chat_history',       array( $this, 'ajax_chat_history' ) );
        add_action( 'wp_ajax_smva_stripe_checkout',    array( $this, 'ajax_stripe_checkout' ) );
        add_action( 'wp_ajax_smva_poll_new_license',   array( $this, 'ajax_poll_new_license' ) );
        add_action( 'wp_ajax_smva_manage_subscription', array( $this, 'ajax_manage_subscription' ) );
        add_action( 'wp_ajax_smva_dismiss_trial_notice', array( $this, 'ajax_dismiss_trial_notice' ) );
        add_action( 'wp_ajax_smva_reactivate_here',     array( $this, 'ajax_reactivate_here' ) );

        // AJAX — public (widget quota check)
        add_action( 'wp_ajax_nopriv_smva_widget_quota', array( $this, 'ajax_widget_quota' ) );
        add_action( 'wp_ajax_smva_widget_quota',        array( $this, 'ajax_widget_quota' ) );
        add_action( 'wp_ajax_smva_voice_sessions',   array( $this, 'ajax_voice_sessions' ) );
        add_action( 'wp_ajax_smva_voice_transcript', array( $this, 'ajax_voice_transcript' ) );
        add_action( 'wp_ajax_smva_voice_summarize',  array( $this, 'ajax_voice_summarize' ) );
        add_action( 'wp_ajax_smva_voice_recording_url', array( $this, 'ajax_voice_recording_url' ) );
        add_action( 'wp_ajax_smva_voice_recording_proxy', array( $this, 'ajax_voice_recording_proxy' ) );
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

        // Trial state
        add_option( 'smva_trial_attempted', '0' );
        add_option( 'smva_trial_last_attempt', 0 );
        add_option( 'smva_trial_notice_dismissed', '0' );

        // Site-replaced state (set when this site is auto-deactivated by another)
        add_option( 'smva_site_replaced_notice', '0' );
        add_option( 'smva_site_replaced_message', '' );

        // Try to activate trial immediately. If backend is unreachable,
        // we retry in maybe_retry_trial_activation() on admin page loads.
        $self = self::get_instance();
        $self->auto_trial_activate();
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
    private function site_fingerprint() {
        $site_url    = get_site_url();
        $admin_email = get_option( 'admin_email', '' );
        // Use AUTH_KEY if available for entropy; fallback to site_url
        $secret = defined( 'AUTH_KEY' ) ? AUTH_KEY : $site_url;
        return hash( 'sha256', $site_url . '|' . $admin_email . '|' . $secret );
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
            return false;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $data = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code !== 200 || empty( $data['internal_token'] ) ) {
            return false;
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
     * If trial activation failed during activate(), retry on admin page loads
     * (throttled to once every 10 minutes).
     */
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
        if ( get_option( 'smva_trial_attempted', '0' ) === '1' ) return;

        $last = (int) get_option( 'smva_trial_last_attempt', 0 );
        if ( $last && ( time() - $last ) < 600 ) return; // 10 min cooldown

        $this->auto_trial_activate();
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
            <script>
            (function(){
                var btn = document.getElementById('smva-reactivate-here-btn');
                if (!btn) return;
                btn.addEventListener('click', function() {
                    btn.disabled = true;
                    btn.textContent = 'Reactivating...';
                    var msg = document.getElementById('smva-reactivate-msg');
                    var params = new URLSearchParams({
                        action: 'smva_reactivate_here',
                        nonce: '<?php echo esc_js( wp_create_nonce( 'smva_nonce' ) ); ?>'
                    });
                    fetch(ajaxurl, { method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'}, body: params })
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
            </script>
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
                <a href="<?php echo esc_url( SMVA_PRICING_URL ); ?>" target="_blank" class="button button-primary" style="margin-left:8px">Upgrade Plan</a>
            </p>
            <script>
            (function(){
                var n = document.getElementById('smva-trial-notice');
                if (!n) return;
                n.addEventListener('click', function(e){
                    if (!e.target.classList.contains('notice-dismiss')) return;
                    jQuery.post(ajaxurl, {
                        action: 'smva_dismiss_trial_notice',
                        nonce: '<?php echo esc_attr( wp_create_nonce( 'smva_nonce' ) ); ?>'
                    });
                });
            })();
            </script>
        </div>
        <?php
    }

    public function ajax_dismiss_trial_notice() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        update_option( 'smva_trial_notice_dismissed', '1' );
        wp_send_json_success();
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
        wp_enqueue_script( 'smva-admin', SMVA_URL . 'assets/admin.js',  array( 'jquery' ), SMVA_VERSION, true );
        wp_localize_script( 'smva-admin', 'smvaAdmin', array(
            'ajaxUrl'    => admin_url( 'admin-ajax.php' ),
            'nonce' => esc_attr( wp_create_nonce( 'smva_nonce' ) ),
            'apiUrl'     => SMVA_API_URL,
            'pricingUrl' => SMVA_PRICING_URL,
            'siteUrl'    => get_site_url(),
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

        $quota = $this->get_quota_status();
        ob_start(); ?>
        <script>
        window.smvaConfig = {
            internalToken : <?php echo wp_json_encode( $token ); ?>,
            licenseKey    : <?php echo wp_json_encode( get_option( 'smva_license_key', '' ) ); ?>,
            wsUrl         : <?php echo wp_json_encode( SMVA_WS_URL ); ?>,
            apiUrl        : <?php echo wp_json_encode( SMVA_API_URL ); ?>,
            ajaxUrl       : <?php echo wp_json_encode( admin_url( 'admin-ajax.php' ) ); ?>,
            pricingUrl    : <?php echo wp_json_encode( SMVA_PRICING_URL ); ?>,
            widgetMode    : <?php echo wp_json_encode( $mode ); ?>,
            plan          : <?php echo wp_json_encode( get_option( 'smva_plan', '' ) ); ?>,
            quota         : <?php echo wp_json_encode( is_array( $quota ) && empty( $quota['error'] ) ? $quota : null ); ?>,
            primaryColor  : <?php echo wp_json_encode( get_option( 'smva_widget_color', '#2563eb' ) ); ?>,
            position      : <?php echo wp_json_encode( get_option( 'smva_widget_position', 'bottom-right' ) ); ?>,
            widgetStyle   : <?php echo wp_json_encode( get_option( 'smva_widget_style', 'fab' ) ); ?>,
            widgetTheme   : <?php echo wp_json_encode( get_option( 'smva_widget_theme', 'classic' ) ); ?>,
            agentLogo     : <?php echo wp_json_encode( get_option( 'smva_agent_logo', '' ) ); ?>,
            lang          : <?php echo wp_json_encode( get_option( 'smva_lang', 'en' ) ); ?>,
            extraLangs    : <?php echo esc_html( get_option( 'smva_extra_langs', '[]' ) ); ?>,
            businessName  : <?php echo wp_json_encode( get_option( 'smva_business_name', '' ) ); ?>,
            greeting      : <?php echo wp_json_encode( get_option( 'smva_greeting', 'Hello! How can I help you?' ) ); ?>,
            defaultTab    : <?php echo wp_json_encode( get_option( 'smva_default_tab', 'voice' ) ); ?>,
            voiceEnabled  : <?php echo esc_html( get_option( 'smva_voice_enabled', '1' ) === '1' ? 'true' : 'false'; ?>,
            chatEnabled   : <?php echo esc_html( get_option( 'smva_chat_enabled', '1' ) === '1' ? 'true' : 'false'; ?>,
            maxCallDuration    : <?php echo intval( get_option( 'smva_max_call_duration', 10 ) ); ?>,
            silenceTimeout     : <?php echo intval( get_option( 'smva_silence_timeout', 60 ) ); ?>,
            callCooldown       : <?php echo intval( get_option( 'smva_call_cooldown', 30 ) ); ?>,
            suggestedQuestions : <?php
                $sq = get_option( 'smva_suggested_questions', '[]' );
                $sq_arr = json_decode( $sq, true );
                echo wp_json_encode( is_array( $sq_arr ) ? $sq_arr : array() );
            ?>,
        };
        </script>
        <?php return ob_get_clean();
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
        $quota = $this->get_quota_status( true );
        wp_send_json_success( $quota );
    }

    // ── AJAX: Reactivate this site (after being replaced by another) ────────

    public function ajax_reactivate_here() {
        check_ajax_referer( 'smva_nonce', 'nonce' );

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

    // ── Admin Page ──────────────────────────────────────────────────────────

    public function page_main() {
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $plan           = get_option( 'smva_plan', '' );
        $is_active      = ! empty( $internal_token );
        $is_trial       = ( $plan === 'trial' );
        $active_tab     = isset( $_GET['tab'] ) ? sanitize_text_field( wp_unslash( $_GET['tab'] ) ) : ( $is_active ? 'dashboard' : 'license' );
        if ( $active_tab === 'settings' ) $active_tab = 'general';

        include SMVA_PATH . 'views/admin-page.php';
    }

    // ── AJAX: Activate License (manual paste by user) ───────────────────────

    public function ajax_activate() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
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
        );

        foreach ( $fields as $post_key => $option_key ) {
            if ( isset( $_POST[ $post_key ] ) ) {
                update_option( $option_key, sanitize_text_field( wp_unslash( $_POST[ $post_key ] ) ) );
            }
        }

        if ( isset( $_POST['smva_voice_enabled'] ) ) update_option( 'smva_voice_enabled', $_POST['smva_voice_enabled'] === '1' ? '1' : '0' );
        if ( isset( $_POST['smva_chat_enabled'] ) )  update_option( 'smva_chat_enabled',  $_POST['smva_chat_enabled']  === '1' ? '1' : '0' );

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
            $extra = json_decode( wp_unslash( $_POST['smva_extra_langs'] ), true );
            if ( is_array( $extra ) ) {
                update_option( 'smva_extra_langs', wp_json_encode( array_values( array_map( 'sanitize_text_field', $extra ) ) ) );
            }
        }

        wp_send_json_success( array( 'message' => 'Settings saved.' ) );
    }

    // ── AJAX: Save Agent Settings ───────────────────────────────────────────

    public function ajax_save_agent() {
        check_ajax_referer( 'smva_nonce', 'nonce' );

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
            $el = json_decode( wp_unslash( $_POST['extra_langs'] ), true );
            if ( is_array( $el ) ) {
                $payload['extra_langs'] = array_values( array_map( 'sanitize_text_field', $el ) );
            }
        }

        if ( isset( $_POST['agent_tools'] ) ) {
            $payload['agent_tools'] = json_decode( wp_unslash( $_POST['agent_tools'] ), true );
        }

        // Only send suggested_questions if explicitly provided (Agent tab only)
        if ( isset( $_POST['smva_suggested_questions'] ) ) {
            $raw = wp_unslash( $_POST['smva_suggested_questions'] );
            $payload['suggested_questions'] = array_values( array_filter( array_map( 'trim', explode( "\n", $raw ) ) ) );
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
            'timeout' => 60,
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

    // ── AJAX: Optimize Agent ────────────────────────────────────────────────

    public function ajax_optimize_agent() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
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

        // Stream audio back to browser
        header( 'Content-Type: audio/wav' );
        header( 'Content-Length: ' . strlen( $body ) );
        header( 'Cache-Control: no-store' );
        echo wp_kses_post( $body );
        exit;
    }


    // ── AJAX: Get Agent Tools (used before save to preserve tools) ──────────

    public function ajax_get_agent_tools() {
        check_ajax_referer( 'smva_nonce', 'nonce' );

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


    // ── AJAX: Stripe Checkout ────────────────────────────────────────────

    public function ajax_stripe_checkout() {
        check_ajax_referer( 'smva_nonce', 'nonce' );

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
        $license_key = get_option( 'smva_license_key', '' );
        $api_url     = SMVA_API_URL;
        $page        = isset( $_GET['page_num'] ) ? intval( $_GET['page_num'] ) : 1;
        $date_from   = sanitize_text_field( wp_unslash( $_GET['date_from'] ?? '' ) );
        $date_to     = sanitize_text_field( wp_unslash( $_GET['date_to']   ?? '' ) );
        $query = http_build_query( array_filter( [
            'license_key' => $license_key,
            'page'        => $page,
            'per_page'    => 20,
            'date_from'   => $date_from,
            'date_to'     => $date_to,
        ] ) );
        $response = wp_remote_get( "{$api_url}/plugin/voice-summary/sessions?{$query}", [
            'timeout' => 15,
            'headers' => [ 'x-license-key' => $license_key ],
        ] );
        if ( is_wp_error( $response ) ) { wp_send_json_error( $response->get_error_message() ); }
        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        wp_send_json_success( $body );
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
        $license_key = get_option( 'smva_license_key', '' );
        $api_url     = SMVA_API_URL;
        $session_id  = sanitize_text_field( wp_unslash( $_GET['session_id'] ?? '' ) );
        if ( ! $session_id ) { wp_send_json_error( 'Missing session_id' ); }
        // Return proxy URL (through WordPress to avoid CORS)
        $proxy_url = admin_url( 'admin-ajax.php' ) . '?action=smva_voice_recording_proxy&nonce=' . wp_create_nonce( 'smva_nonce' ) . '&session_id=' . urlencode( $session_id );
        wp_send_json_success( [ 'url' => $proxy_url ] );
    }

    public function ajax_voice_recording_proxy() {
        check_ajax_referer( 'smva_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'Unauthorized', 403 ); }
        $license_key = get_option( 'smva_license_key', '' );
        $api_url     = SMVA_API_URL;
        $session_id  = sanitize_text_field( wp_unslash( $_GET['session_id'] ?? '' ) );
        if ( ! $session_id ) { wp_die( 'Missing session_id' ); }
        $track = sanitize_text_field( wp_unslash( $_GET['track'] ?? 'main' ) );
        $url = "{$api_url}/plugin/voice-summary/sessions/{$session_id}/recording?license_key=" . urlencode( $license_key ) . "&track=" . urlencode( $track );
        $response = wp_remote_get( $url, [ 'timeout' => 30 ] );
        if ( is_wp_error( $response ) ) { wp_die( 'Failed to fetch recording' ); }
        $body = wp_remote_retrieve_body( $response );
        header( 'Content-Type: audio/wav' );
        header( 'Content-Length: ' . strlen( $body ) );
        header( 'Accept-Ranges: bytes' );
        echo wp_kses_post( $body );
        exit;
    }

}

