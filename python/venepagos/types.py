"""Definiciones de tipos para el SDK de VenePagos."""

from typing import Any, Dict, List, Optional

try:
    from typing import TypedDict
except ImportError:
    from typing_extensions import TypedDict


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------


class CreatePaymentLinkRequest(TypedDict, total=False):
    """Cuerpo para crear un link de pago."""

    merchantId: str  # required
    amount: float  # required
    currency: str
    description: str
    expiresAt: str


class UpdatePaymentLinkRequest(TypedDict, total=False):
    """Cuerpo para actualizar un link de pago."""

    description: str
    isActive: bool
    expiresAt: str


class CreateOrderRequest(TypedDict, total=False):
    """Cuerpo para crear una orden en una tienda."""

    customerName: str  # required
    customerEmail: str  # required
    customerPhone: str
    quantity: int
    shippingAddress: str
    notes: str


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------


class PaymentLink(TypedDict, total=False):
    """Representacion completa de un link de pago."""

    id: str
    merchantId: str
    amount: float
    currency: str
    description: str
    token: str
    url: str
    isActive: bool
    expiresAt: Optional[str]
    createdAt: str


class PublicPaymentInfo(TypedDict, total=False):
    """Informacion publica de un pago (obtenida por token)."""

    id: str
    merchantId: str
    amount: float
    currency: str
    description: str
    token: str
    url: str
    isActive: bool
    expiresAt: Optional[str]
    createdAt: str


class CreateOrderResponse(TypedDict):
    """Respuesta al crear una orden."""

    order: Dict[str, Any]
    paymentUrl: str


class ApiResponse(TypedDict):
    """Envoltorio estandar de respuesta exitosa."""

    data: Any


class ApiListResponse(TypedDict):
    """Envoltorio de respuesta de lista."""

    data: List[Any]
