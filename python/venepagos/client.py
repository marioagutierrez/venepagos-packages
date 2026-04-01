"""Cliente principal del SDK de VenePagos."""

from typing import Any, Dict, List, Optional
from urllib.parse import quote, urlencode

import requests

from .exceptions import APIError, AuthenticationError, VenePagosError
from .types import (
    CreateOrderRequest,
    CreateOrderResponse,
    CreatePaymentLinkRequest,
    PaymentLink,
    PublicPaymentInfo,
    UpdatePaymentLinkRequest,
)

DEFAULT_BASE_URL = "https://api.venepagos.com"
DEFAULT_TIMEOUT = 30


class VenePagos:
    """Cliente principal del SDK de VenePagos.

    Ejemplo::

        client = VenePagos(api_key="vp_live_...")
        link = client.create_payment_link(
            merchant_id="merch_123",
            amount=25.00,
            description="Suscripcion mensual",
        )
        print(link["data"]["url"])
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: int = DEFAULT_TIMEOUT,
    ) -> None:
        if not api_key:
            raise AuthenticationError("Se requiere una api_key valida.")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update(
            {
                "X-API-Key": self.api_key,
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
        )

    # -------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------

    def _request(
        self,
        method: str,
        path: str,
        body: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, str]] = None,
    ) -> Any:
        """Ejecuta una peticion HTTP contra la API de VenePagos.

        Args:
            method: Metodo HTTP (GET, POST, PUT, DELETE).
            path: Ruta del endpoint (ej. ``/api/v1/payment-links``).
            body: Cuerpo JSON de la peticion (opcional).
            params: Parametros de query string (opcional).

        Returns:
            Respuesta parseada como diccionario, o ``None`` para 204.

        Raises:
            AuthenticationError: Si la API retorna 401 o 403.
            APIError: Si la API retorna cualquier otro error HTTP.
            VenePagosError: En caso de error de red u otro error inesperado.
        """
        url = f"{self.base_url}{path}"

        # Filter out None values from params
        if params:
            params = {k: v for k, v in params.items() if v is not None}

        try:
            response = self._session.request(
                method=method,
                url=url,
                json=body,
                params=params,
                timeout=self.timeout,
            )
        except requests.exceptions.Timeout:
            raise VenePagosError(
                f"La peticion a {path} excedio el tiempo limite de {self.timeout}s."
            )
        except requests.exceptions.ConnectionError:
            raise VenePagosError(
                f"No se pudo conectar con la API de VenePagos en {self.base_url}."
            )
        except requests.exceptions.RequestException as exc:
            raise VenePagosError(f"Error de red: {exc}")

        # Handle errors
        if not response.ok:
            error_body: Any = None
            try:
                error_body = response.json()
            except ValueError:
                error_body = response.text

            message = "Error HTTP {}".format(response.status_code)
            if isinstance(error_body, dict) and "message" in error_body:
                message = str(error_body["message"])

            if response.status_code in (401, 403):
                raise AuthenticationError(message)

            raise APIError(message, response.status_code, error_body)

        # 204 No Content
        if response.status_code == 204:
            return None

        return response.json()

    # -------------------------------------------------------------------
    # Payment Links
    # -------------------------------------------------------------------

    def create_payment_link(
        self,
        merchant_id: str,
        amount: float,
        currency: Optional[str] = None,
        description: Optional[str] = None,
        expires_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Crea un nuevo link de pago.

        Args:
            merchant_id: ID del comercio propietario del link.
            amount: Monto a cobrar.
            currency: Moneda (ej. ``"VES"``, ``"USD"``). Opcional.
            description: Descripcion del cobro. Opcional.
            expires_at: Fecha/hora de expiracion en formato ISO 8601. Opcional.

        Returns:
            Diccionario con clave ``data`` que contiene el
            :class:`~venepagos.types.PaymentLink` creado.
        """
        body: Dict[str, Any] = {
            "merchantId": merchant_id,
            "amount": amount,
        }
        if currency is not None:
            body["currency"] = currency
        if description is not None:
            body["description"] = description
        if expires_at is not None:
            body["expiresAt"] = expires_at

        return self._request("POST", "/api/v1/payment-links", body=body)

    def list_payment_links(
        self, merchant_id: Optional[str] = None
    ) -> Dict[str, List[Any]]:
        """Lista los links de pago, opcionalmente filtrados por comercio.

        Args:
            merchant_id: Filtrar por ID de comercio. Opcional.

        Returns:
            Diccionario con clave ``data`` que contiene la lista de
            :class:`~venepagos.types.PaymentLink`.
        """
        params: Optional[Dict[str, str]] = None
        if merchant_id is not None:
            params = {"merchantId": merchant_id}
        return self._request("GET", "/api/v1/payment-links", params=params)

    def get_payment_link(self, link_id: str) -> Dict[str, Any]:
        """Obtiene un link de pago por su ID.

        Args:
            link_id: ID del link de pago.

        Returns:
            Diccionario con clave ``data`` que contiene el
            :class:`~venepagos.types.PaymentLink`.
        """
        return self._request("GET", f"/api/v1/payment-links/{quote(link_id, safe='')}")

    def update_payment_link(
        self,
        link_id: str,
        description: Optional[str] = None,
        is_active: Optional[bool] = None,
        expires_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Actualiza un link de pago existente.

        Args:
            link_id: ID del link de pago.
            description: Nueva descripcion. Opcional.
            is_active: Activar o desactivar el link. Opcional.
            expires_at: Nueva fecha de expiracion. Opcional.

        Returns:
            Diccionario con clave ``data`` que contiene el
            :class:`~venepagos.types.PaymentLink` actualizado.
        """
        body: Dict[str, Any] = {}
        if description is not None:
            body["description"] = description
        if is_active is not None:
            body["isActive"] = is_active
        if expires_at is not None:
            body["expiresAt"] = expires_at

        return self._request(
            "PUT", f"/api/v1/payment-links/{quote(link_id, safe='')}", body=body
        )

    def delete_payment_link(self, link_id: str) -> None:
        """Desactiva (elimina logicamente) un link de pago.

        Args:
            link_id: ID del link de pago.
        """
        self._request("DELETE", f"/api/v1/payment-links/{quote(link_id, safe='')}")

    # -------------------------------------------------------------------
    # Public Payment Info
    # -------------------------------------------------------------------

    def get_public_payment_info(self, token: str) -> Dict[str, Any]:
        """Obtiene la informacion publica de un pago a partir de su token.

        Este endpoint no requiere autenticacion.

        Args:
            token: Token unico del link de pago.

        Returns:
            Diccionario con clave ``data`` que contiene la informacion
            publica del pago.
        """
        return self._request("GET", f"/api/v1/pay/{quote(token, safe='')}")

    # -------------------------------------------------------------------
    # Store Orders
    # -------------------------------------------------------------------

    def create_order(
        self,
        store_slug: str,
        product_slug: str,
        customer_name: str,
        customer_email: str,
        customer_phone: Optional[str] = None,
        quantity: Optional[int] = None,
        shipping_address: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Crea una orden en una tienda para un producto especifico.

        Args:
            store_slug: Slug de la tienda.
            product_slug: Slug del producto.
            customer_name: Nombre del cliente.
            customer_email: Correo electronico del cliente.
            customer_phone: Telefono del cliente. Opcional.
            quantity: Cantidad de productos. Opcional (por defecto 1).
            shipping_address: Direccion de envio. Opcional.
            notes: Notas adicionales. Opcional.

        Returns:
            Diccionario con clave ``data`` que contiene ``order`` y
            ``paymentUrl``.
        """
        body: Dict[str, Any] = {
            "customerName": customer_name,
            "customerEmail": customer_email,
        }
        if customer_phone is not None:
            body["customerPhone"] = customer_phone
        if quantity is not None:
            body["quantity"] = quantity
        if shipping_address is not None:
            body["shippingAddress"] = shipping_address
        if notes is not None:
            body["notes"] = notes

        store = quote(store_slug, safe="")
        product = quote(product_slug, safe="")
        return self._request(
            "POST", f"/api/v1/store/{store}/checkout/{product}", body=body
        )
