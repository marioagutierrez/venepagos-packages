import type {
  VenePagosConfig,
  ApiResponse,
  ApiListResponse,
  CreatePaymentLinkRequest,
  UpdatePaymentLinkRequest,
  PaymentLink,
  ListPaymentLinksParams,
  PublicPaymentInfo,
  CreateOrderRequest,
  CreateOrderResponse,
} from './types';
import { VenePagosError } from './types';

const DEFAULT_BASE_URL = 'https://api.venepagos.com';
const DEFAULT_TIMEOUT = 30_000;

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
export class VenePagosClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: VenePagosConfig) {
    if (!config.apiKey) {
      throw new Error('VenePagosClient: se requiere una apiKey válida.');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  // -----------------------------------------------------------------------
  // Helpers internos
  // -----------------------------------------------------------------------

  /**
   * Ejecuta una petición HTTP contra la API de VenePagos.
   * @internal
   */
  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      query?: Record<string, string | undefined>;
    },
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'X-API-Key': this.apiKey,
        'Accept': 'application/json',
      };

      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (options?.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(options.body);
      }

      const response = await fetch(url.toString(), init);

      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }
        const msg =
          typeof errorBody === 'object' && errorBody !== null && 'message' in errorBody
            ? String((errorBody as Record<string, unknown>).message)
            : `Error HTTP ${response.status}`;
        throw new VenePagosError(msg, response.status, errorBody);
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof VenePagosError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new VenePagosError(
          `La petición a ${path} excedió el tiempo límite de ${this.timeout}ms.`,
          408,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  // -----------------------------------------------------------------------
  // Payment Links
  // -----------------------------------------------------------------------

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
  async createPaymentLink(
    data: CreatePaymentLinkRequest,
  ): Promise<ApiResponse<PaymentLink>> {
    return this.request<ApiResponse<PaymentLink>>('POST', '/api/v1/payment-links', {
      body: data,
    });
  }

  /**
   * Lista los links de pago, opcionalmente filtrados por comercio.
   *
   * @param params - Filtros opcionales.
   * @returns Lista de links de pago.
   */
  async listPaymentLinks(
    params?: ListPaymentLinksParams,
  ): Promise<ApiListResponse<PaymentLink>> {
    return this.request<ApiListResponse<PaymentLink>>('GET', '/api/v1/payment-links', {
      query: { merchantId: params?.merchantId },
    });
  }

  /**
   * Obtiene un link de pago por su ID.
   *
   * @param id - ID del link de pago.
   * @returns El link de pago.
   */
  async getPaymentLink(id: string): Promise<ApiResponse<PaymentLink>> {
    return this.request<ApiResponse<PaymentLink>>('GET', `/api/v1/payment-links/${encodeURIComponent(id)}`);
  }

  /**
   * Actualiza un link de pago existente.
   *
   * @param id   - ID del link de pago.
   * @param data - Campos a actualizar.
   * @returns El link de pago actualizado.
   */
  async updatePaymentLink(
    id: string,
    data: UpdatePaymentLinkRequest,
  ): Promise<ApiResponse<PaymentLink>> {
    return this.request<ApiResponse<PaymentLink>>('PUT', `/api/v1/payment-links/${encodeURIComponent(id)}`, {
      body: data,
    });
  }

  /**
   * Desactiva (elimina lógicamente) un link de pago.
   *
   * @param id - ID del link de pago.
   */
  async deletePaymentLink(id: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v1/payment-links/${encodeURIComponent(id)}`);
  }

  // -----------------------------------------------------------------------
  // Public Payment Info
  // -----------------------------------------------------------------------

  /**
   * Obtiene la información pública de un pago a partir de su token.
   * Este endpoint no requiere autenticación.
   *
   * @param token - Token único del link de pago.
   * @returns Información pública del pago.
   */
  async getPublicPaymentInfo(token: string): Promise<ApiResponse<PublicPaymentInfo>> {
    return this.request<ApiResponse<PublicPaymentInfo>>('GET', `/api/v1/pay/${encodeURIComponent(token)}`);
  }

  // -----------------------------------------------------------------------
  // Store Orders
  // -----------------------------------------------------------------------

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
  async createOrder(
    storeSlug: string,
    productSlug: string,
    data: CreateOrderRequest,
  ): Promise<ApiResponse<CreateOrderResponse>> {
    return this.request<ApiResponse<CreateOrderResponse>>(
      'POST',
      `/api/v1/store/${encodeURIComponent(storeSlug)}/checkout/${encodeURIComponent(productSlug)}`,
      { body: data },
    );
  }
}
