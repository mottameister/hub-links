const {
  createDeliveryIfNeeded,
  getProduct,
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
    const product = getProduct(order.sku);
    const paidAmount = Number(payment.transaction_amount);

    const isApproved = payment.status === "approved";
    const hasExpectedAmount = paidAmount === Number(product.amount);
    const hasExpectedCurrency = payment.currency_id === product.currency;

    if (!isApproved || !hasExpectedAmount || !hasExpectedCurrency) {
      await updateOrder(order.id, {
        status: isApproved ? "payment_review_required" : `payment_${payment.status || "unknown"}`,
        paymentValidation: {
          paidAmount,
          expectedAmount: product.amount,
          currency: payment.currency_id,
          expectedCurrency: product.currency,
        },
      });

      return json(response, { received: true, delivered: false });
    }

    await updateOrder(order.id, {
      status: "paid_pending_delivery",
      mercadoPagoPaymentId: String(payment.id || paymentId),
      paidAt: payment.date_approved || new Date().toISOString(),
    });
    const delivery = await createDeliveryIfNeeded({ order, payment });
    if (delivery.status !== "paid_pending_delivery") {
      await updateOrder(order.id, { status: delivery.status });
    }

    return json(response, {
      received: true,
      delivered: false,
      deliveryId: delivery.id,
    });
  } catch (error) {
    return handleError(response, error, "Nao foi possivel validar o pagamento agora.");
  }
};
