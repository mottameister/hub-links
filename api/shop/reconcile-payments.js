const {
  applyApprovedPayment,
  handleError,
  isAuthorizedDeliveryRequest,
  json,
  listOrders,
} = require("../../lib/coruja-shop-store");
const { searchPaymentsByExternalReference } = require("../../lib/coruja-shop-mercadopago");

const MAX_RECONCILE_ORDERS = 12;

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  try {
    if (!isAuthorizedDeliveryRequest(request)) {
      return json(response, { error: "Unauthorized." }, 401);
    }

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
        paymentStatus: payment.status || "",
        orderStatus: result.order.status,
        deliveryId: result.delivery?.id || null,
      });
    }

    return json(response, {
      ok: true,
      checked: candidates.length,
      synced,
    });
  } catch (error) {
    return handleError(response, error, "Nao foi possivel reconciliar pagamentos.");
  }
};

