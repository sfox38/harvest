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

    /** Token secret inherited from a wrapping [harvest_group]. */
    private static string $group_token_secret = '';

    public static function init(): void {
        add_shortcode( 'harvest',       [ self::class, 'render'       ] );
        add_shortcode( 'harvest_group', [ self::class, 'render_group' ] );
    }

    // ---------------------------------------------------------------------------
    // [harvest] shortcode
    // ---------------------------------------------------------------------------

    public static function render( array|string $atts = [] ): string {
        $atts = (array) $atts;
        $atts = shortcode_atts(
            [
                'token'        => '',
                'token-secret' => '',
                'entity'       => '',
                'alias'        => '',
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
            _doing_it_wrong(
                'harvest shortcode',
                'Both entity and alias attributes are set. ' .
                'entity takes priority. Remove alias to suppress this notice.',
                '1.0.0'
            );
        }

        $ha_url = Harvest_Settings::get_ha_url();

        if ( empty( $ha_url ) ) {
            return self::render_error(
                __( 'HArvest: Home Assistant URL is not configured. Go to Settings > HArvest to set it up.', 'harvest' )
            );
        }

        // Build data attributes. entity takes priority over alias.
        $data_attrs = [
            'data-token'  => $atts['token'],
            'data-ha-url' => $ha_url,
        ];

        if ( ! empty( $atts['token-secret'] ) ) {
            $data_attrs['data-token-secret'] = $atts['token-secret'];
        } elseif ( ! empty( self::$group_token_secret ) ) {
            $data_attrs['data-token-secret'] = self::$group_token_secret;
        }

        if ( ! empty( $atts['entity'] ) ) {
            $data_attrs['data-entity'] = $atts['entity'];
        } else {
            $data_attrs['data-alias'] = $atts['alias'];
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

    public static function render_group( array|string $atts = [], string $content = '' ): string {
        $atts = (array) $atts;
        $atts = shortcode_atts(
            [
                'token'        => '',
                'token-secret' => '',
            ],
            $atts,
            'harvest_group'
        );

        if ( empty( $atts['token'] ) ) {
            return self::render_error(
                __( 'HArvest: [harvest_group] missing required "token" attribute.', 'harvest' )
            );
        }

        $ha_url = Harvest_Settings::get_ha_url();

        if ( empty( $ha_url ) ) {
            return self::render_error(
                __( 'HArvest: Home Assistant URL is not configured. Go to Settings > HArvest to set it up.', 'harvest' )
            );
        }

        $data_attrs = [
            'data-token'  => $atts['token'],
            'data-ha-url' => $ha_url,
        ];

        if ( ! empty( $atts['token-secret'] ) ) {
            $data_attrs['data-token-secret'] = $atts['token-secret'];
        }

        $attr_string = self::build_attr_string( $data_attrs );

        // Save and restore group context so nested [harvest_group] works correctly.
        $prev_token  = self::$group_token;
        $prev_secret = self::$group_token_secret;
        self::$group_token = $atts['token'];
        self::$group_token_secret = $atts['token-secret'];
        $inner = do_shortcode( $content );
        self::$group_token = $prev_token;
        self::$group_token_secret = $prev_secret;

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
