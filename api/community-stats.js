const DISCORD_INVITE = "TcSFAXGr6a";
const INSTAGRAM_API_VERSION = "v24.0";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function getDiscordStats() {
  const response = await fetch(
    `https://discord.com/api/v10/invites/${DISCORD_INVITE}?with_counts=true&with_expiration=true`,
    { headers: { accept: "application/json" } }
  );

  if (!response.ok) throw new Error(`Discord returned ${response.status}`);
  const payload = await response.json();

  return {
    members: asNumber(payload.approximate_member_count),
    online: asNumber(payload.approximate_presence_count),
  };
}

async function getInstagramStats() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !accessToken) return null;

  const params = new URLSearchParams({
    fields: "followers_count",
    access_token: accessToken,
  });
  const response = await fetch(
    `https://graph.facebook.com/${INSTAGRAM_API_VERSION}/${accountId}?${params}`
  );

  if (!response.ok) throw new Error(`Instagram returned ${response.status}`);
  const payload = await response.json();

  return { followers: asNumber(payload.followers_count) };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const checkedAt = new Date().toISOString();
  const [discord, instagram] = await Promise.all([
    getDiscordStats().catch(() => null),
    getInstagramStats().catch(() => null),
  ]);

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({ ok: true, checkedAt, discord, instagram });
};
