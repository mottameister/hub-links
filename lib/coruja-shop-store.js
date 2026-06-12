const { createHmac, randomUUID, timingSafeEqual } = require("node:crypto");

const defaultEnvironment = "test";

const products = {
  "cobbledollars_1m": {
    sku: "cobbledollars_1m",
    title: "1 mi CobbleDollars",
    amount: 10,
    currency: "BRL",
    cobbleDollars: 1000000,
    command: "cobbledollars give {nick} 1000000",
  },
  "cobbledollars_5m": {
    sku: "cobbledollars_5m",
    title: "5 mi CobbleDollars",
    amount: 30,
    currency: "BRL",
    cobbleDollars: 5000000,
    command: "cobbledollars give {nick} 5000000",
  },
  "cobbledollars_10m": {
    sku: "cobbledollars_10m",
    title: "10 mi CobbleDollars",
    amount: 40,
    currency: "BRL",
    cobbleDollars: 10000000,
    command: "cobbledollars give {nick} 10000000",
  },
};

const json = (response, body, status = 200) => {
  response.status(status).setHeader("Cache-Control", "no-store").json(body);
};

const getHeader = (request, name) => {
  const headers = request.headers || {};
  const lowerName = String(name).toLowerCase();
  const direct = headers[name] || headers[lowerName];
  if (direct) return Array.isArray(direct) ? direct[0] : direct;

  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === lowerName);
  const value = matchedKey ? headers[matchedKey] : "";
  return Array.isArray(value) ? value[0] : value;
};

const sanitizeText = (value, maxLength = 120) => String(value || "")
  .trim()
  .replace(/\s+/g, " ")
  .slice(0, maxLength);

const sanitizeMinecraftNick = (value) => {
  const nick = sanitizeText(value, 24);
  return /^[A-Za-z0-9_]{3,16}$/.test(nick) ? nick : "";
};

const safeEqual = (received, expected) => {
  const left = Buffer.from(String(received || ""));
  const right = Buffer.from(String(expected || ""));
  return left.length === right.length && timingSafeEqual(left, right);
};

const parseJsonBody = (request) => {
  try {
    if (typeof request.body === "string") return JSON.parse(request.body || "{}");
    return request.body || {};
  } catch {
    const error = new Error("JSON invalido.");
    error.statusCode = 400;
    throw error;
  }
};

const validateMinecraftProfile = async (nick) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(nick)}`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    );

    if (response.status === 404) {
      const error = new Error("Esse nick nao existe em uma conta Minecraft original.");
      error.statusCode = 400;
      throw error;
    }

    if (!response.ok) {
      const error = new Error("Nao foi possivel validar o nick na Mojang agora. Tente novamente em alguns instantes.");
      error.statusCode = response.status >= 500 ? 503 : 400;
      throw error;
    }

    const profile = await response.json();
    if (!profile || !profile.id || !profile.name) {
      const error = new Error("A Mojang nao retornou um perfil valido para esse nick.");
      error.statusCode = 400;
      throw error;
    }

    return {
      id: sanitizeText(profile.id, 40),
      name: sanitizeMinecraftNick(profile.name),
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("A validacao do nick demorou demais. Tente novamente em alguns instantes.");
      timeoutError.statusCode = 503;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const getProduct = (sku) => products[String(sku || "")] || null;

const getEnvironment = () => sanitizeText(process.env.SHOP_ENV || defaultEnvironment, 24) || defaultEnvironment;

const prefix = () => `coruja-shop/${getEnvironment()}`;

const orderPath = (orderId) => `${prefix()}/orders/${orderId}.json`;
const deliveryPath = (orderId) => `${prefix()}/deliveries/${orderId}.json`;

const ensureBlobConfig = () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const error = new Error("Vercel Blob ainda nao esta configurado.");
    error.statusCode = 503;
    throw error;
  }
};

const ensureMercadoPagoConfig = () => {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    const error = new Error("Mercado Pago ainda nao esta configurado.");
    error.statusCode = 503;
    throw error;
  }
};

const ensureDeliverySecret = () => {
  if (!process.env.SHOP_DELIVERY_SECRET) {
    const error = new Error("SHOP_DELIVERY_SECRET ainda nao esta configurado.");
    error.statusCode = 503;
    throw error;
  }
};

const getShopAdminSecret = () => process.env.SHOP_ADMIN_TOKEN || process.env.CORUJA_CUP_ADMIN_TOKEN || "";

const ensureShopAdminSecret = () => {
  if (!getShopAdminSecret()) {
    const error = new Error("SHOP_ADMIN_TOKEN ou CORUJA_CUP_ADMIN_TOKEN ainda nao esta configurado.");
    error.statusCode = 503;
    throw error;
  }
};

const streamToText = async (stream) => {
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return text;
};

const readJson = async (path, fallback = null) => {
  ensureBlobConfig();
  const { get } = await import("@vercel/blob");

  try {
    const blob = await get(path, { access: "private" });
    const raw = await streamToText(blob && blob.stream);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    if (error && (error.name === "BlobNotFoundError" || String(error.message || "").includes("does not exist"))) {
      return fallback;
    }
    throw error;
  }
};

const writeJson = async (path, data) => {
  ensureBlobConfig();
  const { put } = await import("@vercel/blob");

  await put(path, JSON.stringify(data, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
  });
};

const listJson = async (pathPrefix) => {
  ensureBlobConfig();
  const { list } = await import("@vercel/blob");
  const rows = [];
  let cursor;

  do {
    const page = await list({ prefix: pathPrefix, cursor, limit: 1000 });
    for (const blob of page.blobs || []) {
      const path = blob.pathname || blob.url;
      if (path) rows.push(await readJson(path, null));
    }
    cursor = page.cursor;
  } while (cursor);

  return rows.filter(Boolean);
};

const createOrder = async ({ sku, minecraftNick, discordName, request }) => {
  const product = getProduct(sku);
  if (!product) {
    const error = new Error("Produto invalido.");
    error.statusCode = 400;
    throw error;
  }

  const cleanNick = sanitizeMinecraftNick(minecraftNick);
  if (!cleanNick) {
    const error = new Error("Nick do Minecraft invalido.");
    error.statusCode = 400;
    throw error;
  }

  const minecraftProfile = await validateMinecraftProfile(cleanNick);

  const now = new Date().toISOString();
  const orderId = randomUUID();
  const order = {
    id: orderId,
    status: "created",
    sku: product.sku,
    productTitle: product.title,
    amount: product.amount,
    currency: product.currency,
    cobbleDollars: product.cobbleDollars,
    minecraftNick: minecraftProfile.name || cleanNick,
    minecraftUuid: minecraftProfile.id,
    discordName: sanitizeText(discordName, 80),
    mercadoPagoPreferenceId: null,
    mercadoPagoPaymentId: null,
    createdAt: now,
    updatedAt: now,
    requester: {
      ip: sanitizeText(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "", 180),
      userAgent: sanitizeText(request.headers["user-agent"], 220),
    },
  };

  await writeJson(orderPath(orderId), order);
  return order;
};

const updateOrder = async (orderId, patch) => {
  const current = await readJson(orderPath(orderId), null);
  if (!current) {
    const error = new Error("Pedido nao encontrado.");
    error.statusCode = 404;
    throw error;
  }

  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(orderPath(orderId), next);
  return next;
};

const getOrder = async (orderId) => {
  const order = await readJson(orderPath(orderId), null);
  if (!order) {
    const error = new Error("Pedido nao encontrado.");
    error.statusCode = 404;
    throw error;
  }
  return order;
};

const createDeliveryIfNeeded = async ({ order, payment }) => {
  const existing = await readJson(deliveryPath(order.id), null);
  if (existing) return existing;

  const product = getProduct(order.sku);
  const command = product.command.replace("{nick}", order.minecraftNick);
  const delivery = {
    id: order.id,
    orderId: order.id,
    status: "paid_pending_delivery",
    sku: order.sku,
    minecraftNick: order.minecraftNick,
    cobbleDollars: order.cobbleDollars,
    command,
    paymentId: String(payment.id || order.mercadoPagoPaymentId || ""),
    createdAt: new Date().toISOString(),
    deliveredAt: null,
    deliveryLog: null,
  };

  await writeJson(deliveryPath(order.id), delivery);
  return delivery;
};

const paymentExternalReference = (payment) => sanitizeText(
  payment.external_reference || payment.metadata?.order_id || "",
  100,
);

const paymentBelongsToOrder = ({ order, payment }) => paymentExternalReference(payment) === order.id;

const applyApprovedPayment = async ({ order, payment }) => {
  const product = getProduct(order.sku);
  const paidAmount = Number(payment.transaction_amount);
  const isApproved = payment.status === "approved";
  const belongsToOrder = paymentBelongsToOrder({ order, payment });
  const hasExpectedAmount = paidAmount === Number(product.amount);
  const hasExpectedCurrency = payment.currency_id === product.currency;

  if (!belongsToOrder) {
    const nextOrder = await updateOrder(order.id, {
      status: "payment_reference_mismatch",
      paymentValidation: {
        paymentId: String(payment.id || ""),
        paymentExternalReference: paymentExternalReference(payment),
        expectedOrderId: order.id,
      },
    });

    return {
      order: nextOrder,
      delivery: null,
      delivered: false,
      validation: nextOrder.paymentValidation,
    };
  }

  await updateOrder(order.id, {
    mercadoPagoPaymentId: String(payment.id || order.mercadoPagoPaymentId || ""),
    lastPaymentStatus: payment.status || null,
  });

  if (!isApproved || !hasExpectedAmount || !hasExpectedCurrency) {
    const nextOrder = await updateOrder(order.id, {
      status: isApproved ? "payment_review_required" : `payment_${payment.status || "unknown"}`,
      paymentValidation: {
        paidAmount,
        expectedAmount: product.amount,
        currency: payment.currency_id,
        expectedCurrency: product.currency,
      },
    });

    return {
      order: nextOrder,
      delivery: null,
      delivered: false,
      validation: nextOrder.paymentValidation,
    };
  }

  const paidOrder = await updateOrder(order.id, {
    status: "paid_pending_delivery",
    mercadoPagoPaymentId: String(payment.id || order.mercadoPagoPaymentId || ""),
    paidAt: payment.date_approved || new Date().toISOString(),
  });
  const delivery = await createDeliveryIfNeeded({ order: paidOrder, payment });
  if (delivery.status !== "paid_pending_delivery") {
    await updateOrder(paidOrder.id, { status: delivery.status });
  }

  return {
    order: paidOrder,
    delivery,
    delivered: false,
    validation: null,
  };
};

const pendingDeliveries = async () => {
  const rows = await listJson(`${prefix()}/deliveries/`);
  return rows
    .filter((row) => row.status === "paid_pending_delivery")
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
};

const listOrders = async ({ includeArchived = false } = {}) => {
  const orders = await listJson(`${prefix()}/orders/`);
  const deliveries = await listJson(`${prefix()}/deliveries/`);
  const deliveriesByOrder = new Map(deliveries.map((delivery) => [delivery.orderId, delivery]));

  return orders
    .filter((order) => includeArchived || !order.archivedAt)
    .map((order) => {
      const delivery = deliveriesByOrder.get(order.id) || null;
      return {
        id: order.id,
        status: order.status,
        sku: order.sku,
        productTitle: order.productTitle,
        amount: order.amount,
        currency: order.currency,
        cobbleDollars: order.cobbleDollars,
        minecraftNick: order.minecraftNick,
        minecraftUuid: order.minecraftUuid || "",
        discordName: order.discordName || "",
        mercadoPagoPreferenceId: order.mercadoPagoPreferenceId || "",
        mercadoPagoPaymentId: order.mercadoPagoPaymentId || "",
        lastPaymentStatus: order.lastPaymentStatus || "",
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        paidAt: order.paidAt || "",
        archivedAt: order.archivedAt || "",
        archiveReason: order.archiveReason || "",
        deliveryStatus: delivery?.status || "",
        deliveryCommand: delivery?.command || "",
        deliveredAt: delivery?.deliveredAt || "",
        deliveryLog: delivery?.deliveryLog || "",
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
};

const archiveUnpaidTestOrders = async ({ keepOrderIds = [], keepMinecraftNicks = [], reason = "admin cleanup" }) => {
  const keepIds = new Set(keepOrderIds.map((value) => sanitizeText(value, 80)).filter(Boolean));
  const keepNicks = new Set(keepMinecraftNicks.map((value) => sanitizeMinecraftNick(value)).filter(Boolean));
  const orders = await listJson(`${prefix()}/orders/`);
  const archived = [];

  for (const order of orders) {
    if (order.archivedAt) continue;
    if (keepIds.has(order.id)) continue;
    if (keepNicks.has(order.minecraftNick)) continue;
    if (order.mercadoPagoPaymentId || order.paidAt) continue;
    if (!["created", "checkout_created"].includes(order.status)) continue;

    const nextOrder = await updateOrder(order.id, {
      archivedAt: new Date().toISOString(),
      archiveReason: sanitizeText(reason, 120),
    });
    archived.push(nextOrder);
  }

  return archived;
};

const markClaimed = async ({ orderId, workerId }) => {
  const delivery = await readJson(deliveryPath(orderId), null);
  if (!delivery) {
    const error = new Error("Entrega nao encontrada.");
    error.statusCode = 404;
    throw error;
  }

  if (delivery.status !== "paid_pending_delivery") {
    const error = new Error("Entrega nao esta pendente.");
    error.statusCode = 409;
    throw error;
  }

  const nextDelivery = {
    ...delivery,
    status: "delivering",
    claimedAt: new Date().toISOString(),
    workerId: sanitizeText(workerId, 80),
  };
  await writeJson(deliveryPath(orderId), nextDelivery);
  await updateOrder(orderId, { status: "delivering" });
  return nextDelivery;
};

const markDelivered = async ({ orderId, deliveryLog }) => {
  const delivery = await readJson(deliveryPath(orderId), null);
  if (!delivery) {
    const error = new Error("Entrega nao encontrada.");
    error.statusCode = 404;
    throw error;
  }

  if (delivery.status === "delivered") {
    return delivery;
  }

  if (delivery.status !== "delivering") {
    const error = new Error("Entrega precisa estar em processamento antes de ser concluida.");
    error.statusCode = 409;
    throw error;
  }

  const nextDelivery = {
    ...delivery,
    status: "delivered",
    deliveredAt: new Date().toISOString(),
    deliveryLog: sanitizeText(deliveryLog, 500),
  };
  await writeJson(deliveryPath(orderId), nextDelivery);
  await updateOrder(orderId, { status: "delivered" });
  return nextDelivery;
};

const isAuthorizedDeliveryRequest = (request) => {
  ensureDeliverySecret();
  const customSecret = getHeader(request, "x-shop-delivery-secret");
  if (customSecret) return safeEqual(customSecret, process.env.SHOP_DELIVERY_SECRET);

  const authorization = getHeader(request, "authorization");
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return safeEqual(bearer, process.env.SHOP_DELIVERY_SECRET);
};

const isAuthorizedShopAdminRequest = (request) => {
  ensureShopAdminSecret();
  const customSecret = getHeader(request, "x-shop-admin-token");
  if (customSecret) return safeEqual(customSecret, getShopAdminSecret());

  const authorization = getHeader(request, "authorization");
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return safeEqual(bearer, getShopAdminSecret());
};

const verifyMercadoPagoSignature = (request) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    const error = new Error("MERCADOPAGO_WEBHOOK_SECRET ainda nao esta configurado.");
    error.statusCode = 503;
    throw error;
  }

  const xSignature = getHeader(request, "x-signature");
  const xRequestId = getHeader(request, "x-request-id");
  const dataId = sanitizeText(
    request.query?.["data.id"] || request.query?.id || request.body?.data?.id || request.body?.id,
    80,
  ).toLowerCase();

  if (!xSignature || !xRequestId || !dataId) {
    return false;
  }

  const parts = String(xSignature).split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = parts.v1;

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
  } catch {
    return false;
  }
};

const handleError = (response, error, fallback = "Nao foi possivel processar a lojinha agora.") => {
  const status = error.statusCode || 500;
  const message = status >= 500 ? fallback : error.message;
  json(response, { error: message }, status);
};

module.exports = {
  createDeliveryIfNeeded,
  createOrder,
  ensureMercadoPagoConfig,
  archiveUnpaidTestOrders,
  getOrder,
  getHeader,
  getProduct,
  handleError,
  isAuthorizedDeliveryRequest,
  isAuthorizedShopAdminRequest,
  json,
  listOrders,
  markClaimed,
  markDelivered,
  pendingDeliveries,
  paymentBelongsToOrder,
  paymentExternalReference,
  parseJsonBody,
  products,
  safeEqual,
  sanitizeMinecraftNick,
  sanitizeText,
  applyApprovedPayment,
  updateOrder,
  verifyMercadoPagoSignature,
};
