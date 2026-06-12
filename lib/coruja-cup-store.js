const { timingSafeEqual } = require("node:crypto");

const capacity = 9;
const defaultEventId = "coruja-cup-2026-06-28";
const legacyEventIds = ["poison-edition-001"];

const json = (response, body, status = 200) => {
  response.status(status).setHeader("Cache-Control", "no-store").json(body);
};

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

const safeEqual = (received, expected) => {
  const left = Buffer.from(String(received || ""));
  const right = Buffer.from(String(expected || ""));
  return left.length === right.length && timingSafeEqual(left, right);
};

const parseJsonBody = (request) => {
  try {
    if (typeof request.body === "string") return JSON.parse(request.body || "{}");
    return request.body || {};
  } catch {
    const error = new Error("JSON invalido.");
    error.statusCode = 400;
    throw error;
  }
};

const blobPath = (eventId) => `coruja-cup/${eventId}/registrations.json`;
const ensureBlobConfig = () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const error = new Error("Vercel Blob ainda nao esta configurado para este projeto.");
    error.statusCode = 503;
    throw error;
  }
};

const streamToText = async (stream) => {
  if (!stream) return "";

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return text;
};

const readRegistrations = async (eventId) => {
  ensureBlobConfig();
  const { get } = await import("@vercel/blob");

  try {
    const blob = await get(blobPath(eventId), { access: "private" });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return [];
    }

    const raw = await streamToText(blob.stream);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (error && (error.name === "BlobNotFoundError" || String(error.message || "").includes("does not exist"))) {
      return [];
    }
    if (error instanceof SyntaxError) {
      return [];
    }
    throw error;
  }
};

const readRegistrationsWithLegacy = async (eventId) => {
  const registrations = await readRegistrations(eventId);
  if (registrations.length || eventId !== defaultEventId) {
    return registrations;
  }

  for (const legacyEventId of legacyEventIds) {
    const legacyRegistrations = await readRegistrations(legacyEventId);
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

const writeRegistrations = async (eventId, rows) => {
  ensureBlobConfig();
  const { put } = await import("@vercel/blob");

  const options = {
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
  };

  await put(blobPath(eventId), JSON.stringify(rows, null, 2), {
    access: "private",
    ...options,
  });
};

const getCounts = (registrations) => ({
  confirmed: registrations.filter((row) => row.status === "confirmed").length,
  waitlist: registrations.filter((row) => row.status === "waitlist").length,
  total: registrations.length,
});

const isAuthorized = (request) => {
  const expected = process.env.CORUJA_CUP_ADMIN_TOKEN;
  if (!expected) return false;

  const authorization = request.headers.authorization || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  return safeEqual(bearer, expected);
};

const handleError = (response, error) => {
  console.error("Coruja Cup API error", error);
  const status = error.statusCode || 500;
  const message = status === 503
    ? "Inscricoes ainda nao configuradas no servidor. Falta conectar o Vercel Blob no projeto."
    : "Nao foi possivel processar sua inscricao agora.";

  json(response, { error: message }, status);
};

module.exports = {
  capacity,
  defaultEventId,
  getCounts,
  handleError,
  isAuthorized,
  json,
  parseJsonBody,
  readRegistrations,
  readRegistrationsWithLegacy,
  sanitize,
  toCsv,
  writeRegistrations,
};
