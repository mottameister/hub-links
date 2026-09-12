module.exports = async function handler(req, res) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const response = await fetch(`https://www.mottameister.xyz/api/instagram-views?date=${date}`);
  const payload = await response.json().catch(() => null);
  res.setHeader("Cache-Control", "no-store");
  res.status(response.ok ? 200 : 502).json({ ok: response.ok, date, views: payload?.totalViews ?? null });
};
