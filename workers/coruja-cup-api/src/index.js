const capacity = 9;
const defaultEventId = "coruja-cup-2026-06-28";
const legacyEventIds = ["poison-edition-001"];

const allowedOrigins = new Set([
  "https://mottameister.xyz",
  "https://www.mottameister.xyz",
]);

const corsHeaders = (request) => {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = allowedOrigins.has(origin) ? origin : "https://mottameister.xyz";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
};

const json = (request, body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...corsHeaders(request),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  },
});

const csvEscape = (value) => {
  const text = String(value || "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (rows) => {
  const header = ["status", "minecraftNick", "discordName", "timezone", "notes", "createdAt"];
  const lines = rows.map((row) => header.map((key) => csvEscape(row[key])).join(","));
  return [header.join(","), ...lines].join("\n");
};

const sanitize = (value, maxLength = 180) => String(value || "")
  .trim()
  .replace(/\s+/g, " ")
  .slice(0, maxLength);

const prefixFor = (eventId) => `registration:${eventId}:`;

const getEventId = (request) => {
  const url = new URL(request.url);
  return sanitize(url.searchParams.get("eventId") || defaultEventId, 80);
};

const readRegistrations = async (store, eventId) => {
  const prefix = prefixFor(eventId);
  let cursor;
  const rows = [];

  do {
    const page = await store.list({ prefix, cursor });
    const values = await Promise.all(page.keys.map(async (key) => {
      const raw = await store.get(key.name);
      if (!raw) return null;

      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }));

    rows.push(...values.filter(Boolean));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

const readRegistrationsWithLegacy = async (store, eventId) => {
  const registrations = await readRegistrations(store, eventId);
  if (registrations.length || eventId !== defaultEventId) {
    return registrations;
  }

  for (const legacyEventId of legacyEventIds) {
    const legacyRegistrations = await readRegistrations(store, legacyEventId);
    if (legacyRegistrations.length) {
      return legacyRegistrations.map((row) => ({
        ...row,
        originalEventId: row.eventId || legacyEventId,
        eventId,
      }));
    }
  }

  return registrations;
};

const getCounts = (registrations) => ({
  confirmed: registrations.filter((row) => row.status === "confirmed").length,
  waitlist: registrations.filter((row) => row.status === "waitlist").length,
  total: registrations.length,
});

const isAuthorized = (request, env) => {
  const expected = env.CORUJA_CUP_ADMIN_TOKEN;
  if (!expected) return false;

  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return bearer === expected;
};

const requireStore = (request, env) => {
  if (!env.CORUJA_CUP) {
    return json(request, { error: "Storage binding CORUJA_CUP is not configured." }, 503);
  }

  return null;
};

const handleStatus = async (request, env) => {
  const missingStore = requireStore(request, env);
  if (missingStore) return missingStore;

  const eventId = getEventId(request);
  const registrations = await readRegistrationsWithLegacy(env.CORUJA_CUP, eventId);

  return json(request, {
    eventId,
    ...getCounts(registrations),
  });
};

const handleRegister = async (request, env) => {
  const missingStore = requireStore(request, env);
  if (missingStore) return missingStore;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(request, { error: "JSON invalido." }, 400);
  }

  const eventId = sanitize(payload.eventId || defaultEventId, 80);
  const minecraftNick = sanitize(payload.minecraftNick, 40);
  const discordName = sanitize(payload.discordName, 60);
  const timezone = sanitize(payload.timezone, 80);
  const notes = sanitize(payload.notes, 420);

  if (!minecraftNick || !discordName) {
    return json(request, { error: "Preencha seu nick no Minecraft e seu Discord." }, 400);
  }

  if (!payload.rulesAccepted || !payload.scheduleConfirmed) {
    return json(request, { error: "Confirme as regras e o horario antes de se inscrever." }, 400);
  }

  const registrations = await readRegistrationsWithLegacy(env.CORUJA_CUP, eventId);
  const duplicate = registrations.find((row) => (
    row.minecraftNick.toLowerCase() === minecraftNick.toLowerCase()
    || row.discordName.toLowerCase() === discordName.toLowerCase()
  ));

  if (duplicate) {
    return json(request, {
      error: "Voce ja esta inscrito ou na lista de espera.",
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

  await env.CORUJA_CUP.put(`${prefixFor(eventId)}${createdAt}:${id}`, JSON.stringify(registration));

  return json(request, {
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
};

const handleRegistrations = async (request, env) => {
  const missingStore = requireStore(request, env);
  if (missingStore) return missingStore;

  if (!isAuthorized(request, env)) {
    return json(request, { error: "Unauthorized." }, 401);
  }

  const eventId = getEventId(request);
  const url = new URL(request.url);
  const registrations = await readRegistrationsWithLegacy(env.CORUJA_CUP, eventId);

  if (url.searchParams.get("format") === "csv") {
    return new Response(toCsv(registrations), {
      headers: {
        ...corsHeaders(request),
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="coruja-cup-${eventId}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return json(request, {
    eventId,
    ...getCounts(registrations),
    registrations,
  });
};

const notFound = (request) => json(request, { error: "Not found." }, 404);

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/api\/coruja-cup/, "");

      if (request.method === "GET" && path === "/status") {
        return handleStatus(request, env);
      }

      if (request.method === "POST" && path === "/register") {
        return handleRegister(request, env);
      }

      if (request.method === "GET" && path === "/registrations") {
        return handleRegistrations(request, env);
      }

      return notFound(request);
    } catch (error) {
      console.error("Coruja Cup Worker error", error);
      return json(request, { error: "Nao foi possivel processar sua inscricao agora." }, 500);
    }
  },
};
