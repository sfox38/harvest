<?php
/**
 * class-harvest-settings.php - Admin settings page and options management.
 *
 * Registers the HArvest settings page under Settings > HArvest.
 * All plugin options use the harvest_ prefix and are stored via the
 * standard WordPress options API (get_option / update_option).
 *
 * Options managed here:
 *   harvest_ha_url          - External HA URL used by every widget on the site
 *   harvest_widget_source   - "bundled" or "cdn"
 *   harvest_default_theme   - Optional URL to a default theme JSON file
 */

defined( 'ABSPATH' ) || exit;

class Harvest_Settings {

    public static function init(): void {
        add_action( 'admin_menu', [ self::class, 'add_settings_page' ] );
        add_action( 'admin_init', [ self::class, 'register_settings'  ] );
    }

    // ---------------------------------------------------------------------------
    // Admin menu
    // ---------------------------------------------------------------------------

    public static function add_settings_page(): void {
        add_options_page(
            __( 'HArvest Settings', 'harvest' ),
            __( 'HArvest',          'harvest' ),
            'manage_options',
            'harvest-settings',
            [ self::class, 'render_settings_page' ]
        );
    }

    // ---------------------------------------------------------------------------
    // Settings registration
    // ---------------------------------------------------------------------------

    public static function register_settings(): void {
        register_setting( 'harvest_settings_group', 'harvest_ha_url', [
            'type'              => 'string',
            'sanitize_callback' => [ self::class, 'sanitize_ha_url' ],
            'default'           => '',
        ] );

        register_setting( 'harvest_settings_group', 'harvest_widget_source', [
            'type'              => 'string',
            'sanitize_callback' => [ self::class, 'sanitize_widget_source' ],
            'default'           => 'bundled',
        ] );

        register_setting( 'harvest_settings_group', 'harvest_default_theme', [
            'type'              => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default'           => '',
        ] );
    }

    // ---------------------------------------------------------------------------
    // Sanitization callbacks
    // ---------------------------------------------------------------------------

    public static function sanitize_ha_url( string $url ): string {
        $url = esc_url_raw( trim( $url ) );
        // Strip trailing slash so the URL is consistent across the plugin.
        return rtrim( $url, '/' );
    }

    public static function sanitize_widget_source( string $source ): string {
        return in_array( $source, [ 'bundled', 'cdn' ], true ) ? $source : 'bundled';
    }

    // ---------------------------------------------------------------------------
    // Settings page renderer
    // ---------------------------------------------------------------------------

    public static function render_settings_page(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        $ha_url = self::get_ha_url();
        $ws_url = $ha_url ? preg_replace( '/^https?:\/\//', 'wss://', $ha_url ) : '';
        ?>
        <div class="wrap">
            <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

            <?php settings_errors( 'harvest_settings_group' ); ?>

            <form method="post" action="options.php">
                <?php settings_fields( 'harvest_settings_group' ); ?>

                <table class="form-table" role="presentation">

                    <tr>
                        <th scope="row">
                            <label for="harvest_ha_url">
                                <?php esc_html_e( 'Home Assistant URL', 'harvest' ); ?>
                            </label>
                        </th>
                        <td>
                            <input
                                type="url"
                                id="harvest_ha_url"
                                name="harvest_ha_url"
                                value="<?php echo esc_attr( get_option( 'harvest_ha_url' ) ); ?>"
                                class="regular-text"
                                placeholder="https://myhome.duckdns.org"
                            >
                            <p class="description">
                                <?php esc_html_e(
                                    'The external URL of your Home Assistant instance. Used by every widget on your site.',
                                    'harvest'
                                ); ?>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <?php esc_html_e( 'Widget JS source', 'harvest' ); ?>
                        </th>
                        <td>
                            <?php $source = get_option( 'harvest_widget_source', 'bundled' ); ?>
                            <label>
                                <input type="radio"
                                    name="harvest_widget_source"
                                    value="bundled"
                                    <?php checked( $source, 'bundled' ); ?>>
                                <?php printf(
                                    /* translators: %s: version number */
                                    esc_html__( 'Use bundled version (harvest.js v%s)', 'harvest' ),
                                    esc_html( HARVEST_VERSION )
                                ); ?>
                            </label>
                            <br>
                            <label>
                                <input type="radio"
                                    name="harvest_widget_source"
                                    value="cdn"
                                    <?php checked( $source, 'cdn' ); ?>>
                                <?php esc_html_e( 'Use CDN version (always latest)', 'harvest' ); ?>
                            </label>
                            <p class="description">
                                <?php esc_html_e(
                                    'Bundled is recommended for stability. CDN always loads the latest widget version from jsDelivr.',
                                    'harvest'
                                ); ?>
                            </p>
                            <?php if ( $source === 'cdn' ) : ?>
                            <p class="description" style="color:#b45309;">
                                <?php esc_html_e(
                                    'CDN note: if your site has a strict script-src Content Security Policy, you may need to add https://cdn.jsdelivr.net manually.',
                                    'harvest'
                                ); ?>
                            </p>
                            <?php endif; ?>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <label for="harvest_default_theme">
                                <?php esc_html_e( 'Default theme URL', 'harvest' ); ?>
                            </label>
                        </th>
                        <td>
                            <input
                                type="url"
                                id="harvest_default_theme"
                                name="harvest_default_theme"
                                value="<?php echo esc_attr( get_option( 'harvest_default_theme' ) ); ?>"
                                class="regular-text"
                                placeholder="https://example.com/my-theme.json"
                            >
                            <p class="description">
                                <?php esc_html_e(
                                    'Optional. URL to a HArvest theme JSON file. Applied to all widgets that do not specify their own theme. Leave blank to use the built-in default.',
                                    'harvest'
                                ); ?>
                            </p>
                        </td>
                    </tr>

                </table>

                <?php submit_button(); ?>
            </form>

            <hr>
            <h2><?php esc_html_e( 'Shortcode usage', 'harvest' ); ?></h2>
            <p><?php esc_html_e(
                'Paste the shortcode below into any post or page using the Classic editor:',
                'harvest'
            ); ?></p>
            <pre style="background:#f0f0f0;padding:12px;border-radius:4px;"
            >[harvest token="hwt_YOUR_TOKEN" entity="light.your_entity"]</pre>

            <h3><?php esc_html_e( 'Available shortcode parameters', 'harvest' ); ?></h3>
            <table class="widefat striped" style="max-width:700px">
                <thead>
                    <tr>
                        <th><?php esc_html_e( 'Parameter',   'harvest' ); ?></th>
                        <th><?php esc_html_e( 'Required',    'harvest' ); ?></th>
                        <th><?php esc_html_e( 'Description', 'harvest' ); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>token</code></td>
                        <td><?php esc_html_e( 'Yes', 'harvest' ); ?></td>
                        <td><?php esc_html_e( 'Your HArvest widget token ID.', 'harvest' ); ?></td>
                    </tr>
                    <tr>
                        <td><code>entity</code></td>
                        <td><?php esc_html_e( 'Yes*', 'harvest' ); ?></td>
                        <td><?php esc_html_e(
                            'HA entity ID, e.g. light.bedroom_main. Required unless alias is set. If both entity and alias are provided, entity takes priority.',
                            'harvest'
                        ); ?></td>
                    </tr>
                    <tr>
                        <td><code>alias</code></td>
                        <td><?php esc_html_e( 'Yes*', 'harvest' ); ?></td>
                        <td><?php esc_html_e(
                            'Entity alias (8-character random key). Use instead of entity when "Show as aliases" is checked in the wizard. Either entity or alias is required, not both. Companion values should match - use aliases when alias is set, real IDs when entity is set.',
                            'harvest'
                        ); ?></td>
                    </tr>
                    <tr>
                        <td><code>token-secret</code></td>
                        <td><?php esc_html_e( 'No', 'harvest' ); ?></td>
                        <td><?php esc_html_e(
                            'HMAC secret for enhanced security. Set via the token editor in Home Assistant.',
                            'harvest'
                        ); ?></td>
                    </tr>
                    <tr>
                        <td><code>companion</code></td>
                        <td><?php esc_html_e( 'No', 'harvest' ); ?></td>
                        <td><?php esc_html_e( 'Comma-separated companion entity IDs or aliases.', 'harvest' ); ?></td>
                    </tr>
                    <tr>
                        <td><code>theme</code></td>
                        <td><?php esc_html_e( 'No', 'harvest' ); ?></td>
                        <td><?php esc_html_e(
                            'URL to a HArvest theme JSON file. Overrides the site default.',
                            'harvest'
                        ); ?></td>
                    </tr>
                    <tr>
                        <td><code>lang</code></td>
                        <td><?php esc_html_e( 'No', 'harvest' ); ?></td>
                        <td><?php esc_html_e(
                            'Language code, e.g. "de". Defaults to auto-detect from browser.',
                            'harvest'
                        ); ?></td>
                    </tr>
                    <tr>
                        <td><code>graph</code></td>
                        <td><?php esc_html_e( 'No', 'harvest' ); ?></td>
                        <td><?php esc_html_e(
                            'Graph type: "line" or "bar". Omit to show no graph.',
                            'harvest'
                        ); ?></td>
                    </tr>
                    <tr>
                        <td><code>hours</code></td>
                        <td><?php esc_html_e( 'No', 'harvest' ); ?></td>
                        <td><?php esc_html_e( 'History window in hours. Default: 24.', 'harvest' ); ?></td>
                    </tr>
                    <tr>
                        <td><code>period</code></td>
                        <td><?php esc_html_e( 'No', 'harvest' ); ?></td>
                        <td><?php esc_html_e( 'Aggregation period in minutes. Default: 10.', 'harvest' ); ?></td>
                    </tr>
                </tbody>
            </table>

            <hr>
            <h2><?php esc_html_e( 'Content Security Policy', 'harvest' ); ?></h2>
            <p><?php esc_html_e(
                'HArvest automatically adds your Home Assistant URL to the Content-Security-Policy connect-src directive. This allows the widget to open a WebSocket connection to your Home Assistant instance.',
                'harvest'
            ); ?></p>
            <p><?php esc_html_e(
                'If you use a security plugin that manages CSP headers separately (such as Wordfence or NinjaFirewall), you may need to manually add the following to your connect-src directive:',
                'harvest'
            ); ?></p>
            <?php if ( $ws_url ) : ?>
            <pre style="background:#f0f0f0;padding:8px;border-radius:4px;"><?php echo esc_html( $ws_url ); ?></pre>
            <?php endif; ?>

            <hr>
            <h2><?php esc_html_e( 'Backup note', 'harvest' ); ?></h2>
            <p><?php esc_html_e(
                'HArvest plugin settings are stored in the WordPress database and are included in standard WordPress backups. The widget token secrets you create in Home Assistant are stored in HA, not in WordPress.',
                'harvest'
            ); ?></p>
        </div>
        <?php
    }

    // ---------------------------------------------------------------------------
    // Accessors used by other plugin classes
    // ---------------------------------------------------------------------------

    public static function get_ha_url(): string {
        return (string) get_option( 'harvest_ha_url', '' );
    }

    public static function get_default_theme(): string {
        return (string) get_option( 'harvest_default_theme', '' );
    }

    public static function get_widget_source(): string {
        return (string) get_option( 'harvest_widget_source', 'bundled' );
    }
}
