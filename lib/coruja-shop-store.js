const { createHmac, randomUUID, timingSafeEqual } = require("node:crypto");

const defaultEnvironment = "test";

const products = {
  "cobbledollars_1m": {
    sku: "cobbledollars_1m",
    title: "1 mi CobbleDollars",
    amount: 10,
    currency: "BRL",
    cobbleDollars: 1000000,
    command: "eco give {nick} 1000000",
  },
  "cobbledollars_5m": {
    sku: "cobbledollars_5m",
    title: "5 mi CobbleDollars",
    amount: 30,
    currency: "BRL",
    cobbleDollars: 5000000,
    command: "eco give {nick} 5000000",
  },
  "cobbledollars_10m": {
    sku: "cobbledollars_10m",
    title: "10 mi CobbleDollars",
    amount: 40,
    currency: "BRL",
    cobbleDollars: 10000000,
    command: "eco give {nick} 10000000",
  },
};

const json = (response, body, status = 200) => {
  response.status(status).setHeader("Cache-Control", "no-store").json(body);
};

const sanitizeText = (value, maxLength = 120) => String(value || "")
  .trim()
  .replace(/\s+/g, " ")
  .slice(0, maxLength);

const sanitizeMinecraftNick = (value) => {
  const nick = sanitizeText(value, 24);
  return /^[A-Za-z0-9_]{3,16}$/.test(nick) ? nick : "";
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

const pendingDeliveries = async () => {
  const rows = await listJson(`${prefix()}/deliveries/`);
  return rows
    .filter((row) => row.status === "paid_pending_delivery")
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
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
  const authorization = request.headers.authorization || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return bearer && bearer === process.env.SHOP_DELIVERY_SECRET;
};

const verifyMercadoPagoSignature = (request) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    const error = new Error("MERCADOPAGO_WEBHOOK_SECRET ainda nao esta configurado.");
    error.statusCode = 503;
    throw error;
  }

  const xSignature = request.headers["x-signature"];
  const xRequestId = request.headers["x-request-id"];
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
  getProduct,
  handleError,
  isAuthorizedDeliveryRequest,
  json,
  markClaimed,
  markDelivered,
  pendingDeliveries,
  products,
  sanitizeMinecraftNick,
  sanitizeText,
  updateOrder,
  verifyMercadoPagoSignature,
};
