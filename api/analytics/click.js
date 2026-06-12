const {
  isAuthorizedAnalyticsRequest,
  json,
  parseBody,
  recordClick,
  summarizeClicks,
} = require("../../lib/click-analytics-store");

module.exports = async function handler(request, response) {
  try {
    if (request.method === "POST") {
      const payload = parseBody(request);
      await recordClick({ payload, request });
      return json(response, { ok: true });
    }

    if (request.method === "GET") {
      if (!isAuthorizedAnalyticsRequest(request)) {
        return json(response, { error: "Unauthorized." }, 401);
      }

      const days = Number(request.query?.days || 30);
      const summary = await summarizeClicks({ days });
      return json(response, { ok: true, ...summary });
    }

    return json(response, { error: "Method not allowed." }, 405);
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status >= 500 ? "Nao foi possivel registrar analytics agora." : error.message;
    return json(response, { error: message }, status);
  }
};
