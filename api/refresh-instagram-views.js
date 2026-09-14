const { getInstagramMediaViews, getInstagramStats } = require("../lib/instagram");

module.exports = async function handler(req, res) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Cache-Control", "no-store");

  try {
    const [stats, views] = await Promise.all([getInstagramStats(), getInstagramMediaViews()]);
    res.status(200).json({
      ok: true,
      date,
      followers: stats.followers,
      views: views.totalViews,
      measuredVideoCount: views.measuredVideoCount,
    });
  } catch (error) {
    const diagnostic = {
      status: Number.isInteger(error.status) ? error.status : null,
      code: Number.isInteger(error.code) ? error.code : null,
      subcode: Number.isInteger(error.subcode) ? error.subcode : null,
    };
    console.error("Instagram refresh failed", diagnostic);
    res.status(502).json({ ok: false, date, error: diagnostic });
  }
};
