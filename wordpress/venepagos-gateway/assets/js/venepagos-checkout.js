/**
 * VenePagos Checkout - Frontend JavaScript
 *
 * Maneja los tres modos de checkout: popup, newTab y redirect.
 */
(function () {
  'use strict';

  var config = window.venepagosConfig || {};

  // -----------------------------------------------------------------------
  // Modal popup
  // -----------------------------------------------------------------------

  function createModal(url) {
    // Overlay
    var overlay = document.createElement('div');
    overlay.className = 'venepagos-overlay';
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });

    // Modal container
    var modal = document.createElement('div');
    modal.className = 'venepagos-modal';

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'venepagos-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.addEventListener('click', function () {
      closeModal(overlay);
    });

    // Spinner
    var spinner = document.createElement('div');
    spinner.className = 'venepagos-spinner';

    // Iframe
    var iframe = document.createElement('iframe');
    iframe.className = 'venepagos-iframe';
    iframe.src = url;
    iframe.setAttribute('allowpaymentrequest', 'true');
    iframe.addEventListener('load', function () {
      spinner.style.display = 'none';
    });

    modal.appendChild(closeBtn);
    modal.appendChild(spinner);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Close on Escape key
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') {
        closeModal(overlay);
        document.removeEventListener('keydown', handler);
      }
    });
  }

  function closeModal(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      document.body.style.overflow = '';
    }
  }

  // -----------------------------------------------------------------------
  // Abrir checkout segun modo
  // -----------------------------------------------------------------------

  function openCheckout(url, mode) {
    mode = mode || config.checkoutMode || 'redirect';

    switch (mode) {
      case 'popup':
        createModal(url);
        break;
      case 'newTab':
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      case 'redirect':
      default:
        window.location.href = url;
        break;
    }
  }

  // -----------------------------------------------------------------------
  // Crear payment link via AJAX
  // -----------------------------------------------------------------------

  function createPaymentLink(amount, currency, description, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', config.ajaxUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;

      try {
        var response = JSON.parse(xhr.responseText);
        if (response.success && response.data && response.data.url) {
          callback(null, response.data);
        } else {
          var msg =
            response.data && response.data.message
              ? response.data.message
              : 'Error al crear el enlace de pago.';
          callback(new Error(msg));
        }
      } catch (e) {
        callback(new Error('Error de comunicación con el servidor.'));
      }
    };

    var params = [
      'action=venepagos_create_link',
      'nonce=' + encodeURIComponent(config.nonce),
      'amount=' + encodeURIComponent(amount),
      'currency=' + encodeURIComponent(currency),
      'description=' + encodeURIComponent(description),
    ].join('&');

    xhr.send(params);
  }

  // -----------------------------------------------------------------------
  // Botones del shortcode
  // -----------------------------------------------------------------------

  function initButtons() {
    var buttons = document.querySelectorAll('.venepagos-pay-button');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();

        var amount = btn.getAttribute('data-amount');
        var currency = btn.getAttribute('data-currency') || 'USD';
        var description = btn.getAttribute('data-description') || '';

        btn.disabled = true;
        btn.classList.add('venepagos-loading');

        createPaymentLink(amount, currency, description, function (err, data) {
          btn.disabled = false;
          btn.classList.remove('venepagos-loading');

          if (err) {
            alert(err.message);
            return;
          }

          openCheckout(data.url);
        });
      });
    });
  }

  // -----------------------------------------------------------------------
  // WooCommerce: popup en pagina de orden recibida
  // -----------------------------------------------------------------------

  function initWooCommercePopup() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('venepagos_popup') === '1' && params.get('venepagos_url')) {
      var url = decodeURIComponent(params.get('venepagos_url'));
      openCheckout(url, 'popup');
    }
  }

  // -----------------------------------------------------------------------
  // API publica
  // -----------------------------------------------------------------------

  window.VenePagos = {
    openCheckout: openCheckout,
    createModal: createModal,
  };

  // -----------------------------------------------------------------------
  // Init
  // -----------------------------------------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initButtons();
      initWooCommercePopup();
    });
  } else {
    initButtons();
    initWooCommercePopup();
  }
})();
