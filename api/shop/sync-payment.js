const {
  applyApprovedPayment,
  getOrder,
  handleError,
  isAuthorizedShopAdminRequest,
  json,
  paymentBelongsToOrder,
  parseJsonBody,
  sanitizeText,
} = require("../../lib/coruja-shop-store");
const { searchPaymentsByExternalReference } = require("../../lib/coruja-shop-mercadopago");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  try {
    const payload = parseJsonBody(request);
    if (!isAuthorizedShopAdminRequest(request)) {
      return json(response, { error: "Unauthorized." }, 401);
    }

    const orderId = sanitizeText(payload.orderId, 80);
    if (!orderId) {
      return json(response, { error: "Pedido invalido." }, 400);
    }

    const order = await getOrder(orderId);
    const payments = await searchPaymentsByExternalReference(order.id);
    const payment = payments.find((row) => row.status === "approved" && paymentBelongsToOrder({ order, payment: row }));

    if (!payment) {
      return json(response, {
        ok: false,
        synced: false,
        error: "Nenhum pagamento encontrado no Mercado Pago para esse pedido.",
      }, 404);
    }

    const result = await applyApprovedPayment({ order, payment });
    return json(response, {
      ok: true,
      synced: true,
      paymentId: String(payment.id || ""),
      paymentStatus: payment.status || "",
      deliveryId: result.delivery?.id || null,
      orderStatus: result.order.status,
      validation: result.validation,
    });
  } catch (error) {
    return handleError(response, error, "Nao foi possivel sincronizar o pagamento.");
  }
};
