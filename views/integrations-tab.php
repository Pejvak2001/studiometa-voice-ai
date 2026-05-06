<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>
<?php
$hs_connected = get_option( 'smva_hubspot_connected', '0' ) === '1';
?>
<div class="smva-tab-content">
<style>
.smva-integration-card{padding:24px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;margin-bottom:14px;transition:box-shadow .15s}
.smva-integration-card:hover:not(.smva-int-disabled){box-shadow:0 4px 16px rgba(0,0,0,.06)}
.smva-int-header{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.smva-int-logo{width:44px;height:44px;border-radius:10px;background:#fff5f2;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #ffe4dc}
.smva-int-name{font-size:15px;font-weight:700;color:#111827}
.smva-int-badge-connected{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:#059669;background:#d1fae5;padding:3px 10px;border-radius:20px;margin-left:8px}
.smva-int-badge-soon{font-size:12px;font-weight:600;color:#9ca3af;background:#f3f4f6;padding:3px 10px;border-radius:20px}
.smva-int-token-row{display:flex;gap:8px;align-items:center;margin-top:4px}
.smva-int-token-input{flex:1;font-family:monospace;font-size:13px;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;outline:none}
.smva-int-token-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1)}
.smva-int-hint{font-size:12px;color:#6b7280;margin-top:8px;line-height:1.5}
.smva-int-hint a{color:#6366f1;text-decoration:none}
.smva-int-hint a:hover{text-decoration:underline}
.smva-int-msg{font-size:13px;margin-top:10px;padding:8px 12px;border-radius:8px;display:none}
.smva-int-msg.ok{background:#f0fdf4;color:#15803d;display:block}
.smva-int-msg.err{background:#fef2f2;color:#b91c1c;display:block}
.smva-int-disabled{opacity:.6}
.smva-int-connected-row{display:flex;align-items:center;gap:10px}
.smva-btn-ghost{background:transparent!important;border:1px solid #d1d5db!important;color:#374151!important;box-shadow:none!important}
.smva-btn-ghost:hover{background:#f9fafb!important}
.smva-btn-sm{padding:6px 14px!important;font-size:12px!important}
</style>
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
