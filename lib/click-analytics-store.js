const { createHmac, randomUUID, timingSafeEqual } = require("node:crypto");

const analyticsPrefix = "analytics/clicks";

const json = (response, body, status = 200) => {
  response.status(status).setHeader("Cache-Control", "no-store").json(body);
};

const sanitizeText = (value, maxLength = 180) => String(value || "")
  .trim()
  .replace(/\s+/g, " ")
  .slice(0, maxLength);

const safeEqual = (received, expected) => {
  const left = Buffer.from(String(received || ""));
  const right = Buffer.from(String(expected || ""));
  return left.length === right.length && timingSafeEqual(left, right);
};

const getAdminSecret = () => process.env.CLICK_ANALYTICS_ADMIN_TOKEN
  || process.env.SHOP_ADMIN_TOKEN
  || process.env.CORUJA_CUP_ADMIN_TOKEN
  || "";

const isAuthorizedAnalyticsRequest = (request) => {
  const expected = getAdminSecret();
  if (!expected) return false;

  const authorization = request.headers.authorization || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return safeEqual(bearer, expected);
};

const ensureBlobConfig = () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const error = new Error("Vercel Blob ainda nao esta configurado.");
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

const readJson = async (path, fallback = null) => {
  ensureBlobConfig();
  const { get } = await import("@vercel/blob");

  try {
    const blob = await get(path, { access: "private" });
    const raw = await streamToText(blob && blob.stream);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    if (error && (error.name === "BlobNotFoundError" || String(error.message || "").includes("does not exist"))) {
      return fallback;
    }
    throw error;
  }
};

const writeJson = async (path, data) => {
  ensureBlobConfig();
  const { put } = await import("@vercel/blob");

  await put(path, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: "application/json; charset=utf-8",
  });
};

const listJson = async (pathPrefix) => {
  ensureBlobConfig();
  const { list } = await import("@vercel/blob");
  const rows = [];
  let cursor;

  do {
    const page = await list({ prefix: pathPrefix, cursor, limit: 1000 });
    for (const blob of page.blobs || []) {
      const path = blob.pathname || blob.url;
      if (path) rows.push(await readJson(path, null));
    }
    cursor = page.cursor;
  } while (cursor);

  return rows.filter(Boolean);
};

const visitorHash = (request) => {
  const ip = sanitizeText(request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "", 180);
  const userAgent = sanitizeText(request.headers["user-agent"], 220);
  const salt = process.env.CLICK_ANALYTICS_SALT || getAdminSecret() || "mottameister-click-analytics";
  return createHmac("sha256", salt).update(`${ip}|${userAgent}`).digest("hex").slice(0, 24);
};

const referrerHost = (value) => {
  try {
    return sanitizeText(new URL(String(value || "")).hostname, 120);
  } catch {
    return "";
  }
};

const parseBody = (request) => {
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");
  return request.body || {};
};

const recordClick = async ({ payload, request }) => {
  const now = new Date();
  const href = sanitizeText(payload.href, 500);
  const path = sanitizeText(payload.path, 160);
  const label = sanitizeText(payload.label, 140);
  const source = sanitizeText(payload.source, 80);

  if (!href && !source) {
    const error = new Error("Clique invalido.");
    error.statusCode = 400;
    throw error;
  }

  const row = {
    id: randomUUID(),
    type: "click",
    href,
    path,
    label,
    source,
    language: sanitizeText(payload.language, 16),
    theme: sanitizeText(payload.theme, 16),
    referrerHost: referrerHost(request.headers.referer || request.headers.referrer),
    country: sanitizeText(request.headers["x-vercel-ip-country"], 8),
    visitor: visitorHash(request),
    createdAt: now.toISOString(),
  };

  const day = now.toISOString().slice(0, 10);
  await writeJson(`${analyticsPrefix}/${day}/${row.id}.json`, row);
  return row;
};

const summarizeClicks = async ({ days = 30 } = {}) => {
  const end = new Date();
  const startsAt = new Date(end.getTime() - Math.max(1, Math.min(Number(days) || 30, 90)) * 86400000);
  const rows = await listJson(`${analyticsPrefix}/`);
  const filtered = rows.filter((row) => {
    const createdAt = new Date(row.createdAt);
    return createdAt >= startsAt && createdAt <= end;
  });

  const byHref = new Map();
  const byPath = new Map();
  const visitors = new Set();

  for (const row of filtered) {
    visitors.add(row.visitor);
    const hrefKey = row.href || row.source || "unknown";
    const pathKey = row.path || "/";
    byHref.set(hrefKey, (byHref.get(hrefKey) || 0) + 1);
    byPath.set(pathKey, (byPath.get(pathKey) || 0) + 1);
  }

  const top = (map) => [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([key, count]) => ({ key, count }));

  return {
    days: Math.ceil((end - startsAt) / 86400000),
    totalClicks: filtered.length,
    uniqueVisitors: visitors.size,
    topLinks: top(byHref),
    topPages: top(byPath),
    recent: filtered
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 50),
  };
};

module.exports = {
  isAuthorizedAnalyticsRequest,
  json,
  parseBody,
  recordClick,
  summarizeClicks,
};
