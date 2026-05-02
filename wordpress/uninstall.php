<?php
/**
 * uninstall.php - HArvest plugin cleanup on deletion.
 *
 * Called by WordPress when the plugin is deleted (not merely deactivated).
 * Removes all plugin options. No other data is stored by this plugin.
 *
 * Only the options explicitly listed here are deleted. This prevents
 * accidental removal of unrelated data in the event of a future refactor
 * that adds new options - those new options must be listed here explicitly.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'harvest_ha_url' );
delete_option( 'harvest_widget_source' );
delete_option( 'harvest_widget_custom_url' );
