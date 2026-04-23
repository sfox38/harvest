<?php
/**
 * Plugin Name:       HArvest
 * Plugin URI:        https://github.com/sfox38/harvest
 * Description:       Embed live Home Assistant entity widgets on any page or post.
 * Version:           1.0.0
 * Requires at least: 5.0
 * Requires PHP:      7.4
 * Author:            HArvest Contributors
 * Author URI:        https://github.com/sfox38/harvest
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       harvest
 * Domain Path:       /languages
 */

defined( 'ABSPATH' ) || exit;

define( 'HARVEST_VERSION',    '1.0.0' );
define( 'HARVEST_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'HARVEST_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function harvest_init(): void {
    require_once HARVEST_PLUGIN_DIR . 'includes/class-harvest-settings.php';
    require_once HARVEST_PLUGIN_DIR . 'includes/class-harvest-shortcode.php';
    require_once HARVEST_PLUGIN_DIR . 'includes/class-harvest-assets.php';
    require_once HARVEST_PLUGIN_DIR . 'includes/class-harvest-csp.php';

    Harvest_Settings::init();
    Harvest_Shortcode::init();
    Harvest_Assets::init();
    Harvest_Csp::init();
}
add_action( 'plugins_loaded', 'harvest_init' );

// ---------------------------------------------------------------------------
// Activation / deactivation hooks
// ---------------------------------------------------------------------------

register_activation_hook( __FILE__, 'harvest_activate' );
register_deactivation_hook( __FILE__, 'harvest_deactivate' );

function harvest_activate(): void {
    // Set default options only when not already present so existing
    // settings survive plugin deactivation/reactivation cycles.
    if ( ! get_option( 'harvest_ha_url' ) ) {
        add_option( 'harvest_ha_url', '' );
    }
    if ( ! get_option( 'harvest_widget_source' ) ) {
        add_option( 'harvest_widget_source', 'bundled' );
    }
    if ( ! get_option( 'harvest_default_theme' ) ) {
        add_option( 'harvest_default_theme', '' );
    }
}

function harvest_deactivate(): void {
    // Nothing to clean up on deactivation.
    // Options are retained so settings survive deactivation/reactivation.
}

// ---------------------------------------------------------------------------
// Theme JSON upload support
//
// WordPress disallows JSON uploads by default. These two filters allow users
// to upload HArvest theme JSON files to the media library.
// ---------------------------------------------------------------------------

add_filter( 'upload_mimes', function ( array $mimes ): array {
    $mimes['json'] = 'application/json';
    return $mimes;
} );

// WordPress 4.7.1+ performs additional MIME type verification. This filter
// ensures JSON files pass the check_filetype_and_ext check.
add_filter(
    'wp_check_filetype_and_ext',
    function ( array $data, string $file, string $filename, array $mimes ): array {
        if ( empty( $data['ext'] ) ) {
            $ext = pathinfo( $filename, PATHINFO_EXTENSION );
            if ( $ext === 'json' ) {
                $data['ext']  = 'json';
                $data['type'] = 'application/json';
            }
        }
        return $data;
    },
    10,
    4
);
