const {
  handleError,
  isAuthorizedShopAdminRequest,
  json,
} = require("../../lib/coruja-shop-store");

const fingerprint = (value) => {
  const text = String(value || "");
  return {
    present: Boolean(text),
    length: text.length,
    startsWith: text ? text.slice(0, 4) : "",
    endsWith: text ? text.slice(-4) : "",
  };
};

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  try {
    if (!isAuthorizedShopAdminRequest(request)) {
      return json(response, { error: "Unauthorized." }, 401);
    }

    return json(response, {
      ok: true,
      shopEnv: process.env.SHOP_ENV || "",
      siteUrl: process.env.SITE_URL || "",
      deliverySecret: fingerprint(process.env.SHOP_DELIVERY_SECRET),
      adminSecret: fingerprint(process.env.SHOP_ADMIN_TOKEN || process.env.CORUJA_CUP_ADMIN_TOKEN),
    });
  } catch (error) {
    return handleError(response, error, "Nao foi possivel carregar diagnostico da lojinha.");
  }
};
