const {
  handleError,
  isAuthorizedShopAdminRequest,
  json,
  listOrders,
} = require("../../lib/coruja-shop-store");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  try {
    if (!isAuthorizedShopAdminRequest(request)) {
      return json(response, { error: "Unauthorized." }, 401);
    }

    const orders = await listOrders();
    return json(response, {
      ok: true,
      orders,
    });
  } catch (error) {
    return handleError(response, error, "Nao foi possivel buscar os pedidos da lojinha.");
  }
};

