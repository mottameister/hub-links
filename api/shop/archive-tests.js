const {
  archiveUnpaidTestOrders,
  handleError,
  isAuthorizedShopAdminRequest,
  json,
  sanitizeMinecraftNick,
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
    if (!isAuthorizedShopAdminRequest(request)) {
      return json(response, { error: "Unauthorized." }, 401);
    }

    const keepOrderIds = Array.isArray(payload.keepOrderIds)
      ? payload.keepOrderIds.map((value) => sanitizeText(value, 80)).filter(Boolean)
      : [];
    const keepMinecraftNicks = Array.isArray(payload.keepMinecraftNicks)
      ? payload.keepMinecraftNicks.map((value) => sanitizeMinecraftNick(value)).filter(Boolean)
      : [];

    const archived = await archiveUnpaidTestOrders({
      keepOrderIds,
      keepMinecraftNicks,
      reason: payload.reason || "production table cleanup",
    });

    return json(response, {
      ok: true,
      archivedCount: archived.length,
      archivedOrderIds: archived.map((order) => order.id),
    });
  } catch (error) {
    return handleError(response, error, "Nao foi possivel arquivar pedidos de teste.");
  }
};

