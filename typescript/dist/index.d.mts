/** Opciones de configuración del cliente VenePagos. */
interface VenePagosConfig {
    /** API key proporcionada por VenePagos (se envía en el header X-API-Key). */
    apiKey: string;
    /** URL base de la API. Por defecto: https://api.venepagos.com */
    baseUrl?: string;
    /** Tiempo máximo de espera para cada petición en milisegundos. Por defecto: 30 000. */
    timeout?: number;
}
/** Envoltorio estándar de respuesta exitosa de la API. */
interface ApiResponse<T> {
    data: T;
}
/** Envoltorio de respuesta de lista. */
interface ApiListResponse<T> {
    data: T[];
}
/** Error devuelto por la API. */
interface ApiError {
    error: string;
    message?: string;
    statusCode?: number;
}
/** Cuerpo para crear un link de pago. */
interface CreatePaymentLinkRequest {
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
interface UpdatePaymentLinkRequest {
    /** Nueva descripción. */
    description?: string;
    /** Activar o desactivar el link. */
    isActive?: boolean;
    /** Nueva fecha de expiración. */
    expiresAt?: string;
}
/** Representación completa de un link de pago. */
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
/** Parámetros de consulta para listar links de pago. */
interface ListPaymentLinksParams {
    /** Filtrar por ID de comercio. */
    merchantId?: string;
}
/** Información pública de un pago (obtenida por token). */
interface PublicPaymentInfo {
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
/** Cuerpo para crear una orden en una tienda. */
interface CreateOrderRequest {
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
interface CreateOrderResponse {
    order: Record<string, unknown>;
    paymentUrl: string;
}
/** Modo de visualización del checkout. */
type CheckoutMode = 'popup' | 'newTab' | 'redirect';
/** Opciones para abrir el checkout. */
interface CheckoutOptions {
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
/** Error lanzado por el SDK cuando la API devuelve un error. */
declare class VenePagosError extends Error {
    /** Código de estado HTTP. */
    readonly statusCode: number;
    /** Cuerpo de la respuesta de error. */
    readonly body: unknown;
    constructor(message: string, statusCode: number, body?: unknown);
}

/**
 * Cliente principal del SDK de VenePagos.
 *
 * @example
 * ```ts
 * const client = new VenePagosClient({ apiKey: 'vp_live_...' });
 * const link = await client.createPaymentLink({
 *   merchantId: 'merch_123',
 *   amount: 25.00,
 *   description: 'Suscripción mensual',
 * });
 * ```
 */
declare class VenePagosClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    constructor(config: VenePagosConfig);
    /**
     * Ejecuta una petición HTTP contra la API de VenePagos.
     * @internal
     */
    private request;
    /**
     * Crea un nuevo link de pago.
     *
     * @param data - Datos del link de pago a crear.
     * @returns El link de pago creado.
     *
     * @example
     * ```ts
     * const { data: link } = await client.createPaymentLink({
     *   merchantId: 'merch_123',
     *   amount: 50,
     *   currency: 'USD',
     *   description: 'Producto premium',
     * });
     * console.log(link.url);
     * ```
     */
    createPaymentLink(data: CreatePaymentLinkRequest): Promise<ApiResponse<PaymentLink>>;
    /**
     * Lista los links de pago, opcionalmente filtrados por comercio.
     *
     * @param params - Filtros opcionales.
     * @returns Lista de links de pago.
     */
    listPaymentLinks(params?: ListPaymentLinksParams): Promise<ApiListResponse<PaymentLink>>;
    /**
     * Obtiene un link de pago por su ID.
     *
     * @param id - ID del link de pago.
     * @returns El link de pago.
     */
    getPaymentLink(id: string): Promise<ApiResponse<PaymentLink>>;
    /**
     * Actualiza un link de pago existente.
     *
     * @param id   - ID del link de pago.
     * @param data - Campos a actualizar.
     * @returns El link de pago actualizado.
     */
    updatePaymentLink(id: string, data: UpdatePaymentLinkRequest): Promise<ApiResponse<PaymentLink>>;
    /**
     * Desactiva (elimina lógicamente) un link de pago.
     *
     * @param id - ID del link de pago.
     */
    deletePaymentLink(id: string): Promise<void>;
    /**
     * Obtiene la información pública de un pago a partir de su token.
     * Este endpoint no requiere autenticación.
     *
     * @param token - Token único del link de pago.
     * @returns Información pública del pago.
     */
    getPublicPaymentInfo(token: string): Promise<ApiResponse<PublicPaymentInfo>>;
    /**
     * Crea una orden en una tienda para un producto específico.
     *
     * @param storeSlug   - Slug de la tienda.
     * @param productSlug - Slug del producto.
     * @param data        - Datos del cliente y la orden.
     * @returns La orden creada y la URL de pago.
     *
     * @example
     * ```ts
     * const { data } = await client.createOrder('mi-tienda', 'camiseta-xl', {
     *   customerName: 'Juan Pérez',
     *   customerEmail: 'juan@ejemplo.com',
     *   quantity: 2,
     * });
     * // Abrir checkout
     * checkout.open(data.paymentUrl, { mode: 'popup' });
     * ```
     */
    createOrder(storeSlug: string, productSlug: string, data: CreateOrderRequest): Promise<ApiResponse<CreateOrderResponse>>;
}

/**
 * Clase para abrir el checkout de VenePagos en distintos modos de visualización.
 *
 * @example
 * ```ts
 * const checkout = new VenePagosCheckout();
 *
 * // Popup (modal con iframe)
 * checkout.open(paymentUrl, { mode: 'popup', onClose: () => console.log('cerrado') });
 *
 * // Nueva pestaña
 * checkout.open(paymentUrl, { mode: 'newTab' });
 *
 * // Redirección
 * checkout.open(paymentUrl, { mode: 'redirect', returnUrl: 'https://mi-sitio.com/gracias' });
 * ```
 */
declare class VenePagosCheckout {
    private overlayElement;
    private styleElement;
    /**
     * Abre el checkout de VenePagos.
     *
     * @param url     - URL de la página de pago.
     * @param options - Opciones de visualización.
     */
    open(url: string, options?: CheckoutOptions): void;
    /**
     * Cierra el popup de checkout si está abierto.
     */
    close(): void;
    private openPopup;
    private openNewTab;
    private openRedirect;
    private destroyOverlay;
    private injectStyles;
}

export { type ApiError, type ApiListResponse, type ApiResponse, type CheckoutMode, type CheckoutOptions, type CreateOrderRequest, type CreateOrderResponse, type CreatePaymentLinkRequest, type ListPaymentLinksParams, type PaymentLink, type PublicPaymentInfo, type UpdatePaymentLinkRequest, VenePagosCheckout, VenePagosClient, type VenePagosConfig, VenePagosError };
