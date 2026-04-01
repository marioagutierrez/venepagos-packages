// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

/** Opciones de configuración del cliente VenePagos. */
export interface VenePagosConfig {
  /** API key proporcionada por VenePagos (se envía en el header X-API-Key). */
  apiKey: string;
  /** URL base de la API. Por defecto: https://api.venepagos.com */
  baseUrl?: string;
  /** Tiempo máximo de espera para cada petición en milisegundos. Por defecto: 30 000. */
  timeout?: number;
}

// ---------------------------------------------------------------------------
// Respuestas genéricas de la API
// ---------------------------------------------------------------------------

/** Envoltorio estándar de respuesta exitosa de la API. */
export interface ApiResponse<T> {
  data: T;
}

/** Envoltorio de respuesta de lista. */
export interface ApiListResponse<T> {
  data: T[];
}

/** Error devuelto por la API. */
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

// ---------------------------------------------------------------------------
// Payment Links
// ---------------------------------------------------------------------------

/** Cuerpo para crear un link de pago. */
export interface CreatePaymentLinkRequest {
  /** ID del comercio propietario del link. */
  merchantId: string;
  /** Monto a cobrar. */
  amount: number;
  /** Moneda (ej. "VES", "USD"). Opcional. */
  currency?: string;
  /** Descripción del cobro. Opcional. */
  description?: string;
  /** Fecha/hora de expiración en formato ISO 8601. Opcional. */
  expiresAt?: string;
}

/** Cuerpo para actualizar un link de pago existente. */
export interface UpdatePaymentLinkRequest {
  /** Nueva descripción. */
  description?: string;
  /** Activar o desactivar el link. */
  isActive?: boolean;
  /** Nueva fecha de expiración. */
  expiresAt?: string;
}

/** Representación completa de un link de pago. */
export interface PaymentLink {
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

/** Parámetros de consulta para listar links de pago. */
export interface ListPaymentLinksParams {
  /** Filtrar por ID de comercio. */
  merchantId?: string;
}

// ---------------------------------------------------------------------------
// Public Payment Info
// ---------------------------------------------------------------------------

/** Información pública de un pago (obtenida por token). */
export interface PublicPaymentInfo {
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
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Orders (Store checkout)
// ---------------------------------------------------------------------------

/** Cuerpo para crear una orden en una tienda. */
export interface CreateOrderRequest {
  /** Nombre del cliente. */
  customerName: string;
  /** Correo electrónico del cliente. */
  customerEmail: string;
  /** Teléfono del cliente. Opcional. */
  customerPhone?: string;
  /** Cantidad de productos. Opcional (por defecto 1). */
  quantity?: number;
  /** Dirección de envío. Opcional. */
  shippingAddress?: string;
  /** Notas adicionales. Opcional. */
  notes?: string;
}

/** Respuesta al crear una orden. */
export interface CreateOrderResponse {
  order: Record<string, unknown>;
  paymentUrl: string;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

/** Modo de visualización del checkout. */
export type CheckoutMode = 'popup' | 'newTab' | 'redirect';

/** Opciones para abrir el checkout. */
export interface CheckoutOptions {
  /** Modo de apertura. Por defecto: 'popup'. */
  mode?: CheckoutMode;
  /** URL de retorno tras el pago (solo para modo 'redirect'). */
  returnUrl?: string;
  /** Callback cuando se cierra el popup (solo para modo 'popup'). */
  onClose?: () => void;
  /** Callback cuando el pago se completa dentro del popup. */
  onSuccess?: () => void;
  /** Ancho del popup en píxeles. Por defecto: 480. */
  width?: number;
  /** Alto del popup en píxeles. Por defecto: 680. */
  height?: number;
}

// ---------------------------------------------------------------------------
// Error personalizado
// ---------------------------------------------------------------------------

/** Error lanzado por el SDK cuando la API devuelve un error. */
export class VenePagosError extends Error {
  /** Código de estado HTTP. */
  public readonly statusCode: number;
  /** Cuerpo de la respuesta de error. */
  public readonly body: unknown;

  constructor(message: string, statusCode: number, body?: unknown) {
    super(message);
    this.name = 'VenePagosError';
    this.statusCode = statusCode;
    this.body = body;
  }
}
