const {
  getHeader,
  handleError,
  isAuthorizedDeliveryRequest,
  json,
  pendingDeliveries,
} = require("../../lib/coruja-shop-store");

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

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  try {
    if (!isAuthorizedDeliveryRequest(request)) {
      return json(response, { error: "Unauthorized.", debug: authDebug(request) }, 401);
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
