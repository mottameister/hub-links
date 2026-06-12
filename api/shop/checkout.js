const {
  createOrder,
  handleError,
  json,
  parseJsonBody,
  updateOrder,
} = require("../../lib/coruja-shop-store");
const { createPreference } = require("../../lib/coruja-shop-mercadopago");

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
