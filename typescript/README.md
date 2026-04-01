# @venepagos/sdk

SDK oficial de VenePagos para TypeScript y JavaScript. Integra links de pago y checkout en tu aplicación web.

## Instalacion

```bash
npm install @venepagos/sdk
```

## Inicio rapido

```ts
import { VenePagosClient, VenePagosCheckout } from '@venepagos/sdk';

// 1. Crear el cliente
const client = new VenePagosClient({
  apiKey: 'vp_live_tu_api_key',
});

// 2. Crear un link de pago
const { data: link } = await client.createPaymentLink({
  merchantId: 'merch_123',
  amount: 25.00,
  description: 'Suscripcion mensual',
});

// 3. Abrir el checkout
const checkout = new VenePagosCheckout();
checkout.open(link.url, { mode: 'popup' });
```

## Configuracion

```ts
const client = new VenePagosClient({
  // Requerido: tu API key de VenePagos
  apiKey: 'vp_live_...',

  // Opcional: URL base de la API (por defecto https://api.venepagos.com)
  baseUrl: 'https://api.venepagos.com',

  // Opcional: timeout en milisegundos (por defecto 30000)
  timeout: 15000,
});
```

## Links de pago

### Crear un link de pago

```ts
const { data: link } = await client.createPaymentLink({
  merchantId: 'merch_123',
  amount: 50.00,
  currency: 'USD',           // Opcional
  description: 'Producto X', // Opcional
  expiresAt: '2026-12-31T23:59:59Z', // Opcional (ISO 8601)
});

console.log(link.id);    // ID del link
console.log(link.url);   // URL para el cliente
console.log(link.token); // Token unico
```

### Listar links de pago

```ts
// Todos los links
const { data: links } = await client.listPaymentLinks();

// Filtrar por comercio
const { data: links } = await client.listPaymentLinks({
  merchantId: 'merch_123',
});
```

### Obtener un link de pago

```ts
const { data: link } = await client.getPaymentLink('link_abc123');
```

### Actualizar un link de pago

```ts
const { data: link } = await client.updatePaymentLink('link_abc123', {
  description: 'Nueva descripcion',
  isActive: false,
  expiresAt: '2027-06-30T00:00:00Z',
});
```

### Desactivar un link de pago

```ts
await client.deletePaymentLink('link_abc123');
```

## Informacion publica de pago

Obtener datos de un pago usando su token (no requiere API key en el backend):

```ts
const { data: info } = await client.getPublicPaymentInfo('tok_xyz789');
console.log(info.amount, info.currency);
```

## Ordenes (Store Checkout)

Crear una orden desde una tienda:

```ts
const { data } = await client.createOrder('mi-tienda', 'camiseta-xl', {
  customerName: 'Juan Perez',
  customerEmail: 'juan@ejemplo.com',
  customerPhone: '+58412-1234567', // Opcional
  quantity: 2,                      // Opcional
  shippingAddress: 'Av. Libertador #123', // Opcional
  notes: 'Talla L, color azul',    // Opcional
});

console.log(data.paymentUrl); // URL de pago
```

## Checkout

La clase `VenePagosCheckout` permite abrir la pagina de pago en tres modos distintos.

### Modo popup (modal)

Abre un modal con un iframe sobre la pagina actual. Ideal para no perder el contexto del usuario.

```ts
const checkout = new VenePagosCheckout();

checkout.open(paymentUrl, {
  mode: 'popup',
  width: 480,    // Opcional (px, defecto 480)
  height: 680,   // Opcional (px, defecto 680)
  onClose: () => {
    console.log('El usuario cerro el checkout');
  },
  onSuccess: () => {
    console.log('Pago completado');
  },
});

// Cerrar programaticamente
checkout.close();
```

### Modo nueva pestana

Abre el checkout en una nueva pestana del navegador.

```ts
checkout.open(paymentUrl, {
  mode: 'newTab',
});
```

### Modo redireccion

Redirige la pagina actual al checkout. Despues del pago, el usuario es enviado de vuelta a `returnUrl`.

```ts
checkout.open(paymentUrl, {
  mode: 'redirect',
  returnUrl: 'https://mi-sitio.com/gracias',
});
```

## Manejo de errores

```ts
import { VenePagosError } from '@venepagos/sdk';

try {
  await client.createPaymentLink({ merchantId: 'x', amount: 10 });
} catch (error) {
  if (error instanceof VenePagosError) {
    console.error('Error de API:', error.message);
    console.error('Codigo HTTP:', error.statusCode);
    console.error('Cuerpo:', error.body);
  } else {
    console.error('Error inesperado:', error);
  }
}
```

## Referencia de tipos TypeScript

```ts
// Configuracion del cliente
interface VenePagosConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

// Link de pago
interface PaymentLink {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  description: string;
  token: string;
  url: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

// Crear link de pago
interface CreatePaymentLinkRequest {
  merchantId: string;
  amount: number;
  currency?: string;
  description?: string;
  expiresAt?: string;
}

// Actualizar link de pago
interface UpdatePaymentLinkRequest {
  description?: string;
  isActive?: boolean;
  expiresAt?: string;
}

// Crear orden
interface CreateOrderRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  quantity?: number;
  shippingAddress?: string;
  notes?: string;
}

// Respuesta de orden
interface CreateOrderResponse {
  order: Record<string, unknown>;
  paymentUrl: string;
}

// Opciones de checkout
interface CheckoutOptions {
  mode?: 'popup' | 'newTab' | 'redirect';
  returnUrl?: string;
  onClose?: () => void;
  onSuccess?: () => void;
  width?: number;
  height?: number;
}
```

## Ejemplos por framework

### React

```tsx
import { useState } from 'react';
import { VenePagosClient, VenePagosCheckout } from '@venepagos/sdk';

const client = new VenePagosClient({ apiKey: 'vp_live_...' });
const checkout = new VenePagosCheckout();

function PayButton({ merchantId, amount }: { merchantId: string; amount: number }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { data: link } = await client.createPaymentLink({ merchantId, amount });
      checkout.open(link.url, {
        mode: 'popup',
        onClose: () => setLoading(false),
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePay} disabled={loading}>
      {loading ? 'Procesando...' : `Pagar $${amount}`}
    </button>
  );
}
```

### Vue 3

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VenePagosClient, VenePagosCheckout } from '@venepagos/sdk';

const client = new VenePagosClient({ apiKey: 'vp_live_...' });
const checkout = new VenePagosCheckout();
const loading = ref(false);

async function pay() {
  loading.value = true;
  try {
    const { data: link } = await client.createPaymentLink({
      merchantId: 'merch_123',
      amount: 30,
    });
    checkout.open(link.url, {
      mode: 'popup',
      onClose: () => { loading.value = false; },
    });
  } catch (err) {
    console.error(err);
    loading.value = false;
  }
}
</script>

<template>
  <button @click="pay" :disabled="loading">
    {{ loading ? 'Procesando...' : 'Pagar $30' }}
  </button>
</template>
```

### Vanilla JavaScript

```html
<script type="module">
  import { VenePagosClient, VenePagosCheckout } from '@venepagos/sdk';

  const client = new VenePagosClient({ apiKey: 'vp_live_...' });
  const checkout = new VenePagosCheckout();

  document.getElementById('pay-btn').addEventListener('click', async () => {
    const { data: link } = await client.createPaymentLink({
      merchantId: 'merch_123',
      amount: 15,
      description: 'Compra rapida',
    });

    // Popup
    checkout.open(link.url, { mode: 'popup' });

    // O nueva pestana
    // checkout.open(link.url, { mode: 'newTab' });

    // O redireccion
    // checkout.open(link.url, { mode: 'redirect', returnUrl: location.href });
  });
</script>
```

## Licencia

MIT
