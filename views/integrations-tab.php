<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>
<?php
$smva_hs_connected = get_option( 'smva_hubspot_connected', '0' ) === '1';

// Phone (Twilio). The auth token is never stored locally — only these
// non-secret display values, written after the backend confirms a connection.
$smva_phone_connected = get_option( 'smva_phone_connected', '0' ) === '1';
$smva_phone_number    = get_option( 'smva_phone_number', '' );
$smva_phone_sid_mask  = get_option( 'smva_phone_sid_masked', '' );
$smva_phone_webhook   = SMVA_API_URL . '/twilio/voice';
$smva_is_trial        = get_option( 'smva_plan', '' ) === 'trial';
?>
<div class="smva-tab-content">
    <div class="smva-section">
        <div class="smva-section-title">CRM Integrations</div>
        <p class="smva-section-desc">Connect your CRM to automatically sync leads captured by the voice and chat widget.</p>
        <div class="smva-integration-card">
            <div class="smva-int-header">
                <div class="smva-int-logo">
                    <svg viewBox="0 0 60 60" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="30" cy="30" r="30" fill="#FF7A59"/>
                        <path d="M34 22v-7a4 4 0 1 0-8 0v7l-10 7v5l10-3v6l-3 2v3l7-2 7 2v-3l-3-2v-6l10 3v-5l-10-7z" fill="#fff"/>
                    </svg>
                </div>
                <div>
                    <div class="smva-int-name">
                        HubSpot
                        <?php if ( $smva_hs_connected ) : ?>
                            <span class="smva-int-badge-connected">&#10003; Connected</span>
                        <?php endif; ?>
                    </div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px">Sync leads to HubSpot Contacts automatically</div>
                </div>
            </div>
            <?php if ( $smva_hs_connected ) : ?>
                <div class="smva-int-connected-row">
                    <span style="font-size:13px;color:#374151">Leads are syncing to your HubSpot account.</span>
                    <button class="smva-btn smva-btn-ghost smva-btn-sm" id="smva-hubspot-disconnect">Disconnect</button>
                </div>
            <?php else : ?>
                <div>
                    <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px">Private App Token</label>
                    <div class="smva-int-token-row">
                        <input type="password" id="smva-hubspot-token" class="smva-int-token-input" placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                        <button class="smva-btn smva-btn-primary smva-btn-sm" id="smva-hubspot-save">
                            <span class="smva-hs-label">Connect</span>
                            <span class="smva-hs-spinner" style="display:none">Verifying...</span>
                        </button>
                    </div>
                    <div class="smva-int-hint">
                        Get your token from HubSpot:
                        <a href="https://app.hubspot.com/private-apps" target="_blank">Settings &rarr; Integrations &rarr; Private Apps &rarr; Create a private app</a><br>
                        Required scopes: <code>crm.objects.contacts.write</code> and <code>crm.objects.contacts.read</code>
                    </div>
                    <div id="smva-hs-msg" class="smva-int-msg"></div>
                </div>
            <?php endif; ?>
        </div>
        <div class="smva-integration-card smva-int-disabled">
            <div class="smva-int-header" style="margin-bottom:0">
                <div class="smva-int-logo" style="background:#e8f4fb;border-color:#bde3f5">
                    <svg viewBox="0 0 60 60" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                        <ellipse cx="30" cy="30" rx="24" ry="19" fill="#00A1E0"/>
                        <text x="30" y="37" text-anchor="middle" font-size="14" font-weight="bold" fill="white" font-family="sans-serif">SF</text>
                    </svg>
                </div>
                <div style="flex:1">
                    <div class="smva-int-name" style="opacity:.5">Salesforce</div>
                    <div style="font-size:12px;color:#9ca3af;margin-top:2px">Coming soon</div>
                </div>
                <span class="smva-int-badge-soon">Coming Soon</span>
            </div>
        </div>
    </div>

    <div class="smva-section">
        <div class="smva-section-title">Phone</div>
        <p class="smva-section-desc">Let your agent answer real calls to a phone number you own. You connect your own Twilio account and pay Twilio directly for call minutes and number rental &mdash; StudioMeta never bills you for those. Talk time counts against the same monthly voice minutes as the widget.</p>

        <div class="smva-integration-card">
            <div class="smva-int-header">
                <div class="smva-int-logo smva-int-logo-twilio">
                    <svg viewBox="0 0 60 60" width="28" height="28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                        <circle cx="30" cy="30" r="30" fill="#F22F46"/>
                        <circle cx="30" cy="30" r="17" fill="none" stroke="#fff" stroke-width="6"/>
                        <circle cx="24.5" cy="24.5" r="4" fill="#fff"/>
                        <circle cx="35.5" cy="24.5" r="4" fill="#fff"/>
                        <circle cx="24.5" cy="35.5" r="4" fill="#fff"/>
                        <circle cx="35.5" cy="35.5" r="4" fill="#fff"/>
                    </svg>
                </div>
                <div class="smva-int-grow">
                    <div class="smva-int-name">
                        Twilio
                        <?php if ( $smva_phone_connected ) : ?>
                            <span class="smva-int-badge-connected">&#10003; Connected</span>
                        <?php endif; ?>
                    </div>
                    <div class="smva-int-sub">Answer inbound calls to your own phone number</div>
                </div>
            </div>

            <?php if ( $smva_is_trial && ! $smva_phone_connected ) : ?>
                <div class="smva-int-msg smva-int-msg-static err">
                    Phone answering is available on paid plans. <a href="<?php echo esc_url( admin_url( 'admin.php?page=smva&tab=license' ) ); ?>">Upgrade your plan</a> to connect a number.
                </div>
            <?php endif; ?>

            <div id="smva-phone-connected" class="<?php echo $smva_phone_connected ? '' : 'smva-hidden'; ?>">
                <div class="smva-int-connected-row">
                    <span class="smva-phone-status-text">
                        Answering calls to <strong id="smva-phone-number-label"><?php echo esc_html( $smva_phone_number ); ?></strong><?php if ( $smva_phone_sid_mask ) : ?> &middot; <span class="smva-phone-sid"><?php echo esc_html( $smva_phone_sid_mask ); ?></span><?php endif; ?>
                    </span>
                    <button type="button" class="smva-btn smva-btn-ghost smva-btn-sm" id="smva-phone-disconnect">Disconnect</button>
                </div>
            </div>

            <div id="smva-phone-form" class="<?php echo $smva_phone_connected ? 'smva-hidden' : ''; ?>">
                <div class="smva-phone-fields">
                    <div class="smva-phone-field">
                        <label class="smva-phone-label" for="smva-phone-sid">Account SID</label>
                        <input type="text" id="smva-phone-sid" class="smva-int-token-input" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" autocomplete="off">
                    </div>
                    <div class="smva-phone-field">
                        <label class="smva-phone-label" for="smva-phone-token">Auth Token</label>
                        <input type="password" id="smva-phone-token" class="smva-int-token-input" placeholder="Your Twilio auth token" autocomplete="new-password">
                    </div>
                    <div class="smva-phone-field">
                        <label class="smva-phone-label" for="smva-phone-number">Phone Number</label>
                        <input type="text" id="smva-phone-number" class="smva-int-token-input" placeholder="+15551234567" autocomplete="off">
                    </div>
                </div>
                <div class="smva-phone-actions">
                    <button type="button" class="smva-btn smva-btn-primary smva-btn-sm" id="smva-phone-save">
                        <span class="smva-phone-label-text">Connect</span>
                        <span class="smva-phone-spinner smva-hidden">Verifying&hellip;</span>
                    </button>
                </div>
                <div class="smva-int-hint">
                    Find your Account SID and Auth Token on the
                    <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer">Twilio Console</a> dashboard.
                    Enter the number in E.164 format, e.g. <code>+15551234567</code>.
                </div>
            </div>

            <div id="smva-phone-msg" class="smva-int-msg"></div>

            <div class="smva-phone-webhook">
                <label class="smva-phone-label" for="smva-phone-webhook-url">Webhook URL &mdash; paste this into Twilio</label>
                <div class="smva-int-token-row">
                    <input type="text" id="smva-phone-webhook-url" class="smva-int-token-input" value="<?php echo esc_attr( $smva_phone_webhook ); ?>" readonly>
                    <button type="button" class="smva-btn smva-btn-ghost smva-btn-sm" id="smva-phone-copy-webhook">Copy</button>
                </div>
                <div class="smva-int-hint">
                    In the Twilio Console open your number, and under <em>Voice &rarr; A call comes in</em> choose <strong>Webhook</strong>, paste this URL, and set the method to <strong>HTTP POST</strong>.
                </div>
            </div>
        </div>
    </div>
</div><!-- .smva-tab-content -->
