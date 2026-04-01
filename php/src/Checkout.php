<?php

namespace VenePagos;

class Checkout
{
    /** @var string */
    private $paymentUrl;

    /**
     * @param string $paymentUrl URL de pago
     */
    public function __construct(string $paymentUrl)
    {
        $this->paymentUrl = $paymentUrl;
    }

    /**
     * Generar URL de pago con returnUrl para modo redirect.
     *
     * @param string $returnUrl URL de retorno despues del pago
     * @return string
     */
    public function generateUrl(string $returnUrl = ''): string
    {
        if (empty($returnUrl)) {
            return $this->paymentUrl;
        }

        $separator = str_contains($this->paymentUrl, '?') ? '&' : '?';

        return $this->paymentUrl . $separator . 'returnUrl=' . urlencode($returnUrl);
    }

    /**
     * Renderizar script de checkout segun el modo seleccionado.
     *
     * @param string $mode     Modo de checkout: 'popup', 'newTab' o 'redirect'
     * @param array  $options  Opciones adicionales:
     *   - buttonId (string):  ID del boton que activa el checkout (default: 'venepagos-btn')
     *   - buttonText (string): Texto del boton (default: 'Pagar con VenePagos')
     *   - returnUrl (string):  URL de retorno para modo redirect
     *   - width (string):      Ancho del iframe en modo popup (default: '450px')
     *   - height (string):     Alto del iframe en modo popup (default: '650px')
     *   - onSuccess (string):  Nombre de funcion JS callback en exito
     *   - onClose (string):    Nombre de funcion JS callback al cerrar
     * @return string HTML/JS para insertar en la pagina
     */
    public function renderScript(string $mode = 'popup', array $options = []): string
    {
        $buttonId = $options['buttonId'] ?? 'venepagos-btn';
        $buttonText = $options['buttonText'] ?? 'Pagar con VenePagos';
        $returnUrl = $options['returnUrl'] ?? '';
        $onSuccess = $options['onSuccess'] ?? '';
        $onClose = $options['onClose'] ?? '';

        $paymentUrl = $this->escapeJs($this->paymentUrl);

        switch ($mode) {
            case 'popup':
                return $this->renderPopup($paymentUrl, $buttonId, $buttonText, $options, $onSuccess, $onClose);
            case 'newTab':
                return $this->renderNewTab($paymentUrl, $buttonId, $buttonText);
            case 'redirect':
                return $this->renderRedirect($returnUrl);
            default:
                throw new \InvalidArgumentException("Modo de checkout invalido: '{$mode}'. Use 'popup', 'newTab' o 'redirect'.");
        }
    }

    /**
     * Renderizar modo popup (iframe modal overlay).
     */
    private function renderPopup(
        string $paymentUrl,
        string $buttonId,
        string $buttonText,
        array $options,
        string $onSuccess,
        string $onClose
    ): string {
        $width = $options['width'] ?? '450px';
        $height = $options['height'] ?? '650px';

        $onSuccessCallback = $onSuccess ? "if (typeof {$onSuccess} === 'function') {$onSuccess}(event.data);" : '';
        $onCloseCallback = $onClose ? "if (typeof {$onClose} === 'function') {$onClose}();" : '';

        $buttonIdSafe = $this->escapeHtmlAttr($buttonId);
        $buttonTextSafe = $this->escapeHtml($buttonText);

        return <<<HTML
<button id="{$buttonIdSafe}" type="button">{$buttonTextSafe}</button>
<script>
(function() {
    var btn = document.getElementById('{$this->escapeJs($buttonId)}');
    if (!btn) return;

    btn.addEventListener('click', function() {
        // Crear overlay
        var overlay = document.createElement('div');
        overlay.id = 'venepagos-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';

        // Contenedor del iframe
        var container = document.createElement('div');
        container.style.cssText = 'position:relative;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

        // Boton cerrar
        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:24px;cursor:pointer;color:#666;z-index:1;';
        closeBtn.onclick = function() {
            document.body.removeChild(overlay);
            {$onCloseCallback}
        };

        // Iframe
        var iframe = document.createElement('iframe');
        iframe.src = '{$paymentUrl}';
        iframe.style.cssText = 'width:{$width};height:{$height};border:none;';

        container.appendChild(closeBtn);
        container.appendChild(iframe);
        overlay.appendChild(container);

        // Cerrar al hacer clic en el overlay
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                {$onCloseCallback}
            }
        });

        document.body.appendChild(overlay);

        // Escuchar mensajes del iframe
        window.addEventListener('message', function handler(event) {
            if (event.data && event.data.type === 'venepagos:success') {
                {$onSuccessCallback}
                if (document.getElementById('venepagos-overlay')) {
                    document.body.removeChild(overlay);
                }
                window.removeEventListener('message', handler);
            }
            if (event.data && event.data.type === 'venepagos:close') {
                if (document.getElementById('venepagos-overlay')) {
                    document.body.removeChild(overlay);
                }
                {$onCloseCallback}
                window.removeEventListener('message', handler);
            }
        });
    });
})();
</script>
HTML;
    }

    /**
     * Renderizar modo nueva pestana.
     */
    private function renderNewTab(string $paymentUrl, string $buttonId, string $buttonText): string
    {
        $buttonIdSafe = $this->escapeHtmlAttr($buttonId);
        $buttonTextSafe = $this->escapeHtml($buttonText);

        return <<<HTML
<button id="{$buttonIdSafe}" type="button">{$buttonTextSafe}</button>
<script>
(function() {
    var btn = document.getElementById('{$this->escapeJs($buttonId)}');
    if (!btn) return;

    btn.addEventListener('click', function() {
        window.open('{$paymentUrl}', '_blank', 'noopener,noreferrer');
    });
})();
</script>
HTML;
    }

    /**
     * Renderizar modo redirect (redireccion PHP con header).
     */
    private function renderRedirect(string $returnUrl): string
    {
        $url = $this->generateUrl($returnUrl);

        return "<?php header('Location: " . addslashes($url) . "'); exit; ?>";
    }

    /**
     * Realizar redireccion HTTP directa. Llamar antes de cualquier output.
     *
     * @param string $returnUrl URL de retorno despues del pago
     * @return void
     */
    public function redirect(string $returnUrl = ''): void
    {
        $url = $this->generateUrl($returnUrl);
        header('Location: ' . $url);
        exit;
    }

    /**
     * @return string
     */
    public function getPaymentUrl(): string
    {
        return $this->paymentUrl;
    }

    private function escapeJs(string $value): string
    {
        return addslashes($value);
    }

    private function escapeHtml(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }

    private function escapeHtmlAttr(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}
