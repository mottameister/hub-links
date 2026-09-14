const DISCORD_INVITE = "TcSFAXGr6a";
const { asNumber, getInstagramStats } = require("../lib/instagram");

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

async function getInstagramViews(req) {
  const date = new Date().toISOString().slice(0, 10);
  const response = await fetch(`https://www.mottameister.xyz/api/instagram-views?date=${date}`);
  if (!response.ok) return null;
  const payload = await response.json();
  return payload?.ok ? payload : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const checkedAt = new Date().toISOString();
  const [discord, instagramResult, instagramViews] = await Promise.all([
    getDiscordStats().catch(() => null),
    getInstagramStats()
      .then((instagram) => ({ instagram, error: null }))
      .catch((error) => ({
        instagram: null,
        error: {
          status: Number.isInteger(error.status) ? error.status : null,
          code: Number.isInteger(error.code) ? error.code : null,
          subcode: Number.isInteger(error.subcode) ? error.subcode : null,
        },
      })),
    getInstagramViews(req).catch(() => null),
  ]);

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({
    ok: true,
    checkedAt,
    discord,
    instagram: instagramResult.instagram,
    instagramError: instagramResult.error,
    instagramViews,
  });
};
