import "dotenv/config";
import express from "express";
import crypto from "crypto";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-01";
import paymentRoutes from "./routes/payment.js";

// ---------------------------------------------------------------------------
// Shopify API setup
// ---------------------------------------------------------------------------
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: (process.env.SHOPIFY_SCOPES || "write_payment_gateways,read_orders").split(","),
  hostName: (process.env.SHOPIFY_APP_URL || "").replace(/^https?:\/\//, ""),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  restResources,
});

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Raw body for webhook signature verification
app.use("/payment/webhook", express.raw({ type: "application/json" }), (req, _res, next) => {
  // Parse the raw body for downstream handlers
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body;
    req.body = JSON.parse(req.body.toString("utf8"));
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ---------------------------------------------------------------------------
// Shopify OAuth
// ---------------------------------------------------------------------------

/**
 * GET /auth
 * Starts the Shopify OAuth flow.
 */
app.get("/auth", async (req, res) => {
  const shop = req.query.shop;
  if (!shop) {
    return res.status(400).send("Missing shop parameter");
  }

  const authRoute = await shopify.auth.begin({
    shop,
    callbackPath: "/auth/callback",
    isOnline: false,
    rawRequest: req,
    rawResponse: res,
  });
});

/**
 * GET /auth/callback
 * Completes the OAuth flow and stores the session.
 */
app.get("/auth/callback", async (req, res) => {
  try {
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callback;

    // Store session — in production use a persistent session storage
    console.log(`[OAuth] Session created for shop: ${session.shop}`);

    // Register webhooks
    await registerWebhooks(session);

    // Redirect to Shopify admin
    const host = req.query.host;
    res.redirect(`/?shop=${session.shop}&host=${host}`);
  } catch (err) {
    console.error("[OAuth] Callback error:", err);
    res.status(500).send("OAuth failed");
  }
});

/**
 * Register required webhooks with Shopify.
 */
async function registerWebhooks(session) {
  try {
    const response = await shopify.webhooks.register({
      session,
    });
    console.log("[Webhooks] Registration result:", JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("[Webhooks] Registration error:", err);
  }
}

// ---------------------------------------------------------------------------
// Shopify webhook verification middleware
// ---------------------------------------------------------------------------
function verifyShopifyWebhook(req, res, next) {
  const hmacHeader = req.headers["x-shopify-hmac-sha256"];
  if (!hmacHeader || !req.rawBody) {
    return next(); // Skip verification if no HMAC or rawBody
  }

  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(req.rawBody)
    .digest("base64");

  if (generatedHmac !== hmacHeader) {
    console.warn("[Webhook] Invalid HMAC signature");
    return res.status(401).send("Unauthorized");
  }

  next();
}

// ---------------------------------------------------------------------------
// Payment routes
// ---------------------------------------------------------------------------
app.use("/payment", verifyShopifyWebhook, paymentRoutes);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "venepagos-shopify",
    checkoutMode: process.env.VENEPAGOS_CHECKOUT_MODE || "redirect",
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Root — embedded app landing
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
  const shop = req.query.shop;
  if (!shop) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>VenePagos para Shopify</title></head>
        <body>
          <h1>VenePagos para Shopify</h1>
          <p>Instala esta app desde tu panel de Shopify Partners.</p>
        </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>VenePagos - Configuracion</title>
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      </head>
      <body>
        <div id="app">
          <h1>VenePagos</h1>
          <p>Pasarela de pagos VenePagos configurada correctamente.</p>
          <h2>Configuracion actual</h2>
          <ul>
            <li><strong>Modo de checkout:</strong> ${process.env.VENEPAGOS_CHECKOUT_MODE || "redirect"}</li>
            <li><strong>Merchant ID:</strong> ${process.env.VENEPAGOS_MERCHANT_ID || "No configurado"}</li>
          </ul>
          <p>Los pagos se procesaran automaticamente cuando un cliente seleccione VenePagos en el checkout.</p>
        </div>
        <script>
          var AppBridge = window['app-bridge'];
          var app = AppBridge.createApp({
            apiKey: '${process.env.SHOPIFY_API_KEY}',
            host: new URLSearchParams(location.search).get('host'),
          });
        </script>
      </body>
    </html>
  `);
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[VenePagos Shopify] Server running on port ${PORT}`);
  console.log(`[VenePagos Shopify] Checkout mode: ${process.env.VENEPAGOS_CHECKOUT_MODE || "redirect"}`);
  console.log(`[VenePagos Shopify] VenePagos API: ${process.env.VENEPAGOS_API_URL || "not configured"}`);
});

export default app;
