"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  VenePagosCheckout: () => VenePagosCheckout,
  VenePagosClient: () => VenePagosClient,
  VenePagosError: () => VenePagosError
});
module.exports = __toCommonJS(index_exports);

// src/types.ts
var VenePagosError = class extends Error {
  constructor(message, statusCode, body) {
    super(message);
    this.name = "VenePagosError";
    this.statusCode = statusCode;
    this.body = body;
  }
};

// src/client.ts
var DEFAULT_BASE_URL = "https://api.venepagos.com";
var DEFAULT_TIMEOUT = 3e4;
var VenePagosClient = class {
  constructor(config) {
    if (!config.apiKey) {
      throw new Error("VenePagosClient: se requiere una apiKey v\xE1lida.");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }
  // -----------------------------------------------------------------------
  // Helpers internos
  // -----------------------------------------------------------------------
  /**
   * Ejecuta una petición HTTP contra la API de VenePagos.
   * @internal
   */
  async request(method, path, options) {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== void 0) {
          url.searchParams.set(key, value);
        }
      }
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const headers = {
        "X-API-Key": this.apiKey,
        "Accept": "application/json"
      };
      const init = {
        method,
        headers,
        signal: controller.signal
      };
      if (options?.body !== void 0) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(options.body);
      }
      const response = await fetch(url.toString(), init);
      if (!response.ok) {
        let errorBody;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }
        const msg = typeof errorBody === "object" && errorBody !== null && "message" in errorBody ? String(errorBody.message) : `Error HTTP ${response.status}`;
        throw new VenePagosError(msg, response.status, errorBody);
      }
      if (response.status === 204) {
        return void 0;
      }
      return await response.json();
    } catch (error) {
      if (error instanceof VenePagosError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new VenePagosError(
          `La petici\xF3n a ${path} excedi\xF3 el tiempo l\xEDmite de ${this.timeout}ms.`,
          408
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
  async createPaymentLink(data) {
    return this.request("POST", "/api/v1/payment-links", {
      body: data
    });
  }
  /**
   * Lista los links de pago, opcionalmente filtrados por comercio.
   *
   * @param params - Filtros opcionales.
   * @returns Lista de links de pago.
   */
  async listPaymentLinks(params) {
    return this.request("GET", "/api/v1/payment-links", {
      query: { merchantId: params?.merchantId }
    });
  }
  /**
   * Obtiene un link de pago por su ID.
   *
   * @param id - ID del link de pago.
   * @returns El link de pago.
   */
  async getPaymentLink(id) {
    return this.request("GET", `/api/v1/payment-links/${encodeURIComponent(id)}`);
  }
  /**
   * Actualiza un link de pago existente.
   *
   * @param id   - ID del link de pago.
   * @param data - Campos a actualizar.
   * @returns El link de pago actualizado.
   */
  async updatePaymentLink(id, data) {
    return this.request("PUT", `/api/v1/payment-links/${encodeURIComponent(id)}`, {
      body: data
    });
  }
  /**
   * Desactiva (elimina lógicamente) un link de pago.
   *
   * @param id - ID del link de pago.
   */
  async deletePaymentLink(id) {
    await this.request("DELETE", `/api/v1/payment-links/${encodeURIComponent(id)}`);
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
  async getPublicPaymentInfo(token) {
    return this.request("GET", `/api/v1/pay/${encodeURIComponent(token)}`);
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
  async createOrder(storeSlug, productSlug, data) {
    return this.request(
      "POST",
      `/api/v1/store/${encodeURIComponent(storeSlug)}/checkout/${encodeURIComponent(productSlug)}`,
      { body: data }
    );
  }
};

// src/checkout.ts
var VenePagosCheckout = class {
  constructor() {
    this.overlayElement = null;
    this.styleElement = null;
  }
  /**
   * Abre el checkout de VenePagos.
   *
   * @param url     - URL de la página de pago.
   * @param options - Opciones de visualización.
   */
  open(url, options = {}) {
    const mode = options.mode ?? "popup";
    switch (mode) {
      case "popup":
        this.openPopup(url, options);
        break;
      case "newTab":
        this.openNewTab(url);
        break;
      case "redirect":
        this.openRedirect(url, options);
        break;
      default:
        throw new Error(`Modo de checkout no soportado: ${mode}`);
    }
  }
  /**
   * Cierra el popup de checkout si está abierto.
   */
  close() {
    this.destroyOverlay();
  }
  // -----------------------------------------------------------------------
  // Modo: popup
  // -----------------------------------------------------------------------
  openPopup(url, options) {
    if (this.overlayElement) {
      this.destroyOverlay();
    }
    const width = options.width ?? 480;
    const height = options.height ?? 680;
    this.injectStyles(width, height);
    const overlay = document.createElement("div");
    overlay.className = "vp-checkout-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "VenePagos Checkout");
    const modal = document.createElement("div");
    modal.className = "vp-checkout-modal";
    const header = document.createElement("div");
    header.className = "vp-checkout-header";
    const title = document.createElement("span");
    title.className = "vp-checkout-title";
    title.textContent = "VenePagos";
    const closeBtn = document.createElement("button");
    closeBtn.className = "vp-checkout-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Cerrar checkout");
    closeBtn.type = "button";
    closeBtn.addEventListener("click", () => {
      this.destroyOverlay();
      options.onClose?.();
    });
    header.appendChild(title);
    header.appendChild(closeBtn);
    const loader = document.createElement("div");
    loader.className = "vp-checkout-loader";
    loader.innerHTML = '<div class="vp-checkout-spinner"></div><p>Cargando checkout&hellip;</p>';
    const iframe = document.createElement("iframe");
    iframe.className = "vp-checkout-iframe";
    iframe.src = url;
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allow", "payment");
    iframe.addEventListener("load", () => {
      loader.style.display = "none";
      iframe.style.opacity = "1";
    });
    modal.appendChild(header);
    modal.appendChild(loader);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.destroyOverlay();
        options.onClose?.();
      }
    });
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        this.destroyOverlay();
        options.onClose?.();
        document.removeEventListener("keydown", handleEsc);
      }
    };
    document.addEventListener("keydown", handleEsc);
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
    document.body.style.overflow = "hidden";
  }
  // -----------------------------------------------------------------------
  // Modo: newTab
  // -----------------------------------------------------------------------
  openNewTab(url) {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      window.location.href = url;
    }
  }
  // -----------------------------------------------------------------------
  // Modo: redirect
  // -----------------------------------------------------------------------
  openRedirect(url, options) {
    const targetUrl = new URL(url);
    if (options.returnUrl) {
      targetUrl.searchParams.set("returnUrl", options.returnUrl);
    }
    window.location.href = targetUrl.toString();
  }
  // -----------------------------------------------------------------------
  // Helpers internos
  // -----------------------------------------------------------------------
  destroyOverlay() {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    document.body.style.overflow = "";
  }
  injectStyles(width, height) {
    if (this.styleElement) return;
    const style = document.createElement("style");
    style.textContent = `
      .vp-checkout-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        animation: vpFadeIn 0.2s ease-out;
      }

      @keyframes vpFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      @keyframes vpSlideUp {
        from { opacity: 0; transform: translateY(24px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      .vp-checkout-modal {
        width: ${width}px;
        max-width: 95vw;
        height: ${height}px;
        max-height: 90vh;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
        display: flex;
        flex-direction: column;
        background: #ffffff;
        animation: vpSlideUp 0.25s ease-out;
      }

      .vp-checkout-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: #ffffff;
        flex-shrink: 0;
      }

      .vp-checkout-title {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0.3px;
      }

      .vp-checkout-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: #ffffff;
        font-size: 22px;
        line-height: 1;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
      }

      .vp-checkout-close:hover {
        background: rgba(255, 255, 255, 0.35);
      }

      .vp-checkout-loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 0;
        gap: 16px;
        position: absolute;
        inset: 0;
        top: 50px;
        background: #ffffff;
        z-index: 1;
      }

      .vp-checkout-loader p {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        color: #6b7280;
      }

      .vp-checkout-spinner {
        width: 36px;
        height: 36px;
        border: 3px solid #e5e7eb;
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: vpSpin 0.7s linear infinite;
      }

      @keyframes vpSpin {
        to { transform: rotate(360deg); }
      }

      .vp-checkout-iframe {
        flex: 1;
        width: 100%;
        border: none;
        opacity: 0;
        transition: opacity 0.3s;
        position: relative;
        z-index: 2;
      }
    `;
    document.head.appendChild(style);
    this.styleElement = style;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VenePagosCheckout,
  VenePagosClient,
  VenePagosError
});
//# sourceMappingURL=index.js.map