const {
  handleError,
  isAuthorizedDeliveryRequest,
  json,
  pendingDeliveries,
} = require("../../lib/coruja-shop-store");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  try {
    if (!isAuthorizedDeliveryRequest(request)) {
      return json(response, { error: "Unauthorized." }, 401);
    }

    const deliveries = await pendingDeliveries();
    return json(response, {
      ok: true,
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
