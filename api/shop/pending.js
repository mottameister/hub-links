const {
  applyApprovedPayment,
  getHeader,
  handleError,
  isAuthorizedDeliveryRequest,
  json,
  listOrders,
  pendingDeliveries,
} = require("../../lib/coruja-shop-store");
const { searchPaymentsByExternalReference } = require("../../lib/coruja-shop-mercadopago");

const MAX_RECONCILE_ORDERS = 8;

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
    const payment = payments.find((row) => row.status === "approved");
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
  if (request.method !== "GET") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  try {
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
