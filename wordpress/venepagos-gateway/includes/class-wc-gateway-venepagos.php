<?php
/**
 * Gateway de pago WooCommerce para VenePagos.
 *
 * @package VenePagos_Gateway
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WC_Gateway_VenePagos extends WC_Payment_Gateway {

    /**
     * Constructor.
     */
    public function __construct() {
        $this->id                 = 'venepagos';
        $this->icon               = VENEPAGOS_PLUGIN_URL . 'assets/img/venepagos-icon.png';
        $this->has_fields         = false;
        $this->method_title       = __( 'VenePagos', 'venepagos-gateway' );
        $this->method_description = __( 'Acepta pagos a través de VenePagos. Los clientes serán redirigidos a VenePagos para completar el pago.', 'venepagos-gateway' );

        // Cargar campos de configuracion.
        $this->init_form_fields();
        $this->init_settings();

        $this->title       = $this->get_option( 'title' );
        $this->description = $this->get_option( 'description' );
        $this->enabled     = $this->get_option( 'enabled' );

        // Guardar opciones del gateway.
        add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );

        // Encolar scripts en el checkout.
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_checkout_scripts' ) );
    }

    /**
     * Campos de configuracion del gateway en WooCommerce.
     */
    public function init_form_fields() {
        $this->form_fields = array(
            'enabled'     => array(
                'title'   => __( 'Activar/Desactivar', 'venepagos-gateway' ),
                'type'    => 'checkbox',
                'label'   => __( 'Activar VenePagos', 'venepagos-gateway' ),
                'default' => 'no',
            ),
            'title'       => array(
                'title'       => __( 'Título', 'venepagos-gateway' ),
                'type'        => 'text',
                'description' => __( 'El título que el usuario ve durante el checkout.', 'venepagos-gateway' ),
                'default'     => __( 'VenePagos', 'venepagos-gateway' ),
                'desc_tip'    => true,
            ),
            'description' => array(
                'title'       => __( 'Descripción', 'venepagos-gateway' ),
                'type'        => 'textarea',
                'description' => __( 'Descripción que el usuario ve durante el checkout.', 'venepagos-gateway' ),
                'default'     => __( 'Paga de forma segura con VenePagos.', 'venepagos-gateway' ),
                'desc_tip'    => true,
            ),
        );
    }

    /**
     * Procesa el pago.
     *
     * @param int $order_id ID de la orden de WooCommerce.
     * @return array Resultado con redirect URL.
     */
    public function process_payment( $order_id ) {
        $order = wc_get_order( $order_id );

        if ( ! $order ) {
            wc_add_notice( __( 'Orden no encontrada.', 'venepagos-gateway' ), 'error' );
            return array( 'result' => 'failure' );
        }

        $api = new VenePagos_API();

        $description = sprintf(
            /* translators: %s: order number */
            __( 'Orden #%s', 'venepagos-gateway' ),
            $order->get_order_number()
        );

        /**
         * Filtro para modificar la descripcion del pago en WooCommerce.
         *
         * @param string   $description Descripcion del pago.
         * @param WC_Order $order       Orden de WooCommerce.
         */
        $description = apply_filters( 'venepagos_wc_payment_description', $description, $order );

        $currency = $order->get_currency();
        $amount   = (float) $order->get_total();

        $link = $api->create_payment_link( $amount, $currency, $description );

        if ( is_wp_error( $link ) ) {
            wc_add_notice(
                sprintf(
                    /* translators: %s: error message */
                    __( 'Error al crear el enlace de pago: %s', 'venepagos-gateway' ),
                    $link->get_error_message()
                ),
                'error'
            );
            return array( 'result' => 'failure' );
        }

        // Guardar datos del enlace de pago en la orden.
        $order->update_meta_data( '_venepagos_payment_link_id', $link['id'] );
        $order->update_meta_data( '_venepagos_payment_token', $link['token'] );
        $order->update_meta_data( '_venepagos_payment_url', $link['url'] );
        $order->save();

        // Marcar como pendiente de pago.
        $order->update_status( 'pending', __( 'Esperando pago vía VenePagos.', 'venepagos-gateway' ) );

        // Vaciar carrito.
        WC()->cart->empty_cart();

        /**
         * Se dispara despues de crear el enlace de pago para una orden de WooCommerce.
         *
         * @param array    $link  Datos del enlace de pago.
         * @param WC_Order $order Orden de WooCommerce.
         */
        do_action( 'venepagos_wc_payment_link_created', $link, $order );

        $checkout_mode = get_option( 'venepagos_checkout_mode', 'redirect' );

        // Para todos los modos, redirigimos a la URL de pago.
        // El JS del frontend manejara popup/newTab si corresponde.
        if ( 'popup' === $checkout_mode ) {
            // Para popup, redirigimos a una pagina intermedia o usamos JS.
            // WooCommerce siempre espera una URL de redireccion, asi que redirigimos
            // a la pagina de la orden con un parametro para que el JS abra el popup.
            return array(
                'result'   => 'success',
                'redirect' => add_query_arg( array(
                    'venepagos_popup' => '1',
                    'venepagos_url'   => urlencode( $link['url'] ),
                ), $order->get_checkout_order_received_url() ),
            );
        }

        // newTab y redirect: redirigir directamente a la URL de pago.
        return array(
            'result'   => 'success',
            'redirect' => $link['url'],
        );
    }

    /**
     * Encola scripts del checkout si este gateway esta activo.
     */
    public function enqueue_checkout_scripts() {
        if ( 'yes' !== $this->enabled ) {
            return;
        }

        if ( is_checkout() || is_wc_endpoint_url( 'order-received' ) ) {
            wp_enqueue_style( 'venepagos-checkout' );
            wp_enqueue_script( 'venepagos-checkout' );
        }
    }
}
