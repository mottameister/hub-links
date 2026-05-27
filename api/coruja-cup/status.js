const {
  defaultEventId,
  getCounts,
  handleError,
  json,
  readRegistrations,
} = require("../../lib/coruja-cup-store");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  const eventId = request.query.eventId || defaultEventId;

  try {
    const registrations = await readRegistrations(eventId);
    return json(response, {
      eventId,
      ...getCounts(registrations),
    });
  } catch (error) {
    return handleError(response, error);
  }
};
