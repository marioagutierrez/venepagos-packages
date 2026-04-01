<?php
/**
 * Logica de presentacion del checkout de VenePagos.
 *
 * @package VenePagos_Gateway
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class VenePagos_Checkout {

    /**
     * Renderiza el boton de pago para el shortcode.
     *
     * @param array $atts Atributos del shortcode.
     * @return string HTML del boton.
     */
    public function render_button( $atts ) {
        // Encolar assets solo cuando se usa el shortcode.
        wp_enqueue_style( 'venepagos-checkout' );
        wp_enqueue_script( 'venepagos-checkout' );

        $extra_class = ! empty( $atts['class'] ) ? ' ' . esc_attr( $atts['class'] ) : '';

        $html = sprintf(
            '<button type="button" class="venepagos-pay-button%s" data-amount="%s" data-currency="%s" data-description="%s">%s</button>',
            $extra_class,
            esc_attr( $atts['amount'] ),
            esc_attr( $atts['currency'] ),
            esc_attr( $atts['description'] ),
            esc_html( $atts['label'] )
        );

        /**
         * Filtro para modificar el HTML del boton de pago.
         *
         * @param string $html HTML del boton.
         * @param array  $atts Atributos del shortcode.
         */
        return apply_filters( 'venepagos_button_html', $html, $atts );
    }

    /**
     * Abre el checkout segun el modo configurado.
     *
     * Se usa del lado del servidor solo para el modo "redirect".
     * Los modos "popup" y "newTab" se manejan en JavaScript.
     *
     * @param string $payment_url URL del enlace de pago.
     * @param string $mode        Modo de checkout: popup, newTab, redirect.
     */
    public function open_checkout( $payment_url, $mode = null ) {
        if ( null === $mode ) {
            $mode = get_option( 'venepagos_checkout_mode', 'redirect' );
        }

        /**
         * Filtro para modificar la URL de pago antes de abrirla.
         *
         * @param string $payment_url URL del enlace de pago.
         * @param string $mode        Modo de checkout.
         */
        $payment_url = apply_filters( 'venepagos_checkout_url', $payment_url, $mode );

        if ( 'redirect' === $mode ) {
            wp_redirect( $payment_url );
            exit;
        }

        // Para popup y newTab, la logica se maneja en JS.
        // Este metodo retorna la URL para que el llamador la pase al frontend.
        return $payment_url;
    }
}
