const SERVER_HOST = "cbmn.mottameister.xyz";
const STATUS_SOURCE = `https://api.mcstatus.io/v2/status/java/${SERVER_HOST}?timeout=5`;

function compactUuid(uuid) {
  return String(uuid || "").replace(/-/g, "");
}

function normalizePlayer(player) {
  const uuid = compactUuid(player?.uuid);
  const name = String(player?.name_clean || player?.name || player?.name_raw || "Jogador").trim();

  if (!uuid || !/^[a-f0-9]{32}$/i.test(uuid)) return null;

  return {
    name: name.slice(0, 32),
    avatarUrl: `https://crafatar.com/avatars/${uuid}?size=96&overlay&default=MHF_Steve`,
  };
}

function normalizeStatus(payload) {
  const players = payload?.players || {};
  const visiblePlayers = Array.isArray(players.list)
    ? players.list.map(normalizePlayer).filter(Boolean).slice(0, 24)
    : [];

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    online: Boolean(payload?.online),
    players: {
      online: Number(players.online || 0),
      max: Number(players.max || 0),
      list: visiblePlayers,
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
      online: false,
    });
  } finally {
    clearTimeout(timeout);
  }
};
