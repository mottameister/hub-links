const INSTAGRAM_API_VERSION = "v24.0";
const MEDIA_PAGE_SIZE = 100;
const INSIGHT_CONCURRENCY = 10;

class InstagramApiError extends Error {
  constructor(response, payload) {
    super(payload?.error?.message || `Instagram returned ${response.status}`);
    this.name = "InstagramApiError";
    this.status = response.status;
    this.code = payload?.error?.code ?? null;
    this.subcode = payload?.error?.error_subcode ?? null;
  }
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getCredentials() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accountId || !accessToken) return null;
  return { accountId, accessToken };
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new InstagramApiError(response, payload);
  return payload;
}

async function getInstagramStats() {
  const credentials = getCredentials();
  if (!credentials) return null;

  const params = new URLSearchParams({
    fields: "followers_count",
    access_token: credentials.accessToken,
  });
  const payload = await fetchJson(
    `https://graph.facebook.com/${INSTAGRAM_API_VERSION}/${credentials.accountId}?${params}`
  );
  return { followers: asNumber(payload.followers_count) };
}

async function listInstagramMedia(credentials) {
  const params = new URLSearchParams({
    fields: "id,media_type,media_product_type",
    limit: String(MEDIA_PAGE_SIZE),
    access_token: credentials.accessToken,
  });
  let nextUrl = `https://graph.facebook.com/${INSTAGRAM_API_VERSION}/${credentials.accountId}/media?${params}`;
  const media = [];

  while (nextUrl) {
    const payload = await fetchJson(nextUrl);
    if (Array.isArray(payload.data)) media.push(...payload.data);
    nextUrl = payload.paging?.next || null;
  }

  return media;
}

async function getMediaViews(mediaId, accessToken) {
  const params = new URLSearchParams({ metric: "views", access_token: accessToken });
  const response = await fetch(
    `https://graph.facebook.com/${INSTAGRAM_API_VERSION}/${mediaId}/insights?${params}`
  );
  if (!response.ok) return null;
  const payload = await response.json();
  return asNumber(payload.data?.[0]?.values?.[0]?.value);
}

async function getInstagramMediaViews() {
  const credentials = getCredentials();
  if (!credentials) return null;

  const media = await listInstagramMedia(credentials);
  const videos = media.filter((item) =>
    item.media_type === "VIDEO" || item.media_product_type === "REELS"
  );
  const values = [];

  for (let index = 0; index < videos.length; index += INSIGHT_CONCURRENCY) {
    const batch = videos.slice(index, index + INSIGHT_CONCURRENCY);
    const result = await Promise.all(batch.map((item) => getMediaViews(item.id, credentials.accessToken)));
    values.push(...result);
  }

  const measured = values.filter((value) => value !== null);
  if (measured.length === 0 && videos.length > 0) throw new Error("Instagram did not return video views");

  return {
    totalViews: measured.reduce((total, value) => total + value, 0),
    videoCount: videos.length,
    measuredVideoCount: measured.length,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { asNumber, getInstagramStats, getInstagramMediaViews, InstagramApiError };
