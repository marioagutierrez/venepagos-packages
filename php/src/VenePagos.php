<?php

namespace VenePagos;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\GuzzleException;
use VenePagos\Exceptions\ApiException;
use VenePagos\Exceptions\AuthenticationException;
use VenePagos\Exceptions\VenePagosException;

class VenePagos
{
    /** @var string */
    private $apiKey;

    /** @var string */
    private $baseUrl;

    /** @var Client */
    private $httpClient;

    /** @var int */
    private $timeout;

    /**
     * @param string $apiKey Clave de API de VenePagos
     * @param array $options Opciones de configuracion:
     *   - baseUrl (string): URL base de la API (default: https://api.venepagos.com)
     *   - timeout (int): Timeout en segundos (default: 30)
     *   - httpClient (Client|null): Cliente HTTP personalizado
     */
    public function __construct(string $apiKey, array $options = [])
    {
        if (empty($apiKey)) {
            throw new AuthenticationException('La API key es requerida');
        }

        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($options['baseUrl'] ?? 'https://api.venepagos.com', '/');
        $this->timeout = $options['timeout'] ?? 30;

        $this->httpClient = $options['httpClient'] ?? new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => $this->timeout,
            'headers' => [
                'X-API-Key' => $this->apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
        ]);
    }

    // -------------------------------------------------------
    // Payment Links
    // -------------------------------------------------------

    /**
     * Crear un link de pago.
     *
     * @param array $params {
     *   @type string $merchantId  ID del comercio (requerido)
     *   @type float  $amount      Monto del pago (requerido)
     *   @type string $currency    Moneda (opcional, default: VES)
     *   @type string $description Descripcion del pago (opcional)
     *   @type string $expiresAt   Fecha de expiracion ISO 8601 (opcional)
     * }
     * @return array Datos del link de pago creado
     * @throws VenePagosException
     */
    public function createPaymentLink(array $params): array
    {
        $this->validateRequired($params, ['merchantId', 'amount']);

        return $this->request('POST', '/api/v1/payment-links', $params);
    }

    /**
     * Listar links de pago.
     *
     * @param array $query Filtros opcionales: merchantId
     * @return array Lista de links de pago
     * @throws VenePagosException
     */
    public function listPaymentLinks(array $query = []): array
    {
        return $this->request('GET', '/api/v1/payment-links', null, $query);
    }

    /**
     * Obtener un link de pago por ID.
     *
     * @param string $id ID del link de pago
     * @return array Datos del link de pago
     * @throws VenePagosException
     */
    public function getPaymentLink(string $id): array
    {
        return $this->request('GET', "/api/v1/payment-links/{$id}");
    }

    /**
     * Actualizar un link de pago.
     *
     * @param string $id     ID del link de pago
     * @param array  $params Campos a actualizar
     * @return array Datos del link de pago actualizado
     * @throws VenePagosException
     */
    public function updatePaymentLink(string $id, array $params): array
    {
        return $this->request('PUT', "/api/v1/payment-links/{$id}", $params);
    }

    /**
     * Desactivar un link de pago.
     *
     * @param string $id ID del link de pago
     * @return array Respuesta de la API
     * @throws VenePagosException
     */
    public function deactivatePaymentLink(string $id): array
    {
        return $this->request('DELETE', "/api/v1/payment-links/{$id}");
    }

    // -------------------------------------------------------
    // Public / Pay
    // -------------------------------------------------------

    /**
     * Obtener informacion publica de un pago por token.
     *
     * @param string $token Token del link de pago
     * @return array Informacion del pago
     * @throws VenePagosException
     */
    public function getPaymentInfo(string $token): array
    {
        return $this->request('GET', "/api/v1/pay/{$token}");
    }

    // -------------------------------------------------------
    // Store / Checkout
    // -------------------------------------------------------

    /**
     * Crear una orden de checkout en una tienda.
     *
     * @param string $storeSlug   Slug de la tienda
     * @param string $productSlug Slug del producto
     * @param array  $params {
     *   @type string $customerName    Nombre del cliente (requerido)
     *   @type string $customerEmail   Email del cliente (requerido)
     *   @type string $customerPhone   Telefono del cliente (opcional)
     *   @type int    $quantity        Cantidad (opcional, default: 1)
     *   @type string $shippingAddress Direccion de envio (opcional)
     *   @type string $notes           Notas adicionales (opcional)
     * }
     * @return array { order: {...}, paymentUrl: string }
     * @throws VenePagosException
     */
    public function createOrder(string $storeSlug, string $productSlug, array $params): array
    {
        $this->validateRequired($params, ['customerName', 'customerEmail']);

        return $this->request('POST', "/api/v1/store/{$storeSlug}/checkout/{$productSlug}", $params);
    }

    /**
     * Crear una instancia de Checkout para integracion frontend.
     *
     * @param string $paymentUrl URL de pago obtenida de createOrder()
     * @return Checkout
     */
    public function checkout(string $paymentUrl): Checkout
    {
        return new Checkout($paymentUrl);
    }

    // -------------------------------------------------------
    // Internal
    // -------------------------------------------------------

    /**
     * @param string     $method  HTTP method
     * @param string     $path    Request path
     * @param array|null $body    Request body (for POST/PUT)
     * @param array      $query   Query parameters (for GET)
     * @return array
     * @throws VenePagosException
     */
    private function request(string $method, string $path, ?array $body = null, array $query = []): array
    {
        $options = [];

        if (!empty($query)) {
            $options['query'] = $query;
        }

        if ($body !== null) {
            $options['json'] = $body;
        }

        try {
            $response = $this->httpClient->request($method, $path, $options);
            $data = json_decode($response->getBody()->getContents(), true);

            return $data ?? [];
        } catch (ClientException $e) {
            $statusCode = $e->getResponse()->getStatusCode();
            $responseBody = json_decode($e->getResponse()->getBody()->getContents(), true);
            $message = $responseBody['error'] ?? $responseBody['message'] ?? $e->getMessage();

            if ($statusCode === 401) {
                throw new AuthenticationException($message, $e);
            }

            throw new ApiException($message, $statusCode, $responseBody, $e);
        } catch (GuzzleException $e) {
            throw new VenePagosException(
                'Error de conexion con VenePagos: ' . $e->getMessage(),
                0,
                null,
                $e
            );
        }
    }

    /**
     * @param array    $params
     * @param string[] $fields
     * @throws VenePagosException
     */
    private function validateRequired(array $params, array $fields): void
    {
        foreach ($fields as $field) {
            if (!isset($params[$field]) || (is_string($params[$field]) && trim($params[$field]) === '')) {
                throw new VenePagosException("El campo '{$field}' es requerido");
            }
        }
    }

    /**
     * Obtener la URL base configurada.
     *
     * @return string
     */
    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }
}
