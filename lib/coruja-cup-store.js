const capacity = 9;
const defaultEventId = "poison-edition-001";

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
    const raw = await streamToText(blob && blob.stream);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (error && (error.name === "BlobNotFoundError" || String(error.message || "").includes("does not exist"))) {
      return [];
    }
    throw error;
  }
};

const writeRegistrations = async (eventId, rows) => {
  ensureBlobConfig();
  const { put } = await import("@vercel/blob");

  await put(blobPath(eventId), JSON.stringify(rows, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
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

  const fromQuery = request.query && request.query.token;
  const authorization = request.headers.authorization || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  return fromQuery === expected || bearer === expected;
};

const handleError = (response, error) => {
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
  readRegistrations,
  sanitize,
  toCsv,
  writeRegistrations,
};
