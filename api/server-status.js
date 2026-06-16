const SERVER_HOST = "crafty.marru.dpdns.org";
const SERVER_PORT = 25565;
const STATUS_SOURCE = `https://api.mcsrvstat.us/3/${SERVER_HOST}`;

function normalizeStatus(payload) {
  const players = payload?.players || {};
  const motd = payload?.motd || {};
  const debug = payload?.debug || {};

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    host: SERVER_HOST,
    port: payload?.port || SERVER_PORT,
    online: Boolean(payload?.online),
    ip: payload?.ip || null,
    version: payload?.version || null,
    protocol: payload?.protocol || null,
    players: {
      online: Number(players.online || 0),
      max: Number(players.max || 0),
      sample: Array.isArray(players.list) ? players.list.slice(0, 12) : [],
    },
    motd: {
      clean: Array.isArray(motd.clean) ? motd.clean.filter(Boolean).join("\n") : "",
      html: Array.isArray(motd.html) ? motd.html.filter(Boolean).join("<br>") : "",
    },
    debug: {
      cachehit: Boolean(debug.cachehit),
      cachetime: debug.cachetime || null,
      cacheexpire: debug.cacheexpire || null,
      error: debug.error || null,
    },
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
      host: SERVER_HOST,
      port: SERVER_PORT,
      online: false,
      error: error.name === "AbortError" ? "Status check timed out" : error.message,
    });
  } finally {
    clearTimeout(timeout);
  }
};
