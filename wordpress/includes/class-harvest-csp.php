<?php
/**
 * class-harvest-csp.php - Content Security Policy header injection.
 *
 * Adds the HA WebSocket URL to the connect-src CSP directive so that the
 * widget can open a WebSocket connection to the HA instance.
 *
 * The HA URL is converted from https:// to wss:// before injection. For
 * example, https://myhome.duckdns.org becomes wss://myhome.duckdns.org.
 *
 * Only the connect-src directive is modified. No other directives are touched.
 *
 * Caveat: this filter modifies headers that WordPress itself sets via wp_headers.
 * Security plugins that set CSP headers via a separate mechanism (a different
 * PHP hook, nginx configuration, or .htaccess) may override what WordPress sets,
 * in which case this filter has no effect. The settings page explains this and
 * shows the manual connect-src value for those cases.
 */

defined( 'ABSPATH' ) || exit;

class Harvest_Csp {

    public static function init(): void {
        add_filter( 'wp_headers', [ self::class, 'modify_csp_headers' ] );
    }

    /**
     * Add the HA WebSocket URL to the connect-src CSP directive.
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

        if ( isset( $headers['Content-Security-Policy'] ) ) {
            $headers['Content-Security-Policy'] = self::add_to_connect_src(
                $headers['Content-Security-Policy'],
                $ws_url
            );
        } else {
            // No existing CSP header from WordPress. Add a minimal one that
            // permits the WebSocket connection without restricting anything else.
            // Only connect-src is specified; all other directives remain open.
            $headers['Content-Security-Policy'] = "connect-src 'self' {$ws_url}";
        }

        return $headers;
    }

    /**
     * Append $url to the connect-src directive in an existing CSP policy string.
     * If no connect-src directive exists, one is appended to the policy.
     * If $url is already present, the policy is returned unchanged.
     *
     * @param string $policy Existing CSP policy string.
     * @param string $url    WebSocket URL to add (e.g. wss://myhome.duckdns.org).
     * @return string Updated policy string.
     */
    private static function add_to_connect_src( string $policy, string $url ): string {
        // Fast path: URL is already in the policy.
        if ( strpos( $policy, $url ) !== false ) {
            return $policy;
        }

        if ( strpos( $policy, 'connect-src' ) !== false ) {
            // connect-src directive exists - append the HA URL to its value.
            // The regex matches "connect-src" followed by all non-semicolon chars.
            $policy = preg_replace(
                '/connect-src([^;]*)/',
                "connect-src$1 {$url}",
                $policy
            );
        } else {
            // No connect-src directive - append a new one to the end of the policy.
            $policy .= "; connect-src 'self' {$url}";
        }

        return $policy;
    }
}
