import 'dart:convert';

import 'package:http/http.dart' as http;

import 'exceptions.dart';
import 'models.dart';

/// Cliente principal del SDK de VenePagos.
///
/// Proporciona metodos para interactuar con la API de VenePagos:
/// links de pago, informacion de pagos y checkout de tiendas.
class VenePagosClient {
  /// API key para autenticacion.
  final String apiKey;

  /// URL base de la API.
  final String baseUrl;

  /// Cliente HTTP subyacente (inyectable para testing).
  final http.Client _httpClient;

  /// Crea una instancia del cliente de VenePagos.
  ///
  /// [apiKey] es obligatorio para autenticar las solicitudes.
  /// [baseUrl] por defecto apunta a la API de produccion.
  /// [httpClient] permite inyectar un cliente HTTP personalizado para testing.
  VenePagosClient({
    required this.apiKey,
    this.baseUrl = 'https://api.venepagos.com',
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? http.Client();

  /// Headers comunes para todas las solicitudes.
  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      };

  // ---------------------------------------------------------------------------
  // Payment Links
  // ---------------------------------------------------------------------------

  /// Crea un nuevo link de pago.
  ///
  /// Retorna el [PaymentLink] creado.
  Future<PaymentLink> createPaymentLink(
      CreatePaymentLinkRequest request) async {
    final response = await _post('/api/v1/payment-links', request.toJson());
    return PaymentLink.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// Lista los links de pago.
  ///
  /// Opcionalmente filtra por [merchantId].
  Future<List<PaymentLink>> listPaymentLinks({String? merchantId}) async {
    final queryParams = <String, String>{};
    if (merchantId != null) queryParams['merchantId'] = merchantId;

    final response = await _get('/api/v1/payment-links', queryParams);
    final data = response['data'] as List<dynamic>;
    return data
        .map((item) => PaymentLink.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// Obtiene un link de pago por su ID.
  Future<PaymentLink> getPaymentLink(String id) async {
    final response = await _get('/api/v1/payment-links/$id');
    return PaymentLink.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// Actualiza un link de pago existente.
  Future<PaymentLink> updatePaymentLink(
      String id, UpdatePaymentLinkRequest request) async {
    final response =
        await _put('/api/v1/payment-links/$id', request.toJson());
    return PaymentLink.fromJson(response['data'] as Map<String, dynamic>);
  }

  /// Desactiva un link de pago.
  Future<void> deactivatePaymentLink(String id) async {
    await _delete('/api/v1/payment-links/$id');
  }

  // ---------------------------------------------------------------------------
  // Public Payment Info
  // ---------------------------------------------------------------------------

  /// Obtiene la informacion publica de pago usando un token.
  ///
  /// Este endpoint es publico y no requiere autenticacion,
  /// pero se envia el header de todas formas.
  Future<PaymentInfo> getPaymentInfo(String token) async {
    final response = await _get('/api/v1/pay/$token');
    return PaymentInfo.fromJson(response['data'] as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // Store Checkout
  // ---------------------------------------------------------------------------

  /// Crea una orden via checkout de tienda.
  ///
  /// [slug] es el identificador de la tienda.
  /// [productSlug] es el identificador del producto.
  /// Retorna un [OrderResult] con la orden y la URL de pago.
  Future<OrderResult> createOrder({
    required String slug,
    required String productSlug,
    required CreateOrderRequest request,
  }) async {
    final response = await _post(
      '/api/v1/store/$slug/checkout/$productSlug',
      request.toJson(),
    );
    return OrderResult.fromJson(response['data'] as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // HTTP helpers
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> _get(
    String path, [
    Map<String, String>? queryParams,
  ]) async {
    final uri = _buildUri(path, queryParams);
    final response = await _httpClient.get(uri, headers: _headers);
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, dynamic> body,
  ) async {
    final uri = _buildUri(path);
    final response = await _httpClient.post(
      uri,
      headers: _headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> _put(
    String path,
    Map<String, dynamic> body,
  ) async {
    final uri = _buildUri(path);
    final response = await _httpClient.put(
      uri,
      headers: _headers,
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> _delete(String path) async {
    final uri = _buildUri(path);
    final response = await _httpClient.delete(uri, headers: _headers);
    return _handleResponse(response);
  }

  Uri _buildUri(String path, [Map<String, String>? queryParams]) {
    final base = Uri.parse(baseUrl);
    return base.replace(
      path: path,
      queryParameters: queryParams?.isNotEmpty == true ? queryParams : null,
    );
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    final body = response.body;

    if (response.statusCode == 401) {
      throw const AuthenticationException();
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'Error en la solicitud';
      try {
        final json = jsonDecode(body) as Map<String, dynamic>;
        message = json['message'] as String? ??
            json['error'] as String? ??
            message;
      } catch (_) {
        // El body no es JSON valido, usar mensaje por defecto.
      }
      throw ApiException(
        message,
        statusCode: response.statusCode,
        responseBody: body,
      );
    }

    if (body.isEmpty) return {};

    try {
      return jsonDecode(body) as Map<String, dynamic>;
    } catch (e) {
      throw VenePagosException(
        'Respuesta invalida del servidor: $e',
        statusCode: response.statusCode,
      );
    }
  }

  /// Cierra el cliente HTTP subyacente.
  ///
  /// Llamar a este metodo libera los recursos del cliente.
  /// Despues de cerrarlo, no se deben hacer mas solicitudes.
  void close() {
    _httpClient.close();
  }
}
