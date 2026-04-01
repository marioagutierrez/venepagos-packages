import 'package:url_launcher/url_launcher.dart';

/// Modos de visualizacion del checkout.
enum CheckoutDisplayMode {
  /// Abre en el navegador externo del dispositivo.
  newTab,

  /// Abre en un navegador in-app con opcion de retorno via deep link.
  redirect,

  /// Abre via url_launcher para usar en un popup/bottom sheet con WebView.
  /// En Flutter, se recomienda combinar con showModalBottomSheet y WebView.
  popup,
}

/// Utilidad para abrir el checkout de VenePagos en Flutter.
///
/// Soporta tres modos de visualizacion:
/// - [CheckoutDisplayMode.popup]: Para mostrar en un bottom sheet o dialog.
/// - [CheckoutDisplayMode.newTab]: Abre en el navegador externo.
/// - [CheckoutDisplayMode.redirect]: Abre en navegador in-app con retorno.
class VenePagosCheckout {
  const VenePagosCheckout._();

  /// Abre el checkout de VenePagos con la URL de pago proporcionada.
  ///
  /// [url] es la URL de pago obtenida al crear un link o una orden.
  /// [mode] determina como se muestra el checkout al usuario.
  /// [returnUrl] es la URL de retorno (deep link) para el modo redirect.
  ///
  /// Retorna `true` si el checkout se abrio exitosamente.
  ///
  /// Ejemplo:
  /// ```dart
  /// await VenePagosCheckout.openCheckout(
  ///   url: 'https://pay.venepagos.com/abc123',
  ///   mode: CheckoutDisplayMode.redirect,
  ///   returnUrl: 'miapp://payment-complete',
  /// );
  /// ```
  static Future<bool> openCheckout({
    required String url,
    CheckoutDisplayMode mode = CheckoutDisplayMode.newTab,
    String? returnUrl,
  }) async {
    final checkoutUrl = returnUrl != null && mode == CheckoutDisplayMode.redirect
        ? _appendReturnUrl(url, returnUrl)
        : url;

    final uri = Uri.parse(checkoutUrl);

    switch (mode) {
      case CheckoutDisplayMode.popup:
        // En modo popup, se lanza la URL. El desarrollador debe envolver
        // esto en un showModalBottomSheet o showDialog con un WebView.
        // url_launcher se usa como fallback.
        return await launchUrl(
          uri,
          mode: LaunchMode.platformDefault,
        );

      case CheckoutDisplayMode.newTab:
        return await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );

      case CheckoutDisplayMode.redirect:
        return await launchUrl(
          uri,
          mode: LaunchMode.inAppBrowserView,
        );
    }
  }

  /// Verifica si una URL de checkout puede ser abierta.
  static Future<bool> canOpenCheckout(String url) async {
    return await canLaunchUrl(Uri.parse(url));
  }

  /// Agrega el parametro returnUrl a la URL del checkout.
  static String _appendReturnUrl(String url, String returnUrl) {
    final uri = Uri.parse(url);
    final params = Map<String, String>.from(uri.queryParameters);
    params['returnUrl'] = returnUrl;
    return uri.replace(queryParameters: params).toString();
  }
}
