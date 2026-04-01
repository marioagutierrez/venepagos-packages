<?php
/**
 * Plugin Name: VenePagos Payment Gateway
 * Plugin URI: https://venepagos.com
 * Description: Pasarela de pago VenePagos para WordPress y WooCommerce. Genera enlaces de pago y procesa cobros.
 * Version: 1.0.0
 * Author: VenePagos
 * Author URI: https://venepagos.com
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: venepagos-gateway
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'VENEPAGOS_VERSION', '1.0.0' );
define( 'VENEPAGOS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'VENEPAGOS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'VENEPAGOS_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

/**
 * Carga las clases del plugin.
 */
require_once VENEPAGOS_PLUGIN_DIR . 'includes/class-venepagos-api.php';
require_once VENEPAGOS_PLUGIN_DIR . 'includes/class-venepagos-checkout.php';

/**
 * Activacion del plugin.
 */
function venepagos_activate() {
    $defaults = array(
        'venepagos_api_key'      => '',
        'venepagos_merchant_id'  => '',
        'venepagos_api_base_url' => 'https://api.venepagos.com',
        'venepagos_checkout_mode'=> 'redirect',
        'venepagos_return_url'   => home_url( '/gracias/' ),
    );

    foreach ( $defaults as $key => $value ) {
        if ( false === get_option( $key ) ) {
            add_option( $key, $value );
        }
    }
}
register_activation_hook( __FILE__, 'venepagos_activate' );

/**
 * Desactivacion del plugin.
 */
function venepagos_deactivate() {
    // Limpieza si es necesario.
}
register_deactivation_hook( __FILE__, 'venepagos_deactivate' );

// ---------------------------------------------------------------------------
// Admin: Menu de configuracion
// ---------------------------------------------------------------------------

add_action( 'admin_menu', 'venepagos_admin_menu' );

function venepagos_admin_menu() {
    add_options_page(
        __( 'VenePagos', 'venepagos-gateway' ),
        __( 'VenePagos', 'venepagos-gateway' ),
        'manage_options',
        'venepagos-settings',
        'venepagos_settings_page'
    );
}

add_action( 'admin_init', 'venepagos_register_settings' );

function venepagos_register_settings() {
    register_setting( 'venepagos_settings_group', 'venepagos_api_key', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
    ) );
    register_setting( 'venepagos_settings_group', 'venepagos_merchant_id', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
    ) );
    register_setting( 'venepagos_settings_group', 'venepagos_api_base_url', array(
        'type'              => 'string',
        'sanitize_callback' => 'esc_url_raw',
    ) );
    register_setting( 'venepagos_settings_group', 'venepagos_checkout_mode', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
    ) );
    register_setting( 'venepagos_settings_group', 'venepagos_return_url', array(
        'type'              => 'string',
        'sanitize_callback' => 'esc_url_raw',
    ) );
}

function venepagos_settings_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
    ?>
    <div class="wrap">
        <h1><?php esc_html_e( 'VenePagos — Configuración', 'venepagos-gateway' ); ?></h1>
        <form method="post" action="options.php">
            <?php settings_fields( 'venepagos_settings_group' ); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row">
                        <label for="venepagos_api_key"><?php esc_html_e( 'API Key', 'venepagos-gateway' ); ?></label>
                    </th>
                    <td>
                        <input type="text" id="venepagos_api_key" name="venepagos_api_key"
                               value="<?php echo esc_attr( get_option( 'venepagos_api_key' ) ); ?>"
                               class="regular-text" autocomplete="off" />
                        <p class="description"><?php esc_html_e( 'Clave de API proporcionada por VenePagos.', 'venepagos-gateway' ); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="venepagos_merchant_id"><?php esc_html_e( 'Merchant ID', 'venepagos-gateway' ); ?></label>
                    </th>
                    <td>
                        <input type="text" id="venepagos_merchant_id" name="venepagos_merchant_id"
                               value="<?php echo esc_attr( get_option( 'venepagos_merchant_id' ) ); ?>"
                               class="regular-text" />
                        <p class="description"><?php esc_html_e( 'Identificador del comercio en VenePagos.', 'venepagos-gateway' ); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="venepagos_api_base_url"><?php esc_html_e( 'URL Base de la API', 'venepagos-gateway' ); ?></label>
                    </th>
                    <td>
                        <input type="url" id="venepagos_api_base_url" name="venepagos_api_base_url"
                               value="<?php echo esc_attr( get_option( 'venepagos_api_base_url', 'https://api.venepagos.com' ) ); ?>"
                               class="regular-text" />
                        <p class="description"><?php esc_html_e( 'URL base de la API de VenePagos (sin barra final).', 'venepagos-gateway' ); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="venepagos_checkout_mode"><?php esc_html_e( 'Modo de Checkout', 'venepagos-gateway' ); ?></label>
                    </th>
                    <td>
                        <?php $mode = get_option( 'venepagos_checkout_mode', 'redirect' ); ?>
                        <select id="venepagos_checkout_mode" name="venepagos_checkout_mode">
                            <option value="popup" <?php selected( $mode, 'popup' ); ?>><?php esc_html_e( 'Popup (modal)', 'venepagos-gateway' ); ?></option>
                            <option value="newTab" <?php selected( $mode, 'newTab' ); ?>><?php esc_html_e( 'Nueva pestaña', 'venepagos-gateway' ); ?></option>
                            <option value="redirect" <?php selected( $mode, 'redirect' ); ?>><?php esc_html_e( 'Redirección', 'venepagos-gateway' ); ?></option>
                        </select>
                        <p class="description"><?php esc_html_e( 'Cómo se abrirá la página de pago de VenePagos.', 'venepagos-gateway' ); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="venepagos_return_url"><?php esc_html_e( 'URL de Retorno', 'venepagos-gateway' ); ?></label>
                    </th>
                    <td>
                        <input type="url" id="venepagos_return_url" name="venepagos_return_url"
                               value="<?php echo esc_attr( get_option( 'venepagos_return_url', home_url( '/gracias/' ) ) ); ?>"
                               class="regular-text" />
                        <p class="description"><?php esc_html_e( 'Página a la que el cliente regresa después de pagar.', 'venepagos-gateway' ); ?></p>
                    </td>
                </tr>
            </table>
            <?php submit_button( __( 'Guardar cambios', 'venepagos-gateway' ) ); ?>
        </form>
    </div>
    <?php
}

// Enlace rapido a la configuracion desde la lista de plugins.
add_filter( 'plugin_action_links_' . VENEPAGOS_PLUGIN_BASENAME, 'venepagos_action_links' );

function venepagos_action_links( $links ) {
    $settings_link = sprintf(
        '<a href="%s">%s</a>',
        admin_url( 'options-general.php?page=venepagos-settings' ),
        __( 'Configuración', 'venepagos-gateway' )
    );
    array_unshift( $links, $settings_link );
    return $links;
}

// ---------------------------------------------------------------------------
// Shortcode: [venepagos_pay]
// ---------------------------------------------------------------------------

add_shortcode( 'venepagos_pay', 'venepagos_pay_shortcode' );

function venepagos_pay_shortcode( $atts ) {
    $atts = shortcode_atts( array(
        'amount'      => '0',
        'currency'    => 'USD',
        'description' => '',
        'label'       => __( 'Pagar con VenePagos', 'venepagos-gateway' ),
        'class'       => '',
    ), $atts, 'venepagos_pay' );

    $amount = floatval( $atts['amount'] );
    if ( $amount <= 0 ) {
        return '<!-- VenePagos: monto invalido -->';
    }

    /**
     * Filtro para modificar los atributos del shortcode antes de renderizar.
     *
     * @param array $atts Atributos del shortcode.
     */
    $atts = apply_filters( 'venepagos_shortcode_atts', $atts );

    $checkout = new VenePagos_Checkout();
    return $checkout->render_button( $atts );
}

// ---------------------------------------------------------------------------
// Frontend assets
// ---------------------------------------------------------------------------

add_action( 'wp_enqueue_scripts', 'venepagos_enqueue_scripts' );

function venepagos_enqueue_scripts() {
    wp_register_style(
        'venepagos-checkout',
        VENEPAGOS_PLUGIN_URL . 'assets/css/venepagos-checkout.css',
        array(),
        VENEPAGOS_VERSION
    );

    wp_register_script(
        'venepagos-checkout',
        VENEPAGOS_PLUGIN_URL . 'assets/js/venepagos-checkout.js',
        array(),
        VENEPAGOS_VERSION,
        true
    );

    wp_localize_script( 'venepagos-checkout', 'venepagosConfig', array(
        'checkoutMode' => get_option( 'venepagos_checkout_mode', 'redirect' ),
        'returnUrl'    => get_option( 'venepagos_return_url', home_url( '/gracias/' ) ),
        'ajaxUrl'      => admin_url( 'admin-ajax.php' ),
        'nonce'        => wp_create_nonce( 'venepagos_nonce' ),
    ) );
}

// ---------------------------------------------------------------------------
// AJAX: Crear payment link desde el frontend (shortcode)
// ---------------------------------------------------------------------------

add_action( 'wp_ajax_venepagos_create_link', 'venepagos_ajax_create_link' );
add_action( 'wp_ajax_nopriv_venepagos_create_link', 'venepagos_ajax_create_link' );

function venepagos_ajax_create_link() {
    check_ajax_referer( 'venepagos_nonce', 'nonce' );

    $amount      = isset( $_POST['amount'] ) ? floatval( $_POST['amount'] ) : 0;
    $currency    = isset( $_POST['currency'] ) ? sanitize_text_field( $_POST['currency'] ) : 'USD';
    $description = isset( $_POST['description'] ) ? sanitize_text_field( $_POST['description'] ) : '';

    if ( $amount <= 0 ) {
        wp_send_json_error( array( 'message' => __( 'Monto inválido.', 'venepagos-gateway' ) ) );
    }

    $api  = new VenePagos_API();
    $link = $api->create_payment_link( $amount, $currency, $description );

    if ( is_wp_error( $link ) ) {
        wp_send_json_error( array( 'message' => $link->get_error_message() ) );
    }

    /**
     * Se dispara después de crear un enlace de pago exitosamente.
     *
     * @param array $link Datos del enlace de pago.
     */
    do_action( 'venepagos_payment_link_created', $link );

    wp_send_json_success( array(
        'url'   => $link['url'],
        'token' => $link['token'],
        'id'    => $link['id'],
    ) );
}

// ---------------------------------------------------------------------------
// WooCommerce: Registrar gateway si WooCommerce esta activo
// ---------------------------------------------------------------------------

add_action( 'plugins_loaded', 'venepagos_init_wc_gateway' );

function venepagos_init_wc_gateway() {
    if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
        return;
    }

    require_once VENEPAGOS_PLUGIN_DIR . 'includes/class-wc-gateway-venepagos.php';

    add_filter( 'woocommerce_payment_gateways', function ( $gateways ) {
        $gateways[] = 'WC_Gateway_VenePagos';
        return $gateways;
    } );
}

// Declarar compatibilidad con HPOS (High-Performance Order Storage) de WooCommerce.
add_action( 'before_woocommerce_init', function () {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
    }
} );
