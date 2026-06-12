const {
  applyApprovedPayment,
  handleError,
  json,
  updateOrder,
  verifyMercadoPagoSignature,
} = require("../../../lib/coruja-shop-store");
const { getPayment } = require("../../../lib/coruja-shop-mercadopago");

const paymentIdFrom = (request) => {
  const payload = typeof request.body === "string"
    ? JSON.parse(request.body || "{}")
    : request.body || {};

  return String(
    request.query?.["data.id"]
    || request.query?.id
    || payload?.data?.id
    || payload?.id
    || "",
  );
};

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  try {
    if (!verifyMercadoPagoSignature(request)) {
      return json(response, { error: "Invalid signature." }, 401);
    }

    const paymentId = paymentIdFrom(request);
    if (!paymentId) {
      return json(response, { error: "Missing payment id." }, 400);
    }

    const payment = await getPayment(paymentId);
    const orderId = String(payment.external_reference || payment.metadata?.order_id || "");
    if (!orderId) {
      return json(response, { received: true, ignored: "missing external reference" });
    }

    const order = await updateOrder(orderId, {
      mercadoPagoPaymentId: String(payment.id || paymentId),
      lastPaymentStatus: payment.status || null,
    });
    const result = await applyApprovedPayment({ order, payment });

    return json(response, {
      received: true,
      delivered: result.delivered,
      deliveryId: result.delivery?.id || null,
    });
  } catch (error) {
    return handleError(response, error, "Nao foi possivel validar o pagamento agora.");
  }
};
