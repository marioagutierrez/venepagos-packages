/// Excepcion base para todos los errores del SDK de VenePagos.
class VenePagosException implements Exception {
  /// Mensaje descriptivo del error.
  final String message;

  /// Codigo de estado HTTP, si aplica.
  final int? statusCode;

  const VenePagosException(this.message, {this.statusCode});

  @override
  String toString() => 'VenePagosException: $message'
      '${statusCode != null ? ' (HTTP $statusCode)' : ''}';
}

/// Error de autenticacion (API key invalida o ausente).
class AuthenticationException extends VenePagosException {
  const AuthenticationException([String message = 'API key invalida o ausente'])
      : super(message, statusCode: 401);

  @override
  String toString() => 'AuthenticationException: $message';
}

/// Error generico de la API de VenePagos.
class ApiException extends VenePagosException {
  /// Cuerpo de la respuesta del servidor.
  final String? responseBody;

  const ApiException(
    super.message, {
    super.statusCode,
    this.responseBody,
  });

  @override
  String toString() => 'ApiException: $message'
      '${statusCode != null ? ' (HTTP $statusCode)' : ''}'
      '${responseBody != null ? '\nResponse: $responseBody' : ''}';
}
