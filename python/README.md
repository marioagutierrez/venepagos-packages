# VenePagos SDK para Python

SDK oficial de VenePagos para Python. Permite integrar la pasarela de pagos VenePagos en aplicaciones Python, Flask, Django y cualquier framework web.

## Instalacion

```bash
pip install venepagos
```

## Inicio rapido

```python
from venepagos import VenePagos

# Crear el cliente
client = VenePagos(api_key="vp_live_tu_api_key")

# Crear un link de pago
resultado = client.create_payment_link(
    merchant_id="merch_123",
    amount=25.00,
    description="Suscripcion mensual",
)

link = resultado["data"]
print(f"URL de pago: {link['url']}")
```

## Configuracion

El cliente acepta las siguientes opciones:

```python
client = VenePagos(
    api_key="vp_live_tu_api_key",           # Requerido
    base_url="https://api.venepagos.com",   # Opcional (por defecto)
    timeout=30,                              # Segundos (por defecto: 30)
)
```

| Parametro  | Tipo  | Descripcion                                      | Por defecto                     |
|------------|-------|--------------------------------------------------|---------------------------------|
| `api_key`  | `str` | API key proporcionada por VenePagos              | *Requerido*                     |
| `base_url` | `str` | URL base de la API                               | `https://api.venepagos.com`     |
| `timeout`  | `int` | Tiempo maximo de espera por peticion (segundos)  | `30`                            |

## Crear links de pago

### Crear un link

```python
resultado = client.create_payment_link(
    merchant_id="merch_123",
    amount=50.00,
    currency="USD",
    description="Producto premium",
    expires_at="2026-12-31T23:59:59Z",
)

link = resultado["data"]
print(link["id"])          # ID del link
print(link["url"])         # URL para pagar
print(link["token"])       # Token unico
print(link["isActive"])    # Estado del link
```

### Listar links

```python
# Todos los links
resultado = client.list_payment_links()

# Filtrar por comercio
resultado = client.list_payment_links(merchant_id="merch_123")

for link in resultado["data"]:
    print(f"{link['id']}: {link['amount']} {link['currency']}")
```

### Obtener un link

```python
resultado = client.get_payment_link("link_id_123")
link = resultado["data"]
```

### Actualizar un link

```python
resultado = client.update_payment_link(
    link_id="link_id_123",
    description="Nueva descripcion",
    is_active=False,
    expires_at="2027-06-30T23:59:59Z",
)
```

### Desactivar un link

```python
client.delete_payment_link("link_id_123")
```

## Informacion publica de pago

Obtener informacion de un pago usando su token (no requiere autenticacion):

```python
resultado = client.get_public_payment_info("token_abc123")
info = resultado["data"]
print(f"Monto: {info['amount']} {info['currency']}")
```

## Crear ordenes (Store Checkout)

```python
resultado = client.create_order(
    store_slug="mi-tienda",
    product_slug="camiseta-xl",
    customer_name="Juan Perez",
    customer_email="juan@ejemplo.com",
    customer_phone="+58412123456",
    quantity=2,
    shipping_address="Av. Principal, Caracas",
    notes="Talla L, color azul",
)

order = resultado["data"]["order"]
payment_url = resultado["data"]["paymentUrl"]
print(f"URL de pago: {payment_url}")
```

## Abrir checkout (3 modos)

La clase `VenePagosCheckout` permite abrir la URL de pago de diferentes formas:

```python
from venepagos import VenePagosCheckout

checkout = VenePagosCheckout()
```

### Modo popup

Abre la URL en una ventana nueva del navegador:

```python
checkout.open_checkout(payment_url, mode="popup")
```

### Modo nueva pestana

Abre la URL en una nueva pestana del navegador por defecto:

```python
checkout.open_checkout(payment_url, mode="new_tab")
```

### Modo redireccion

Retorna la URL con el parametro `returnUrl` para redirecciones del lado del servidor:

```python
redirect_url = checkout.open_checkout(
    payment_url,
    mode="redirect",
    return_url="https://mi-sitio.com/gracias",
)
# Usar redirect_url en tu framework para redirigir al usuario
```

## Referencia completa de la API

### `VenePagos`

| Metodo                       | Descripcion                                    |
|------------------------------|------------------------------------------------|
| `create_payment_link()`      | Crea un nuevo link de pago                     |
| `list_payment_links()`       | Lista links de pago                            |
| `get_payment_link(id)`       | Obtiene un link por ID                         |
| `update_payment_link(id)`    | Actualiza un link existente                    |
| `delete_payment_link(id)`    | Desactiva un link                              |
| `get_public_payment_info(token)` | Informacion publica de pago por token      |
| `create_order()`             | Crea una orden en una tienda                   |

### `VenePagosCheckout`

| Metodo                                          | Descripcion                        |
|-------------------------------------------------|------------------------------------|
| `open_checkout(url, mode, return_url)`          | Abre el checkout en el modo indicado |

**Modos de checkout:**

| Modo         | Descripcion                                                 | Retorna          |
|--------------|-------------------------------------------------------------|------------------|
| `"popup"`    | Abre una ventana nueva del navegador                        | `None`           |
| `"new_tab"`  | Abre una nueva pestana en el navegador por defecto          | `None`           |
| `"redirect"` | Retorna la URL con `returnUrl` como query param             | `str` (la URL)   |

## Manejo de errores

El SDK lanza excepciones especificas para cada tipo de error:

```python
from venepagos import VenePagos, VenePagosError, AuthenticationError, APIError

client = VenePagos(api_key="vp_live_...")

try:
    resultado = client.create_payment_link(
        merchant_id="merch_123",
        amount=50.00,
    )
except AuthenticationError as e:
    # API key invalida o sin permisos (401, 403)
    print(f"Error de autenticacion: {e.message}")

except APIError as e:
    # Otro error HTTP de la API
    print(f"Error de API ({e.status_code}): {e.message}")
    print(f"Cuerpo: {e.body}")

except VenePagosError as e:
    # Error de red, timeout, etc.
    print(f"Error: {e.message}")
```

### Jerarquia de excepciones

```
VenePagosError           # Error base (red, timeout, etc.)
  |-- AuthenticationError  # 401 / 403
  |-- APIError             # Cualquier otro error HTTP
```

## Ejemplos con Flask

### Crear un link de pago y redirigir al checkout

```python
from flask import Flask, redirect, request, jsonify
from venepagos import VenePagos, VenePagosCheckout, APIError

app = Flask(__name__)
client = VenePagos(api_key="vp_live_tu_api_key")
checkout = VenePagosCheckout()


@app.route("/pagar", methods=["POST"])
def crear_pago():
    """Crea un link de pago y redirige al checkout."""
    try:
        resultado = client.create_payment_link(
            merchant_id="merch_123",
            amount=float(request.form["amount"]),
            description=request.form.get("description", "Pago"),
        )
        payment_url = resultado["data"]["url"]

        # Redirigir al checkout con URL de retorno
        redirect_url = checkout.open_checkout(
            payment_url,
            mode="redirect",
            return_url=request.url_root + "pago-exitoso",
        )
        return redirect(redirect_url)

    except APIError as e:
        return jsonify({"error": e.message}), e.status_code


@app.route("/pago-exitoso")
def pago_exitoso():
    return "Pago procesado exitosamente."


@app.route("/links")
def listar_links():
    """Lista todos los links de pago."""
    resultado = client.list_payment_links()
    return jsonify(resultado)
```

### Crear una orden desde una tienda

```python
@app.route("/tienda/<store_slug>/<product_slug>/comprar", methods=["POST"])
def comprar(store_slug, product_slug):
    try:
        resultado = client.create_order(
            store_slug=store_slug,
            product_slug=product_slug,
            customer_name=request.form["name"],
            customer_email=request.form["email"],
            customer_phone=request.form.get("phone"),
            quantity=int(request.form.get("quantity", 1)),
        )
        payment_url = resultado["data"]["paymentUrl"]

        redirect_url = checkout.open_checkout(
            payment_url,
            mode="redirect",
            return_url=request.url_root + "orden-confirmada",
        )
        return redirect(redirect_url)

    except APIError as e:
        return jsonify({"error": e.message}), e.status_code
```

## Ejemplos con Django

### Configuracion

Agrega la configuracion en `settings.py`:

```python
# settings.py
VENEPAGOS_API_KEY = "vp_live_tu_api_key"
VENEPAGOS_BASE_URL = "https://api.venepagos.com"  # Opcional
```

### Vistas

```python
# views.py
from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect as django_redirect
from django.views.decorators.http import require_POST, require_GET

from venepagos import VenePagos, VenePagosCheckout, APIError

client = VenePagos(
    api_key=settings.VENEPAGOS_API_KEY,
    base_url=getattr(settings, "VENEPAGOS_BASE_URL", "https://api.venepagos.com"),
)
checkout = VenePagosCheckout()


@require_POST
def crear_pago(request):
    """Crea un link de pago y redirige al checkout."""
    try:
        resultado = client.create_payment_link(
            merchant_id="merch_123",
            amount=float(request.POST["amount"]),
            description=request.POST.get("description", "Pago"),
        )
        payment_url = resultado["data"]["url"]

        redirect_url = checkout.open_checkout(
            payment_url,
            mode="redirect",
            return_url=request.build_absolute_uri("/pago-exitoso/"),
        )
        return django_redirect(redirect_url)

    except APIError as e:
        return JsonResponse({"error": e.message}, status=e.status_code)


def pago_exitoso(request):
    return JsonResponse({"message": "Pago procesado exitosamente."})


@require_GET
def listar_links(request):
    """Lista links de pago filtrados opcionalmente por merchant."""
    merchant_id = request.GET.get("merchantId")
    resultado = client.list_payment_links(merchant_id=merchant_id)
    return JsonResponse(resultado)


@require_POST
def crear_orden(request, store_slug, product_slug):
    """Crea una orden y redirige al checkout."""
    try:
        resultado = client.create_order(
            store_slug=store_slug,
            product_slug=product_slug,
            customer_name=request.POST["name"],
            customer_email=request.POST["email"],
            customer_phone=request.POST.get("phone"),
            quantity=int(request.POST.get("quantity", 1)),
            shipping_address=request.POST.get("address"),
            notes=request.POST.get("notes"),
        )
        payment_url = resultado["data"]["paymentUrl"]

        redirect_url = checkout.open_checkout(
            payment_url,
            mode="redirect",
            return_url=request.build_absolute_uri("/orden-confirmada/"),
        )
        return django_redirect(redirect_url)

    except APIError as e:
        return JsonResponse({"error": e.message}, status=e.status_code)
```

### URLs

```python
# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("pagar/", views.crear_pago, name="crear_pago"),
    path("pago-exitoso/", views.pago_exitoso, name="pago_exitoso"),
    path("links/", views.listar_links, name="listar_links"),
    path(
        "tienda/<str:store_slug>/<str:product_slug>/comprar/",
        views.crear_orden,
        name="crear_orden",
    ),
]
```

## Licencia

MIT
