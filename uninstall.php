<?php
/**
 * Uninstall handler for StudioMeta Voice AI.
 *
 * Triggered by WordPress when the user clicks "Delete" on the plugin
 * (NOT on plain deactivation). Cleans up all plugin data so the
 * database is left in the same state as before the plugin was installed.
 *
 * @package StudioMeta_Voice_AI
 */

// Exit if WordPress did not call this file.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

global $wpdb;

// Best-effort: notify the licensing API that this site is uninstalling
// so the trial / license can be released server-side. Non-blocking.
$license_key    = get_option( 'smva_license_key', '' );
$internal_token = get_option( 'smva_internal_token', '' );

if ( $license_key && $internal_token ) {
    wp_remote_post( 'https://api2.studiometa.io/plugin/license/uninstall', array(
        'headers'  => array( 'Content-Type' => 'application/json' ),
        'body'     => wp_json_encode( array(
            'license_key'    => $license_key,
            'internal_token' => $internal_token,
            'site_url'       => get_site_url(),
        ) ),
        'timeout'  => 3,
        'blocking' => false,
    ) );
}

// ── Delete all plugin options ───────────────────────────────────────────────
$options = array(
    // License / trial state — NOTE: smva_license_key and smva_internal_token
    // are intentionally kept so reinstalling restores the existing license.
    'smva_plan',
    'smva_trial_attempted',
    'smva_trial_last_attempt',
    'smva_trial_notice_dismissed',
    'smva_synced_from_backend',
    'smva_site_replaced_notice',
    'smva_site_replaced_message',

    // Widget settings
    'smva_widget_color',
    'smva_widget_position',
    'smva_widget_style',
    'smva_default_tab',
    'smva_voice_enabled',
    'smva_chat_enabled',
    'smva_max_call_duration',
    'smva_silence_timeout',
    'smva_call_cooldown',

    // Content settings — intentionally kept because they're synced from backend
    // and will be restored when the license is re-activated.
    // 'smva_lang',
    // 'smva_greeting',
    // 'smva_business_name',
    // 'smva_suggested_questions',
);

foreach ( $options as $option ) {
    delete_option( $option );
    // For multisite (just in case)
    delete_site_option( $option );
}

// ── Delete transients ──────────────────────────────────────────────────────
delete_transient( 'smva_quota_cache' );
delete_site_transient( 'smva_quota_cache' );

// ── Multisite: clean up across all sites ───────────────────────────────────
if ( is_multisite() ) {
    $sites = get_sites( array( 'number' => 0, 'fields' => 'ids' ) );
    foreach ( $sites as $blog_id ) {
        switch_to_blog( $blog_id );
        foreach ( $options as $option ) {
            delete_option( $option );
        }
        delete_transient( 'smva_quota_cache' );
        restore_current_blog();
    }
}
