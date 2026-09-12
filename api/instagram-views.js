const { getInstagramMediaViews } = require("../lib/instagram");

async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || ""))
      ? req.query.date
      : new Date().toISOString().slice(0, 10);
    const stats = await getInstagramMediaViews();
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=172800");
    res.status(200).json({ ok: true, date, ...stats });
  } catch {
    res.status(503).json({ ok: false, error: "Instagram views are temporarily unavailable" });
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 60 };
