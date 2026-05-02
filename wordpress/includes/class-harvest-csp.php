<?php
/**
 * class-harvest-csp.php - Content Security Policy header injection.
 *
 * Adds the HA URL to two CSP directives:
 *
 *   connect-src - the WebSocket URL (wss://) so the widget can open a
 *                 WebSocket connection to the HA instance.
 *
 *   script-src  - the HTTPS origin so renderer pack JS files can be loaded
 *                 dynamically via script tag injection from the HA instance.
 *                 'unsafe-inline' is intentionally included because renderer
 *                 packs use inline script evaluation during dynamic loading.
 *
 * The HA URL is converted from https:// to wss:// for connect-src. For
 * example, https://myhome.duckdns.org becomes wss://myhome.duckdns.org.
 * The original https:// URL is used for script-src.
 *
 * Caveat: this filter modifies headers that WordPress itself sets via wp_headers.
 * Security plugins that set CSP headers via a separate mechanism (a different
 * PHP hook, nginx configuration, or .htaccess) may override what WordPress sets,
 * in which case this filter has no effect. The settings page explains this and
 * shows the manual CSP values for those cases.
 */

defined( 'ABSPATH' ) || exit;

class Harvest_Csp {

    public static function init(): void {
        add_filter( 'wp_headers', [ self::class, 'modify_csp_headers' ] );
    }

    /**
     * Add the HA URLs to the connect-src and script-src CSP directives.
     *
     * @param array $headers Associative array of HTTP headers.
     * @return array Modified headers.
     */
    public static function modify_csp_headers( array $headers ): array {
        $ha_url = Harvest_Settings::get_ha_url();

        if ( empty( $ha_url ) ) {
            return $headers;
        }

        // Validate URL structure before injecting into a security header.
        $parsed = wp_parse_url( $ha_url );
        if ( empty( $parsed['host'] ) ) {
            return $headers;
        }

        // Convert http(s):// to wss:// for the WebSocket CSP directive.
        $ws_url = preg_replace( '/^https?:\/\//', 'wss://', $ha_url );

        // Normalise the HTTPS origin for script-src (strip trailing slash).
        $script_origin = rtrim( $ha_url, '/' );

        if ( isset( $headers['Content-Security-Policy'] ) ) {
            $headers['Content-Security-Policy'] = self::add_to_directive(
                $headers['Content-Security-Policy'],
                'connect-src',
                $ws_url
            );
            $headers['Content-Security-Policy'] = self::add_to_directive(
                $headers['Content-Security-Policy'],
                'script-src',
                $script_origin
            );
        } else {
            // No existing CSP header from WordPress. Add a minimal one that
            // permits the WebSocket and pack script loading without restricting
            // anything else.
            // Apply the same validation as add_to_directive() before interpolation.
            $valid_ws     = ! preg_match( '/[\s;,]/', $ws_url );
            $valid_script = ! preg_match( '/[\s;,]/', $script_origin );

            $connect_part = $valid_ws     ? " {$ws_url}"       : '';
            $script_part  = $valid_script ? " {$script_origin}" : '';

            $headers['Content-Security-Policy'] = "connect-src 'self'{$connect_part}; script-src 'self' 'unsafe-inline'{$script_part}";
        }

        return $headers;
    }

    /**
     * Append $url to a named directive in an existing CSP policy string.
     * If the directive does not exist, one is appended to the policy.
     * If $url is already present in the directive, the policy is unchanged.
     *
     * @param string $policy    Existing CSP policy string.
     * @param string $directive Directive name (e.g. "connect-src", "script-src").
     * @param string $url       URL to add (e.g. wss://myhome.duckdns.org).
     * @return string Updated policy string.
     */
    private static function add_to_directive( string $policy, string $directive, string $url ): string {
        // Reject URLs containing characters that could break the CSP header.
        if ( preg_match( '/[\s;,]/', $url ) ) {
            return $policy;
        }

        $escaped_dir = preg_quote( $directive, '/' );
        $escaped_url = preg_quote( $url, '/' );

        // Check whether the URL is already in this directive.
        if ( preg_match( '/' . $escaped_dir . '[^;]*' . $escaped_url . '/', $policy ) ) {
            return $policy;
        }

        if ( strpos( $policy, $directive ) !== false ) {
            // Directive exists - append the URL to its value.
            // Limit to 1 replacement in case of malformed duplicate directives.
            $policy = preg_replace(
                '/' . $escaped_dir . '([^;]*)/',
                "{$directive}$1 {$url}",
                $policy,
                1
            );
        } else {
            // Directive does not exist - append a new one to the end of the policy.
            $policy .= "; {$directive} 'self' {$url}";
        }

        return $policy;
    }
}
