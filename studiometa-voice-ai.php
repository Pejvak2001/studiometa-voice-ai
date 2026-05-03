<?php
/**
 * Plugin Name: StudioMeta Voice AI
 * Plugin URI:  https://studiometa.io/plugin/
 * Description: Voice & Chat AI Widget with live voice and chat. Includes free trial (30 voice minutes + 100 chat messages).
 * Version:           1.3.32
 * Author:      StudioMeta
 * Author URI:  https://studiometa.io
 * License:     GPL-2.0+
 * Requires PHP: 7.4
 * Requires at least: 6.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'SMVA_VERSION',        '1.3.35' );
define( 'SMVA_PATH',           plugin_dir_path( __FILE__ ) );
define( 'SMVA_URL',            plugin_dir_url( __FILE__ ) );
define( 'SMVA_WS_URL',         'wss://api2.studiometa.io/voice' );
define( 'SMVA_API_URL',        'https://api2.studiometa.io' );

// ── n8n Webhook URLs ────────────────────────────────────────────────────
define( 'SMVA_N8N_ACTIVATED',   'https://n8n.studiometa.io/webhook/license-activated' );
define( 'SMVA_N8N_USAGE_ALERT', 'https://n8n.studiometa.io/webhook/usage-alert' );

// ── Commerce URLs ───────────────────────────────────────────────────────
define( 'SMVA_PRICING_URL',    'https://studiometa.io/pricing/' );

// ── Trial Defaults (used if backend does not override) ──────────────────
define( 'SMVA_TRIAL_VOICE_MINUTES', 30 );
define( 'SMVA_TRIAL_CHAT_MESSAGES', 100 );

require_once SMVA_PATH . 'includes/class-smva.php';

register_activation_hook( __FILE__, array( 'SMVA_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'SMVA_Plugin', 'deactivate' ) );

SMVA_Plugin::get_instance();
