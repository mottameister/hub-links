const {
  capacity,
  defaultEventId,
  getCounts,
  handleError,
  json,
  readRegistrations,
  sanitize,
  writeRegistrations,
} = require("../../lib/coruja-cup-store");
const { randomUUID } = require("node:crypto");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return json(response, { error: "Method not allowed." }, 405);
  }

  const payload = typeof request.body === "string"
    ? JSON.parse(request.body || "{}")
    : request.body || {};
  const eventId = sanitize(payload.eventId || defaultEventId, 80);
  const minecraftNick = sanitize(payload.minecraftNick, 40);
  const discordName = sanitize(payload.discordName, 60);
  const timezone = sanitize(payload.timezone, 80);
  const notes = sanitize(payload.notes, 420);

  if (!minecraftNick || !discordName) {
    return json(response, { error: "Preencha seu nick no Minecraft e seu Discord." }, 400);
  }

  if (!payload.rulesAccepted || !payload.scheduleConfirmed) {
    return json(response, { error: "Confirme as regras e o horario antes de se inscrever." }, 400);
  }

  try {
    const registrations = await readRegistrations(eventId);
    const duplicate = registrations.find((row) => (
      row.minecraftNick.toLowerCase() === minecraftNick.toLowerCase()
      || row.discordName.toLowerCase() === discordName.toLowerCase()
    ));

    if (duplicate) {
      return json(response, {
        error: "Voce ja esta inscrito ou na lista de espera.",
        status: duplicate.status,
      }, 409);
    }

    const counts = getCounts(registrations);
    const status = counts.confirmed >= capacity ? "waitlist" : "confirmed";
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const registration = {
      id,
      eventId,
      status,
      minecraftNick,
      discordName,
      timezone,
      notes,
      rulesAccepted: true,
      scheduleConfirmed: true,
      createdAt,
    };

    const nextRegistrations = [...registrations, registration];
    await writeRegistrations(eventId, nextRegistrations);

    return json(response, {
      ok: true,
      status,
      registration: {
        id,
        status,
        minecraftNick,
        discordName,
        createdAt,
      },
    });
  } catch (error) {
    return handleError(response, error);
  }
};
