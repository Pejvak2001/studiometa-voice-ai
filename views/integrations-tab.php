<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>
<?php
$hs_connected = get_option( 'smva_hubspot_connected', '0' ) === '1';
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
                        <?php if ( $hs_connected ) : ?>
                            <span class="smva-int-badge-connected">&#10003; Connected</span>
                        <?php endif; ?>
                    </div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px">Sync leads to HubSpot Contacts automatically</div>
                </div>
            </div>
            <?php if ( $hs_connected ) : ?>
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
</div><!-- .smva-tab-content -->
