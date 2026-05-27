import { getCounts, getEventId, getStore, isAuthorized, json, listRegistrations } from "./_shared.js";

const csvEscape = (value) => {
  const text = String(value || "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (rows) => {
  const header = ["status", "minecraftNick", "discordName", "timezone", "notes", "createdAt"];
  const lines = rows.map((row) => header.map((key) => csvEscape(row[key])).join(","));
  return [header.join(","), ...lines].join("\n");
};

export async function onRequestGet({ request, env }) {
  const store = getStore(env);
  if (!store) {
    return json({ error: "Storage binding CORUJA_CUP is not configured." }, 503);
  }

  if (!isAuthorized(request, env)) {
    return json({ error: "Unauthorized." }, 401);
  }

  const eventId = getEventId(request);
  const registrations = await listRegistrations(store, eventId);
  const url = new URL(request.url);

  if (url.searchParams.get("format") === "csv") {
    return new Response(toCsv(registrations), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="coruja-cup-${eventId}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return json({
    eventId,
    ...getCounts(registrations),
    registrations,
  });
}
