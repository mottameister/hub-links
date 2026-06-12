export const capacity = 9;
export const defaultEventId = "coruja-cup-2026-06-28";

export const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  },
});

export const getStore = (env) => env.CORUJA_CUP || env.CORUJA_CUP_KV;

export const getEventId = (request) => {
  const url = new URL(request.url);
  return url.searchParams.get("eventId") || defaultEventId;
};

export const prefixFor = (eventId) => `registration:${eventId}:`;

export const sanitize = (value, maxLength = 180) => String(value || "")
  .trim()
  .replace(/\s+/g, " ")
  .slice(0, maxLength);

export const listRegistrations = async (store, eventId) => {
  const prefix = prefixFor(eventId);
  const list = await store.list({ prefix });
  const rows = await Promise.all(list.keys.map(async (key) => {
    const raw = await store.get(key.name);
    return raw ? JSON.parse(raw) : null;
  }));

  return rows
    .filter(Boolean)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const getCounts = (registrations) => ({
  confirmed: registrations.filter((row) => row.status === "confirmed").length,
  waitlist: registrations.filter((row) => row.status === "waitlist").length,
  total: registrations.length,
});

export const isAuthorized = (request, env) => {
  const expected = env.CORUJA_CUP_ADMIN_TOKEN;
  if (!expected) return false;

  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  return bearer === expected;
};
