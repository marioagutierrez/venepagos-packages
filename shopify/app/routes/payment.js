import { Router } from "express";
import crypto from "crypto";
import VenePagosAPI from "../venepagos-api.js";

const router = Router();

const venepagos = new VenePagosAPI({
  baseUrl: process.env.VENEPAGOS_API_URL,
  apiKey: process.env.VENEPAGOS_API_KEY,
});

const MERCHANT_ID = process.env.VENEPAGOS_MERCHANT_ID;
const APP_URL = process.env.SHOPIFY_APP_URL;
const CHECKOUT_MODE = process.env.VENEPAGOS_CHECKOUT_MODE || "redirect";

/**
 * In-memory store mapping VenePagos payment tokens to Shopify payment session data.
 * In production, replace with a database or Redis.
 */
const paymentSessions = new Map();

// ---------------------------------------------------------------------------
// POST /payment/create
// Called by Shopify when a customer selects VenePagos at checkout.
// Receives the Shopify payment session and creates a VenePagos payment link.
// ---------------------------------------------------------------------------
router.post("/create", async (req, res) => {
  try {
    const {
      id: shopifyPaymentId,
      gid,
      group,
      amount,
      currency,
      test,
      kind,
      customer,
      payment_method: paymentMethod,
      proposed_at: proposedAt,
    } = req.body;

    const description = `Shopify Order - ${shopifyPaymentId}`;

    // Expiration: 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const paymentLink = await venepagos.createPaymentLink({
      merchantId: MERCHANT_ID,
      amount: parseFloat(amount),
      currency: currency || "USD",
      description,
      expiresAt,
    });

    // Store session mapping
    paymentSessions.set(paymentLink.token, {
      shopifyPaymentId,
      gid,
      group,
      amount,
      currency,
      test,
      kind,
      paymentLinkId: paymentLink.id,
      token: paymentLink.token,
      createdAt: new Date().toISOString(),
    });

    const paymentUrl = paymentLink.url;
    const returnUrl = `${APP_URL}/payment/complete?token=${paymentLink.token}`;

    // Respond based on checkout mode
    if (CHECKOUT_MODE === "redirect") {
      // Shopify Payments App API: return redirect_url for the customer
      return res.json({
        redirect_url: `${paymentUrl}?returnUrl=${encodeURIComponent(returnUrl)}`,
      });
    }

    // For popup/newTab modes, return the payment URL for the extension to handle
    return res.json({
      redirect_url: `${paymentUrl}?returnUrl=${encodeURIComponent(returnUrl)}`,
      payment_url: paymentUrl,
      return_url: returnUrl,
      token: paymentLink.token,
      mode: CHECKOUT_MODE,
    });
  } catch (err) {
    console.error("[VenePagos] Error creating payment session:", err);
    return res.status(502).json({
      error: "Failed to create VenePagos payment",
      message: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /payment/complete
// Return URL after VenePagos checkout. Resolves the Shopify payment session.
// ---------------------------------------------------------------------------
router.get("/complete", async (req, res) => {
  try {
    const { token, status } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Missing token parameter" });
    }

    const session = paymentSessions.get(token);
    if (!session) {
      return res.status(404).json({ error: "Payment session not found" });
    }

    // Verify payment status with VenePagos
    const paymentInfo = await venepagos.getPaymentInfo(token);

    const paymentResolved = status === "success" || paymentInfo.status === "completed";

    // Clean up session
    paymentSessions.delete(token);

    if (paymentResolved) {
      // Resolve the Shopify payment session as successful
      return res.redirect(
        `/payment/resolve?gid=${encodeURIComponent(session.gid)}&status=resolve`
      );
    }

    // Payment was not completed
    return res.redirect(
      `/payment/resolve?gid=${encodeURIComponent(session.gid)}&status=reject&reason=payment_not_completed`
    );
  } catch (err) {
    console.error("[VenePagos] Error completing payment:", err);
    return res.status(500).json({
      error: "Failed to complete payment",
      message: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /payment/resolve
// Renders a page that communicates back to Shopify checkout.
// ---------------------------------------------------------------------------
router.get("/resolve", (req, res) => {
  const { gid, status, reason } = req.query;

  // This page sends a postMessage to the Shopify checkout parent window
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>VenePagos - Procesando pago</title></head>
      <body>
        <p>Procesando tu pago... por favor espera.</p>
        <script>
          (function() {
            var data = {
              gid: "${gid}",
              status: "${status}",
              reason: "${reason || ""}"
            };
            if (window.opener) {
              window.opener.postMessage(data, "*");
              window.close();
            } else if (window.parent !== window) {
              window.parent.postMessage(data, "*");
            } else {
              // Redirect mode: Shopify handles this via the payment session API
              window.location.href = "/";
            }
          })();
        </script>
      </body>
    </html>
  `);
});

// ---------------------------------------------------------------------------
// POST /payment/webhook
// Webhook from VenePagos when a payment status changes.
// ---------------------------------------------------------------------------
router.post("/webhook", async (req, res) => {
  try {
    // Verify webhook signature if provided
    const signature = req.headers["x-venepagos-signature"];
    if (signature) {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.VENEPAGOS_API_KEY)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (signature !== expectedSignature) {
        console.warn("[VenePagos] Invalid webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const { event, data } = req.body;

    console.log(`[VenePagos] Webhook received: ${event}`, data);

    switch (event) {
      case "payment.completed": {
        const session = paymentSessions.get(data.token);
        if (session) {
          console.log(
            `[VenePagos] Payment completed for Shopify session: ${session.shopifyPaymentId}`
          );
          paymentSessions.delete(data.token);
        }
        break;
      }

      case "payment.failed": {
        const session = paymentSessions.get(data.token);
        if (session) {
          console.log(
            `[VenePagos] Payment failed for Shopify session: ${session.shopifyPaymentId}`
          );
          paymentSessions.delete(data.token);
        }
        break;
      }

      case "payment.expired": {
        const session = paymentSessions.get(data.token);
        if (session) {
          console.log(
            `[VenePagos] Payment expired for Shopify session: ${session.shopifyPaymentId}`
          );
          paymentSessions.delete(data.token);
        }
        break;
      }

      default:
        console.log(`[VenePagos] Unhandled webhook event: ${event}`);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[VenePagos] Webhook processing error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
