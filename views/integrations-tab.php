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

// Transfer-to-human departments. Held on the backend next to the rest of the
// agent config rather than in wp_options, so the agent and this screen can
// never disagree about which numbers are live. Only fetched when a number is
// actually connected — there is nothing to transfer otherwise.
$smva_transfer = array(
	'enabled'      => false,
	'ring_timeout' => 25,
	'departments'  => array(),
);
if ( $smva_phone_connected ) {
	$smva_lk = get_option( 'smva_license_key', '' );
	$smva_it = get_option( 'smva_internal_token', '' );
	if ( $smva_lk && $smva_it ) {
		$smva_r = wp_remote_post(
			SMVA_API_URL . '/plugin/license/agent/get',
			array(
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode( array( 'license_key' => $smva_lk, 'internal_token' => $smva_it ) ),
				'timeout' => 10,
			)
		);
		if ( ! is_wp_error( $smva_r ) ) {
			$smva_agent = json_decode( wp_remote_retrieve_body( $smva_r ), true );
			$smva_tc    = $smva_agent['transfer_config'] ?? array();
			if ( is_string( $smva_tc ) ) {
				$smva_tc = json_decode( $smva_tc, true );
			}
			if ( is_array( $smva_tc ) ) {
				$smva_transfer['enabled']      = ! empty( $smva_tc['enabled'] );
				$smva_transfer['ring_timeout'] = (int) ( $smva_tc['ring_timeout'] ?? 25 );
				$smva_transfer['departments']  = isset( $smva_tc['departments'] ) && is_array( $smva_tc['departments'] )
					? $smva_tc['departments']
					: array();
			}
		}
	}
}
$smva_transfer_json = wp_json_encode( $smva_transfer );
?>
<div class="smva-tab-content">
    <div class="smva-section">
        <div class="smva-section-title"><?php esc_html_e( 'CRM Integrations', 'studiometa-voice-ai' ); ?></div>
        <p class="smva-section-desc"><?php esc_html_e( 'Connect your CRM to automatically sync leads captured by the voice and chat widget.', 'studiometa-voice-ai' ); ?></p>
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
                            <span class="smva-int-badge-connected">&#10003; <?php esc_html_e( 'Connected', 'studiometa-voice-ai' ); ?></span>
                        <?php endif; ?>
                    </div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px"><?php esc_html_e( 'Sync leads to HubSpot Contacts automatically', 'studiometa-voice-ai' ); ?></div>
                </div>
            </div>
            <?php if ( $smva_hs_connected ) : ?>
                <div class="smva-int-connected-row">
                    <span style="font-size:13px;color:#374151"><?php esc_html_e( 'Leads are syncing to your HubSpot account.', 'studiometa-voice-ai' ); ?></span>
                    <button class="smva-btn smva-btn-ghost smva-btn-sm" id="smva-hubspot-disconnect"><?php esc_html_e( 'Disconnect', 'studiometa-voice-ai' ); ?></button>
                </div>
            <?php else : ?>
                <div>
                    <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px"><?php esc_html_e( 'Private App Token', 'studiometa-voice-ai' ); ?></label>
                    <div class="smva-int-token-row">
                        <input type="password" id="smva-hubspot-token" class="smva-int-token-input" placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                        <button class="smva-btn smva-btn-primary smva-btn-sm" id="smva-hubspot-save">
                            <span class="smva-hs-label"><?php esc_html_e( 'Connect', 'studiometa-voice-ai' ); ?></span>
                            <span class="smva-hs-spinner" style="display:none"><?php esc_html_e( 'Verifying...', 'studiometa-voice-ai' ); ?></span>
                        </button>
                    </div>
                    <div class="smva-int-hint">
                        <?php
                        echo wp_kses(
                            sprintf(
                                /* translators: %s: link to the HubSpot private-apps page, with its own label */
                                __( 'Get your token from HubSpot: %s', 'studiometa-voice-ai' ),
                                '<a href="https://app.hubspot.com/private-apps" target="_blank">'
                                    . esc_html__( 'Settings &rarr; Integrations &rarr; Private Apps &rarr; Create a private app', 'studiometa-voice-ai' )
                                    . '</a>'
                            ),
                            array( 'a' => array( 'href' => array(), 'target' => array() ) )
                        );
                        ?><br>
                        <?php
                        // The scope names are API identifiers, never translated.
                        echo wp_kses(
                            sprintf(
                                /* translators: 1: first required API scope, 2: second required API scope */
                                __( 'Required scopes: %1$s and %2$s', 'studiometa-voice-ai' ),
                                '<code>crm.objects.contacts.write</code>',
                                '<code>crm.objects.contacts.read</code>'
                            ),
                            array( 'code' => array() )
                        );
                        ?>
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
                    <div style="font-size:12px;color:#9ca3af;margin-top:2px"><?php esc_html_e( 'Coming soon', 'studiometa-voice-ai' ); ?></div>
                </div>
                <span class="smva-int-badge-soon"><?php esc_html_e( 'Coming Soon', 'studiometa-voice-ai' ); ?></span>
            </div>
        </div>
    </div>

    <div class="smva-section">
        <div class="smva-section-title"><?php esc_html_e( 'Phone', 'studiometa-voice-ai' ); ?></div>
        <p class="smva-section-desc"><?php esc_html_e( 'Let your agent answer real calls to a phone number you own. You connect your own Twilio account and pay Twilio directly for call minutes and number rental &mdash; StudioMeta never bills you for those. Talk time counts against the same monthly voice minutes as the widget.', 'studiometa-voice-ai' ); ?></p>

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
                            <span class="smva-int-badge-connected">&#10003; <?php esc_html_e( 'Connected', 'studiometa-voice-ai' ); ?></span>
                        <?php endif; ?>
                    </div>
                    <div class="smva-int-sub"><?php esc_html_e( 'Answer inbound calls to your own phone number', 'studiometa-voice-ai' ); ?></div>
                </div>
            </div>

            <?php if ( $smva_is_trial && ! $smva_phone_connected ) : ?>
                <div class="smva-int-msg smva-int-msg-static err">
                    <?php
                    echo wp_kses(
                        sprintf(
                            /* translators: %s: link to the License tab, with its own label */
                            __( 'Phone answering is available on paid plans. %s to connect a number.', 'studiometa-voice-ai' ),
                            '<a href="' . esc_url( admin_url( 'admin.php?page=smva&tab=license' ) ) . '">'
                                . esc_html__( 'Upgrade your plan', 'studiometa-voice-ai' )
                                . '</a>'
                        ),
                        array( 'a' => array( 'href' => array() ) )
                    );
                    ?>
                </div>
            <?php endif; ?>

            <div id="smva-phone-connected" class="<?php echo $smva_phone_connected ? '' : 'smva-hidden'; ?>">
                <div class="smva-int-connected-row">
                    <span class="smva-phone-status-text">
                        <?php
                        echo wp_kses(
                            sprintf(
                                /* translators: %s: the connected phone number */
                                __( 'Answering calls to %s', 'studiometa-voice-ai' ),
                                '<strong id="smva-phone-number-label">' . esc_html( $smva_phone_number ) . '</strong>'
                            ),
                            array( 'strong' => array( 'id' => array() ) )
                        );
                        ?><?php if ( $smva_phone_sid_mask ) : ?> &middot; <span class="smva-phone-sid"><?php echo esc_html( $smva_phone_sid_mask ); ?></span><?php endif; ?>
                    </span>
                    <button type="button" class="smva-btn smva-btn-ghost smva-btn-sm" id="smva-phone-disconnect"><?php esc_html_e( 'Disconnect', 'studiometa-voice-ai' ); ?></button>
                </div>
            </div>

            <div id="smva-phone-form" class="<?php echo $smva_phone_connected ? 'smva-hidden' : ''; ?>">
                <div class="smva-phone-fields">
                    <div class="smva-phone-field">
                        <label class="smva-phone-label" for="smva-phone-sid"><?php esc_html_e( 'Account SID', 'studiometa-voice-ai' ); ?></label>
                        <input type="text" id="smva-phone-sid" class="smva-int-token-input" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" autocomplete="off">
                    </div>
                    <div class="smva-phone-field">
                        <label class="smva-phone-label" for="smva-phone-token"><?php esc_html_e( 'Auth Token', 'studiometa-voice-ai' ); ?></label>
                        <input type="password" id="smva-phone-token" class="smva-int-token-input" placeholder="<?php esc_attr_e( 'Your Twilio auth token', 'studiometa-voice-ai' ); ?>" autocomplete="new-password">
                    </div>
                    <div class="smva-phone-field">
                        <label class="smva-phone-label" for="smva-phone-number"><?php esc_html_e( 'Phone Number', 'studiometa-voice-ai' ); ?></label>
                        <input type="text" id="smva-phone-number" class="smva-int-token-input" placeholder="+15551234567" autocomplete="off">
                    </div>
                </div>
                <div class="smva-phone-actions">
                    <button type="button" class="smva-btn smva-btn-primary smva-btn-sm" id="smva-phone-save">
                        <span class="smva-phone-label-text"><?php esc_html_e( 'Connect', 'studiometa-voice-ai' ); ?></span>
                        <span class="smva-phone-spinner smva-hidden"><?php esc_html_e( 'Verifying&hellip;', 'studiometa-voice-ai' ); ?></span>
                    </button>
                </div>
                <div class="smva-int-hint">
                    <?php
                    echo wp_kses(
                        sprintf(
                            /* translators: 1: link to the Twilio Console, 2: example phone number in E.164 format */
                            __( 'Find your Account SID and Auth Token on the %1$s dashboard. Enter the number in E.164 format, e.g. %2$s.', 'studiometa-voice-ai' ),
                            '<a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer">'
                                . esc_html__( 'Twilio Console', 'studiometa-voice-ai' ) . '</a>',
                            '<code>+15551234567</code>'
                        ),
                        array( 'a' => array( 'href' => array(), 'target' => array(), 'rel' => array() ), 'code' => array() )
                    );
                    ?>
                </div>
            </div>

            <div id="smva-phone-msg" class="smva-int-msg"></div>

            <div class="smva-phone-webhook">
                <label class="smva-phone-label" for="smva-phone-webhook-url"><?php esc_html_e( 'Webhook URL &mdash; paste this into Twilio', 'studiometa-voice-ai' ); ?></label>
                <div class="smva-int-token-row">
                    <input type="text" id="smva-phone-webhook-url" class="smva-int-token-input" value="<?php echo esc_attr( $smva_phone_webhook ); ?>" readonly>
                    <button type="button" class="smva-btn smva-btn-ghost smva-btn-sm" id="smva-phone-copy-webhook"><?php esc_html_e( 'Copy', 'studiometa-voice-ai' ); ?></button>
                </div>
                <div class="smva-int-hint">
                    <?php
                    echo wp_kses(
                        sprintf(
                            /* translators: 1: the Twilio setting's name, 2: the "Webhook" option, 3: the "HTTP POST" method */
                            __( 'In the Twilio Console open your number, and under %1$s choose %2$s, paste this URL, and set the method to %3$s.', 'studiometa-voice-ai' ),
                            '<em>' . esc_html__( 'Voice &rarr; A call comes in', 'studiometa-voice-ai' ) . '</em>',
                            '<strong>Webhook</strong>',
                            '<strong>HTTP POST</strong>'
                        ),
                        array( 'em' => array(), 'strong' => array() )
                    );
                    ?>
                </div>
            </div>
        </div>

        <?php // Transfer to a human. Only meaningful once a number is answering. ?>
        <div class="smva-integration-card <?php echo $smva_phone_connected ? '' : 'smva-hidden'; ?>" id="smva-transfer-card">
            <div class="smva-int-header">
                <div class="smva-int-grow">
                    <div class="smva-int-name"><?php esc_html_e( 'Transfer to a human', 'studiometa-voice-ai' ); ?></div>
                    <div class="smva-int-sub"><?php esc_html_e( 'Let the agent hand a call to a person when the caller asks for one', 'studiometa-voice-ai' ); ?></div>
                </div>
            </div>

            <label class="smva-transfer-toggle">
                <input type="checkbox" id="smva-transfer-enabled" <?php checked( $smva_transfer['enabled'] ); ?>>
                <span><?php esc_html_e( 'Allow the agent to transfer calls', 'studiometa-voice-ai' ); ?></span>
            </label>

            <div id="smva-transfer-body" class="<?php echo $smva_transfer['enabled'] ? '' : 'smva-hidden'; ?>">
                <div id="smva-transfer-list" class="smva-transfer-list"></div>

                <div class="smva-transfer-actions">
                    <button type="button" class="smva-btn smva-btn-ghost smva-btn-sm" id="smva-transfer-add"><?php esc_html_e( 'Add department +', 'studiometa-voice-ai' ); ?></button>
                </div>

                <div class="smva-transfer-field">
                    <label class="smva-phone-label" for="smva-transfer-timeout"><?php esc_html_e( 'Ring for', 'studiometa-voice-ai' ); ?></label>
                    <div class="smva-transfer-timeout-row">
                        <input type="number" id="smva-transfer-timeout" class="smva-int-token-input smva-transfer-timeout" min="10" max="60" step="1" value="<?php echo esc_attr( $smva_transfer['ring_timeout'] ); ?>">
                        <span class="smva-int-sub"><?php esc_html_e( 'seconds before giving up and returning the caller to the agent', 'studiometa-voice-ai' ); ?></span>
                    </div>
                </div>

                <div class="smva-int-hint">
                    <?php
                    echo wp_kses(
                        sprintf(
                            /* translators: %s: example phone number in E.164 format */
                            __( 'Calls are dialled out on your own Twilio account and billed by Twilio. The person picking up sees your Twilio number, not the caller&rsquo;s &mdash; the agent is told to capture the caller&rsquo;s details first. Enter every number in E.164 format, e.g. %s.', 'studiometa-voice-ai' ),
                            '<code>+15551234567</code>'
                        ),
                        array( 'code' => array() )
                    );
                    ?>
                </div>
            </div>

            <div class="smva-transfer-footer">
                <button type="button" class="smva-btn smva-btn-primary smva-btn-sm" id="smva-transfer-save">
                    <span class="smva-transfer-label-text"><?php esc_html_e( 'Save transfer settings', 'studiometa-voice-ai' ); ?></span>
                    <span class="smva-transfer-spinner smva-hidden"><?php esc_html_e( 'Saving&hellip;', 'studiometa-voice-ai' ); ?></span>
                </button>
                <span id="smva-transfer-msg" class="smva-int-msg"></span>
            </div>

            <input type="hidden" id="smva-transfer-json" value="<?php echo esc_attr( $smva_transfer_json ); ?>">
        </div>
    </div>
</div><!-- .smva-tab-content -->
