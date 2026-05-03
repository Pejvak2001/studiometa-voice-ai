
<?php
if ( ! defined( 'ABSPATH' ) ) exit;
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
?>
<div class="smva-admin-wrap">
<style>
/* ── SMVA Modern Admin Layout ── */
.smva-admin-wrap{display:flex;min-height:100vh;background:#f0f2f5;margin:-20px -20px -20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}

/* SIDEBAR */
.smva-sidebar{width:220px;flex-shrink:0;background:#1e1f2e;display:flex;flex-direction:column;position:sticky;top:32px;height:calc(100vh - 32px);overflow-y:auto}
.smva-sidebar-brand{padding:20px 18px 16px;border-bottom:1px solid rgba(255,255,255,.07)}
.smva-sidebar-brand-inner{display:flex;align-items:center;gap:10px}
.smva-sb-logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#3b6eff);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.smva-sb-name{font-size:14px;font-weight:700;color:#fff;line-height:1.2}
.smva-sb-sub{font-size:11px;color:rgba(255,255,255,.4);margin-top:2px}

/* NAV ITEMS */
.smva-sidenav{padding:12px 0;flex:1}
.smva-sidenav-group{padding:0 10px;margin-bottom:4px}
.smva-sidenav-label{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.25);padding:8px 8px 4px}
.smva-sidenav a{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500;color:rgba(255,255,255,.55);transition:all .15s;margin-bottom:2px}
.smva-sidenav a:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.9)}
.smva-sidenav a.active{background:rgba(99,102,241,.25);color:#a5b4fc}
.smva-sidenav a.active .smva-nav-icon{opacity:1}
.smva-nav-icon{font-size:15px;width:20px;text-align:center;opacity:.6;flex-shrink:0}
.smva-nav-label{flex:1}
.smva-nav-badge{font-size:10px;background:rgba(99,102,241,.4);color:#a5b4fc;padding:2px 6px;border-radius:10px}

/* SIDEBAR FOOTER */
.smva-sb-footer{padding:14px;border-top:1px solid rgba(255,255,255,.07)}
.smva-sb-plan{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.05);border-radius:8px}
.smva-sb-plan-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;animation:smva-sb-pulse 2s ease-in-out infinite;flex-shrink:0}
@keyframes smva-sb-pulse{0%,100%{opacity:1}50%{opacity:.4}}
.smva-sb-plan-info{flex:1;min-width:0}
.smva-sb-plan-name{font-size:12px;font-weight:600;color:#fff;text-transform:capitalize}
.smva-sb-plan-sub{font-size:10px;color:rgba(255,255,255,.4)}

/* MAIN CONTENT */
.smva-main{flex:1;min-width:0;padding:28px 32px;max-width:900px}
.smva-main-header{margin-bottom:24px}
.smva-main-title{font-size:22px;font-weight:700;color:#111827;margin:0 0 4px}
.smva-main-sub{font-size:13px;color:#6b7280}

/* hide old header elements */
.smva-header{display:none!important}
.smva-tab-content{all:unset;display:block}
/* hide WP footer on plugin page */
#wpfooter{display:none!important}
#wpcontent{padding-bottom:0!important}

/* responsive */
@media(max-width:782px){
  .smva-admin-wrap{flex-direction:column;margin:0}
  .smva-sidebar{width:100%;height:auto;position:static;flex-direction:row;flex-wrap:wrap}
  .smva-sidebar-brand{display:none}
  .smva-sidenav{display:flex;flex-wrap:wrap;padding:6px}
  .smva-sidenav-group{padding:0}
  .smva-sidenav-label{display:none}
  .smva-sidenav a{padding:6px 10px;font-size:12px}
  .smva-sb-footer{display:none}
  .smva-main{padding:16px}
}
</style>

    <!-- SIDEBAR -->
    <aside class="smva-sidebar">
        <div class="smva-sidebar-brand">
            <div class="smva-sidebar-brand-inner">
                <div class="smva-sb-logo">🎙️</div>
                <div>
                    <div class="smva-sb-name">StudioMeta AI</div>
                    <div class="smva-sb-sub">Voice &amp; Chat</div>
                </div>
            </div>
        </div>

        <nav class="smva-sidenav">
            <div class="smva-sidenav-group">
                <div class="smva-sidenav-label">Account</div>
                <a href="?page=smva&tab=license" class="<?php echo $active_tab==='license' ? 'active' : ''; ?>">
                    <span class="smva-nav-icon">🔑</span>
                    <span class="smva-nav-label">License</span>
                </a>
                <a href="?page=smva&tab=dashboard" class="<?php echo $active_tab==='dashboard' ? 'active' : ''; ?>">
                    <span class="smva-nav-icon">📊</span>
                    <span class="smva-nav-label">Dashboard</span>
                </a>
            </div>
            <div class="smva-sidenav-group">
                <div class="smva-sidenav-label">Configuration</div>
                <a href="?page=smva&tab=general" class="<?php echo $active_tab==='general' ? 'active' : ''; ?>">
                    <span class="smva-nav-icon">⚙️</span>
                    <span class="smva-nav-label">General</span>
                </a>
                <a href="?page=smva&tab=agent" class="<?php echo $active_tab==='agent' ? 'active' : ''; ?>">
                    <span class="smva-nav-icon">🤖</span>
                    <span class="smva-nav-label">My Agent</span>
                </a>
                <a href="?page=smva&tab=widget" class="<?php echo $active_tab==='widget' ? 'active' : ''; ?>">
                    <span class="smva-nav-icon">🎨</span>
                    <span class="smva-nav-label">Widget</span>
                </a>
                <a href="?page=smva&tab=automation" class="<?php echo $active_tab==='automation' ? 'active' : ''; ?>">
                    <span class="smva-nav-icon">⚡</span>
                    <span class="smva-nav-label">Automation</span>
                </a>
            </div>
            <div class="smva-sidenav-group">
                <div class="smva-sidenav-label">History</div>
                <a href="?page=smva&tab=history" class="<?php echo $active_tab==='history' ? 'active' : ''; ?>">
                    <span class="smva-nav-icon">💬</span>
                    <span class="smva-nav-label">Chat History</span>
                </a>
                <a href="?page=smva&tab=voice_summary" class="<?php echo $active_tab==='voice_summary' ? 'active' : ''; ?>">
                    <span class="smva-nav-icon">🎙️</span>
                    <span class="smva-nav-label">Voice Summary</span>
                </a>
            </div>
        </nav>

        <div class="smva-sb-footer">
            <?php
            $sb_plan = get_option('smva_plan_type', get_option('smva_license_plan','trial'));
            $sb_key  = get_option('smva_license_key','');
            ?>
            <div class="smva-sb-plan">
                <span class="smva-sb-plan-dot"></span>
                <div class="smva-sb-plan-info">
                    <div class="smva-sb-plan-name"><?php echo esc_html( ucfirst($sb_plan) ); ?> Plan</div>
                    <div class="smva-sb-plan-sub"><?php echo $sb_key ? esc_html( substr($sb_key,0,16) ).'…' : 'Not activated'; ?></div>
                </div>
            </div>
        </div>
    </aside>

    <!-- MAIN CONTENT -->
    <div class="smva-main">
    <div class="smva-tab-content">

    <?php // ── LICENSE TAB ─────────────────────────────────────────────── ?>
    <?php if ( ! $is_active || $active_tab === 'license' ) :
        $quota = $is_active ? $this->get_quota_status() : null;
        $has_quota = is_array( $quota ) && empty( $quota['error'] );
    ?>

    <?php if ( $is_trial && $has_quota ) : ?>
    <div class="smva-card smva-trial-card">
        <div class="smva-card-header">
            <h2 class="smva-card-title">Free Trial Active</h2>
            <span class="smva-badge smva-badge-trial">TRIAL</span>
        </div>
        <p class="smva-desc">Upgrade to a paid plan to unlock full voice &amp; chat. Usage details are in the <a href="?page=smva&tab=dashboard">Dashboard</a>.</p>
        <div class="smva-card-footer">
            <button id="smva-upgrade-btn" class="smva-btn smva-btn-primary" type="button">💎 Upgrade Plan</button>
        </div>
    </div>
    <?php endif; ?>





    <div class="smva-card">
        <div class="smva-card-header"><h2 class="smva-card-title">License</h2></div>

        <?php if ( ! $is_active && ! empty( get_option('smva_license_key') ) ) : ?>
            <div class="smva-notice smva-notice-error" style="margin-bottom:16px">
                ⚠️ Your subscription has been cancelled or expired. 
                <strong><a href="?page=smva&tab=license" id="smva-upgrade-btn" style="color:inherit">Renew your plan</a></strong> to restore access.
            </div>
        <?php endif; ?>

        <?php if ( $is_active ) : ?>
            <div class="smva-status-row" style="flex-wrap:wrap;gap:8px">
                <?php if ( $is_trial ) : ?>
                    <span class="smva-badge smva-badge-trial">TRIAL</span>
                <?php else : ?>
                    <span class="smva-badge smva-badge-success">✓ Active</span>
                <?php endif; ?>
                <code style="font-size:13px;color:#374151;background:#f1f5f9;padding:4px 10px;border-radius:6px;letter-spacing:.03em"><?php echo esc_html( get_option( 'smva_license_key', '' ) ); ?></code>
                <?php if ( ! $is_trial ) : ?>
                    <div style="margin-left:auto;display:flex;gap:8px">
                        <button id="smva-manage-subscription-btn" class="smva-btn smva-btn-sm" type="button">⚙️ Manage Subscription</button>
                        <button id="smva-deactivate-btn" class="smva-btn smva-btn-danger smva-btn-sm" type="button">Deactivate</button>
                    </div>
                <?php endif; ?>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
                <div style="background:#f8fafc;border-radius:8px;padding:12px 14px">
                    <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Plan</div>
                    <div style="font-size:14px;font-weight:600;color:#0f172a"><?php echo esc_html( ucwords( str_replace('_',' ', $quota['plan'] ?? get_option('smva_plan','basic') ) ) ); ?></div>
                </div>
                <div style="background:#f8fafc;border-radius:8px;padding:12px 14px">
                    <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Active Site</div>
                    <div style="font-size:12px;font-weight:500;color:#475569;word-break:break-all"><?php echo esc_html( get_site_url() ); ?></div>
                </div>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin-top:12px">Each license is single-site. Activating elsewhere will deactivate the widget here.</p>

            <?php if ( $is_trial ) : ?>
                <div style="border-top:1px solid #f3f4f6;margin-top:16px;padding-top:16px">
                    <p class="smva-desc" style="margin-bottom:10px"><strong>Already purchased?</strong> Paste the license key from your email below to upgrade instantly.</p>
                    <div style="display:flex;gap:8px">
                        <input type="text" id="smva-license-input" class="smva-input" placeholder="VOICEAI-XXXX-XXXX-XXXX" style="flex:1">
                        <button id="smva-activate-btn" class="smva-btn smva-btn-primary" style="flex:none">Upgrade</button>
                    </div>
                    <span id="smva-license-msg" style="display:block;margin-top:8px;font-size:13px"></span>
                </div>
            <?php endif; ?>

        <?php else : ?>

            <?php // No internal token — trial activation likely failed. Offer retry + manual paste. ?>
            <?php $last_attempt = (int) get_option( 'smva_trial_last_attempt', 0 ); ?>
            <div class="smva-notice smva-notice-warning">
                <strong>⚠ Trial activation pending.</strong>
                We could not reach our licensing server<?php echo $last_attempt ? ' (last tried ' . esc_html( human_time_diff( $last_attempt ) ) . ' ago)' : ''; ?>.
                The plugin will retry automatically, or you can paste a license key manually below.
            </div>
            <p style="color:#6b7280;font-size:13px;margin-bottom:16px">Enter your license key to activate the plugin.</p>
            <div style="display:flex;gap:8px">
                <input type="text" id="smva-license-input" class="smva-input" placeholder="VOICEAI-XXXX-XXXX-XXXX" style="flex:1">
                <button id="smva-activate-btn" class="smva-btn smva-btn-primary" style="flex:none">Activate</button>
            </div>
            <span id="smva-license-msg" style="display:block;margin-top:8px;font-size:13px"></span>

            <div style="margin-top:16px;padding-top:16px;border-top:1px solid #f3f4f6">
                <p style="font-size:13px;color:#6b7280;margin:0 0 8px">Don't have a key yet?</p>
                <a href="<?php echo esc_url( SMVA_PRICING_URL ); ?>" target="_blank" rel="noopener" class="smva-btn smva-btn-primary">💎 View Pricing</a>
            </div>

        <?php endif; ?>
    </div>

    <?php // ── DASHBOARD TAB ───────────────────────────────────────────── ?>
    <?php elseif ( $active_tab === 'dashboard' ) :
        $dash = $this->get_dashboard_data();
        $usage   = $dash['usage']   ?? array();
        $license = $dash['license'] ?? array();
        $sessions= $dash['recent_sessions'] ?? array();
        $daily   = $dash['daily_usage'] ?? array();
        $error   = $dash['error'] ?? '';

        $quota = $this->get_quota_status();
        $has_quota = is_array( $quota ) && empty( $quota['error'] );
        if ( $has_quota ) {
            if ( ! isset( $usage['voice_minutes_used'] ) || intval( $usage['voice_minutes_limit'] ?? 0 ) === 0 ) {
                $usage['voice_minutes_used']  = floatval( $quota['voice_minutes_used'] ?? 0 );
                $usage['voice_minutes_limit'] = intval( $quota['voice_minutes_limit'] ?? 0 );
            }
            if ( ! isset( $usage['chat_messages_used'] ) || intval( $usage['chat_messages_limit'] ?? 0 ) === 0 ) {
                $usage['chat_messages_used']  = intval( $quota['chat_messages_used'] ?? 0 );
                $usage['chat_messages_limit'] = intval( $quota['chat_messages_limit'] ?? 0 );
            }
        }
    ?>
    <?php if ( $error ) : ?>
        <div class="smva-notice smva-notice-error"><?php echo esc_html( $error ); ?></div>
    <?php else : ?>

        <?php
        $dv_used  = floatval( $usage['voice_minutes_used']  ?? 0 );
        $dv_limit = intval(   $usage['voice_minutes_limit'] ?? 0 );
        $dc_used  = intval(   $usage['chat_messages_used']  ?? 0 );
        $dc_limit = intval(   $usage['chat_messages_limit'] ?? 0 );
        $dv_pct = ( $dv_limit > 0 ) ? min( 100, ( $dv_used / $dv_limit ) * 100 ) : 0;
        $dc_pct = ( $dc_limit > 0 ) ? min( 100, ( $dc_used / $dc_limit ) * 100 ) : 0;
        $plan_label = esc_html( $quota['plan'] ?? $license['plan_type'] ?? 'basic' );
        $expires_at = ! empty( $quota['expires_at'] ) ? gmdate('M j, Y', strtotime($quota['expires_at'])) : null;
        ?>
        <div class="smva-card" style="margin-bottom:16px">
            <div class="smva-card-header">
                <h2 class="smva-card-title">Usage This Month</h2>
                <span class="smva-badge <?php echo $is_trial ? 'smva-badge-trial' : 'smva-badge-success'; ?>">
                    <?php echo $is_trial ? 'TRIAL' : esc_html( ucfirst(str_replace('_',' ',$plan_label)) ); ?>
                </span>
                <?php if ( $expires_at ) : ?>
                <span class="smva-hint-inline"><?php echo $is_trial ? 'Expires' : 'Renews'; ?> <?php echo esc_html( $expires_at ); ?></span>
                <?php endif; ?>
            </div>

            <div class="smva-stats-grid" style="margin-bottom:16px">
                <?php if ( $dv_limit > 0 ) : ?>
                <div class="smva-stat-card" style="text-align:left">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <div>
                            <div class="smva-stat-label" style="font-size:12px">🎙️ Voice Minutes</div>
                            <div class="smva-stat-value" style="font-size:22px"><?php echo number_format($dv_used,1); ?></div>
                            <div class="smva-stat-sub">of <?php echo (int) $dv_limit; ?> min</div>
                        </div>
                    </div>
                    <div class="smva-quota-bar"><div class="smva-quota-fill <?php echo $dv_pct > 90 ? 'danger' : ($dv_pct > 70 ? 'warn' : ''); ?>" style="width:<?php echo esc_attr($dv_pct); ?>%"></div></div>
                </div>
                <?php endif; ?>
                <div class="smva-stat-card" style="text-align:left">
                    <div style="margin-bottom:8px">
                        <div class="smva-stat-label" style="font-size:12px">💬 Chat Messages</div>
                        <div class="smva-stat-value" style="font-size:22px"><?php echo number_format($dc_used); ?></div>
                        <div class="smva-stat-sub">of <?php echo number_format($dc_limit); ?></div>
                    </div>
                    <div class="smva-quota-bar"><div class="smva-quota-fill <?php echo $dc_pct > 90 ? 'danger' : ($dc_pct > 70 ? 'warn' : ''); ?>" style="width:<?php echo esc_attr($dc_pct); ?>%"></div></div>
                </div>
                <div class="smva-stat-card">
                    <div class="smva-stat-icon">🧾</div>
                    <div class="smva-stat-value"><?php echo number_format($usage['total_sessions'] ?? 0); ?></div>
                    <div class="smva-stat-label">Sessions</div>
                    <div class="smva-stat-sub">This month</div>
                </div>
                <div class="smva-stat-card">
                    <div class="smva-stat-icon">📅</div>
                    <div class="smva-stat-value"><?php echo esc_html( $usage['days_remaining'] ?? '∞' ); ?></div>
                    <div class="smva-stat-label">Days Remaining</div>
                    <div class="smva-stat-sub"><?php echo esc_html($license['status'] ?? 'active'); ?></div>
                </div>
            </div>

            <div class="smva-card-footer" style="border-top:1px solid var(--smva-border);padding-top:12px;margin-top:0">
                <?php if ( $is_trial ) : ?>
                <button id="smva-upgrade-btn" class="smva-btn smva-btn-primary" type="button">💎 Upgrade Plan</button>
                <?php endif; ?>
                <button id="smva-refresh-quota" class="smva-btn" type="button">⟳ Refresh</button>
                <span class="smva-hint-inline">Refreshes every 5 min.</span>
            </div>
        </div>

        <?php if ( ! empty($sessions) ) : ?>
        <div class="smva-card" style="margin-top:16px">
            <div class="smva-card-header"><h2 class="smva-card-title">Recent Sessions</h2></div>
            <table class="smva-table">
                <thead><tr><th>Date</th><th>Type</th><th>Duration</th></tr></thead>
                <tbody>
                <?php foreach ( array_slice($sessions, 0, 10) as $s ) : ?>
                <tr>
                    <td><?php echo esc_html( gmdate('M d, H:i', strtotime($s['started_at'])) ); ?></td>
                    <td><?php echo esc_html( ucfirst($s['session_type'] ?? 'voice') ); ?></td>
                    <td><?php 
                        $type = $s['session_type'] ?? 'voice';
                        if ( $type === 'chat' ) {
                            echo '—';
                        } else {
                            echo number_format($s['duration_minutes'] ?? 0, 1) . ' min';
                        }
                    ?></td>
                </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php elseif ( ! empty( $usage['chat_messages_used'] ) ) : ?>
        <div class="smva-card" style="margin-top:16px">
            <div class="smva-card-header"><h2 class="smva-card-title">Recent Sessions</h2></div>
            <div style="padding:16px;color:#6b7280">Chat usage was detected, but recent chat sessions were not returned by the backend yet.</div>
        </div>
        <?php endif; ?>

    <?php endif; ?>

    <?php // ── GENERAL TAB ─────────────────────────────────────────────── ?>
    <?php elseif ( $active_tab === 'general' ) :
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $agent = array();
        if ( $license_key && $internal_token ) {
            $r = wp_remote_post( SMVA_API_URL . '/plugin/license/agent/get', array(
                'headers' => array( 'Content-Type' => 'application/json' ),
                'body'    => wp_json_encode( array( 'license_key' => $license_key, 'internal_token' => $internal_token ) ),
                'timeout' => 10,
            ));
            if ( ! is_wp_error($r) ) {
                $agent = json_decode( wp_remote_retrieve_body($r), true ) ?: array();
                // Sync language from backend to local option (survives reinstall)
                if ( ! empty( $agent['language'] ) ) {
                    update_option( 'smva_lang', $agent['language'] );
                }
            }
        }
    ?>
    <form id="smva-settings-form">

        <div class="smva-card">
            <div class="smva-card-header">
                <h2 class="smva-card-title">General Settings</h2>
            </div>
            <div class="smva-form-grid">

                <div class="smva-field">
                    <label>Language <span>— widget UI &amp; agent default</span></label>
                    <select name="smva_lang" class="smva-select" id="smva-lang-select">
                        <?php foreach ( array( 'en' => '🇺🇸 English', 'fa' => '🇮🇷 فارسی', 'ar' => '🇸🇦 العربية', 'fr' => '🇫🇷 Français', 'es' => '🇪🇸 Español' ) as $val => $label ) : ?>
                        <option value="<?php echo esc_attr( $val ); ?>" <?php selected( get_option('smva_lang','en'), $val ); ?>><?php echo esc_html( $label ); ?></option>
                        <?php endforeach; ?>
                    </select>
                    <p class="smva-hint">Agent auto-detects and switches to the user's language mid-conversation.</p>
                </div>

                <div class="smva-field">
                    <label>Business Name</label>
                    <input type="text" name="smva_business_name" class="smva-input" value="<?php echo esc_attr( get_option('smva_business_name','') ); ?>" placeholder="<?php echo esc_attr( get_bloginfo('name') ); ?>">
                </div>

                <div class="smva-field smva-field-full">
                    <label>Chat Greeting <span>— shown when chat widget opens</span></label>
                    <input type="text" name="smva_greeting" class="smva-input" value="<?php echo esc_attr( get_option('smva_greeting','Hello! How can I help you?') ); ?>">
                </div>

                <div class="smva-field">
                    <label>Primary Color</label>
                    <div class="smva-color-row">
                        <div class="smva-color-swatch">
                            <input type="color" id="smva-color-input" name="smva_widget_color" value="<?php echo esc_attr( get_option('smva_widget_color','#2563eb') ); ?>">
                        </div>
                        <span id="smva-color-val" class="smva-color-val"><?php echo esc_html( get_option('smva_widget_color','#2563eb') ); ?></span>
                    </div>
                </div>

                <div class="smva-field">
                    <label>Widget Position</label>
                    <select name="smva_widget_position" class="smva-select">
                        <option value="bottom-right" <?php selected( get_option('smva_widget_position','bottom-right'), 'bottom-right' ); ?>>Bottom Right</option>
                        <option value="bottom-left"  <?php selected( get_option('smva_widget_position','bottom-right'), 'bottom-left' ); ?>>Bottom Left</option>
                    </select>
                </div>

                <div class="smva-field">
                    <label>Widget Style</label>
                    <select name="smva_widget_style" class="smva-select">
                        <option value="fab"  <?php selected( get_option('smva_widget_style','fab'), 'fab' ); ?>>Floating Button (FAB)</option>
                        <option value="pill" <?php selected( get_option('smva_widget_style','fab'), 'pill' ); ?>>Pill Button</option>
                    </select>
                </div>

            </div>
        </div>

        <div class="smva-card">
            <div class="smva-card-header">
                <h2 class="smva-card-title">Agent Identity</h2>
            </div>
            <div class="smva-form-grid">

                <div class="smva-field">
                    <label>Agent Name</label>
                    <input type="text" name="agent_name" class="smva-input" placeholder="AI Assistant" value="<?php echo esc_attr( $agent['agent_name'] ?? '' ); ?>">
                </div>

                <div class="smva-field smva-field-full">
                    <label>🎤 Voice</label>
                    <?php
                    $voices = array(
                        'Zephyr'        => array( 'label' => 'Zephyr',        'tone' => 'Bright',        'best_for' => 'Energetic welcomes and upbeat brands',         'preview_rate' => '1.02', 'preview_pitch' => '1.08' ),
                        'Puck'          => array( 'label' => 'Puck',          'tone' => 'Upbeat',        'best_for' => 'Friendly sales intros and lively conversations', 'preview_rate' => '1.06', 'preview_pitch' => '1.02' ),
                        'Charon'        => array( 'label' => 'Charon',        'tone' => 'Informative',   'best_for' => 'Clear explanations and service details',       'preview_rate' => '0.97', 'preview_pitch' => '0.95' ),
                        'Kore'          => array( 'label' => 'Kore',          'tone' => 'Firm',          'best_for' => 'Confident professional guidance',             'preview_rate' => '0.96', 'preview_pitch' => '0.94' ),
                        'Fenrir'        => array( 'label' => 'Fenrir',        'tone' => 'Excitable',     'best_for' => 'High-energy promotions and launches',         'preview_rate' => '1.08', 'preview_pitch' => '1.05' ),
                        'Leda'          => array( 'label' => 'Leda',          'tone' => 'Youthful',      'best_for' => 'Modern lifestyle and casual engagement',      'preview_rate' => '1.04', 'preview_pitch' => '1.08' ),
                        'Orus'          => array( 'label' => 'Orus',          'tone' => 'Firm',          'best_for' => 'Straightforward service and support flows',   'preview_rate' => '0.96', 'preview_pitch' => '0.92' ),
                        'Aoede'         => array( 'label' => 'Aoede',         'tone' => 'Breezy',        'best_for' => 'Warm, relaxed greetings',                    'preview_rate' => '1.00', 'preview_pitch' => '1.03' ),
                        'Callirrhoe'    => array( 'label' => 'Callirrhoe',    'tone' => 'Easy-going',    'best_for' => 'Calm concierge and hospitality flows',       'preview_rate' => '0.98', 'preview_pitch' => '1.00' ),
                        'Autonoe'       => array( 'label' => 'Autonoe',       'tone' => 'Bright',        'best_for' => 'Fresh and clear customer greetings',         'preview_rate' => '1.02', 'preview_pitch' => '1.07' ),
                        'Enceladus'     => array( 'label' => 'Enceladus',     'tone' => 'Breathy',       'best_for' => 'Soft luxury and spa experiences',            'preview_rate' => '0.95', 'preview_pitch' => '1.04' ),
                        'Iapetus'       => array( 'label' => 'Iapetus',       'tone' => 'Clear',         'best_for' => 'Clean onboarding and booking steps',         'preview_rate' => '0.99', 'preview_pitch' => '0.98' ),
                        'Umbriel'       => array( 'label' => 'Umbriel',       'tone' => 'Easy-going',    'best_for' => 'Low-pressure support conversations',         'preview_rate' => '0.98', 'preview_pitch' => '1.01' ),
                        'Algieba'       => array( 'label' => 'Algieba',       'tone' => 'Smooth',        'best_for' => 'Polished premium-brand interactions',        'preview_rate' => '0.97', 'preview_pitch' => '0.99' ),
                        'Despina'       => array( 'label' => 'Despina',       'tone' => 'Smooth',        'best_for' => 'Luxury and hospitality welcome flows',       'preview_rate' => '0.97', 'preview_pitch' => '1.00' ),
                        'Erinome'       => array( 'label' => 'Erinome',       'tone' => 'Clear',         'best_for' => 'Direct FAQs and policy explanations',        'preview_rate' => '0.99', 'preview_pitch' => '0.98' ),
                        'Algenib'       => array( 'label' => 'Algenib',       'tone' => 'Gravelly',      'best_for' => 'Grounded, distinctive brand voices',         'preview_rate' => '0.94', 'preview_pitch' => '0.88' ),
                        'Rasalgethi'    => array( 'label' => 'Rasalgethi',    'tone' => 'Informative',   'best_for' => 'Structured answers and instructions',        'preview_rate' => '0.97', 'preview_pitch' => '0.95' ),
                        'Laomedeia'     => array( 'label' => 'Laomedeia',     'tone' => 'Upbeat',        'best_for' => 'Cheerful scheduling and front-desk flows',   'preview_rate' => '1.05', 'preview_pitch' => '1.03' ),
                        'Achernar'      => array( 'label' => 'Achernar',      'tone' => 'Soft',          'best_for' => 'Gentle reassurance and sensitive support',   'preview_rate' => '0.94', 'preview_pitch' => '1.02' ),
                        'Alnilam'       => array( 'label' => 'Alnilam',       'tone' => 'Firm',          'best_for' => 'High-confidence expert-style guidance',      'preview_rate' => '0.96', 'preview_pitch' => '0.93' ),
                        'Schedar'       => array( 'label' => 'Schedar',       'tone' => 'Even',          'best_for' => 'Balanced all-purpose assistants',            'preview_rate' => '1.00', 'preview_pitch' => '1.00' ),
                        'Gacrux'        => array( 'label' => 'Gacrux',        'tone' => 'Mature',        'best_for' => 'Calm authority and premium trust',           'preview_rate' => '0.95', 'preview_pitch' => '0.90' ),
                        'Pulcherrima'   => array( 'label' => 'Pulcherrima',   'tone' => 'Forward',       'best_for' => 'Assertive CTAs and sales moments',           'preview_rate' => '1.03', 'preview_pitch' => '1.00' ),
                        'Achird'        => array( 'label' => 'Achird',        'tone' => 'Friendly',      'best_for' => 'Approachable customer care',                 'preview_rate' => '1.01', 'preview_pitch' => '1.02' ),
                        'Zubenelgenubi' => array( 'label' => 'Zubenelgenubi', 'tone' => 'Casual',        'best_for' => 'Relaxed, conversational brands',             'preview_rate' => '1.01', 'preview_pitch' => '1.01' ),
                        'Vindemiatrix'  => array( 'label' => 'Vindemiatrix',  'tone' => 'Gentle',        'best_for' => 'Empathetic responses and softer support',    'preview_rate' => '0.95', 'preview_pitch' => '1.03' ),
                        'Sadachbia'     => array( 'label' => 'Sadachbia',     'tone' => 'Lively',        'best_for' => 'Fast-paced engagement and promotions',       'preview_rate' => '1.06', 'preview_pitch' => '1.05' ),
                        'Sadaltager'    => array( 'label' => 'Sadaltager',    'tone' => 'Knowledgeable', 'best_for' => 'Expert explainers and consultative flows',   'preview_rate' => '0.97', 'preview_pitch' => '0.96' ),
                        'Sulafat'       => array( 'label' => 'Sulafat',       'tone' => 'Warm',          'best_for' => 'Welcoming, human-sounding introductions',    'preview_rate' => '0.98', 'preview_pitch' => '1.01' ),
                    );
                    $current_voice = $agent['voice_id'] ?? 'Aoede';
                    ?>
                    <?php
                    $voice_gender = array(
                        'Zephyr'=>'f','Kore'=>'f','Leda'=>'f','Aoede'=>'f','Callirrhoe'=>'f',
                        'Autonoe'=>'f','Despina'=>'f','Erinome'=>'f','Laomedeia'=>'f','Achernar'=>'f',
                        'Pulcherrima'=>'f','Vindemiatrix'=>'f','Sadachbia'=>'f','Sulafat'=>'f',
                        'Puck'=>'m','Charon'=>'m','Fenrir'=>'m','Orus'=>'m','Enceladus'=>'m',
                        'Iapetus'=>'m','Umbriel'=>'m','Algieba'=>'m','Algenib'=>'m','Rasalgethi'=>'m',
                        'Alnilam'=>'m','Schedar'=>'m','Gacrux'=>'m','Achird'=>'m',
                        'Zubenelgenubi'=>'m','Sadaltager'=>'m',
                    );
                    $current_gender = $voice_gender[ $current_voice ] ?? 'f';
                    ?>
                    <div class="smva-gender-tabs" id="smva-gender-tabs">
                        <button type="button" class="smva-gender-btn <?php echo $current_gender==='f'?'active':''; ?>" data-gender="f">
                            <span>♀</span> Female
                        </button>
                        <button type="button" class="smva-gender-btn <?php echo $current_gender==='m'?'active':''; ?>" data-gender="m">
                            <span>♂</span> Male
                        </button>
                    </div>
                    <select name="voice_id" class="smva-select" id="smva-voice-select">
                        <?php foreach ( $voices as $val => $meta ) :
                            $g = $voice_gender[$val] ?? 'f';
                        ?>
                        <option
                            value="<?php echo esc_attr( $val ); ?>"
                            data-label="<?php echo esc_attr( $meta['label'] ); ?>"
                            data-tone="<?php echo esc_attr( $meta['tone'] ); ?>"
                            data-best-for="<?php echo esc_attr( $meta['best_for'] ); ?>"
                            data-preview-rate="<?php echo esc_attr( $meta['preview_rate'] ); ?>"
                            data-preview-pitch="<?php echo esc_attr( $meta['preview_pitch'] ); ?>"
                            data-gender="<?php echo esc_attr( $g ); ?>"
                            <?php selected( $current_voice, $val ); ?>
                        >
                            <?php echo esc_html( $meta['label'] . ' — ' . $meta['tone'] ); ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                    <style>
                    .smva-gender-tabs{display:flex;gap:8px;margin-bottom:10px}
                    .smva-gender-btn{flex:1;padding:8px 12px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;font-size:13px;font-weight:600;color:#6b7280;cursor:pointer;transition:all .15s;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px}
                    .smva-gender-btn span{font-size:16px}
                    .smva-gender-btn:hover{border-color:#3b6eff;color:#3b6eff}
                    .smva-gender-btn.active{border-color:#3b6eff;background:#eff2ff;color:#3b6eff}
                    </style>
                    <script>
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
                    </script>
                    <p class="smva-hint">Filter by gender, then pick a voice. Preview uses Gemini TTS — same as the live widget.</p>
                    <div class="smva-voice-meta-card" id="smva-voice-meta-card">
                        <div class="smva-voice-meta-top">
                            <div>
                                <div class="smva-voice-meta-name" id="smva-voice-meta-name"><?php echo esc_html( $voices[ $current_voice ]['label'] ?? 'Aoede' ); ?></div>
                                <div class="smva-voice-meta-tone" id="smva-voice-meta-tone"><?php echo esc_html( $voices[ $current_voice ]['tone'] ?? 'Breezy' ); ?></div>
                            </div>
                            <span class="smva-voice-meta-badge">Voice profile</span>
                        </div>
                        <div class="smva-voice-meta-best" id="smva-voice-meta-best"><?php echo esc_html( $voices[ $current_voice ]['best_for'] ?? 'Warm, relaxed greetings' ); ?></div>
                        <div class="smva-voice-meta-note">Preview uses Gemini TTS with the selected voice — same as the live widget.</div>
                    </div>
                    <div class="smva-voice-greeting-inline">
                        <label>🎙️ Voice Greeting — <span style="color:#9ca3af;font-weight:400">what the agent says when the voice call starts</span></label>
                        <div class="smva-greeting-row">
                            <input type="text" id="smva-first-message" name="first_message" class="smva-input" placeholder="Hello! How can I help you today?" value="<?php echo esc_attr( $agent['first_message'] ?? '' ); ?>">
                            <button type="button" class="smva-btn" id="smva-preview-greeting-btn">▶ Preview Greeting</button>
                            <button type="button" class="smva-btn" id="smva-stop-preview-btn" style="display:none">■ Stop</button>
                        </div>
                        <p class="smva-hint">Preview the selected greeting right under the chosen voice to make comparison easier.</p>
                        <div class="smva-preview-status" id="smva-preview-status" aria-live="polite"></div>
                    </div>
                </div>

                <div class="smva-field">
                    <label>🕐 Timezone</label>
                    <select name="agent_timezone" class="smva-select">
                        <?php
                        $tzones = array(
                            'UTC'               => 'UTC',
                            'America/Toronto'   => 'Eastern — Toronto',
                            'America/Chicago'   => 'Central — Chicago',
                            'America/Denver'    => 'Mountain — Denver',
                            'America/Vancouver' => 'Pacific — Vancouver',
                            'Europe/London'     => 'GMT — London',
                            'Europe/Paris'      => 'CET — Paris',
                            'Asia/Tehran'       => 'IRST — Tehran',
                            'Asia/Dubai'        => 'GST — Dubai',
                            'Asia/Tokyo'        => 'JST — Tokyo',
                            'Australia/Sydney'  => 'AEDT — Sydney',
                        );
                        foreach ( $tzones as $val => $label ) : ?>
                        <option value="<?php echo esc_attr( $val ); ?>" <?php selected( $agent['agent_timezone'] ?? 'UTC', $val ); ?>><?php echo esc_html( $label ); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="smva-field">
                    <label>🎯 Response Style</label>
                    <div style="display:flex;gap:10px;margin-top:6px">
                        <?php
                        $styles = array(
                            'precise'  => array('icon'=>'🎯','title'=>'Precise','desc'=>'Consistent & factual'),
                            'balanced' => array('icon'=>'⚖️','title'=>'Balanced','desc'=>'Default — works for most'),
                            'creative' => array('icon'=>'🎨','title'=>'Creative','desc'=>'Varied & expressive'),
                        );
                        $cur = $agent['response_style'] ?? 'balanced';
                        foreach ( $styles as $val => $s ) : ?>
                        <label style="flex:1;border:2px solid <?php echo $cur===esc_attr($val)?'#2563eb':'#e5e7eb'; ?>;border-radius:10px;padding:10px;cursor:pointer;text-align:center;transition:all .2s" onclick="smvaSelectStyle('<?php echo esc_attr( $val ); ?>')">
                            <input type="radio" name="response_style" value="<?php echo esc_attr( $val ); ?>" <?php checked($cur,$val); ?> style="display:none">
                            <div style="font-size:20px;margin-bottom:2px"><?php echo esc_html( $s['icon'] ); ?></div>
                            <div style="font-size:12px;font-weight:600"><?php echo esc_html( $s['title'] ); ?></div>
                            <div style="font-size:10px;color:#6b7280"><?php echo esc_html( $s['desc'] ); ?></div>
                        </label>
                        <?php endforeach; ?>
                    </div>
                </div>

            </div>
        </div>

        <div class="smva-action-bar">
            <span id="smva-save-msg" class="smva-save-msg"></span>
            <button type="submit" class="smva-btn smva-btn-primary">Save General Settings</button>
        </div>

        <div class="smva-card">
            <div class="smva-card-header"><h2 class="smva-card-title">Embed Shortcode</h2></div>
            <div class="smva-shortcode-wrap">
                <code class="smva-code" onclick="navigator.clipboard.writeText('[smva_widget]');this.textContent='Copied!';setTimeout(()=>this.textContent='[smva_widget]',2000)">[smva_widget]</code>
                <span class="smva-hint">Click to copy — paste anywhere on your site</span>
            </div>
        </div>
    </form>

    <?php // ── AGENT TAB ────────────────────────────────────────────────── ?>
    <?php elseif ( $active_tab === 'agent' ) :
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $agent = array();
        if ( $license_key && $internal_token ) {
            $r = wp_remote_post( SMVA_API_URL . '/plugin/license/agent/get', array(
                'headers' => array( 'Content-Type' => 'application/json' ),
                'body'    => wp_json_encode( array( 'license_key' => $license_key, 'internal_token' => $internal_token ) ),
                'timeout' => 10,
            ));
            if ( ! is_wp_error($r) ) $agent = json_decode( wp_remote_retrieve_body($r), true ) ?: array();
        }
    ?>
    <form id="smva-agent-form">

        <div class="smva-card">
            <div class="smva-card-header">
                <h2 class="smva-card-title">Knowledge Base</h2>
                <span class="smva-step-badge">Step 1</span>
            </div>
            <p class="smva-desc">Add your business information here. The more detail, the better your agent will perform. You can import it automatically from your website.</p>

            <div class="smva-field smva-field-full" style="margin-bottom:12px">
                <label style="font-size:12px;color:#6b7280;margin-bottom:4px;display:block">Website URL to import from:</label>
                <div style="display:flex;gap:8px">
                    <input type="text" id="smva-crawl-url" class="smva-input" placeholder="<?php echo esc_attr( get_site_url() ); ?>" value="<?php echo esc_attr( get_site_url() ); ?>" style="flex:1">
                    <button type="button" id="smva-crawl-btn" class="smva-btn smva-btn-green" style="flex:none" title="Crawl your website and build knowledge base automatically">
                        🌐 Import from Website
                    </button>
                </div>
            </div>

            <textarea name="knowledge_base" class="smva-textarea" rows="8" placeholder="## Business Name&#10;Your Company&#10;&#10;## Services&#10;- Service 1&#10;- Service 2&#10;&#10;## Hours&#10;Mon-Fri: 9am-5pm&#10;&#10;## Contact&#10;Email: info@example.com"><?php echo esc_textarea( $agent['knowledge_base'] ?? '' ); ?></textarea>
        </div>

        <div class="smva-card">
            <div class="smva-card-header">
                <h2 class="smva-card-title">System Prompt</h2>
                <span class="smva-step-badge">Step 2</span>
            </div>
            <p class="smva-desc">Instructions for how your agent should behave and respond. Fill in the Knowledge Base first, then generate or write your system prompt.</p>

            <textarea name="system_prompt" class="smva-textarea" rows="6" placeholder="You are a helpful assistant for [Business Name]. You help customers with questions about our services, pricing, and booking appointments. Always be friendly and professional."><?php echo esc_textarea( $agent['system_prompt'] ?? '' ); ?></textarea>


        </div>

        <div class="smva-card">
            <div class="smva-card-header">
                <h2 class="smva-card-title">Suggested Questions</h2>
                <span class="smva-step-badge">Step 3</span>
            </div>
            <p class="smva-desc">Quick question chips shown in the widget. One per line.</p>
            <textarea name="smva_suggested_questions" class="smva-textarea" rows="5" placeholder="What are your opening hours?&#10;How can I book an appointment?&#10;What services do you offer?"><?php
                $sq = get_option( 'smva_suggested_questions', '' );
                $sq_arr = json_decode( $sq, true );
                if ( is_array($sq_arr) ) echo esc_textarea( implode("\n", $sq_arr) );
                else echo esc_textarea( $sq );
            ?></textarea>
        </div>

        <!-- Loading indicator -->
        <div id="smva-agent-loading" class="smva-loading-bar">
            <div class="smva-loading-inner">
                <div class="smva-spinner"></div>
                <span id="smva-loading-text" class="smva-loading-text">Processing...</span>
            </div>
        </div>

        <div class="smva-action-bar">
            <span id="smva-agent-msg" class="smva-save-msg"></span>
            <button type="button" id="smva-optimize-btn" class="smva-btn smva-btn-purple">✨ Optimize with AI</button>
            <button type="submit" class="smva-btn smva-btn-primary">💾 Save &amp; Sync Agent</button>
        </div>

    </form>
    <script>
    function smvaSelectStyle(val) {
        document.querySelectorAll('[name=response_style]').forEach(function(r) {
            r.checked = r.value === val;
            var lbl = r.closest('label');
            if (lbl) lbl.style.borderColor = r.value === val ? '#2563eb' : '#e5e7eb';
        });
    }
    </script>

    <?php // ── WIDGET TAB ───────────────────────────────────────────────── ?>
    <?php elseif ( $active_tab === 'widget' ) : ?>
    <form id="smva-widget-form">

        <div class="smva-card" style="margin-bottom:16px">
            <div class="smva-card-header"><h2 class="smva-card-title">Agent Logo</h2></div>
            <div class="smva-card-body">
                <div class="smva-field">
                    <label>Agent Logo</label>
                    <div style="display:flex;align-items:center;gap:12px;margin-top:6px;">
                        <div id="smva-logo-preview" style="width:52px;height:52px;border-radius:50%;border:2px solid #e5e7eb;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f9fafb;flex-shrink:0;">
                            <?php $logo = get_option('smva_agent_logo',''); ?>
                            <?php if ($logo) : ?>
                            <img src="<?php echo esc_url($logo); ?>" style="width:100%;height:100%;object-fit:cover;" id="smva-logo-img" />
                            <?php else : ?>
                            <svg id="smva-logo-img" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            <?php endif; ?>
                        </div>
                        <div style="flex:1">
                            <input type="hidden" name="smva_agent_logo" id="smva_agent_logo" value="<?php echo esc_attr( get_option('smva_agent_logo','') ); ?>">
                            <button type="button" id="smva-logo-upload" class="button">📁 Choose from Media</button>
                            <?php if ( get_option('smva_agent_logo','') ) : ?>
                            <button type="button" id="smva-logo-remove" class="button" style="margin-left:6px;color:#dc2626;">Remove</button>
                            <?php endif; ?>
                            <p style="margin-top:4px;font-size:12px;color:#6b7280">Square image recommended. Leave empty to use default icon.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="smva-card" style="margin-bottom:16px">
            <div class="smva-card-header"><h2 class="smva-card-title">Widget Theme</h2></div>
            <p class="smva-desc">Choose the visual style of your AI widget.</p>
            <div id="smva-theme-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px">
                <?php
                $current_theme = get_option('smva_widget_theme','classic');
                $themes = [
                    'classic'  => ['Classic',    '#2563eb', '#2563eb', '#fff',    '#f4f4f5'],
                    'floating' => ['Floating',   '#2563eb', '#fff',    '#111827', '#f0f0f0'],
                    'soft'     => ['Soft Round', '#3b82f6', '#fff',    '#111827', '#f0f0f0'],
                    'dark'     => ['Dark Modern','#818cf8', '#0f172a', '#e0e7ff', '#ffffff12'],
                    'glass'    => ['Glass',      '#2563eb', '#dbeafe', '#1e3a8a', '#ffffff80'],
                    'gradient' => ['Gradient',   '#764ba2', '#667eea', '#fff',    '#f4f4f5'],
                ];
                foreach ($themes as $key => $info ) :
                    $is_active = $current_theme === $key;
                    $border = $is_active ? '2px solid #2563eb' : '1.5px solid #e2e8f0';
                    $bg = $is_active ? '#eff6ff' : '#fff';
                ?>
                <div class="smva-theme-card" data-theme="<?php echo esc_attr($key); ?>"
                     style="border-radius:12px;padding:10px;cursor:pointer;text-align:center;transition:all .15s;border:<?php echo esc_attr( $border ); ?>;background:<?php echo esc_attr( $bg ); ?>">
                    <?php /* Mini widget preview */ ?>
                    <div style="width:100%;border-radius:8px;overflow:hidden;margin-bottom:8px;border:0.5px solid rgba(0,0,0,.08)">
                        <div style="padding:6px 8px;background:<?php echo esc_attr($info[2]); ?>;display:flex;align-items:center;gap:4px">
                            <div style="width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.25)"></div>
                            <div style="flex:1">
                                <div style="height:4px;border-radius:2px;background:<?php echo esc_attr($info[3]); ?>;opacity:.8;width:60%;margin-bottom:2px"></div>
                                <div style="height:3px;border-radius:2px;background:<?php echo esc_attr($info[3]); ?>;opacity:.4;width:35%"></div>
                            </div>
                        </div>
                        <div style="padding:6px 8px;background:<?php echo $key==='dark'?'#1e293b':'#f9fafb'; ?>;display:flex;flex-direction:column;gap:3px">
                            <div style="background:<?php echo esc_attr($info[4]); ?>;border-radius:5px 5px 5px 1px;padding:3px 6px;font-size:8px;color:<?php echo $key==='dark'?'#e2e8f0':'#374151'; ?>;align-self:flex-start;max-width:80%">Hello!</div>
                            <div style="background:<?php echo esc_attr($info[1]); ?>;border-radius:5px 5px 1px 5px;padding:3px 6px;font-size:8px;color:#fff;align-self:flex-end;max-width:70%">Hi there</div>
                        </div>
                        <div style="padding:4px 6px;background:<?php echo $key==='dark'?'#0f172a':'#fff'; ?>;display:flex;gap:3px;border-top:0.5px solid <?php echo $key==='dark'?'rgba(255,255,255,.06)':'#f0f0f0'; ?>">
                            <div style="flex:1;height:12px;background:<?php echo $key==='dark'?'rgba(255,255,255,.06)':'#f3f4f6'; ?>;border-radius:4px"></div>
                            <div style="width:14px;height:12px;background:<?php echo esc_attr($info[1]); ?>;border-radius:3px"></div>
                        </div>
                    </div>
                    <div style="font-size:11px;font-weight:500;color:#374151"><?php echo esc_html($info[0]); ?></div>
                    <div class="smva-theme-check" style="font-size:10px;color:#2563eb;margin-top:2px;<?php echo $is_active?'':'display:none'; ?>">✓ Selected</div>
                </div>
                <?php endforeach; ?>
            </div>
            <input type="hidden" name="smva_widget_theme" id="smva_widget_theme" value="<?php echo esc_attr(get_option('smva_widget_theme','classic')); ?>">
        </div>

        <div class="smva-card">
            <div class="smva-card-header"><h2 class="smva-card-title">Voice &amp; Chat</h2></div>
            <div class="smva-form-grid">

                <div class="smva-field">
                    <label>Default Tab</label>
                    <select name="smva_default_tab" class="smva-select">
                        <option value="voice" <?php selected( get_option('smva_default_tab','voice'), 'voice' ); ?>>Voice</option>
                        <option value="chat"  <?php selected( get_option('smva_default_tab','voice'), 'chat' ); ?>>Chat</option>
                    </select>
                </div>

                <div class="smva-field">
                    <label>Enabled Modes</label>
                    <div style="display:flex;gap:16px;margin-top:4px">
                        <label class="smva-toggle-label"><input type="checkbox" name="smva_voice_enabled" value="1" <?php checked( get_option('smva_voice_enabled','1'), '1' ); ?>> 🎙️ Voice</label>
                        <label class="smva-toggle-label"><input type="checkbox" name="smva_chat_enabled"  value="1" <?php checked( get_option('smva_chat_enabled','1'),  '1' ); ?>> 💬 Chat</label>
                    </div>
                </div>

            </div>
        </div>

        <div class="smva-card">
            <div class="smva-card-header">
                <h2 class="smva-card-title">Call Limits</h2>
                <span class="smva-hint-inline">prevent abuse</span>
            </div>
            <div class="smva-limits-grid">
                <div class="smva-limit-item">
                    <div class="smva-limit-header">
                        <label class="smva-limit-label">Max Call Duration</label>
                        <span class="smva-limit-unit">minutes &middot; 0 = off</span>
                    </div>
                    <div class="smva-limit-ctrl">
                        <button type="button" class="smva-lim-btn" onclick="smvaLimStep('smva_max_call_duration',-1)">&minus;</button>
                        <input type="number" name="smva_max_call_duration" id="smva_max_call_duration" class="smva-lim-input" min="0" max="60" value="<?php echo intval( get_option('smva_max_call_duration',10) ); ?>">
                        <button type="button" class="smva-lim-btn" onclick="smvaLimStep('smva_max_call_duration',1)">+</button>
                    </div>
                    <p class="smva-hint">Auto-disconnect after this many minutes.</p>
                </div>
                <div class="smva-limit-item">
                    <div class="smva-limit-header">
                        <label class="smva-limit-label">Silence Timeout</label>
                        <span class="smva-limit-unit">seconds &middot; 0 = off</span>
                    </div>
                    <div class="smva-limit-ctrl">
                        <button type="button" class="smva-lim-btn" onclick="smvaLimStep('smva_silence_timeout',-5)">&minus;</button>
                        <input type="number" name="smva_silence_timeout" id="smva_silence_timeout" class="smva-lim-input" min="0" max="300" value="<?php echo intval( get_option('smva_silence_timeout',60) ); ?>">
                        <button type="button" class="smva-lim-btn" onclick="smvaLimStep('smva_silence_timeout',5)">+</button>
                    </div>
                    <p class="smva-hint">Auto-disconnect after this many seconds of silence.</p>
                </div>
                <div class="smva-limit-item">
                    <div class="smva-limit-header">
                        <label class="smva-limit-label">Call Cooldown</label>
                        <span class="smva-limit-unit">seconds &middot; 0 = off</span>
                    </div>
                    <div class="smva-limit-ctrl">
                        <button type="button" class="smva-lim-btn" onclick="smvaLimStep('smva_call_cooldown',-10)">&minus;</button>
                        <input type="number" name="smva_call_cooldown" id="smva_call_cooldown" class="smva-lim-input" min="0" max="3600" value="<?php echo intval( get_option('smva_call_cooldown',30) ); ?>">
                        <button type="button" class="smva-lim-btn" onclick="smvaLimStep('smva_call_cooldown',10)">+</button>
                    </div>
                    <p class="smva-hint">Minimum wait between calls to prevent abuse.</p>
                </div>
            </div>
            <style>
            .smva-limits-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-top:4px}
            .smva-limit-item{background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
            .smva-limit-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
            .smva-limit-label{font-size:13px;font-weight:600;color:#374151}
            .smva-limit-unit{font-size:10px;color:#9ca3af}
            .smva-limit-ctrl{display:flex;align-items:center;border:1.5px solid #d1d5db;border-radius:10px;overflow:hidden;background:#fff}
            .smva-lim-btn{width:36px;height:36px;border:none;background:transparent;font-size:18px;color:#374151;cursor:pointer;flex-shrink:0;transition:background .15s}
            .smva-lim-btn:hover{background:#f3f4f6}
            .smva-lim-input{flex:1;border:none;outline:none;text-align:center;font-size:16px;font-weight:600;color:#111;background:transparent;-moz-appearance:textfield;min-width:0}
            .smva-lim-input::-webkit-inner-spin-button,.smva-lim-input::-webkit-outer-spin-button{-webkit-appearance:none}
            </style>
            <script>
            function smvaLimStep(id, step) {
                var el = document.getElementById(id);
                if (!el) return;
                var val = parseInt(el.value) || 0;
                var min = parseInt(el.min) || 0;
                var max = parseInt(el.max) || 9999;
                el.value = Math.min(max, Math.max(min, val + step));
            }
            </script>
            <div class="smva-card-footer">
                <button type="submit" class="smva-btn smva-btn-primary">Save Widget Settings</button>
                <span id="smva-widget-save-msg" class="smva-save-msg"></span>
            </div>
        </div>

    </form>

    <div class="smva-card" style="margin-top:16px">
        <div class="smva-card-header"><h2 class="smva-card-title">Embed</h2></div>
        <p class="smva-desc">Add the widget to any page using the shortcode, or it loads automatically on all pages when the plugin is active.</p>
        <div style="display:flex;align-items:center;gap:12px">
            <code class="smva-code" onclick="navigator.clipboard.writeText('[smva_widget]');this.textContent='Copied!';setTimeout(()=>this.textContent='[smva_widget]',2000)">[smva_widget]</code>
            <span class="smva-hint">Click to copy</span>
        </div>
    </div>

    <?php // ── AUTOMATION TAB ───────────────────────────────────────────── ?>
    <?php elseif ( $active_tab === 'automation' ) :
        $license_key    = get_option( 'smva_license_key', '' );
        $internal_token = get_option( 'smva_internal_token', '' );
        $adata = array();
        if ( $license_key && $internal_token ) {
            $r = wp_remote_post( SMVA_API_URL . '/plugin/license/agent/get', array(
                'headers' => array( 'Content-Type' => 'application/json' ),
                'body'    => wp_json_encode( array( 'license_key' => $license_key, 'internal_token' => $internal_token ) ),
                'timeout' => 10,
            ));
            if ( ! is_wp_error($r) ) $adata = json_decode( wp_remote_retrieve_body($r), true ) ?: array();
        }
        $tools_raw = $adata['agent_tools'] ?? [];
        $tools     = is_array($tools_raw) ? json_encode($tools_raw) : ($tools_raw ?: '[]');
        $tools_arr = json_decode( $tools, true ) ?: array();
        $webhook   = $adata['webhook_url'] ?? '';
    ?>

    <div class="smva-card">
        <div class="smva-card-header">
            <h2 class="smva-card-title">Automation Webhook</h2>
            <span class="smva-badge" style="background:#e0f2fe;color:#0369a1">Agentic</span>
        </div>
        <p class="smva-desc">Connect your AI agent to any automation platform (n8n, Make, Zapier). When the agent needs to take an action, it will call your webhook URL and wait for a result.</p>
        <div class="smva-field smva-field-full" style="margin-bottom:12px">
            <label>Webhook URL — <span style="color:#9ca3af;font-weight:400">your n8n / Make / Zapier webhook</span></label>
            <input type="text" id="smva-webhook-url" class="smva-input" placeholder="https://your-n8n.io/webhook/your-unique-path" value="<?php echo esc_attr($webhook); ?>">
        </div>
        <div class="smva-info-box" style="margin-bottom:12px">
            Your webhook receives: <code>tool_name</code>, <code>arguments</code>, <code>license_key</code>, <code>session_id</code>. Return: <code>{"result": "your response"}</code>
        </div>
        <div class="smva-card-footer">
            <button type="button" id="smva-save-webhook-btn" class="smva-btn smva-btn-primary">Save Webhook URL</button>
            <span id="smva-webhook-msg" class="smva-save-msg"></span>
        </div>
    </div>

    <div class="smva-card" style="margin-top:16px">
        <div class="smva-card-header"><h2 class="smva-card-title">Agent Tools</h2></div>
        <p class="smva-desc">Define what actions your agent can perform. Each tool triggers your webhook with the tool name and collected parameters.</p>

        <div id="smva-tools-list">
            <?php if ( empty($tools_arr) ) : ?>
            <p style="color:#9ca3af;font-size:13px;text-align:center;padding:16px 0">No tools defined yet. Add a tool below.</p>
            <?php else : ?>
            <?php foreach ( $tools_arr as $i => $tool ) : ?>
            <div class="smva-tool-item" style="background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                    <code style="font-size:13px;font-weight:600"><?php echo esc_html($tool['name'] ?? ''); ?></code>
                    <div style="display:flex;gap:6px">
                        <button type="button" class="smva-btn" style="padding:4px 10px;font-size:12px;flex:none;background:#e0f2fe;color:#0369a1" onclick="smvaEditTool(<?php echo (int) $i; ?>)">Edit</button>
                        <button type="button" class="smva-btn smva-btn-danger" style="padding:4px 10px;font-size:12px;flex:none" onclick="smvaRemoveTool(<?php echo (int) $i; ?>)">Remove</button>
                    </div>
                </div>
                <div style="font-size:12px;color:#6b7280"><?php echo esc_html($tool['description'] ?? ''); ?></div>
            </div>
            <?php endforeach; ?>
            <?php endif; ?>
        </div>

        <div style="margin-top:12px;text-align:center">
            <button type="button" id="smva-add-tool-btn" class="smva-btn smva-btn-primary" style="flex:none">Add Tool +</button>
        </div>

        <!-- Add Tool Modal -->
        <div id="smva-tool-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:999999;align-items:center;justify-content:center">
            <div style="background:#fff;border-radius:14px;padding:28px;width:560px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.2)">
                <h2 style="font-size:18px;font-weight:700;margin:0 0 20px;text-align:center" id="smva-modal-title">Add Tool</h2>
                <div class="smva-field smva-field-full" style="margin-bottom:14px">
                    <label style="text-align:right;display:block">Tool Name <span style="color:#9ca3af;font-weight:400">(lowercase, no spaces)</span></label>
                    <input type="text" id="smva-tool-name" class="smva-input" placeholder="e.g. book_appointment">
                </div>
                <div class="smva-field smva-field-full" style="margin-bottom:14px">
                    <label style="text-align:right;display:block">Description <span style="color:#9ca3af;font-weight:400">(tell the agent when to use this tool)</span></label>
                    <textarea id="smva-tool-desc" class="smva-textarea" rows="3" placeholder="Use this tool to book, update, or cancel an appointment..."></textarea>
                </div>
                <div class="smva-field smva-field-full" style="margin-bottom:14px">
                    <label style="text-align:right;display:block">Thinking Message <span style="color:#9ca3af;font-weight:400">(shown while processing)</span></label>
                    <input type="text" id="smva-tool-thinking" class="smva-input" placeholder="Let me check availability...">
                </div>
                <div class="smva-field smva-field-full" style="margin-bottom:6px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <label style="margin:0">Parameters</label>
                        <button type="button" id="smva-add-param-btn" class="smva-btn" style="background:#e0f2fe;color:#0369a1;padding:4px 12px;font-size:12px;flex:none">Add Parameter +</button>
                    </div>
                    <div id="smva-params-list"></div>
                </div>
                <div style="display:flex;gap:10px;margin-top:20px">
                    <button type="button" id="smva-save-tool-btn" class="smva-btn smva-btn-primary">Save Tool</button>
                    <button type="button" id="smva-cancel-tool-btn" class="smva-btn" style="background:#f3f4f6;color:#374151">Cancel</button>
                </div>
            </div>
        </div>

        <input type="hidden" id="smva-tools-json" value="<?php echo esc_attr($tools); ?>">
        <div class="smva-card-footer" style="margin-top:12px">
            <button type="button" id="smva-save-tools-btn" class="smva-btn smva-btn-primary">Save &amp; Sync Tools</button>
            <span id="smva-tools-msg" class="smva-save-msg"></span>
        </div>
    </div>

    <?php elseif ( $active_tab === 'history' ) : ?>

    <div class="smva-card">
        <div class="smva-card-header">
            <h2 class="smva-card-title">Chat History</h2>
            <div style="display:flex;gap:8px;align-items:center">
                <input type="text" id="smva-history-search" placeholder="Search..." style="border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px;font-size:13px;width:200px">
                <button id="smva-history-refresh" class="smva-btn smva-btn-secondary" style="padding:6px 14px;font-size:13px">↻ Refresh</button>
            </div>
        </div>
        <p class="smva-desc">All chat conversations from your AI widget.</p>
        <div id="smva-history-loading" style="text-align:center;padding:40px;color:#9ca3af">Loading...</div>
        <div id="smva-history-empty" style="display:none;text-align:center;padding:40px;color:#9ca3af">No chat history yet.</div>
        <div id="smva-history-list" style="display:none;flex-direction:column;gap:12px;margin-top:8px"></div>
    </div>

    <style>
    .smva-session-card{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:8px}
    .smva-session-hdr{padding:12px 16px;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;cursor:pointer}
    .smva-session-hdr:hover{background:#f1f5f9}
    .smva-session-preview{font-size:13px;color:#374151;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px}
    .smva-session-meta{font-size:11px;color:#9ca3af;margin-top:2px}
    .smva-session-msgs{display:none;padding:16px;flex-direction:column;gap:8px;border-top:1px solid #f0f0f0}
    .smva-session-msgs.open{display:flex}
    .smva-bubble{padding:8px 12px;border-radius:10px;font-size:13px;line-height:1.5;max-width:80%;word-break:break-word}
    .smva-bubble-user{background:#2563eb;color:#fff;align-self:flex-end;border-bottom-right-radius:3px}
    .smva-bubble-bot{background:#f3f4f6;color:#111827;align-self:flex-start;border-bottom-left-radius:3px}
    .smva-bubble-wrap{display:flex;flex-direction:column}
    .smva-bubble-time{font-size:10px;color:#9ca3af;margin-top:2px}
    </style>

    <script>
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
    </script>

<?php elseif ( $active_tab === 'voice_summary' ) : ?>
<div class="smva-vs-wrap">
  <h2>Voice Summary</h2>
  <div class="smva-vs-filter-row">
    <label>From <input type="date" id="smva-vs-date-from" /></label>
    <label>To <input type="date" id="smva-vs-date-to" /></label>
    <button class="button button-primary" id="smva-vs-search-btn">Search</button>
  </div>
  <table class="widefat smva-vs-table">
    <thead><tr><th>Date</th><th>Duration</th><th>Turns</th><th>Summary</th><th>Actions</th></tr></thead>
    <tbody id="smva-vs-tbody"><tr><td colspan="5" style="text-align:center;padding:20px;">Click Search to load sessions.</td></tr></tbody>
  </table>
  <div id="smva-vs-pagination"></div>
  <div id="smva-vs-modal" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:6px;box-shadow:0 8px 32px rgba(0,0,0,.25);z-index:99999;width:min(90vw,720px);max-height:85vh;flex-direction:column;overflow:hidden;">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #ddd;">
      <h3 id="smva-vs-modal-title" style="margin:0;">Session Transcript</h3>
      <button id="smva-vs-modal-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666;">&times;</button>
    </div>
    <div style="padding:20px;overflow-y:auto;flex:1;">
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong>AI Summary</strong>
          <button class="button" id="smva-vs-summarize-btn">Generate Summary</button>
        </div>
        <div id="smva-vs-summary-text" style="background:#f6f7f7;border-left:4px solid #2271b1;padding:10px 14px;border-radius:0 4px 4px 0;font-size:13px;line-height:1.6;min-height:40px;"><em>No summary yet.</em></div>
      </div>
      <hr />
      <div id="smva-vs-transcript-body"><p>Loading...</p></div>
    </div>
  </div>
  <div id="smva-vs-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99998;"></div>
</div>
    <?php endif; ?>
    </div><!-- .smva-tab-content -->

    <!-- ── Upgrade Modal ─────────────────────────────────────────────── -->
    <div id="smva-upgrade-modal" class="smva-modal-overlay" style="display:none">
        <div class="smva-modal" style="max-width:700px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                <div>
                    <h2 style="margin:0;font-size:18px;font-weight:700;color:#0f172a">Choose Your Plan</h2>
                    <p style="margin:4px 0 0;font-size:13px;color:#64748b">Upgrade to unlock full voice &amp; chat capabilities</p>
                </div>
                <button id="smva-upgrade-modal-close" style="background:none;border:none;cursor:pointer;font-size:20px;color:#94a3b8;padding:4px">✕</button>
            </div>

            <div id="smva-plans-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
                <!-- Plans loaded via JS -->
                <div style="grid-column:1/-1;text-align:center;padding:20px;color:#94a3b8;font-size:13px">Loading plans...</div>
            </div>

            <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0">
                Secure payment via Stripe · Cancel anytime · License key sent by email after payment
            </p>
        </div>
    </div>
</div><!-- .smva-tab-content -->
</div><!-- .smva-main -->
</div><!-- .smva-admin-wrap -->
