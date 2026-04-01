# VenePagos Payment Gateway para WordPress

Plugin de WordPress que integra la pasarela de pago VenePagos en tu sitio. Compatible con WooCommerce.

## Descripción

VenePagos Payment Gateway permite a los comercios aceptar pagos a través de VenePagos directamente desde WordPress. El plugin ofrece:

- **Botón de pago** mediante shortcode para cualquier página o entrada.
- **Gateway de WooCommerce** que se integra directamente en el flujo de checkout.
- **Tres modos de checkout**: popup (modal), nueva pestaña o redirección.
- **Configuración sencilla** desde el panel de administración de WordPress.

## Instalación

### Opción 1: Subir archivo ZIP

1. Descarga el archivo `venepagos-gateway.zip`.
2. En el panel de WordPress, ve a **Plugins > Añadir nuevo > Subir plugin**.
3. Selecciona el archivo ZIP y haz clic en **Instalar ahora**.
4. Activa el plugin.

### Opción 2: Copiar carpeta manualmente

1. Copia la carpeta `venepagos-gateway/` dentro de `wp-content/plugins/`.
2. En el panel de WordPress, ve a **Plugins** y activa **VenePagos Payment Gateway**.

## Configuración

Después de activar el plugin, ve a **Ajustes > VenePagos** para configurar:

| Campo | Descripción |
|-------|-------------|
| **API Key** | Clave de API proporcionada por VenePagos. |
| **Merchant ID** | Identificador de tu comercio en la plataforma VenePagos. |
| **URL Base de la API** | URL del servidor de VenePagos (por defecto: `https://api.venepagos.com`). |
| **Modo de Checkout** | Cómo se abrirá la página de pago: popup, nueva pestaña o redirección. |
| **URL de Retorno** | Página a la que el cliente regresa después de completar el pago. |

## Uso del Shortcode

Inserta el botón de pago en cualquier página o entrada con el shortcode `[venepagos_pay]`.

### Parámetros

| Parámetro | Obligatorio | Descripción | Ejemplo |
|-----------|:-----------:|-------------|---------|
| `amount` | Sí | Monto a cobrar | `50` |
| `currency` | No | Moneda (por defecto: `USD`) | `USD`, `VES` |
| `description` | No | Descripción del pago | `Producto Premium` |
| `label` | No | Texto del botón | `Comprar ahora` |
| `class` | No | Clase CSS adicional para el botón | `mi-clase` |

### Ejemplos

```
[venepagos_pay amount="50" currency="USD" description="Producto Premium"]

[venepagos_pay amount="100" currency="VES" description="Servicio mensual" label="Suscribirme"]

[venepagos_pay amount="25" description="Donación" label="Donar $25" class="btn-donacion"]
```

## Integración con WooCommerce

Si WooCommerce está instalado y activo, el plugin registra automáticamente un gateway de pago.

### Activar el gateway

1. Ve a **WooCommerce > Ajustes > Pagos**.
2. Activa **VenePagos**.
3. Haz clic en **Gestionar** para configurar el título y descripción que verán los clientes.

### Flujo de pago en WooCommerce

1. El cliente selecciona VenePagos como método de pago en el checkout.
2. Al confirmar, se crea un enlace de pago en la API de VenePagos.
3. Según el modo de checkout configurado:
   - **Redirect**: el cliente es redirigido a la página de pago de VenePagos.
   - **Nueva pestaña**: se abre la página de pago en una pestaña nueva.
   - **Popup**: se muestra un modal con la página de pago embebida.
4. Después de pagar, el cliente regresa a la página de confirmación de WooCommerce.

La orden queda en estado "Pendiente de pago" hasta que el webhook de VenePagos confirme el pago.

## Modos de Checkout

### Popup (modal)

Abre la página de pago de VenePagos dentro de un modal (iframe) sin salir del sitio. Ideal para mantener al usuario en contexto.

- El modal se puede cerrar con el botón X o la tecla Escape.
- En móviles se muestra a pantalla completa.

### Nueva pestaña

Abre la página de pago en una pestaña nueva del navegador. El sitio original permanece abierto.

### Redirección

Redirige al usuario directamente a la página de pago de VenePagos. Es el modo más sencillo y compatible.

## Hooks y Filtros Disponibles

El plugin expone varios hooks y filtros para personalización avanzada:

### Filtros

| Filtro | Descripción | Parámetros |
|--------|-------------|------------|
| `venepagos_shortcode_atts` | Modifica los atributos del shortcode antes de renderizar. | `(array $atts)` |
| `venepagos_button_html` | Modifica el HTML del botón de pago. | `(string $html, array $atts)` |
| `venepagos_create_link_body` | Modifica el cuerpo de la petición al crear un enlace de pago. | `(array $body)` |
| `venepagos_create_order_body` | Modifica el cuerpo de la petición al crear una orden de tienda. | `(array $body, string $store_slug, string $product_slug)` |
| `venepagos_checkout_url` | Modifica la URL de pago antes de abrirla. | `(string $url, string $mode)` |
| `venepagos_wc_payment_description` | Modifica la descripción del pago en WooCommerce. | `(string $description, WC_Order $order)` |

### Acciones

| Acción | Descripción | Parámetros |
|--------|-------------|------------|
| `venepagos_payment_link_created` | Se dispara al crear un enlace de pago exitosamente (shortcode). | `(array $link)` |
| `venepagos_wc_payment_link_created` | Se dispara al crear un enlace de pago para una orden de WooCommerce. | `(array $link, WC_Order $order)` |

### Ejemplo de uso

```php
// Agregar un campo personalizado al enlace de pago.
add_filter( 'venepagos_create_link_body', function( $body ) {
    $body['metadata'] = array( 'source' => 'wordpress' );
    return $body;
} );

// Registrar pagos en un log personalizado.
add_action( 'venepagos_payment_link_created', function( $link ) {
    error_log( 'VenePagos: enlace creado - ' . $link['id'] );
} );

// Personalizar la descripción del pago en WooCommerce.
add_filter( 'venepagos_wc_payment_description', function( $description, $order ) {
    return sprintf( 'Pedido %s - %s', $order->get_order_number(), get_bloginfo( 'name' ) );
}, 10, 2 );
```

## FAQ

### ¿Necesito WooCommerce para usar el plugin?

No. El shortcode `[venepagos_pay]` funciona sin WooCommerce. El gateway de WooCommerce se activa automáticamente solo si WooCommerce está instalado.

### ¿Dónde obtengo mis credenciales de API?

Contacta al equipo de VenePagos o accede al panel de comercios en [venepagos.com](https://venepagos.com) para obtener tu API Key y Merchant ID.

### ¿Qué monedas soporta VenePagos?

VenePagos soporta USD y VES. La moneda se puede especificar al crear el enlace de pago.

### ¿El plugin es compatible con el modo HPOS de WooCommerce?

Sí. El plugin declara compatibilidad con High-Performance Order Storage (HPOS).

### ¿Cómo sé si el pago fue exitoso?

VenePagos envía un webhook al backend de tu comercio cuando el pago se confirma. En WooCommerce, la orden pasará de "Pendiente de pago" a "Procesando" cuando el webhook sea recibido.

### ¿Puedo personalizar el estilo del botón?

Sí. Puedes usar el parámetro `class` del shortcode para agregar clases CSS personalizadas, o usar el filtro `venepagos_button_html` para modificar el HTML completo.

### ¿El popup funciona en dispositivos móviles?

Sí. En pantallas pequeñas (menos de 480px), el modal se muestra a pantalla completa para una mejor experiencia.
