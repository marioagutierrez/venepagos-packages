# VenePagos SDK para PHP

SDK oficial de VenePagos para PHP. Permite integrar pagos, crear links de pago y gestionar el checkout de forma sencilla.

## Requisitos

- PHP >= 7.4
- Extensiones: `json`, `curl`

## Instalacion

```bash
composer require venepagos/sdk
```

## Inicio rapido

```php
<?php
require_once 'vendor/autoload.php';

use VenePagos\VenePagos;

$venepagos = new VenePagos('tu-api-key');

// Crear un link de pago
$link = $venepagos->createPaymentLink([
    'merchantId' => 'merchant-123',
    'amount'     => 25.50,
    'currency'   => 'VES',
    'description' => 'Pago de servicio',
]);

echo "Link de pago: " . $link['data']['url'];
```

## Configuracion

```php
$venepagos = new VenePagos('tu-api-key', [
    'baseUrl' => 'https://api.venepagos.com', // URL base (default)
    'timeout' => 30,                            // Timeout en segundos (default: 30)
]);
```

### Opciones disponibles

| Opcion      | Tipo     | Default                        | Descripcion                    |
|-------------|----------|--------------------------------|--------------------------------|
| `baseUrl`   | `string` | `https://api.venepagos.com`    | URL base de la API             |
| `timeout`   | `int`    | `30`                           | Timeout de las peticiones (s)  |
| `httpClient`| `Client` | `null`                         | Cliente Guzzle personalizado   |

## Links de pago

### Crear un link de pago

```php
$link = $venepagos->createPaymentLink([
    'merchantId'  => 'merchant-123',
    'amount'      => 100.00,
    'currency'    => 'VES',         // Opcional
    'description' => 'Producto XYZ', // Opcional
    'expiresAt'   => '2026-12-31T23:59:59Z', // Opcional, ISO 8601
]);

// Respuesta
$id    = $link['data']['id'];
$url   = $link['data']['url'];
$token = $link['data']['token'];
```

### Listar links de pago

```php
// Todos los links
$links = $venepagos->listPaymentLinks();

// Filtrar por comercio
$links = $venepagos->listPaymentLinks(['merchantId' => 'merchant-123']);
```

### Obtener un link de pago

```php
$link = $venepagos->getPaymentLink('link-id-123');
```

### Actualizar un link de pago

```php
$link = $venepagos->updatePaymentLink('link-id-123', [
    'description' => 'Nueva descripcion',
    'amount'      => 150.00,
]);
```

### Desactivar un link de pago

```php
$venepagos->deactivatePaymentLink('link-id-123');
```

## Informacion de pago (publico)

```php
$info = $venepagos->getPaymentInfo('token-del-pago');
```

## Checkout de tienda

### Crear una orden

```php
$result = $venepagos->createOrder('mi-tienda', 'producto-premium', [
    'customerName'    => 'Juan Perez',
    'customerEmail'   => 'juan@ejemplo.com',
    'customerPhone'   => '+58412-1234567', // Opcional
    'quantity'        => 2,                 // Opcional, default: 1
    'shippingAddress' => 'Av. Libertador, Caracas', // Opcional
    'notes'           => 'Envio urgente',   // Opcional
]);

$order      = $result['data']['order'];
$paymentUrl = $result['data']['paymentUrl'];
```

## Integracion frontend (Checkout)

El SDK ofrece tres modos de checkout para integrar el pago en tu sitio web.

### Modo 1: Popup (iframe modal)

Abre un modal superpuesto con el formulario de pago dentro de un iframe. Ideal para no sacar al usuario de tu sitio.

```php
$result = $venepagos->createOrder('mi-tienda', 'mi-producto', [
    'customerName'  => 'Juan Perez',
    'customerEmail' => 'juan@ejemplo.com',
]);

$checkout = $venepagos->checkout($result['data']['paymentUrl']);

echo $checkout->renderScript('popup', [
    'buttonId'   => 'btn-pagar',
    'buttonText' => 'Pagar ahora',
    'width'      => '450px',
    'height'     => '650px',
    'onSuccess'  => 'onPaymentSuccess', // Funcion JS de callback
    'onClose'    => 'onPaymentClose',   // Funcion JS de callback
]);
```

```html
<script>
function onPaymentSuccess(data) {
    alert('Pago exitoso!');
    window.location.href = '/gracias';
}

function onPaymentClose() {
    console.log('El usuario cerro el checkout');
}
</script>
```

### Modo 2: Nueva pestana

Abre el checkout en una nueva pestana del navegador.

```php
echo $checkout->renderScript('newTab', [
    'buttonId'   => 'btn-pagar',
    'buttonText' => 'Pagar en nueva ventana',
]);
```

### Modo 3: Redireccion

Redirige al usuario directamente a la pagina de pago. Hay dos formas de usarlo:

**Opcion A: Redireccion PHP directa (recomendado)**

```php
// Debe llamarse antes de cualquier output HTML
$checkout->redirect('https://mi-sitio.com/pago-completado');
```

**Opcion B: Generar la URL para uso manual**

```php
$url = $checkout->generateUrl('https://mi-sitio.com/pago-completado');
// Usar $url donde sea necesario
```

## Referencia de la API

### Clase `VenePagos`

| Metodo | Descripcion |
|--------|-------------|
| `createPaymentLink(array $params): array` | Crear un link de pago |
| `listPaymentLinks(array $query = []): array` | Listar links de pago |
| `getPaymentLink(string $id): array` | Obtener un link de pago |
| `updatePaymentLink(string $id, array $params): array` | Actualizar un link de pago |
| `deactivatePaymentLink(string $id): array` | Desactivar un link de pago |
| `getPaymentInfo(string $token): array` | Obtener info publica de pago |
| `createOrder(string $storeSlug, string $productSlug, array $params): array` | Crear orden de checkout |
| `checkout(string $paymentUrl): Checkout` | Crear instancia de Checkout |

### Clase `Checkout`

| Metodo | Descripcion |
|--------|-------------|
| `renderScript(string $mode, array $options = []): string` | Generar HTML/JS del checkout |
| `generateUrl(string $returnUrl = ''): string` | Generar URL con retorno |
| `redirect(string $returnUrl = ''): void` | Redirigir al checkout |
| `getPaymentUrl(): string` | Obtener la URL de pago |

### Parametros de `createPaymentLink`

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `merchantId` | `string` | Si | ID del comercio |
| `amount` | `float` | Si | Monto del pago |
| `currency` | `string` | No | Moneda (default: VES) |
| `description` | `string` | No | Descripcion del pago |
| `expiresAt` | `string` | No | Fecha de expiracion (ISO 8601) |

### Parametros de `createOrder`

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| `customerName` | `string` | Si | Nombre del cliente |
| `customerEmail` | `string` | Si | Email del cliente |
| `customerPhone` | `string` | No | Telefono del cliente |
| `quantity` | `int` | No | Cantidad (default: 1) |
| `shippingAddress` | `string` | No | Direccion de envio |
| `notes` | `string` | No | Notas adicionales |

## Manejo de errores

El SDK lanza excepciones especificas segun el tipo de error:

```php
use VenePagos\VenePagos;
use VenePagos\Exceptions\VenePagosException;
use VenePagos\Exceptions\AuthenticationException;
use VenePagos\Exceptions\ApiException;

try {
    $link = $venepagos->createPaymentLink([
        'merchantId' => 'merchant-123',
        'amount'     => 50.00,
    ]);
} catch (AuthenticationException $e) {
    // API key invalida o no proporcionada (HTTP 401)
    echo "Error de autenticacion: " . $e->getMessage();

} catch (ApiException $e) {
    // Error de la API (4xx, 5xx)
    echo "Error de API: " . $e->getMessage();
    echo "Codigo HTTP: " . $e->getStatusCode();
    print_r($e->getResponseBody()); // Cuerpo de la respuesta

} catch (VenePagosException $e) {
    // Error general (conexion, timeout, validacion)
    echo "Error: " . $e->getMessage();
}
```

### Jerarquia de excepciones

```
VenePagosException (base)
  ├── AuthenticationException (401)
  └── ApiException (4xx, 5xx)
```

## Ejemplos

### Laravel

**Configuracion del servicio (config/services.php):**

```php
'venepagos' => [
    'api_key'  => env('VENEPAGOS_API_KEY'),
    'base_url' => env('VENEPAGOS_BASE_URL', 'https://api.venepagos.com'),
],
```

**Service Provider:**

```php
// app/Providers/AppServiceProvider.php
use VenePagos\VenePagos;

public function register()
{
    $this->app->singleton(VenePagos::class, function ($app) {
        return new VenePagos(
            config('services.venepagos.api_key'),
            ['baseUrl' => config('services.venepagos.base_url')]
        );
    });
}
```

**Controlador:**

```php
use VenePagos\VenePagos;
use VenePagos\Exceptions\VenePagosException;

class PaymentController extends Controller
{
    public function __construct(private VenePagos $venepagos) {}

    public function createLink(Request $request)
    {
        $request->validate([
            'amount'      => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:255',
        ]);

        try {
            $link = $this->venepagos->createPaymentLink([
                'merchantId'  => auth()->user()->merchant_id,
                'amount'      => $request->amount,
                'description' => $request->description,
            ]);

            return response()->json($link);

        } catch (VenePagosException $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function checkout(Request $request)
    {
        $result = $this->venepagos->createOrder('mi-tienda', 'producto', [
            'customerName'  => $request->name,
            'customerEmail' => $request->email,
        ]);

        $checkout = $this->venepagos->checkout($result['data']['paymentUrl']);

        return view('payment.checkout', [
            'checkoutScript' => $checkout->renderScript('popup', [
                'buttonText' => 'Completar pago',
                'onSuccess'  => 'handlePaymentSuccess',
            ]),
        ]);
    }
}
```

**Vista Blade (resources/views/payment/checkout.blade.php):**

```blade
<div class="checkout-container">
    {!! $checkoutScript !!}
</div>

<script>
function handlePaymentSuccess(data) {
    window.location.href = '{{ route("payment.success") }}';
}
</script>
```

### PHP vanilla

```php
<?php
require_once 'vendor/autoload.php';

use VenePagos\VenePagos;
use VenePagos\Exceptions\VenePagosException;

$venepagos = new VenePagos('tu-api-key');

// --- Crear link de pago ---
try {
    $link = $venepagos->createPaymentLink([
        'merchantId'  => 'merchant-123',
        'amount'      => 75.00,
        'description' => 'Servicio de consultoria',
    ]);

    echo "Link creado: " . $link['data']['url'] . "\n";
} catch (VenePagosException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// --- Checkout con popup ---
try {
    $result = $venepagos->createOrder('tienda-ejemplo', 'plan-basico', [
        'customerName'  => 'Maria Garcia',
        'customerEmail' => 'maria@ejemplo.com',
        'quantity'      => 1,
    ]);

    $checkout = $venepagos->checkout($result['data']['paymentUrl']);
    ?>
    <!DOCTYPE html>
    <html>
    <head><title>Checkout</title></head>
    <body>
        <h1>Completa tu pago</h1>
        <?= $checkout->renderScript('popup', [
            'buttonText' => 'Pagar $75.00',
            'onSuccess'  => 'pagoExitoso',
        ]) ?>
        <script>
        function pagoExitoso(data) {
            alert('Gracias por tu pago!');
            window.location.href = '/gracias.php';
        }
        </script>
    </body>
    </html>
    <?php
} catch (VenePagosException $e) {
    echo "Error: " . $e->getMessage();
}

// --- Redireccion directa ---
try {
    $result = $venepagos->createOrder('tienda-ejemplo', 'plan-pro', [
        'customerName'  => 'Carlos Lopez',
        'customerEmail' => 'carlos@ejemplo.com',
    ]);

    $checkout = $venepagos->checkout($result['data']['paymentUrl']);
    $checkout->redirect('https://mi-sitio.com/gracias');
} catch (VenePagosException $e) {
    echo "Error: " . $e->getMessage();
}
```

## Licencia

MIT
