const {
  ensureMercadoPagoConfig,
  getProduct,
  sanitizeText,
} = require("./coruja-shop-store");

const mercadoPagoFetch = async (path, options = {}) => {
  ensureMercadoPagoConfig();

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = new Error(body.message || "Erro na API do Mercado Pago.");
    error.statusCode = response.status >= 500 ? 502 : 400;
    error.details = body;
    throw error;
  }

  return body;
};

const getSiteUrl = (request) => {
  const configured = sanitizeText(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL, 180);
  if (configured) return configured.replace(/\/+$/, "");

  const protocol = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  return `${protocol}://${host}`.replace(/\/+$/, "");
};

const buildNotificationUrl = (siteUrl) => {
  const url = new URL(`${siteUrl}/api/shop/webhook/mercadopago`);
  const bypass = sanitizeText(process.env.VERCEL_AUTOMATION_BYPASS_SECRET, 220);

  if (bypass && url.hostname.endsWith(".vercel.app")) {
    url.searchParams.set("x-vercel-protection-bypass", bypass);
  }

  return url.toString();
};

const createPreference = async ({ order, request }) => {
  const product = getProduct(order.sku);
  const siteUrl = getSiteUrl(request);

  return mercadoPagoFetch("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      external_reference: order.id,
      notification_url: buildNotificationUrl(siteUrl),
      back_urls: {
        success: `${siteUrl}/?shop=success&order=${encodeURIComponent(order.id)}`,
        failure: `${siteUrl}/?shop=failure&order=${encodeURIComponent(order.id)}`,
        pending: `${siteUrl}/?shop=pending&order=${encodeURIComponent(order.id)}`,
      },
      auto_return: "approved",
      metadata: {
        order_id: order.id,
        sku: order.sku,
        minecraft_nick: order.minecraftNick,
        cobbledollars: order.cobbleDollars,
      },
      items: [{
        id: product.sku,
        title: product.title,
        description: `CobbleDollars para ${order.minecraftNick} na Toca da Coruja`,
        quantity: 1,
        unit_price: product.amount,
        currency_id: product.currency,
      }],
      payer: {
        name: order.minecraftNick,
      },
    }),
  });
};

const getPayment = async (paymentId) => mercadoPagoFetch(`/v1/payments/${encodeURIComponent(paymentId)}`);

module.exports = {
  createPreference,
  getPayment,
};
