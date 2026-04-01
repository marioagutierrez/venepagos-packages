<?php
/**
 * Clase para interactuar con la API de VenePagos.
 *
 * @package VenePagos_Gateway
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class VenePagos_API {

    /**
     * URL base de la API.
     *
     * @var string
     */
    private $base_url;

    /**
     * Clave de API.
     *
     * @var string
     */
    private $api_key;

    /**
     * ID del comercio.
     *
     * @var string
     */
    private $merchant_id;

    /**
     * Constructor.
     *
     * @param string|null $api_key     Clave de API (usa opcion guardada si es null).
     * @param string|null $merchant_id Merchant ID (usa opcion guardada si es null).
     * @param string|null $base_url    URL base de la API (usa opcion guardada si es null).
     */
    public function __construct( $api_key = null, $merchant_id = null, $base_url = null ) {
        $this->api_key     = $api_key     ?? get_option( 'venepagos_api_key', '' );
        $this->merchant_id = $merchant_id ?? get_option( 'venepagos_merchant_id', '' );
        $this->base_url    = untrailingslashit( $base_url ?? get_option( 'venepagos_api_base_url', 'https://api.venepagos.com' ) );
    }

    /**
     * Cabeceras comunes para las peticiones.
     *
     * @return array
     */
    private function headers() {
        return array(
            'Content-Type' => 'application/json',
            'X-API-Key'    => $this->api_key,
            'Accept'       => 'application/json',
        );
    }

    /**
     * Crea un enlace de pago.
     *
     * @param float       $amount      Monto a cobrar.
     * @param string      $currency    Moneda (USD, VES, etc.).
     * @param string      $description Descripcion del pago.
     * @param string|null $expires_at  Fecha de expiracion ISO 8601 (opcional).
     * @return array|WP_Error Datos del enlace o error.
     */
    public function create_payment_link( $amount, $currency = 'USD', $description = '', $expires_at = null ) {
        $body = array(
            'merchantId'  => $this->merchant_id,
            'amount'      => (float) $amount,
            'currency'    => $currency,
            'description' => $description,
        );

        if ( $expires_at ) {
            $body['expiresAt'] = $expires_at;
        }

        /**
         * Filtro para modificar el cuerpo de la peticion antes de crear el enlace de pago.
         *
         * @param array $body Cuerpo de la peticion.
         */
        $body = apply_filters( 'venepagos_create_link_body', $body );

        $response = wp_remote_post( $this->base_url . '/api/v1/payment-links', array(
            'headers' => $this->headers(),
            'body'    => wp_json_encode( $body ),
            'timeout' => 30,
        ) );

        return $this->parse_response( $response );
    }

    /**
     * Obtiene informacion publica de un pago por su token.
     *
     * @param string $token Token del enlace de pago.
     * @return array|WP_Error Datos del pago o error.
     */
    public function get_payment_info( $token ) {
        $response = wp_remote_get( $this->base_url . '/api/v1/pay/' . urlencode( $token ), array(
            'headers' => $this->headers(),
            'timeout' => 30,
        ) );

        return $this->parse_response( $response );
    }

    /**
     * Crea una orden desde una tienda.
     *
     * @param string $store_slug   Slug de la tienda.
     * @param string $product_slug Slug del producto.
     * @param array  $customer     Datos del cliente.
     * @return array|WP_Error Datos de la orden o error.
     */
    public function create_store_order( $store_slug, $product_slug, $customer ) {
        $body = array(
            'customerName'  => $customer['name']  ?? '',
            'customerEmail' => $customer['email'] ?? '',
        );

        if ( ! empty( $customer['phone'] ) ) {
            $body['customerPhone'] = $customer['phone'];
        }
        if ( ! empty( $customer['quantity'] ) ) {
            $body['quantity'] = (int) $customer['quantity'];
        }
        if ( ! empty( $customer['shippingAddress'] ) ) {
            $body['shippingAddress'] = $customer['shippingAddress'];
        }
        if ( ! empty( $customer['notes'] ) ) {
            $body['notes'] = $customer['notes'];
        }

        /**
         * Filtro para modificar el cuerpo de la peticion antes de crear la orden.
         *
         * @param array  $body         Cuerpo de la peticion.
         * @param string $store_slug   Slug de la tienda.
         * @param string $product_slug Slug del producto.
         */
        $body = apply_filters( 'venepagos_create_order_body', $body, $store_slug, $product_slug );

        $url = sprintf(
            '%s/api/v1/store/%s/checkout/%s',
            $this->base_url,
            urlencode( $store_slug ),
            urlencode( $product_slug )
        );

        $response = wp_remote_post( $url, array(
            'headers' => $this->headers(),
            'body'    => wp_json_encode( $body ),
            'timeout' => 30,
        ) );

        return $this->parse_response( $response );
    }

    /**
     * Parsea la respuesta de la API.
     *
     * @param array|WP_Error $response Respuesta de wp_remote_*.
     * @return array|WP_Error Datos o error.
     */
    private function parse_response( $response ) {
        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $body = wp_remote_retrieve_body( $response );
        $data = json_decode( $body, true );

        if ( $code < 200 || $code >= 300 ) {
            $message = isset( $data['message'] ) ? $data['message'] : __( 'Error desconocido en la API de VenePagos.', 'venepagos-gateway' );
            return new WP_Error( 'venepagos_api_error', $message, array( 'status' => $code ) );
        }

        if ( isset( $data['data'] ) ) {
            return $data['data'];
        }

        return $data;
    }
}
