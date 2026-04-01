# VenePagos para Shopify

App de Shopify que integra VenePagos como metodo de pago en tu tienda online. Permite a tus clientes pagar con transferencias bancarias, pagos moviles y otros metodos de pago venezolanos a traves de la pasarela VenePagos.

## Descripcion

Esta app conecta tu tienda Shopify con la pasarela de pagos VenePagos. Cuando un cliente selecciona VenePagos como metodo de pago en el checkout, se crea un enlace de pago y el cliente es dirigido a la plataforma VenePagos para completar la transaccion.

La app soporta tres modos de checkout:
- **Redireccion** (redirect) — El cliente es redirigido a VenePagos y regresa automaticamente
- **Popup** — Se abre una ventana modal con el checkout de VenePagos
- **Nueva pestana** (newTab) — Se abre VenePagos en una nueva pestana del navegador

## Requisitos previos

- **Cuenta de Shopify Partners** con acceso a desarrollo de apps
- **Shopify CLI** instalado (`npm install -g @shopify/cli`)
- **Cuenta VenePagos** con API key y merchant ID
- **Node.js** >= 18.0.0
- **ngrok** o similar para desarrollo local (o usar `shopify app dev`)

## Instalacion y configuracion

### 1. Clonar e instalar dependencias

```bash
cd client-packages/shopify
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y edita los valores:

```bash
cp env.example .env
```

Edita `.env` con tus credenciales:

```env
SHOPIFY_API_KEY=tu_api_key_de_shopify
SHOPIFY_API_SECRET=tu_api_secret_de_shopify
SHOPIFY_APP_URL=https://tu-app-url.com
VENEPAGOS_API_URL=https://api.venepagos.com
VENEPAGOS_API_KEY=tu_api_key_de_venepagos
VENEPAGOS_MERCHANT_ID=tu_merchant_id
VENEPAGOS_CHECKOUT_MODE=redirect
```

### 3. Desarrollo local

```bash
# Iniciar con Shopify CLI (recomendado)
npm run dev

# O iniciar el servidor directamente
npm start
```

El comando `shopify app dev` configura automaticamente un tunel HTTPS y conecta la app con tu tienda de desarrollo.

### 4. Instalar en tienda de desarrollo

1. Ejecuta `shopify app dev`
2. Sigue las instrucciones en consola para instalar la app
3. Accede a tu panel de Shopify > Settings > Payments
4. Activa VenePagos como metodo de pago

## Configuracion en Shopify Admin

1. Ve a **Settings > Payments** en tu panel de Shopify
2. En la seccion de metodos de pago alternativos, busca **VenePagos**
3. Haz clic en **Activar**
4. Opcionalmente, configura:
   - **Modo de checkout**: popup, newTab o redirect
   - **Texto del boton**: texto personalizado para el boton de pago

## Flujo de pago

```
Cliente en Checkout
        |
        v
Selecciona "VenePagos"
        |
        v
Shopify envia POST /payment/create
        |
        v
App crea Payment Link via VenePagos API
(POST /api/v1/payment-links)
        |
        v
Cliente es dirigido a VenePagos
(segun modo: redirect/popup/newTab)
        |
        v
Cliente completa el pago en VenePagos
        |
        v
VenePagos redirige a GET /payment/complete
        |
        v
App verifica el pago con VenePagos API
        |
        v
App resuelve la sesion de pago en Shopify
        |
        v
Cliente ve confirmacion del pedido
```

## Modos de checkout

### Redirect (por defecto)

El modo mas compatible. El cliente es redirigido completamente a la pagina de pago de VenePagos. Al completar el pago, regresa automaticamente a la confirmacion del pedido en Shopify.

```env
VENEPAGOS_CHECKOUT_MODE=redirect
```

### Popup

Se abre una ventana modal superpuesta en el checkout de Shopify. El cliente completa el pago sin salir de la pagina. Al cerrar la ventana, el pago se confirma automaticamente.

```env
VENEPAGOS_CHECKOUT_MODE=popup
```

### Nueva pestana (newTab)

Se abre VenePagos en una nueva pestana del navegador. El cliente puede alternar entre pestanas durante el proceso de pago.

```env
VENEPAGOS_CHECKOUT_MODE=newTab
```

## Variables de entorno

| Variable | Descripcion | Requerida |
|----------|-------------|-----------|
| `SHOPIFY_API_KEY` | API Key de la app en Shopify Partners | Si |
| `SHOPIFY_API_SECRET` | API Secret de la app en Shopify Partners | Si |
| `SHOPIFY_APP_URL` | URL publica de la app | Si |
| `SHOPIFY_SCOPES` | Permisos de la app (default: `write_payment_gateways,read_orders`) | No |
| `VENEPAGOS_API_URL` | URL base de la API de VenePagos | Si |
| `VENEPAGOS_API_KEY` | API Key de VenePagos | Si |
| `VENEPAGOS_MERCHANT_ID` | ID del comercio en VenePagos | Si |
| `VENEPAGOS_CHECKOUT_MODE` | Modo de checkout: `popup`, `newTab`, `redirect` (default: `redirect`) | No |
| `PORT` | Puerto del servidor (default: 3000) | No |
| `NODE_ENV` | Entorno: `development` o `production` | No |

## Desarrollo local

### Usando Shopify CLI

```bash
# Iniciar servidor de desarrollo con tunel automatico
npm run dev

# Esto equivale a:
shopify app dev
```

Shopify CLI se encarga de:
- Crear un tunel HTTPS (via Cloudflare)
- Actualizar la URL de la app automaticamente
- Instalar la app en tu tienda de desarrollo
- Recargar automaticamente al hacer cambios

### Sin Shopify CLI

Si prefieres no usar Shopify CLI:

1. Inicia ngrok: `ngrok http 3000`
2. Actualiza `SHOPIFY_APP_URL` en `.env` con la URL de ngrok
3. Actualiza la URL en tu app de Shopify Partners
4. Inicia el servidor: `npm start`

## Deploy a produccion

### 1. Configurar servidor

Asegurate de tener un servidor con HTTPS configurado (requerido por Shopify).

### 2. Variables de entorno

Configura todas las variables de entorno en tu servidor de produccion. Cambia `NODE_ENV=production`.

### 3. Desplegar la app

```bash
# Desplegar usando Shopify CLI
npm run deploy

# Esto registra la extension de pago y actualiza la configuracion
shopify app deploy
```

### 4. Publicar en Shopify App Store (opcional)

1. Ve a tu panel de Shopify Partners
2. Selecciona tu app
3. Completa la informacion requerida para publicacion
4. Envia para revision

## Webhooks

La app escucha los siguientes webhooks:

### Desde Shopify
- `orders/paid` — Se recibe cuando un pedido es marcado como pagado

### Desde VenePagos
- `payment.completed` — Pago completado exitosamente
- `payment.failed` — Pago fallido
- `payment.expired` — Enlace de pago expirado

Los webhooks de VenePagos se reciben en `POST /payment/webhook` y se verifican mediante firma HMAC.

## Estructura del proyecto

```
shopify/
├── app/
│   ├── server.js              # Servidor Express principal
│   ├── venepagos-api.js       # Cliente de la API de VenePagos
│   └── routes/
│       └── payment.js         # Rutas de pago
├── extensions/
│   └── venepagos-payment/
│       ├── extension.toml     # Configuracion de la extension
│       └── src/
│           └── index.js       # UI de la extension en el checkout
├── shopify.app.toml           # Configuracion de la app Shopify
├── package.json
├── env.example
└── README.md
```

## FAQ

### Como obtengo mis credenciales de VenePagos?

Registrate en [VenePagos](https://venepagos.com), crea un comercio y genera tu API key desde el panel de administracion.

### Que monedas soporta VenePagos?

VenePagos soporta pagos en bolivares (VES) y dolares (USD). La moneda se configura automaticamente segun la configuracion de tu tienda Shopify.

### Puedo personalizar la apariencia del checkout?

En modo **popup** y **newTab**, la apariencia es controlada por VenePagos. Puedes personalizar el texto del boton de pago desde la configuracion de la extension en Shopify.

### Que pasa si el cliente cierra la ventana de pago?

Si el cliente cierra la ventana antes de completar el pago, el enlace de pago permanece activo hasta su expiracion (1 hora por defecto). El pedido quedara pendiente en Shopify.

### Como pruebo la integracion en desarrollo?

1. Usa `shopify app dev` para iniciar el entorno de desarrollo
2. Configura tu API key de VenePagos en modo sandbox/testing
3. Realiza un pedido de prueba en tu tienda de desarrollo
4. Completa el pago en el entorno de pruebas de VenePagos

### Los webhooks no llegan, que hago?

1. Verifica que tu URL sea accesible publicamente (HTTPS)
2. Revisa los logs de tu servidor
3. En Shopify Partners > Tu App > Webhooks, verifica que esten registrados
4. Para VenePagos, configura la URL del webhook en tu panel de comercio

### Como actualizo la app?

```bash
git pull
npm install
npm run deploy
```

Para actualizaciones mayores, revisa las notas de la version y sigue las instrucciones de migracion si las hay.
