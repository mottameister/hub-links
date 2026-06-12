const {
  defaultEventId,
  getCounts,
  handleError,
  json,
  readRegistrationsWithLegacy,
} = require("../../lib/coruja-cup-store");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  const eventId = request.query.eventId || defaultEventId;

  try {
    const registrations = await readRegistrationsWithLegacy(eventId);
    return json(response, {
      eventId,
      ...getCounts(registrations),
    });
  } catch (error) {
    if (request.query.diagnose === "1") {
      return json(response, {
        error: "status diagnose",
        name: error && error.name,
        message: error && error.message,
        statusCode: error && error.statusCode,
      }, error.statusCode || 500);
    }

    return handleError(response, error);
  }
};
