const {
  defaultEventId,
  getCounts,
  handleError,
  isAuthorized,
  json,
  readRegistrationsWithLegacy,
  toCsv,
} = require("../../lib/coruja-cup-store");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  if (!isAuthorized(request)) {
    return json(response, { error: "Unauthorized." }, 401);
  }

  const eventId = request.query.eventId || defaultEventId;

  try {
    const registrations = await readRegistrationsWithLegacy(eventId);

    if (request.query.format === "csv") {
      response.status(200);
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Content-Type", "text/csv; charset=utf-8");
      response.setHeader("Content-Disposition", `attachment; filename="coruja-cup-${eventId}.csv"`);
      return response.send(toCsv(registrations));
    }

    return json(response, {
      eventId,
      ...getCounts(registrations),
      registrations,
    });
  } catch (error) {
    return handleError(response, error);
  }
};
