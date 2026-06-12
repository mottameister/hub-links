const {
  createDeliveryIfNeeded,
  createOrder,
  handleError,
  json,
  parseJsonBody,
  safeEqual,
  updateOrder,
} = require("../../lib/coruja-shop-store");
const { createPreference } = require("../../lib/coruja-shop-mercadopago");

const isTestCoupon = (coupon) => {
  const expected = process.env.SHOP_TEST_COUPON || "";
  return expected && safeEqual(String(coupon || "").trim(), expected);
};

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  try {
    const payload = parseJsonBody(request);
    const order = await createOrder({
      sku: payload.sku,
      minecraftNick: payload.minecraftNick,
      discordName: payload.discordName,
      request,
    });

    if (isTestCoupon(payload.coupon)) {
      const now = new Date().toISOString();
      const payment = {
        id: `test-coupon-${order.id}`,
        status: "approved",
        transaction_amount: order.amount,
        currency_id: order.currency,
        date_approved: now,
      };
      const paidOrder = await updateOrder(order.id, {
        status: "paid_pending_delivery",
        mercadoPagoPaymentId: payment.id,
        lastPaymentStatus: "approved_test_coupon",
        paidAt: now,
      });
      const delivery = await createDeliveryIfNeeded({ order: paidOrder, payment });

      return json(response, {
        ok: true,
        orderId: order.id,
        testDelivery: true,
        deliveryId: delivery.id,
      });
    }

    const preference = await createPreference({ order, request });
    await updateOrder(order.id, {
      status: "checkout_created",
      mercadoPagoPreferenceId: preference.id || null,
    });

    return json(response, {
      ok: true,
      orderId: order.id,
      checkoutUrl: preference.init_point || preference.sandbox_init_point,
    });
  } catch (error) {
    return handleError(response, error, "Lojinha ainda nao esta configurada para pagamentos.");
  }
};
