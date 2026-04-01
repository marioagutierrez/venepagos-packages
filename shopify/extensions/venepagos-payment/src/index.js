/**
 * VenePagos Payment Extension for Shopify Checkout.
 *
 * This extension renders the VenePagos payment method in the Shopify checkout
 * and handles payment initiation based on the configured checkout mode.
 *
 * Checkout modes:
 *   - popup:    Opens VenePagos in an embedded modal overlay
 *   - newTab:   Opens VenePagos in a new browser tab
 *   - redirect: Redirects the customer to VenePagos (default)
 */

import {
  extension,
  Banner,
  BlockStack,
  Button,
  Image,
  InlineStack,
  Text,
} from "@shopify/ui-extensions/checkout";

export default extension("purchase.checkout.payment-method-list.render-after", (root, api) => {
  const { sessionToken, settings, i18n } = api;

  const checkoutMode = settings.current.checkout_mode || "redirect";
  const buttonLabel = settings.current.button_label || "Pagar con VenePagos";

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  const container = root.createComponent(BlockStack, { spacing: "base" });

  const header = root.createComponent(InlineStack, {
    spacing: "tight",
    blockAlignment: "center",
  });

  const logo = root.createComponent(Image, {
    source: "https://venepagos.com/assets/logo-small.png",
    accessibilityDescription: "VenePagos",
    fit: "contain",
  });
  header.appendChild(logo);

  const title = root.createComponent(Text, { emphasis: "bold", size: "medium" }, "VenePagos");
  header.appendChild(title);

  container.appendChild(header);

  const description = root.createComponent(
    Text,
    { size: "small" },
    "Paga de forma segura con VenePagos. Acepta transferencias bancarias, pagos moviles y mas."
  );
  container.appendChild(description);

  // Payment button
  const payButton = root.createComponent(
    Button,
    {
      kind: "primary",
      onPress: () => handlePayment(api, checkoutMode),
    },
    buttonLabel
  );
  container.appendChild(payButton);

  root.appendChild(container);
});

// ---------------------------------------------------------------------------
// Payment handling
// ---------------------------------------------------------------------------

/**
 * Initiates the VenePagos payment flow.
 *
 * @param {Object} api    - Shopify checkout extension API
 * @param {string} mode   - Checkout display mode (popup | newTab | redirect)
 */
async function handlePayment(api, mode) {
  try {
    const token = await api.sessionToken.get();

    // Request a payment session from our app server
    const response = await fetch("/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: api.cost?.totalAmount?.current?.amount,
        currency: api.cost?.totalAmount?.current?.currencyCode,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[VenePagos] Payment creation failed:", data);
      return;
    }

    switch (mode) {
      case "popup":
        openPopup(data.payment_url || data.redirect_url, data.return_url);
        break;

      case "newTab":
        openNewTab(data.payment_url || data.redirect_url);
        break;

      case "redirect":
      default:
        // Redirect is handled by Shopify through the redirect_url response
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
        }
        break;
    }
  } catch (err) {
    console.error("[VenePagos] Payment error:", err);
  }
}

/**
 * Opens VenePagos checkout in a centered popup window.
 */
function openPopup(paymentUrl, returnUrl) {
  const width = 500;
  const height = 700;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;

  const popup = window.open(
    paymentUrl,
    "venepagos_checkout",
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );

  // Listen for completion message from the popup
  const listener = (event) => {
    if (event.data && event.data.gid) {
      window.removeEventListener("message", listener);
      if (popup && !popup.closed) {
        popup.close();
      }
      if (event.data.status === "resolve") {
        // Payment succeeded, Shopify will handle the rest
        window.location.href = returnUrl;
      }
    }
  };

  window.addEventListener("message", listener);

  // Poll to detect if popup was closed manually
  const pollTimer = setInterval(() => {
    if (popup && popup.closed) {
      clearInterval(pollTimer);
      window.removeEventListener("message", listener);
    }
  }, 1000);
}

/**
 * Opens VenePagos checkout in a new browser tab.
 */
function openNewTab(paymentUrl) {
  window.open(paymentUrl, "_blank");
}
