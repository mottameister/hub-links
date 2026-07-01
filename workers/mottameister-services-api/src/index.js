const defaultEnvironment = "test";
const maxCheckoutQuantity = 10;

const products = {
  cobbledollars_1m: {
    sku: "cobbledollars_1m",
    title: "1 mi CobbleDollars",
    type: "cobbledollars",
    amount: 10,
    currency: "BRL",
    cobbleDollars: 1000000,
    command: "cobbledollars give {nick} 1000000",
  },
  cobbledollars_5m: {
    sku: "cobbledollars_5m",
    title: "5 mi CobbleDollars",
    type: "cobbledollars",
    amount: 30,
    currency: "BRL",
    cobbleDollars: 5000000,
    command: "cobbledollars give {nick} 5000000",
  },
  cobbledollars_10m: {
    sku: "cobbledollars_10m",
    title: "10 mi CobbleDollars",
    type: "cobbledollars",
    amount: 40,
    currency: "BRL",
    cobbleDollars: 10000000,
    command: "cobbledollars give {nick} 10000000",
  },
  claims_5: {
    sku: "claims_5",
    title: "5 Claims",
    type: "opac_claim_bonus",
    amount: 10,
    currency: "BRL",
    cobbleDollars: 0,
    claimChunks: 5,
    command: "opac-claims add {nick} 5",
  },
  claims_12: {
    sku: "claims_12",
    title: "12 Claims",
    type: "opac_claim_bonus",
    amount: 20,
    currency: "BRL",
    cobbleDollars: 0,
    claimChunks: 12,
    command: "opac-claims add {nick} 12",
  },
  claims_30: {
    sku: "claims_30",
    title: "30 Claims",
    type: "opac_claim_bonus",
    amount: 40,
    currency: "BRL",
    cobbleDollars: 0,
    claimChunks: 30,
    command: "opac-claims add {nick} 30",
  },
};

const fallbackLeaderboard = [
  { rank: 1, name: "jotinha7b", amount: "11.6M" },
  { rank: 2, name: "Muniz_XD", amount: "10M" },
  { rank: 3, name: "Marru_XD", amount: "10M" },
  { rank: 4, name: "yRuizx", amount: "1.07M" },
  { rank: 5, name: "Shyad0u", amount: "878K" },
  { rank: 6, name: "Fortalzera", amount: "567K" },
  { rank: 7, name: "Fethr7350", amount: "323K" },
  { rank: 8, name: "yLoorenzoo", amount: "277K" },
  { rank: 9, name: "BiggieSm4llz", amount: "261K" },
  { rank: 10, name: "Miquesl", amount: "215K" },
];

const allowedOrigins = new Set([
  "https://mottameister.xyz",
  "https://www.mottameister.xyz",
  "http://localhost:3000",
  "http://localhost:5173",
]);

const json = (body, status = 200, request = null) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders(request),
  },
});

const corsHeaders = (request) => {
  const origin = request ? request.headers.get("origin") : "";
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization,content-type,x-shop-admin-token,x-shop-delivery-secret",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
};

const sanitizeText = (value, maxLength = 180) => String(value || "")
  .trim()
  .replace(/\s+/g, " ")
  .slice(0, maxLength);

const sanitizeMinecraftNick = (value) => {
  const nick = sanitizeText(value, 24);
  return /^[A-Za-z0-9_]{3,16}$/.test(nick) ? nick : "";
};

const getEnvironment = (env) => sanitizeText(env.SHOP_ENV || defaultEnvironment, 24) || defaultEnvironment;

const getProduct = (sku) => products[String(sku || "")] || null;

const parseCheckoutQuantity = (value) => {
  const quantity = Number(value ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxCheckoutQuantity) {
    throw Object.assign(new Error(`Quantidade deve ser entre 1 e ${maxCheckoutQuantity}.`), { statusCode: 400 });
  }
  return quantity;
};

const getOrderQuantity = (order, product) => {
  const savedQuantity = Number(order.paymentValidation?.quantity || 0);
  if (Number.isInteger(savedQuantity) && savedQuantity > 0) return savedQuantity;

  const unitAmount = Number(product?.amount || 0);
  const orderAmount = Number(order.amount || 0);
  const amountQuantity = unitAmount > 0 ? orderAmount / unitAmount : 1;
  if (Number.isInteger(amountQuantity) && amountQuantity > 0) return amountQuantity;

  return 1;
};

const getOrderClaimChunks = (order, product) => {
  const savedChunks = Number(order.paymentValidation?.claimChunks || 0);
  if (Number.isInteger(savedChunks) && savedChunks > 0) return savedChunks;
  return Number(product?.claimChunks || 0) * getOrderQuantity(order, product);
};

const getOrderDeliveryCommand = (order, product) => {
  if (product.type === "cobbledollars") {
    const totalCobbleDollars = Number(order.cobbleDollars || product.cobbleDollars || 0);
    return `cobbledollars give ${order.minecraftNick} ${totalCobbleDollars}`;
  }

  if (product.type === "opac_claim_bonus") {
    return `opac-claims add ${order.minecraftNick} ${getOrderClaimChunks(order, product)}`;
  }

  return product.command.replace("{nick}", order.minecraftNick);
};

const normalizeCoupon = (value) => sanitizeText(value, 80).toUpperCase();

const parseTestCouponPairs = (env) => {
  const pairs = [];
  const legacyCoupon = normalizeCoupon(env.SHOP_TEST_COUPON);
  const legacySku = sanitizeText(env.SHOP_TEST_COUPON_SKU || "cobbledollars_1m", 80);
  if (legacyCoupon && legacySku) pairs.push({ coupon: legacyCoupon, sku: legacySku });

  // Keep supporting one secret that maps multiple test coupons to SKUs.
  const raw = String(env.SHOP_TEST_COUPONS || "").trim();
  if (!raw) return pairs;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const coupon = normalizeCoupon(item?.coupon || item?.code);
        const sku = sanitizeText(item?.sku, 80);
        if (coupon && sku) pairs.push({ coupon, sku });
      }
      return pairs;
    }

    if (parsed && typeof parsed === "object") {
      for (const [couponValue, skuValue] of Object.entries(parsed)) {
        const coupon = normalizeCoupon(couponValue);
        const sku = sanitizeText(skuValue, 80);
        if (coupon && sku) pairs.push({ coupon, sku });
      }
      return pairs;
    }
  } catch {}

  for (const line of raw.split(/\r?\n|,/)) {
    const match = line.trim().match(/^([^:=]+)\s*[:=]\s*(\S+)$/);
    if (!match) continue;
    const coupon = normalizeCoupon(match[1]);
    const sku = sanitizeText(match[2], 80);
    if (coupon && sku) pairs.push({ coupon, sku });
  }

  return pairs;
};

const validateTestCoupon = async (payload, env) => {
  const coupon = normalizeCoupon(payload.coupon);
  if (!coupon) return "";
  const pairs = parseTestCouponPairs(env);
  let matched = null;
  for (const pair of pairs) {
    if (await isSafeEqual(coupon, pair.coupon)) {
      matched = pair;
      break;
    }
  }

  if (!matched) {
    throw Object.assign(new Error("Cupom invalido."), { statusCode: 400 });
  }
  if (String(payload.sku || "") !== matched.sku) {
    throw Object.assign(new Error(`Cupom de teste disponivel apenas para ${matched.sku}.`), { statusCode: 400 });
  }
  return coupon;
};

const parseBody = async (request) => {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("JSON invalido.");
    error.statusCode = 400;
    throw error;
  }
};

const errorResponse = (error, request, fallback = "Nao foi possivel processar agora.") => {
  const status = error.statusCode || 500;
  return json({ error: status >= 500 ? fallback : error.message }, status, request);
};

const jsonParse = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const isSafeEqual = async (received, expected) => {
  const left = new TextEncoder().encode(String(received || ""));
  const right = new TextEncoder().encode(String(expected || ""));
  const leftHash = new Uint8Array(await crypto.subtle.digest("SHA-256", left));
  const rightHash = new Uint8Array(await crypto.subtle.digest("SHA-256", right));
  let diff = left.length === right.length ? 0 : 1;
  for (let index = 0; index < leftHash.length; index += 1) diff |= leftHash[index] ^ rightHash[index];
  return diff === 0;
};

const bearerToken = (request) => {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
};

const deliverySecret = (request) => request.headers.get("x-shop-delivery-secret") || bearerToken(request);

const adminSecret = (request) => request.headers.get("x-shop-admin-token") || bearerToken(request);

const requireDeliveryAuth = async (request, env) => {
  if (!env.SHOP_DELIVERY_SECRET) throw Object.assign(new Error("SHOP_DELIVERY_SECRET ainda nao esta configurado."), { statusCode: 503 });
  if (!(await isSafeEqual(deliverySecret(request), env.SHOP_DELIVERY_SECRET))) throw Object.assign(new Error("Unauthorized."), { statusCode: 401 });
};

const requireShopAdminAuth = async (request, env) => {
  const expected = env.SHOP_ADMIN_TOKEN || env.CORUJA_CUP_ADMIN_TOKEN || "";
  if (!expected) throw Object.assign(new Error("SHOP_ADMIN_TOKEN ainda nao esta configurado."), { statusCode: 503 });
  if (!(await isSafeEqual(adminSecret(request), expected))) throw Object.assign(new Error("Unauthorized."), { statusCode: 401 });
};

const requireRetryAuth = async (request, env) => {
  const expectedAdmin = env.SHOP_ADMIN_TOKEN || env.CORUJA_CUP_ADMIN_TOKEN || "";
  const adminOk = expectedAdmin && await isSafeEqual(adminSecret(request), expectedAdmin);
  const deliveryOk = env.SHOP_DELIVERY_SECRET && await isSafeEqual(deliverySecret(request), env.SHOP_DELIVERY_SECRET);
  if (!adminOk && !deliveryOk) throw Object.assign(new Error("Unauthorized."), { statusCode: 401 });
};

const mercadoPagoFetch = async (env, path, options = {}) => {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) throw Object.assign(new Error("Mercado Pago ainda nao esta configurado."), { statusCode: 503 });
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) throw Object.assign(new Error(body.message || "Erro na API do Mercado Pago."), { statusCode: response.status >= 500 ? 502 : 400 });
  return body;
};

const validateMinecraftProfile = async (nick) => {
  const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(nick)}`, {
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) throw Object.assign(new Error("Esse nick nao existe em uma conta Minecraft original."), { statusCode: 400 });
  if (!response.ok) return { id: "", name: nick };
  const profile = await response.json();
  if (!profile?.id || !profile?.name) throw Object.assign(new Error("A Mojang nao retornou um perfil valido para esse nick."), { statusCode: 400 });
  return { id: sanitizeText(profile.id, 40), name: sanitizeMinecraftNick(profile.name) };
};

const toOrderRow = ({ env, order }) => [
  order.id,
  getEnvironment(env),
  order.status,
  order.sku,
  order.productTitle,
  order.amount,
  order.currency,
  order.cobbleDollars,
  order.minecraftNick,
  order.minecraftUuid || "",
  order.discordName || "",
  order.mercadoPagoPreferenceId || "",
  order.mercadoPagoPaymentId || "",
  order.lastPaymentStatus || "",
  order.paidAt || "",
  order.archivedAt || "",
  order.archiveReason || "",
  JSON.stringify(order.paymentValidation || null),
  JSON.stringify(order.requester || null),
  order.createdAt,
  order.updatedAt,
];

const orderFromRow = (row) => row && ({
  id: row.id,
  status: row.status,
  sku: row.sku,
  productTitle: row.product_title,
  amount: row.amount,
  currency: row.currency,
  cobbleDollars: row.cobble_dollars,
  minecraftNick: row.minecraft_nick,
  minecraftUuid: row.minecraft_uuid || "",
  discordName: row.discord_name || "",
  mercadoPagoPreferenceId: row.mercado_pago_preference_id || "",
  mercadoPagoPaymentId: row.mercado_pago_payment_id || "",
  lastPaymentStatus: row.last_payment_status || "",
  paidAt: row.paid_at || "",
  archivedAt: row.archived_at || "",
  archiveReason: row.archive_reason || "",
  paymentValidation: jsonParse(row.payment_validation, null),
  requester: jsonParse(row.requester, null),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const deliveryFromRow = (row) => row && ({
  id: row.id,
  orderId: row.order_id,
  status: row.status,
  sku: row.sku,
  minecraftNick: row.minecraft_nick,
  cobbleDollars: row.cobble_dollars,
  command: row.command,
  paymentId: row.payment_id || "",
  createdAt: row.created_at,
  claimedAt: row.claimed_at || "",
  workerId: row.worker_id || "",
  deliveredAt: row.delivered_at || "",
  deliveryLog: row.delivery_log || "",
});

const createOrder = async ({ env, request, payload }) => {
  const product = getProduct(payload.sku);
  if (!product) throw Object.assign(new Error("Produto invalido."), { statusCode: 400 });
  const quantity = parseCheckoutQuantity(payload.quantity);
  const cleanNick = sanitizeMinecraftNick(payload.minecraftNick);
  if (!cleanNick) throw Object.assign(new Error("Nick do Minecraft invalido."), { statusCode: 400 });
  const profile = await validateMinecraftProfile(cleanNick);
  const now = new Date().toISOString();
  const totalAmount = product.amount * quantity;
  const totalCobbleDollars = (product.cobbleDollars || 0) * quantity;
  const totalClaimChunks = (product.claimChunks || 0) * quantity;
  const order = {
    id: crypto.randomUUID(),
    status: "created",
    sku: product.sku,
    productTitle: quantity > 1 ? `${product.title} x${quantity}` : product.title,
    amount: totalAmount,
    currency: product.currency,
    cobbleDollars: totalCobbleDollars,
    minecraftNick: profile.name || cleanNick,
    minecraftUuid: profile.id,
    discordName: sanitizeText(payload.discordName, 80),
    paymentValidation: {
      quantity,
      unitAmount: product.amount,
      unitCobbleDollars: product.cobbleDollars || 0,
      unitClaimChunks: product.claimChunks || 0,
      claimChunks: totalClaimChunks,
    },
    createdAt: now,
    updatedAt: now,
    requester: {
      ip: sanitizeText(request.headers.get("cf-connecting-ip"), 180),
      userAgent: sanitizeText(request.headers.get("user-agent"), 220),
    },
  };
  await env.DB.prepare(`INSERT INTO shop_orders (id, environment, status, sku, product_title, amount, currency, cobble_dollars, minecraft_nick, minecraft_uuid, discord_name, mercado_pago_preference_id, mercado_pago_payment_id, last_payment_status, paid_at, archived_at, archive_reason, payment_validation, requester, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(...toOrderRow({ env, order }))
    .run();
  return order;
};

const getOrder = async (env, orderId) => {
  const row = await env.DB.prepare("SELECT * FROM shop_orders WHERE environment = ? AND id = ?")
    .bind(getEnvironment(env), orderId)
    .first();
  if (!row) throw Object.assign(new Error("Pedido nao encontrado."), { statusCode: 404 });
  return orderFromRow(row);
};

const updateOrder = async (env, orderId, patch) => {
  const current = await getOrder(env, orderId);
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await env.DB.prepare(`UPDATE shop_orders SET status = ?, product_title = ?, amount = ?, currency = ?, cobble_dollars = ?, minecraft_nick = ?, minecraft_uuid = ?, discord_name = ?, mercado_pago_preference_id = ?, mercado_pago_payment_id = ?, last_payment_status = ?, paid_at = ?, archived_at = ?, archive_reason = ?, payment_validation = ?, requester = ?, updated_at = ? WHERE environment = ? AND id = ?`)
    .bind(next.status, next.productTitle, next.amount, next.currency, next.cobbleDollars, next.minecraftNick, next.minecraftUuid || "", next.discordName || "", next.mercadoPagoPreferenceId || "", next.mercadoPagoPaymentId || "", next.lastPaymentStatus || "", next.paidAt || "", next.archivedAt || "", next.archiveReason || "", JSON.stringify(next.paymentValidation || null), JSON.stringify(next.requester || null), next.updatedAt, getEnvironment(env), orderId)
    .run();
  return next;
};

const createPreference = async ({ env, request, order }) => {
  const product = getProduct(order.sku);
  const quantity = getOrderQuantity(order, product);
  const claimChunks = getOrderClaimChunks(order, product);
  const siteUrl = sanitizeText(env.SITE_URL, 180).replace(/\/+$/, "") || "https://mottameister.xyz";
  const apiUrl = sanitizeText(env.API_URL, 180).replace(/\/+$/, "") || new URL(request.url).origin;
  return mercadoPagoFetch(env, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      external_reference: order.id,
      notification_url: `${apiUrl}/api/shop/webhook/mercadopago`,
      back_urls: {
        success: `${siteUrl}/?shop=success&order=${encodeURIComponent(order.id)}`,
        failure: `${siteUrl}/?shop=failure&order=${encodeURIComponent(order.id)}`,
        pending: `${siteUrl}/?shop=pending&order=${encodeURIComponent(order.id)}`,
      },
      auto_return: "approved",
      metadata: {
        order_id: order.id,
        sku: order.sku,
        product_type: product.type,
        minecraft_nick: order.minecraftNick,
        cobbledollars: order.cobbleDollars,
        claim_chunks: claimChunks,
        quantity,
        unit_amount: product.amount,
      },
      items: [{
        id: product.sku,
        title: product.title,
        description: product.type === "opac_claim_bonus"
          ? `Claims de chunks para ${order.minecraftNick} na Toca da Coruja`
          : `CobbleDollars para ${order.minecraftNick} na Toca da Coruja`,
        quantity,
        unit_price: product.amount,
        currency_id: product.currency,
      }],
      payer: { name: order.minecraftNick },
    }),
  });
};

const paymentExternalReference = (payment) => sanitizeText(payment.external_reference || payment.metadata?.order_id || "", 100);

const paymentBelongsToOrder = ({ order, payment }) => paymentExternalReference(payment) === order.id;

const createDeliveryIfNeeded = async ({ env, order, payment }) => {
  const existing = await env.DB.prepare("SELECT * FROM shop_deliveries WHERE environment = ? AND order_id = ?")
    .bind(getEnvironment(env), order.id)
    .first();
  if (existing) return deliveryFromRow(existing);
  const product = getProduct(order.sku);
  const delivery = {
    id: order.id,
    orderId: order.id,
    status: "paid_pending_delivery",
    sku: order.sku,
    minecraftNick: order.minecraftNick,
    cobbleDollars: order.cobbleDollars || 0,
    command: getOrderDeliveryCommand(order, product),
    paymentId: String(payment.id || order.mercadoPagoPaymentId || ""),
    createdAt: new Date().toISOString(),
  };
  await env.DB.prepare(`INSERT INTO shop_deliveries (id, environment, order_id, status, sku, minecraft_nick, cobble_dollars, command, payment_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(delivery.id, getEnvironment(env), delivery.orderId, delivery.status, delivery.sku, delivery.minecraftNick, delivery.cobbleDollars, delivery.command, delivery.paymentId, delivery.createdAt)
    .run();
  return delivery;
};

const applyApprovedPayment = async ({ env, order, payment }) => {
  const product = getProduct(order.sku);
  const paidAmount = Number(payment.transaction_amount);
  const isApproved = payment.status === "approved";
  const belongsToOrder = paymentBelongsToOrder({ order, payment });
  const hasExpectedAmount = paidAmount === Number(order.amount);
  const hasExpectedCurrency = payment.currency_id === product.currency;

  if (!belongsToOrder) {
    const nextOrder = await updateOrder(env, order.id, {
      status: "payment_reference_mismatch",
      paymentValidation: {
        paymentId: String(payment.id || ""),
        paymentExternalReference: paymentExternalReference(payment),
        expectedOrderId: order.id,
      },
    });
    return { order: nextOrder, delivery: null, delivered: false, validation: nextOrder.paymentValidation };
  }

  await updateOrder(env, order.id, {
    mercadoPagoPaymentId: String(payment.id || order.mercadoPagoPaymentId || ""),
    lastPaymentStatus: payment.status || null,
  });

  if (!isApproved || !hasExpectedAmount || !hasExpectedCurrency) {
    const nextOrder = await updateOrder(env, order.id, {
      status: isApproved ? "payment_review_required" : `payment_${payment.status || "unknown"}`,
      paymentValidation: {
        paidAmount,
        expectedAmount: order.amount,
        quantity: getOrderQuantity(order, product),
        currency: payment.currency_id,
        expectedCurrency: product.currency,
      },
    });
    return { order: nextOrder, delivery: null, delivered: false, validation: nextOrder.paymentValidation };
  }

  const paidOrder = await updateOrder(env, order.id, {
    status: "paid_pending_delivery",
    mercadoPagoPaymentId: String(payment.id || order.mercadoPagoPaymentId || ""),
    paidAt: payment.date_approved || new Date().toISOString(),
  });
  const delivery = await createDeliveryIfNeeded({ env, order: paidOrder, payment });
  return { order: paidOrder, delivery, delivered: false, validation: null };
};

const listOrders = async (env, { includeArchived = false } = {}) => {
  const rows = await env.DB.prepare(`
    SELECT o.*, d.status AS delivery_status, d.command AS delivery_command, d.delivered_at, d.delivery_log
    FROM shop_orders o
    LEFT JOIN shop_deliveries d ON d.environment = o.environment AND d.order_id = o.id
    WHERE o.environment = ? ${includeArchived ? "" : "AND (o.archived_at IS NULL OR o.archived_at = '')"}
    ORDER BY o.created_at DESC
  `).bind(getEnvironment(env)).all();
  return (rows.results || []).map((row) => ({
    ...orderFromRow(row),
    deliveryStatus: row.delivery_status || "",
    deliveryCommand: row.delivery_command || "",
    deliveredAt: row.delivered_at || "",
    deliveryLog: row.delivery_log || "",
  }));
};

const searchPaymentsByExternalReference = async (env, externalReference) => {
  const query = new URLSearchParams({ external_reference: externalReference, sort: "date_created", criteria: "desc" });
  const payload = await mercadoPagoFetch(env, `/v1/payments/search?${query.toString()}`);
  return (payload.results || []).filter((payment) => payment.external_reference === externalReference || payment.metadata?.order_id === externalReference);
};

const reconcileRecentPaidOrders = async (env) => {
  const orders = await listOrders(env);
  const candidates = orders.filter((order) => order.status === "checkout_created" && !order.mercadoPagoPaymentId).slice(0, 8);
  const synced = [];
  for (const order of candidates) {
    const payments = await searchPaymentsByExternalReference(env, order.id);
    const payment = payments.find((row) => row.status === "approved" && paymentBelongsToOrder({ order, payment: row }));
    if (!payment) continue;
    const result = await applyApprovedPayment({ env, order, payment });
    synced.push({ orderId: order.id, paymentId: String(payment.id || ""), deliveryId: result.delivery?.id || null });
  }
  return synced;
};

const pendingDeliveries = async (env) => {
  const rows = await env.DB.prepare("SELECT * FROM shop_deliveries WHERE environment = ? AND status = ? ORDER BY created_at ASC")
    .bind(getEnvironment(env), "paid_pending_delivery")
    .all();
  return (rows.results || []).map(deliveryFromRow);
};

const normalizeEntry = (entry, index) => ({
  rank: Number(entry.rank || index + 1),
  name: sanitizeText(entry.name, 32),
  amount: sanitizeText(entry.amount, 20),
});

const normalizeEntries = (entries) => (Array.isArray(entries) ? entries : [])
  .map(normalizeEntry)
  .filter((entry) => entry.rank && entry.name && entry.amount)
  .slice(0, 10);

const parseLeaderboardText = (text) => String(text || "")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .map((line) => line.match(/^(\d+)\.\s+(.+?)\s+\$?\s*([\d.,]+[KMB]?)/i))
  .filter(Boolean)
  .map((match) => ({ rank: Number(match[1]), name: sanitizeText(match[2], 32), amount: sanitizeText(match[3].replace(",", ".").toUpperCase(), 20) }))
  .slice(0, 10);

const ensureLeaderboardSnapshotsTable = async (env) => {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS shop_leaderboard_snapshots (
      environment TEXT PRIMARY KEY,
      entries TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
};

const getLeaderboard = async (env, request) => {
  await ensureLeaderboardSnapshotsTable(env);
  let row = await env.DB.prepare("SELECT * FROM shop_leaderboard_snapshots WHERE environment = ?")
    .bind(getEnvironment(env))
    .first();

  if (!row) {
    row = await env.DB.prepare("SELECT * FROM shop_leaderboard WHERE environment = ?")
      .bind(getEnvironment(env))
      .first()
      .catch(() => null);
  }

  const entries = normalizeEntries(jsonParse(row?.entries, []));
  return json({
    ok: true,
    source: entries.length ? "server" : "snapshot",
    updatedAt: entries.length ? row.updated_at : null,
    entries: entries.length ? entries : fallbackLeaderboard,
  }, 200, request);
};

const handleLeaderboardPost = async (request, env) => {
  await requireDeliveryAuth(request, env);
  const payload = await parseBody(request);
  const entries = normalizeEntries(payload.entries).length ? normalizeEntries(payload.entries) : parseLeaderboardText(payload.text);
  if (!entries.length) throw Object.assign(new Error("Leaderboard vazio ou invalido."), { statusCode: 400 });
  const updatedAt = new Date().toISOString();
  const environment = getEnvironment(env);
  const entriesJson = JSON.stringify(entries);

  await ensureLeaderboardSnapshotsTable(env);
  await env.DB.prepare(`
    INSERT INTO shop_leaderboard_snapshots (environment, entries, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(environment) DO UPDATE SET
      entries = excluded.entries,
      updated_at = excluded.updated_at
  `).bind(environment, entriesJson, updatedAt).run();

  return { ok: true, source: "server", updatedAt, entries };
};

const handleCheckout = async (request, env) => {
  const payload = await parseBody(request);
  const testCoupon = await validateTestCoupon(payload, env);
  const order = await createOrder({ env, request, payload });
  if (testCoupon) {
    const paidOrder = await updateOrder(env, order.id, {
      status: "paid_pending_delivery",
      amount: 0,
      mercadoPagoPaymentId: `coupon:${testCoupon}`,
      lastPaymentStatus: "coupon_test",
      paidAt: new Date().toISOString(),
      paymentValidation: {
        ...(order.paymentValidation || {}),
        source: "test_coupon",
        originalAmount: order.amount,
      },
    });
    const delivery = await createDeliveryIfNeeded({
      env,
      order: paidOrder,
      payment: {
        id: `coupon:${testCoupon}`,
      },
    });
    return { ok: true, orderId: order.id, couponApplied: true, deliveryId: delivery.id, status: paidOrder.status };
  }
  const preference = await createPreference({ env, request, order });
  await updateOrder(env, order.id, {
    status: "checkout_created",
    mercadoPagoPreferenceId: preference.id || null,
  });
  return { ok: true, orderId: order.id, checkoutUrl: preference.init_point || preference.sandbox_init_point };
};

const handlePending = async (request, env) => {
  const url = new URL(request.url);
  if (url.searchParams.get("leaderboard") === "1") {
    if (request.method === "GET") return getLeaderboard(env, request);
    if (request.method === "POST") {
      try {
        return json(await handleLeaderboardPost(request, env), 200, request);
      } catch (error) {
        if ((error.statusCode || 500) < 500) throw error;
        return json({ error: error.message || "Falha ao publicar leaderboard." }, 500, request);
      }
    }
  }
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405, request);
  await requireDeliveryAuth(request, env);
  let synced = [];
  let syncError = "";
  try {
    synced = await reconcileRecentPaidOrders(env);
  } catch (error) {
    syncError = error.message || "Falha ao reconciliar pagamentos recentes.";
    console.error(JSON.stringify({
      event: "shop_pending_reconcile_failed",
      error: syncError,
    }));
  }
  const deliveries = await pendingDeliveries(env);
  return json({ ok: true, synced, deliveries: deliveries.map((delivery) => ({
    id: delivery.id,
    orderId: delivery.orderId,
    sku: delivery.sku,
    minecraftNick: delivery.minecraftNick,
    cobbleDollars: delivery.cobbleDollars,
    command: delivery.command,
    createdAt: delivery.createdAt,
  })), syncError }, 200, request);
};

const verifyMercadoPagoSignature = async ({ request, env, payload }) => {
  if (!env.MERCADOPAGO_WEBHOOK_SECRET) throw Object.assign(new Error("MERCADOPAGO_WEBHOOK_SECRET ainda nao esta configurado."), { statusCode: 503 });
  const url = new URL(request.url);
  const dataId = sanitizeText(url.searchParams.get("data.id") || url.searchParams.get("id") || payload?.data?.id || payload?.id, 80).toLowerCase();
  const xSignature = request.headers.get("x-signature") || "";
  const xRequestId = request.headers.get("x-request-id") || "";
  if (!xSignature || !xRequestId || !dataId) return false;
  const parts = Object.fromEntries(xSignature.split(",").map((part) => part.split("=").map((value) => value.trim())).filter((part) => part.length === 2));
  if (!parts.ts || !parts.v1) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.MERCADOPAGO_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const expected = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return isSafeEqual(parts.v1, expected);
};

const handleMercadoPagoWebhook = async (request, env) => {
  const payload = await parseBody(request);
  if (!(await verifyMercadoPagoSignature({ request, env, payload }))) throw Object.assign(new Error("Invalid signature."), { statusCode: 401 });
  const url = new URL(request.url);
  const paymentId = String(url.searchParams.get("data.id") || url.searchParams.get("id") || payload?.data?.id || payload?.id || "");
  if (!paymentId) throw Object.assign(new Error("Missing payment id."), { statusCode: 400 });
  const payment = await mercadoPagoFetch(env, `/v1/payments/${encodeURIComponent(paymentId)}`);
  const orderId = String(payment.external_reference || payment.metadata?.order_id || "");
  if (!orderId) return { received: true, ignored: "missing external reference" };
  const order = await updateOrder(env, orderId, {
    mercadoPagoPaymentId: String(payment.id || paymentId),
    lastPaymentStatus: payment.status || null,
  });
  const result = await applyApprovedPayment({ env, order, payment });
  return { received: true, delivered: result.delivered, deliveryId: result.delivery?.id || null };
};

const handleClaim = async (request, env) => {
  await requireDeliveryAuth(request, env);
  const payload = await parseBody(request);
  const orderId = sanitizeText(payload.orderId, 80);
  if (!orderId) throw Object.assign(new Error("Pedido invalido."), { statusCode: 400 });
  const delivery = deliveryFromRow(await env.DB.prepare("SELECT * FROM shop_deliveries WHERE environment = ? AND order_id = ?")
    .bind(getEnvironment(env), orderId).first());
  if (!delivery) throw Object.assign(new Error("Entrega nao encontrada."), { statusCode: 404 });
  if (delivery.status !== "paid_pending_delivery") throw Object.assign(new Error("Entrega nao esta pendente."), { statusCode: 409 });
  await env.DB.prepare("UPDATE shop_deliveries SET status = ?, claimed_at = ?, worker_id = ? WHERE environment = ? AND order_id = ?")
    .bind("delivering", new Date().toISOString(), sanitizeText(payload.workerId || "coruja-shop-worker", 80), getEnvironment(env), orderId)
    .run();
  await updateOrder(env, orderId, { status: "delivering" });
  return { ok: true, delivery: { id: delivery.id, status: "delivering", command: delivery.command } };
};

const handleDelivered = async (request, env) => {
  await requireDeliveryAuth(request, env);
  const payload = await parseBody(request);
  const orderId = sanitizeText(payload.orderId, 80);
  if (!orderId) throw Object.assign(new Error("Pedido invalido."), { statusCode: 400 });
  const delivery = deliveryFromRow(await env.DB.prepare("SELECT * FROM shop_deliveries WHERE environment = ? AND order_id = ?")
    .bind(getEnvironment(env), orderId).first());
  if (!delivery) throw Object.assign(new Error("Entrega nao encontrada."), { statusCode: 404 });
  if (delivery.status === "delivered") return { ok: true, delivery: { id: delivery.id, status: delivery.status, deliveredAt: delivery.deliveredAt } };
  if (delivery.status !== "delivering") throw Object.assign(new Error("Entrega precisa estar em processamento antes de ser concluida."), { statusCode: 409 });
  const deliveredAt = new Date().toISOString();
  await env.DB.prepare("UPDATE shop_deliveries SET status = ?, delivered_at = ?, delivery_log = ? WHERE environment = ? AND order_id = ?")
    .bind("delivered", deliveredAt, sanitizeText(payload.deliveryLog, 500), getEnvironment(env), orderId)
    .run();
  await updateOrder(env, orderId, { status: "delivered" });
  return { ok: true, delivery: { id: delivery.id, status: "delivered", deliveredAt } };
};

const handleFailed = async (request, env) => {
  await requireDeliveryAuth(request, env);
  const payload = await parseBody(request);
  const orderId = sanitizeText(payload.orderId, 80);
  if (!orderId) throw Object.assign(new Error("Pedido invalido."), { statusCode: 400 });
  const delivery = deliveryFromRow(await env.DB.prepare("SELECT * FROM shop_deliveries WHERE environment = ? AND order_id = ?")
    .bind(getEnvironment(env), orderId).first());
  if (!delivery) throw Object.assign(new Error("Entrega nao encontrada."), { statusCode: 404 });
  if (delivery.status === "delivered") return { ok: true, delivery: { id: delivery.id, status: delivery.status } };
  const deliveryLog = sanitizeText(payload.deliveryLog || "Falha ao executar entrega.", 500);
  await env.DB.prepare("UPDATE shop_deliveries SET status = ?, delivery_log = ? WHERE environment = ? AND order_id = ?")
    .bind("delivery_failed", deliveryLog, getEnvironment(env), orderId)
    .run();
  await updateOrder(env, orderId, { status: "delivery_failed" });
  return { ok: true, delivery: { id: delivery.id, status: "delivery_failed" } };
};

const handleRetryDelivery = async (request, env) => {
  const payload = await parseBody(request);
  if (payload.force) {
    await requireShopAdminAuth(request, env);
  } else {
    await requireRetryAuth(request, env);
  }
  const orderId = sanitizeText(payload.orderId, 80);
  if (!orderId) throw Object.assign(new Error("Pedido invalido."), { statusCode: 400 });
  const delivery = deliveryFromRow(await env.DB.prepare("SELECT * FROM shop_deliveries WHERE environment = ? AND order_id = ?")
    .bind(getEnvironment(env), orderId).first());
  if (!delivery) throw Object.assign(new Error("Entrega nao encontrada."), { statusCode: 404 });
  if (delivery.status === "delivered" && !payload.force) throw Object.assign(new Error("Entrega ja foi concluida."), { statusCode: 409 });
  await env.DB.prepare("UPDATE shop_deliveries SET status = ?, claimed_at = ?, worker_id = ?, delivered_at = ?, delivery_log = ? WHERE environment = ? AND order_id = ?")
    .bind("paid_pending_delivery", "", "", "", sanitizeText(payload.reason || "retry requested", 500), getEnvironment(env), orderId)
    .run();
  await updateOrder(env, orderId, { status: "paid_pending_delivery" });
  return { ok: true, delivery: { id: delivery.id, status: "paid_pending_delivery" } };
};

const handleSyncPayment = async (request, env) => {
  await requireShopAdminAuth(request, env);
  const payload = await parseBody(request);
  const orderId = sanitizeText(payload.orderId, 80);
  if (!orderId) throw Object.assign(new Error("Pedido invalido."), { statusCode: 400 });
  const order = await getOrder(env, orderId);
  const payments = await searchPaymentsByExternalReference(env, order.id);
  const payment = payments.find((row) => row.status === "approved" && paymentBelongsToOrder({ order, payment: row }));
  if (!payment) return json({ ok: false, synced: false, error: "Nenhum pagamento encontrado no Mercado Pago para esse pedido." }, 404, request);
  const result = await applyApprovedPayment({ env, order, payment });
  return json({ ok: true, synced: true, paymentId: String(payment.id || ""), paymentStatus: payment.status || "", deliveryId: result.delivery?.id || null, orderStatus: result.order.status, validation: result.validation }, 200, request);
};

const handleArchiveTests = async (request, env) => {
  await requireShopAdminAuth(request, env);
  const payload = await parseBody(request);
  const keepOrderIds = new Set((Array.isArray(payload.keepOrderIds) ? payload.keepOrderIds : []).map((value) => sanitizeText(value, 80)).filter(Boolean));
  const keepNicks = new Set((Array.isArray(payload.keepMinecraftNicks) ? payload.keepMinecraftNicks : []).map(sanitizeMinecraftNick).filter(Boolean));
  const orders = await listOrders(env, { includeArchived: true });
  const archived = [];
  for (const order of orders) {
    if (order.archivedAt || keepOrderIds.has(order.id) || keepNicks.has(order.minecraftNick)) continue;
    if (order.mercadoPagoPaymentId || order.paidAt) continue;
    if (!["created", "checkout_created"].includes(order.status)) continue;
    const next = await updateOrder(env, order.id, { archivedAt: new Date().toISOString(), archiveReason: sanitizeText(payload.reason || "production table cleanup", 120) });
    archived.push(next);
  }
  return { ok: true, archivedCount: archived.length, archivedOrderIds: archived.map((order) => order.id) };
};

const referrerHost = (value) => {
  try {
    return sanitizeText(new URL(String(value || "")).hostname, 120);
  } catch {
    return "";
  }
};

const visitorHash = async (request, env) => {
  const salt = env.CLICK_ANALYTICS_SALT || env.SHOP_ADMIN_TOKEN || "mottameister-click-analytics";
  const raw = `${salt}|${request.headers.get("cf-connecting-ip") || ""}|${request.headers.get("user-agent") || ""}`;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);
};

const handleAnalytics = async (request, env) => {
  if (request.method === "POST") {
    const payload = await parseBody(request);
    const href = sanitizeText(payload.href, 500);
    const source = sanitizeText(payload.source, 80);
    if (!href && !source) throw Object.assign(new Error("Clique invalido."), { statusCode: 400 });
    await env.DB.prepare(`INSERT INTO click_events (id, href, path, label, source, language, theme, referrer_host, country, visitor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), href, sanitizeText(payload.path, 160), sanitizeText(payload.label, 140), source, sanitizeText(payload.language, 16), sanitizeText(payload.theme, 16), referrerHost(request.headers.get("referer") || request.headers.get("referrer")), sanitizeText(request.headers.get("cf-ipcountry"), 8), await visitorHash(request, env), new Date().toISOString())
      .run();
    return { ok: true };
  }

  if (request.method === "GET") {
    await requireShopAdminAuth(request, env);
    const days = Math.max(1, Math.min(Number(new URL(request.url).searchParams.get("days") || 30), 90));
    const startsAt = new Date(Date.now() - days * 86400000).toISOString();
    const rows = await env.DB.prepare("SELECT * FROM click_events WHERE created_at >= ? ORDER BY created_at DESC").bind(startsAt).all();
    const filtered = rows.results || [];
    const byHref = new Map();
    const byPath = new Map();
    const visitors = new Set();
    for (const row of filtered) {
      visitors.add(row.visitor);
      byHref.set(row.href || row.source || "unknown", (byHref.get(row.href || row.source || "unknown") || 0) + 1);
      byPath.set(row.path || "/", (byPath.get(row.path || "/") || 0) + 1);
    }
    const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([key, count]) => ({ key, count }));
    return { ok: true, days, totalClicks: filtered.length, uniqueVisitors: visitors.size, topLinks: top(byHref), topPages: top(byPath), recent: filtered.slice(0, 50) };
  }

  throw Object.assign(new Error("Method not allowed."), { statusCode: 405 });
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });

    const url = new URL(request.url);
    try {
      if (url.pathname === "/health") return json({ ok: true, service: "mottameister-services-api" }, 200, request);
      if (url.pathname === "/api/shop/checkout" && request.method === "POST") return json(await handleCheckout(request, env), 200, request);
      if (url.pathname === "/api/shop/pending") return await handlePending(request, env);
      if (url.pathname === "/api/shop/webhook/mercadopago" && request.method === "POST") return json(await handleMercadoPagoWebhook(request, env), 200, request);
      if (url.pathname === "/api/shop/orders" && request.method === "GET") {
        await requireShopAdminAuth(request, env);
        return json({ ok: true, orders: await listOrders(env, { includeArchived: url.searchParams.get("archived") === "1" }) }, 200, request);
      }
      if (url.pathname === "/api/shop/claim" && request.method === "POST") return json(await handleClaim(request, env), 200, request);
      if (url.pathname === "/api/shop/delivered" && request.method === "POST") return json(await handleDelivered(request, env), 200, request);
      if (url.pathname === "/api/shop/failed" && request.method === "POST") return json(await handleFailed(request, env), 200, request);
      if (url.pathname === "/api/shop/retry-delivery" && request.method === "POST") return json(await handleRetryDelivery(request, env), 200, request);
      if (url.pathname === "/api/shop/sync-payment" && request.method === "POST") return handleSyncPayment(request, env);
      if (url.pathname === "/api/shop/archive-tests" && request.method === "POST") return json(await handleArchiveTests(request, env), 200, request);
      if (url.pathname === "/api/analytics/click") return json(await handleAnalytics(request, env), 200, request);
      return json({ error: "Not found." }, 404, request);
    } catch (error) {
      return errorResponse(error, request);
    }
  },
};
