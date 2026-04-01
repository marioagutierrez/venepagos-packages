# VenePagos SDK para Dart y Flutter

SDK oficial de VenePagos para integrar pagos en aplicaciones Dart y Flutter.

## Instalacion

Agrega `venepagos` a tu `pubspec.yaml`:

```yaml
dependencies:
  venepagos:
    git:
      url: https://github.com/venepagos/venepagos-dart.git
```

O si el paquete esta publicado en pub.dev:

```yaml
dependencies:
  venepagos: ^1.0.0
```

Luego ejecuta:

```bash
flutter pub get
```

## Inicio rapido

```dart
import 'package:venepagos/venepagos.dart';

final client = VenePagosClient(apiKey: 'tu-api-key');

// Crear un link de pago
final link = await client.createPaymentLink(
  CreatePaymentLinkRequest(
    merchantId: 'merchant-123',
    amount: 25.00,
    description: 'Producto de ejemplo',
  ),
);

print('Link de pago: ${link.url}');
```

## Configuracion

### Crear el cliente

```dart
final client = VenePagosClient(
  apiKey: 'tu-api-key',
  baseUrl: 'https://api.venepagos.com', // Opcional, este es el valor por defecto
);
```

El parametro `baseUrl` permite apuntar a otro entorno (staging, desarrollo local, etc.):

```dart
final client = VenePagosClient(
  apiKey: 'tu-api-key',
  baseUrl: 'http://localhost:8080',
);
```

### Cerrar el cliente

Cuando ya no necesites el cliente, cierra la conexion para liberar recursos:

```dart
client.close();
```

## Links de pago

### Crear un link de pago

```dart
final link = await client.createPaymentLink(
  CreatePaymentLinkRequest(
    merchantId: 'merchant-123',
    amount: 50.00,
    currency: 'USD',
    description: 'Suscripcion mensual',
    expiresAt: DateTime.now().add(Duration(days: 7)),
  ),
);

print('ID: ${link.id}');
print('URL: ${link.url}');
print('Token: ${link.token}');
```

### Listar links de pago

```dart
// Todos los links
final links = await client.listPaymentLinks();

// Filtrar por merchant
final merchantLinks = await client.listPaymentLinks(merchantId: 'merchant-123');

for (final link in merchantLinks) {
  print('${link.id}: ${link.amount} ${link.currency}');
}
```

### Obtener un link de pago

```dart
final link = await client.getPaymentLink('link-id-123');
print('Monto: ${link.amount} ${link.currency}');
```

### Actualizar un link de pago

```dart
final updated = await client.updatePaymentLink(
  'link-id-123',
  UpdatePaymentLinkRequest(
    amount: 75.00,
    description: 'Precio actualizado',
  ),
);
```

### Desactivar un link de pago

```dart
await client.deactivatePaymentLink('link-id-123');
```

### Obtener informacion publica de pago

```dart
final info = await client.getPaymentInfo('token-abc');
print('Monto a pagar: ${info.amount} ${info.currency}');
```

## Abrir checkout en Flutter

El SDK incluye `VenePagosCheckout` para abrir la pagina de pago directamente desde Flutter. Soporta tres modos de visualizacion:

### Modo popup

Abre la URL de pago usando el mecanismo por defecto de la plataforma. Ideal para combinarlo con un `showModalBottomSheet` o `showDialog` que contenga un `WebView`:

```dart
await VenePagosCheckout.openCheckout(
  url: link.url,
  mode: CheckoutDisplayMode.popup,
);
```

Ejemplo con bottom sheet y WebView:

```dart
showModalBottomSheet(
  context: context,
  isScrollControlled: true,
  builder: (context) => SizedBox(
    height: MediaQuery.of(context).size.height * 0.9,
    child: WebViewWidget(
      controller: WebViewController()..loadRequest(Uri.parse(link.url)),
    ),
  ),
);
```

### Modo newTab

Abre la URL en el navegador externo del dispositivo:

```dart
await VenePagosCheckout.openCheckout(
  url: link.url,
  mode: CheckoutDisplayMode.newTab,
);
```

### Modo redirect

Abre en un navegador in-app. Usa `returnUrl` para que el usuario regrese a la app via deep link despues de pagar:

```dart
await VenePagosCheckout.openCheckout(
  url: link.url,
  mode: CheckoutDisplayMode.redirect,
  returnUrl: 'miapp://payment-complete',
);
```

Para configurar deep links, consulta la documentacion de Flutter para [Android](https://docs.flutter.dev/cookbook/navigation/set-up-app-links) e [iOS](https://docs.flutter.dev/cookbook/navigation/set-up-universal-links).

### Verificar disponibilidad

```dart
final canOpen = await VenePagosCheckout.canOpenCheckout(link.url);
if (canOpen) {
  await VenePagosCheckout.openCheckout(url: link.url);
}
```

## Checkout de tienda

Crea una orden a traves del checkout de una tienda:

```dart
final result = await client.createOrder(
  slug: 'mi-tienda',
  productSlug: 'producto-premium',
  request: CreateOrderRequest(
    customerName: 'Juan Perez',
    customerEmail: 'juan@email.com',
    customerPhone: '+58412-1234567',
    quantity: 2,
    shippingAddress: 'Av. Principal, Caracas',
    notes: 'Entregar en horario de oficina',
  ),
);

print('Orden creada: ${result.order}');
print('URL de pago: ${result.paymentUrl}');

// Abrir el checkout para que el usuario pague
await VenePagosCheckout.openCheckout(
  url: result.paymentUrl,
  mode: CheckoutDisplayMode.redirect,
  returnUrl: 'miapp://order-complete',
);
```

## Modelos de datos

### PaymentLink

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | `String` | ID unico del link |
| `merchantId` | `String` | ID del comercio |
| `amount` | `double` | Monto a pagar |
| `currency` | `String` | Moneda (ej: "USD") |
| `description` | `String?` | Descripcion del pago |
| `token` | `String` | Token unico del link |
| `url` | `String` | URL completa del link de pago |
| `isActive` | `bool` | Si el link esta activo |
| `expiresAt` | `DateTime?` | Fecha de expiracion |
| `createdAt` | `DateTime` | Fecha de creacion |

### PaymentInfo

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | `String` | ID unico |
| `merchantId` | `String` | ID del comercio |
| `amount` | `double` | Monto a pagar |
| `currency` | `String` | Moneda |
| `description` | `String?` | Descripcion |
| `isActive` | `bool` | Si esta activo |
| `expiresAt` | `DateTime?` | Fecha de expiracion |

### OrderResult

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `order` | `Map<String, dynamic>` | Datos de la orden |
| `paymentUrl` | `String` | URL para completar el pago |

### CreatePaymentLinkRequest

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `merchantId` | `String` | Si | ID del comercio |
| `amount` | `double` | Si | Monto a cobrar |
| `currency` | `String?` | No | Moneda (defecto: USD) |
| `description` | `String?` | No | Descripcion del pago |
| `expiresAt` | `DateTime?` | No | Fecha de expiracion |

### CreateOrderRequest

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `customerName` | `String` | Si | Nombre del cliente |
| `customerEmail` | `String` | Si | Email del cliente |
| `customerPhone` | `String?` | No | Telefono del cliente |
| `quantity` | `int?` | No | Cantidad de productos |
| `shippingAddress` | `String?` | No | Direccion de envio |
| `notes` | `String?` | No | Notas adicionales |

## Manejo de errores

El SDK lanza excepciones tipadas que puedes capturar de forma granular:

```dart
try {
  final link = await client.createPaymentLink(
    CreatePaymentLinkRequest(
      merchantId: 'merchant-123',
      amount: 25.00,
    ),
  );
} on AuthenticationException {
  // API key invalida o ausente (HTTP 401)
  print('Error de autenticacion. Verifica tu API key.');
} on ApiException catch (e) {
  // Error de la API (HTTP 4xx/5xx)
  print('Error de API: ${e.message} (HTTP ${e.statusCode})');
  print('Respuesta: ${e.responseBody}');
} on VenePagosException catch (e) {
  // Otros errores del SDK
  print('Error: ${e.message}');
}
```

### Jerarquia de excepciones

- **VenePagosException** - Excepcion base. Contiene `message` y `statusCode` opcional.
- **AuthenticationException** - API key invalida o ausente (HTTP 401).
- **ApiException** - Error generico de la API. Incluye `responseBody` con la respuesta del servidor.

## Ejemplo completo Flutter

```dart
import 'package:flutter/material.dart';
import 'package:venepagos/venepagos.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VenePagos Demo',
      home: const PaymentPage(),
    );
  }
}

class PaymentPage extends StatefulWidget {
  const PaymentPage({super.key});

  @override
  State<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  final client = VenePagosClient(apiKey: 'tu-api-key');
  bool _loading = false;

  @override
  void dispose() {
    client.close();
    super.dispose();
  }

  Future<void> _createAndPay() async {
    setState(() => _loading = true);

    try {
      // 1. Crear link de pago
      final link = await client.createPaymentLink(
        CreatePaymentLinkRequest(
          merchantId: 'merchant-123',
          amount: 25.00,
          currency: 'USD',
          description: 'Compra en la app',
        ),
      );

      // 2. Abrir checkout
      await VenePagosCheckout.openCheckout(
        url: link.url,
        mode: CheckoutDisplayMode.redirect,
        returnUrl: 'miapp://payment-complete',
      );
    } on AuthenticationException {
      _showError('API key invalida');
    } on ApiException catch (e) {
      _showError('Error: ${e.message}');
    } catch (e) {
      _showError('Error inesperado: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _createOrder() async {
    setState(() => _loading = true);

    try {
      // 1. Crear orden
      final result = await client.createOrder(
        slug: 'mi-tienda',
        productSlug: 'producto-1',
        request: CreateOrderRequest(
          customerName: 'Maria Garcia',
          customerEmail: 'maria@email.com',
          customerPhone: '+58412-9876543',
          quantity: 1,
        ),
      );

      // 2. Abrir checkout para pagar la orden
      await VenePagosCheckout.openCheckout(
        url: result.paymentUrl,
        mode: CheckoutDisplayMode.newTab,
      );
    } on VenePagosException catch (e) {
      _showError(e.message);
    } finally {
      setState(() => _loading = false);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('VenePagos Demo')),
      body: Center(
        child: _loading
            ? const CircularProgressIndicator()
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton(
                    onPressed: _createAndPay,
                    child: const Text('Pagar con Link'),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _createOrder,
                    child: const Text('Comprar Producto'),
                  ),
                ],
              ),
      ),
    );
  }
}
```

## Licencia

MIT
