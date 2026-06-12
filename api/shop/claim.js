const {
  handleError,
  isAuthorizedDeliveryRequest,
  json,
  markClaimed,
  sanitizeText,
} = require("../../lib/coruja-shop-store");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  const payload = typeof request.body === "string"
    ? JSON.parse(request.body || "{}")
    : request.body || {};

  try {
    if (!isAuthorizedDeliveryRequest(request)) {
      return json(response, { error: "Unauthorized." }, 401);
    }

    const orderId = sanitizeText(payload.orderId, 80);
    if (!orderId) {
      return json(response, { error: "Pedido invalido." }, 400);
    }

    const delivery = await markClaimed({
      orderId,
      workerId: payload.workerId || "coruja-shop-worker",
    });

    return json(response, {
      ok: true,
      delivery: {
        id: delivery.id,
        status: delivery.status,
        command: delivery.command,
      },
    });
  } catch (error) {
    return handleError(response, error, "Nao foi possivel reservar a entrega.");
  }
};
