<?php
/**
 * class-harvest-shortcode.php - [harvest] and [harvest_group] shortcode handlers.
 *
 * [harvest] renders a single hrv-mount div. The widget JS initialises it into
 * an hrv-card custom element. The HA URL comes from the plugin settings rather
 * than the shortcode attributes, so users do not need to repeat it per widget.
 *
 * [harvest_group] wraps nested [harvest] shortcodes in an hrv-group div,
 * enabling token and HA URL inheritance across all child cards.
 *
 * Error messages (missing token, missing entity, unconfigured HA URL) are
 * shown only to logged-in users with edit_posts capability. Public visitors
 * see no output rather than a message that could expose configuration details.
 */

defined( 'ABSPATH' ) || exit;

class Harvest_Shortcode {

    /** Token inherited from a wrapping [harvest_group]. */
    private static string $group_token = '';

    public static function init(): void {
        add_shortcode( 'harvest',       [ self::class, 'render'       ] );
        add_shortcode( 'harvest_group', [ self::class, 'render_group' ] );
    }

    // ---------------------------------------------------------------------------
    // [harvest] shortcode
    // ---------------------------------------------------------------------------

    public static function render( array $atts ): string {
        $atts = shortcode_atts(
            [
                'token'        => '',
                'entity'       => '',
                'alias'        => '',
                'companion'    => '',
                'theme'        => '',
                'lang'         => 'auto',
                'show_history' => 'false',
                'hours'        => '24',
                'graph'        => 'line',
            ],
            $atts,
            'harvest'
        );

        // Inherit token from wrapping [harvest_group] when not set explicitly.
        if ( empty( $atts['token'] ) && ! empty( self::$group_token ) ) {
            $atts['token'] = self::$group_token;
        }

        if ( empty( $atts['token'] ) ) {
            return self::render_error(
                __( 'HArvest: missing required "token" attribute.', 'harvest' )
            );
        }

        // Validate required: entity or alias
        if ( empty( $atts['entity'] ) && empty( $atts['alias'] ) ) {
            return self::render_error(
                __( 'HArvest: missing required "entity" or "alias" attribute.', 'harvest' )
            );
        }

        // entity takes priority over alias when both are present.
        if ( ! empty( $atts['entity'] ) && ! empty( $atts['alias'] ) ) {
            trigger_error(
                'HArvest shortcode: both entity and alias attributes are set. ' .
                'entity takes priority. Remove alias to suppress this notice.',
                E_USER_NOTICE
            );
        }

        $ha_url = Harvest_Settings::get_ha_url();

        if ( empty( $ha_url ) ) {
            return self::render_error(
                __( 'HArvest: Home Assistant URL is not configured. Go to Settings > HArvest to set it up.', 'harvest' )
            );
        }

        // Theme: shortcode attr > site default > empty (widget uses its own default)
        $theme_url = ! empty( $atts['theme'] )
            ? $atts['theme']
            : Harvest_Settings::get_default_theme();

        // Build data attributes. entity takes priority over alias.
        $data_attrs = [
            'data-token'  => $atts['token'],
            'data-ha-url' => $ha_url,
        ];

        if ( ! empty( $atts['entity'] ) ) {
            $data_attrs['data-entity'] = $atts['entity'];
        } else {
            $data_attrs['data-alias'] = $atts['alias'];
        }

        // Companion values follow the same entity/alias convention as the primary.
        if ( ! empty( $atts['companion'] ) ) {
            $data_attrs['data-companion'] = $atts['companion'];
        }

        if ( ! empty( $theme_url ) ) {
            $data_attrs['data-theme-url'] = $theme_url;
        }

        if ( $atts['lang'] !== 'auto' ) {
            $data_attrs['data-lang'] = $atts['lang'];
        }

        if ( $atts['show_history'] === 'true' ) {
            $data_attrs['data-show-history']  = 'true';
            $data_attrs['data-hours-to-show'] = $atts['hours'];
            $data_attrs['data-graph']          = $atts['graph'];
        }

        $attr_string = self::build_attr_string( $data_attrs );

        // Enqueue the widget script if not already enqueued. This handles cases
        // where the shortcode is rendered outside the standard page content flow,
        // e.g. in a widget area or via a page builder.
        Harvest_Assets::enqueue();

        return sprintf( '<div class="hrv-mount"%s></div>', $attr_string );
    }

    // ---------------------------------------------------------------------------
    // [harvest_group] shortcode
    // ---------------------------------------------------------------------------

    public static function render_group( array $atts, string $content = '' ): string {
        $atts = shortcode_atts(
            [
                'token' => '',
                'theme' => '',
                'lang'  => 'auto',
            ],
            $atts,
            'harvest_group'
        );

        $ha_url = Harvest_Settings::get_ha_url();

        $data_attrs = [
            'data-token'  => $atts['token'],
            'data-ha-url' => $ha_url,
        ];

        if ( ! empty( $atts['theme'] ) ) {
            $data_attrs['data-theme-url'] = $atts['theme'];
        }

        if ( $atts['lang'] !== 'auto' ) {
            $data_attrs['data-lang'] = $atts['lang'];
        }

        $attr_string = self::build_attr_string( $data_attrs );

        // Set group token so nested [harvest] shortcodes can inherit it.
        self::$group_token = $atts['token'];
        $inner = do_shortcode( $content );
        self::$group_token = '';

        Harvest_Assets::enqueue();

        return sprintf(
            '<div class="hrv-group"%s>%s</div>',
            $attr_string,
            $inner
        );
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    /**
     * Build a safely escaped HTML attribute string from an associative array.
     * Output is prefixed with a space: ' data-foo="bar" data-baz="qux"'.
     */
    private static function build_attr_string( array $attrs ): string {
        $parts = '';
        foreach ( $attrs as $key => $value ) {
            $parts .= sprintf( ' %s="%s"', esc_attr( $key ), esc_attr( $value ) );
        }
        return $parts;
    }

    /**
     * Return an error message visible only to users with edit_posts capability.
     * Returns an empty string for public visitors to avoid exposing configuration.
     */
    private static function render_error( string $message ): string {
        if ( ! current_user_can( 'edit_posts' ) ) {
            return '';
        }
        return sprintf(
            '<div style="border:1px solid #c00;padding:8px 12px;color:#c00;font-size:13px;border-radius:4px;">%s</div>',
            esc_html( $message )
        );
    }
}
