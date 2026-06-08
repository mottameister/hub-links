import { capacity, getCounts, getStore, json, listRegistrations, prefixFor, sanitize } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  const store = getStore(env);
  if (!store) {
    return json({ error: "Storage binding CORUJA_CUP is not configured." }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  const eventId = sanitize(payload.eventId || "coruja-cup-2026-06-28", 80);
  const minecraftNick = sanitize(payload.minecraftNick, 40);
  const discordName = sanitize(payload.discordName, 60);
  const timezone = sanitize(payload.timezone, 80);
  const notes = sanitize(payload.notes, 420);

  if (!minecraftNick || !discordName) {
    return json({ error: "Minecraft nick and Discord name are required." }, 400);
  }

  if (!payload.rulesAccepted || !payload.scheduleConfirmed) {
    return json({ error: "Rules and schedule confirmations are required." }, 400);
  }

  const registrations = await listRegistrations(store, eventId);
  const duplicate = registrations.find((row) => (
    row.minecraftNick.toLowerCase() === minecraftNick.toLowerCase()
    || row.discordName.toLowerCase() === discordName.toLowerCase()
  ));

  if (duplicate) {
    return json({
      error: "Você já está inscrito ou na lista de espera.",
      status: duplicate.status,
    }, 409);
  }

  const counts = getCounts(registrations);
  const status = counts.confirmed >= capacity ? "waitlist" : "confirmed";
  const id = crypto.randomUUID();
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

  await store.put(`${prefixFor(eventId)}${createdAt}:${id}`, JSON.stringify(registration));

  return json({
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
}
