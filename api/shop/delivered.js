const {
  handleError,
  isAuthorizedDeliveryRequest,
  json,
  markDelivered,
  parseJsonBody,
  sanitizeText,
} = require("../../lib/coruja-shop-store");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  try {
    const payload = parseJsonBody(request);
    if (!isAuthorizedDeliveryRequest(request)) {
      return json(response, { error: "Unauthorized." }, 401);
    }

    const orderId = sanitizeText(payload.orderId, 80);
    if (!orderId) {
      return json(response, { error: "Pedido invalido." }, 400);
    }

    const delivery = await markDelivered({
      orderId,
      deliveryLog: payload.deliveryLog,
    });

    return json(response, {
      ok: true,
      delivery: {
        id: delivery.id,
        status: delivery.status,
        deliveredAt: delivery.deliveredAt,
      },
    });
  } catch (error) {
    return handleError(response, error, "Nao foi possivel marcar entrega como concluida.");
  }
};
