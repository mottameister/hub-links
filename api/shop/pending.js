const {
  applyApprovedPayment,
  getHeader,
  handleError,
  isAuthorizedDeliveryRequest,
  json,
  listOrders,
  parseJsonBody,
  pendingDeliveries,
  paymentBelongsToOrder,
  readJson,
  sanitizeText,
  writeJson,
} = require("../../lib/coruja-shop-store");
const { searchPaymentsByExternalReference } = require("../../lib/coruja-shop-mercadopago");

const MAX_RECONCILE_ORDERS = 8;

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

const getEnvironment = () => sanitizeText(process.env.SHOP_ENV || "test", 24) || "test";
const leaderboardPath = () => `coruja-shop/${getEnvironment()}/leaderboard.json`;

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
  .map((match) => ({
    rank: Number(match[1]),
    name: sanitizeText(match[2], 32),
    amount: sanitizeText(match[3].replace(",", ".").toUpperCase(), 20),
  }))
  .slice(0, 10);

const getLeaderboard = async () => {
  try {
    const stored = await readJson(leaderboardPath(), null);
    const entries = normalizeEntries(stored && stored.entries);
    if (entries.length) {
      return {
        ok: true,
        source: "server",
        updatedAt: stored.updatedAt || null,
        entries,
      };
    }
  } catch {}

  return {
    ok: true,
    source: "snapshot",
    updatedAt: null,
    entries: fallbackLeaderboard,
  };
};

const updateLeaderboard = async (request, response) => {
  if (!isAuthorizedDeliveryRequest(request)) {
    return json(response, { error: "Unauthorized.", debug: authDebug(request) }, 401);
  }

  const payload = parseJsonBody(request);
  const entries = normalizeEntries(payload.entries).length
    ? normalizeEntries(payload.entries)
    : parseLeaderboardText(payload.text);

  if (!entries.length) {
    return json(response, { error: "Leaderboard vazio ou invalido." }, 400);
  }

  const body = {
    updatedAt: new Date().toISOString(),
    entries,
  };

  await writeJson(leaderboardPath(), body);
  return json(response, { ok: true, source: "server", ...body });
};

const authDebug = (request) => {
  const expected = String(process.env.SHOP_DELIVERY_SECRET || "");
  const customSecret = getHeader(request, "x-shop-delivery-secret");
  const authorization = getHeader(request, "authorization");
  const received = customSecret || (authorization.startsWith("Bearer ") ? authorization.slice(7) : "");
  return {
    expectedPresent: Boolean(expected),
    expectedLength: expected.length,
    expectedStartsWith: expected ? expected.slice(0, 4) : "",
    expectedEndsWith: expected ? expected.slice(-4) : "",
    receivedLength: received.length,
    receivedStartsWith: received ? received.slice(0, 4) : "",
    receivedEndsWith: received ? received.slice(-4) : "",
    receivedVia: customSecret ? "x-shop-delivery-secret" : "authorization",
  };
};

const reconcileRecentPaidOrders = async () => {
  const orders = await listOrders();
  const candidates = orders
    .filter((order) => order.status === "checkout_created" && !order.mercadoPagoPaymentId)
    .slice(0, MAX_RECONCILE_ORDERS);
  const synced = [];

  for (const order of candidates) {
    const payments = await searchPaymentsByExternalReference(order.id);
    const payment = payments.find((row) => row.status === "approved" && paymentBelongsToOrder({ order, payment: row }));
    if (!payment) continue;

    const result = await applyApprovedPayment({ order, payment });
    synced.push({
      orderId: order.id,
      paymentId: String(payment.id || ""),
      deliveryId: result.delivery?.id || null,
    });
  }

  return synced;
};

module.exports = async function handler(request, response) {
  try {
    if (request.query?.leaderboard === "1") {
      if (request.method === "GET") {
        return json(response, await getLeaderboard());
      }

      if (request.method === "POST") {
        return updateLeaderboard(request, response);
      }

      return json(response, { error: "Method not allowed." }, 405);
    }

    if (request.method !== "GET") {
      return json(response, { error: "Method not allowed." }, 405);
    }

    if (!isAuthorizedDeliveryRequest(request)) {
      return json(response, { error: "Unauthorized.", debug: authDebug(request) }, 401);
    }

    const synced = await reconcileRecentPaidOrders();
    const deliveries = await pendingDeliveries();
    return json(response, {
      ok: true,
      synced,
      deliveries: deliveries.map((delivery) => ({
        id: delivery.id,
        orderId: delivery.orderId,
        sku: delivery.sku,
        minecraftNick: delivery.minecraftNick,
        cobbleDollars: delivery.cobbleDollars,
        command: delivery.command,
        createdAt: delivery.createdAt,
      })),
    });
  } catch (error) {
    return handleError(response, error, "Nao foi possivel buscar entregas pendentes.");
  }
};
