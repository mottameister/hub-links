import { getCounts, getEventId, getStore, json, listRegistrations } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  const store = getStore(env);
  if (!store) {
    return json({ error: "Storage binding CORUJA_CUP is not configured." }, 503);
  }

  const eventId = getEventId(request);
  const registrations = await listRegistrations(store, eventId);

  return json({
    eventId,
    ...getCounts(registrations),
  });
}
