const SERVER_HOST = "cbmn.mottameister.xyz";
const STATUS_SOURCE = `https://api.mcsrvstat.us/3/${SERVER_HOST}`;

function normalizeStatus(payload) {
  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    online: Boolean(payload?.online),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch(STATUS_SOURCE, {
      headers: {
        accept: "application/json",
        "user-agent": "mottameister-status-page/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Status provider returned ${response.status}`);
    }

    const payload = await response.json();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    res.status(200).json(normalizeStatus(payload));
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({
      ok: false,
      checkedAt: new Date().toISOString(),
      online: false,
    });
  } finally {
    clearTimeout(timeout);
  }
};
