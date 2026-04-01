import type { CheckoutOptions } from './types';

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
export class VenePagosCheckout {
  private overlayElement: HTMLDivElement | null = null;
  private styleElement: HTMLStyleElement | null = null;

  /**
   * Abre el checkout de VenePagos.
   *
   * @param url     - URL de la página de pago.
   * @param options - Opciones de visualización.
   */
  open(url: string, options: CheckoutOptions = {}): void {
    const mode = options.mode ?? 'popup';

    switch (mode) {
      case 'popup':
        this.openPopup(url, options);
        break;
      case 'newTab':
        this.openNewTab(url);
        break;
      case 'redirect':
        this.openRedirect(url, options);
        break;
      default:
        throw new Error(`Modo de checkout no soportado: ${mode as string}`);
    }
  }

  /**
   * Cierra el popup de checkout si está abierto.
   */
  close(): void {
    this.destroyOverlay();
  }

  // -----------------------------------------------------------------------
  // Modo: popup
  // -----------------------------------------------------------------------

  private openPopup(url: string, options: CheckoutOptions): void {
    // Si ya hay un popup abierto, lo cerramos primero.
    if (this.overlayElement) {
      this.destroyOverlay();
    }

    const width = options.width ?? 480;
    const height = options.height ?? 680;

    this.injectStyles(width, height);

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'vp-checkout-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'VenePagos Checkout');

    // Contenedor del modal
    const modal = document.createElement('div');
    modal.className = 'vp-checkout-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'vp-checkout-header';

    const title = document.createElement('span');
    title.className = 'vp-checkout-title';
    title.textContent = 'VenePagos';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'vp-checkout-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Cerrar checkout');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => {
      this.destroyOverlay();
      options.onClose?.();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Loading
    const loader = document.createElement('div');
    loader.className = 'vp-checkout-loader';
    loader.innerHTML =
      '<div class="vp-checkout-spinner"></div><p>Cargando checkout&hellip;</p>';

    // Iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'vp-checkout-iframe';
    iframe.src = url;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'payment');
    iframe.addEventListener('load', () => {
      loader.style.display = 'none';
      iframe.style.opacity = '1';
    });

    // Ensamblar
    modal.appendChild(header);
    modal.appendChild(loader);
    modal.appendChild(iframe);
    overlay.appendChild(modal);

    // Click fuera del modal cierra
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.destroyOverlay();
        options.onClose?.();
      }
    });

    // Escape cierra
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.destroyOverlay();
        options.onClose?.();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    document.body.appendChild(overlay);
    this.overlayElement = overlay;

    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
  }

  // -----------------------------------------------------------------------
  // Modo: newTab
  // -----------------------------------------------------------------------

  private openNewTab(url: string): void {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) {
      // Fallback: algunos navegadores bloquean window.open
      window.location.href = url;
    }
  }

  // -----------------------------------------------------------------------
  // Modo: redirect
  // -----------------------------------------------------------------------

  private openRedirect(url: string, options: CheckoutOptions): void {
    const targetUrl = new URL(url);
    if (options.returnUrl) {
      targetUrl.searchParams.set('returnUrl', options.returnUrl);
    }
    window.location.href = targetUrl.toString();
  }

  // -----------------------------------------------------------------------
  // Helpers internos
  // -----------------------------------------------------------------------

  private destroyOverlay(): void {
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    document.body.style.overflow = '';
  }

  private injectStyles(width: number, height: number): void {
    if (this.styleElement) return;

    const style = document.createElement('style');
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
}
