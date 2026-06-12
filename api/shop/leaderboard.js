const {
  handleError,
  isAuthorizedDeliveryRequest,
  json,
  parseJsonBody,
  readJson,
  sanitizeText,
  writeJson,
} = require("../../lib/coruja-shop-store");

const fallbackEntries = [
  { rank: 1, name: "jotinha7b", amount: "11.6M" },
  { rank: 2, name: "Muniz_XD", amount: "10M" },
  { rank: 3, name: "Marru_XD", amount: "10M" },
  { rank: 4, name: "yRuizx", amount: "1.07M" },
  { rank: 5, name: "Shyad0u", amount: "878K" },
  { rank: 6, name: "Fortalzera", amount: "567K" },
  { rank: 7, name: "Fethr7350", amount: "323K" },
  { rank: 8, name: "yLoorenzoo", amount: "277K" },
  { rank: 9, name: "BiggieSm4llz", amount: "261K" },
  { rank: 10, name: "Miquesl", amount: "215K" },
];

const getEnvironment = () => sanitizeText(process.env.SHOP_ENV || "test", 24) || "test";
const leaderboardPath = () => `coruja-shop/${getEnvironment()}/leaderboard.json`;

const normalizeEntry = (entry, index) => ({
  rank: Number(entry.rank || index + 1),
  name: sanitizeText(entry.name, 32),
  amount: sanitizeText(entry.amount, 20),
});

const normalizeEntries = (entries) => (Array.isArray(entries) ? entries : [])
  .map(normalizeEntry)
  .filter((entry) => entry.rank && entry.name && entry.amount)
  .slice(0, 10);

const parseLeaderboardText = (text) => String(text || "")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .map((line) => line.match(/^(\d+)\.\s+(.+?)\s+\$?\s*([\d.,]+[KMB]?)/i))
  .filter(Boolean)
  .map((match) => ({
    rank: Number(match[1]),
    name: sanitizeText(match[2], 32),
    amount: sanitizeText(match[3].replace(",", ".").toUpperCase(), 20),
  }))
  .slice(0, 10);

module.exports = async function handler(request, response) {
  if (request.method === "GET") {
    try {
      const stored = await readJson(leaderboardPath(), null);
      const entries = normalizeEntries(stored && stored.entries).length
        ? normalizeEntries(stored.entries)
        : fallbackEntries;

      response.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
      return response.status(200).json({
        ok: true,
        source: stored ? "server" : "snapshot",
        updatedAt: stored?.updatedAt || null,
        entries,
      });
    } catch (error) {
      return json(response, {
        ok: true,
        source: "snapshot",
        updatedAt: null,
        entries: fallbackEntries,
      });
    }
  }

  if (request.method === "POST") {
    try {
      if (!isAuthorizedDeliveryRequest(request)) {
        return json(response, { error: "Unauthorized." }, 401);
      }

      const payload = parseJsonBody(request);
      const entries = normalizeEntries(payload.entries).length
        ? normalizeEntries(payload.entries)
        : parseLeaderboardText(payload.text);

      if (!entries.length) {
        return json(response, { error: "Leaderboard vazio ou invalido." }, 400);
      }

      const body = {
        updatedAt: new Date().toISOString(),
        entries,
      };

      await writeJson(leaderboardPath(), body);
      return json(response, { ok: true, ...body });
    } catch (error) {
      return handleError(response, error, "Nao foi possivel atualizar o leaderboard.");
    }
  }

  return json(response, { error: "Method not allowed." }, 405);
};
