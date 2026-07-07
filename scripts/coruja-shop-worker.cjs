const net = require("node:net");

const opacBonusClaimsKey = "claims.bonusChunkClaims";

const config = {
  siteUrl: (process.env.SHOP_API_URL || process.env.SHOP_SITE_URL || process.env.SITE_URL || "https://mottameister-services-api.mottameister.xyz").replace(/\/+$/, ""),
  deliverySecret: process.env.SHOP_DELIVERY_SECRET || "",
  pollMs: Number(process.env.SHOP_WORKER_POLL_MS || 15000),
  dryRun: process.env.SHOP_DRY_RUN !== "false",
  rconHost: process.env.RCON_HOST || "127.0.0.1",
  rconPort: Number(process.env.RCON_PORT || 25575),
  rconPassword: process.env.RCON_PASSWORD || "",
  rconTimeoutMs: Number(process.env.RCON_TIMEOUT_MS || 10000),
  workerId: process.env.SHOP_WORKER_ID || `worker-${Date.now()}`,
  leaderboardEnabled: process.env.SHOP_LEADERBOARD_ENABLED !== "false",
  leaderboardPollMs: Number(process.env.SHOP_LEADERBOARD_POLL_MS || 600000),
  leaderboardCommand: (process.env.SHOP_LEADERBOARD_COMMAND || "cobbledollars leaderboard").replace(/^\//, ""),
  shinyEggPool: (process.env.SHOP_SHINY_EGG_POOL || "random")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean),
  shinyEggCommandTemplate: process.env.SHOP_SHINY_EGG_COMMAND_TEMPLATE || "givepokemonegg {nick} {species} shiny=yes",
  luckPermsPlusGroup: process.env.SHOP_LUCKPERMS_PLUS_GROUP || "coruja_plus",
  luckPermsPlusPlusGroup: process.env.SHOP_LUCKPERMS_PLUS_PLUS_GROUP || "coruja_plus_plus",
  luckPermsCommandTemplate: process.env.SHOP_LUCKPERMS_COMMAND_TEMPLATE || "lp user {nick} parent addtemp {group} {days}d",
};

let nextLeaderboardAt = 0;

const assertConfig = () => {
  if (!config.siteUrl) throw new Error("Missing SHOP_API_URL, SHOP_SITE_URL, or SITE_URL.");
  if (!config.deliverySecret) throw new Error("Missing SHOP_DELIVERY_SECRET.");
  if (!config.dryRun && !config.rconPassword) throw new Error("Missing RCON_PASSWORD when SHOP_DRY_RUN=false.");
};

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${config.siteUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.deliverySecret}`,
      "x-shop-delivery-secret": config.deliverySecret,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const responseText = await response.text();
  let body = {};
  try {
    body = responseText ? JSON.parse(responseText) : {};
  } catch {
    body = {};
  }
  if (!response.ok) {
    const detail = body.error || responseText.trim();
    throw new Error(detail ? `HTTP ${response.status}: ${detail}` : `HTTP ${response.status}`);
  }
  return body;
};

const writePacket = (requestId, type, body) => {
  const payload = Buffer.from(`${body}\0\0`, "utf8");
  const packet = Buffer.alloc(4 + 4 + 4 + payload.length);
  packet.writeInt32LE(4 + 4 + payload.length, 0);
  packet.writeInt32LE(requestId, 4);
  packet.writeInt32LE(type, 8);
  payload.copy(packet, 12);
  return packet;
};

const readPacket = (socket) => new Promise((resolve, reject) => {
  let buffer = Buffer.alloc(0);

  const cleanup = () => {
    socket.off("data", onData);
    socket.off("error", onError);
  };

  const onError = (error) => {
    cleanup();
    reject(error);
  };

  const onData = (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length < 4) return;

    const length = buffer.readInt32LE(0);
    if (buffer.length < 4 + length) return;

    cleanup();
    resolve({
      id: buffer.readInt32LE(4),
      type: buffer.readInt32LE(8),
      body: buffer.slice(12, 4 + length - 2).toString("utf8"),
    });
  };

  socket.on("data", onData);
  socket.on("error", onError);
});

const rconCommand = async (command) => new Promise((resolve, reject) => {
  const socket = net.createConnection(config.rconPort, config.rconHost);
  const timeout = setTimeout(() => {
    socket.destroy();
    reject(new Error(`RCON timeout after ${config.rconTimeoutMs}ms.`));
  }, config.rconTimeoutMs);

  const finish = (callback, value) => {
    clearTimeout(timeout);
    callback(value);
  };

  socket.once("error", (error) => finish(reject, error));
  socket.once("connect", async () => {
    try {
      socket.write(writePacket(1, 3, config.rconPassword));
      const auth = await readPacket(socket);
      if (auth.id === -1) throw new Error("RCON authentication failed.");

      socket.write(writePacket(2, 2, command));
      const result = await readPacket(socket);
      socket.end();
      finish(resolve, result.body);
    } catch (error) {
      socket.destroy();
      finish(reject, error);
    }
  });
});

const failDelivery = async (orderId, error) => {
  await requestJson("/api/shop/failed", {
    method: "POST",
    body: JSON.stringify({
      orderId,
      deliveryLog: error.message || String(error),
    }),
  }).catch((failError) => {
    console.error(`[shop] could not mark ${orderId} as failed: ${failError.message}`);
  });
};

class RetryableDeliveryError extends Error {
  constructor(message) {
    super(message);
    this.name = "RetryableDeliveryError";
  }
}

const retryDelivery = async (orderId, reason) => {
  await requestJson("/api/shop/retry-delivery", {
    method: "POST",
    body: JSON.stringify({
      orderId,
      reason,
    }),
  }).catch((retryError) => {
    console.error(`[shop] could not reset ${orderId} for retry: ${retryError.message}`);
  });
};

const retryableOutputPatterns = [
  /player\s+not\s+found/i,
  /no\s+such\s+player/i,
  /unknown\s+player/i,
  /player\s+is\s+not\s+online/i,
  /player\s+not\s+online/i,
  /can't\s+find\s+player/i,
  /cannot\s+find\s+player/i,
  /could\s+not\s+find\s+player/i,
  /target\s+not\s+found/i,
  /entity\s+not\s+found/i,
  /no\s+player\s+was\s+found/i,
  /jogador\s+nao\s+encontrado/i,
  new RegExp("jogador\\s+n(?:a|\\u00e3)o\\s+encontrado", "i"),
  /jogador\s+offline/i,
];

const ensureDeliveryOutputSucceeded = (output, context) => {
  const text = String(output || "").trim();
  if (retryableOutputPatterns.some((pattern) => pattern.test(text))) {
    throw new RetryableDeliveryError(`${context}: jogador offline ou nao encontrado. Output: ${text.slice(0, 220) || "(empty)"}`);
  }
};

const parseOpacClaimBonusCommand = (command) => {
  const match = String(command || "").trim().match(/^opac-claims\s+add\s+([A-Za-z0-9_]{3,16})\s+(\d+)$/i);
  if (!match) return null;
  return {
    minecraftNick: match[1],
    claimChunks: Number(match[2]),
  };
};

const parseMembershipCommand = (command) => {
  const match = String(command || "").trim().match(/^coruja-membership\s+grant\s+([A-Za-z0-9_]{3,16})\s+(plus|plus_plus)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/i);
  if (!match) return null;
  return {
    minecraftNick: match[1],
    tier: match[2].toLowerCase(),
    cobbleDollars: Number(match[3]),
    claimChunks: Number(match[4]),
    shinyEggs: Number(match[5]),
    days: Number(match[6]),
  };
};

const parseOpacBonusClaims = (output) => {
  const text = String(output || "");
  const direct = text.match(/claims\.bonusChunkClaims\s*=\s*(-?\d+)/i);
  if (direct) return Number(direct[1]);

  const option = text.match(/bonusChunkClaims.*?(-?\d+)/i);
  if (option) return Number(option[1]);

  throw new Error(`Could not read ${opacBonusClaimsKey} from OPAC output: ${text.slice(0, 220) || "(empty)"}`);
};

const deliverOpacClaimBonus = async ({ delivery, minecraftNick, claimChunks }) => {
  if (!Number.isInteger(claimChunks) || claimChunks <= 0) {
    throw new Error(`Invalid claim chunk amount for ${delivery.orderId}: ${claimChunks}`);
  }

  const getCommand = `execute as ${minecraftNick} run openpac player-config get ${opacBonusClaimsKey}`;
  if (config.dryRun) {
    const setCommand = `execute as ${minecraftNick} run openpac player-config set ${opacBonusClaimsKey} ${claimChunks}`;
    return `dry-run: ${getCommand}\ndry-run: ${setCommand}`;
  }

  const currentOutput = await rconCommand(getCommand);
  ensureDeliveryOutputSucceeded(currentOutput, getCommand);
  const currentClaims = parseOpacBonusClaims(currentOutput);
  const nextClaims = currentClaims + claimChunks;
  const setCommand = `execute as ${minecraftNick} run openpac player-config set ${opacBonusClaimsKey} ${nextClaims}`;
  const setOutput = await rconCommand(setCommand);
  ensureDeliveryOutputSucceeded(setOutput, setCommand);
  return [
    `OPAC bonus claims: ${currentClaims} + ${claimChunks} = ${nextClaims}`,
    `get: ${currentOutput || "Command executed."}`,
    `set: ${setOutput || "Command executed."}`,
  ].join("\n");
};

const pickShinySpecies = () => {
  if (!config.shinyEggPool.length) throw new Error("SHOP_SHINY_EGG_POOL is empty.");
  return config.shinyEggPool[Math.floor(Math.random() * config.shinyEggPool.length)];
};

const renderCommandTemplate = (template, replacements) => Object.entries(replacements)
  .reduce((command, [key, value]) => command.replaceAll(`{${key}}`, String(value)), template)
  .replace(/^\//, "");

const runDeliveryCommand = async (command, context) => {
  if (config.dryRun) return `dry-run: ${command}`;
  const output = await rconCommand(command);
  ensureDeliveryOutputSucceeded(output, context || command);
  return output || "Command executed.";
};

const deliverMembership = async ({ delivery, minecraftNick, tier, cobbleDollars, claimChunks, shinyEggs, days }) => {
  const logs = [];

  if (cobbleDollars > 0) {
    const command = `cobbledollars give ${minecraftNick} ${cobbleDollars}`;
    logs.push(`money: ${await runDeliveryCommand(command, command)}`);
  }

  if (claimChunks > 0) {
    logs.push(`claims: ${await deliverOpacClaimBonus({ delivery, minecraftNick, claimChunks })}`);
  }

  for (let index = 0; index < shinyEggs; index += 1) {
    const species = pickShinySpecies();
    const command = renderCommandTemplate(config.shinyEggCommandTemplate, { nick: minecraftNick, species });
    logs.push(`shiny egg ${index + 1}/${shinyEggs} (${species}): ${await runDeliveryCommand(command, command)}`);
  }

  const group = tier === "plus_plus" ? config.luckPermsPlusPlusGroup : config.luckPermsPlusGroup;
  if (group) {
    const command = renderCommandTemplate(config.luckPermsCommandTemplate, { nick: minecraftNick, group, days });
    logs.push(`luckperms: ${await runDeliveryCommand(command, command)}`);
  }

  return logs.join("\n");
};

const executeDeliveryCommand = async (delivery, command) => {
  const opacClaimBonus = parseOpacClaimBonusCommand(command);
  if (opacClaimBonus) {
    return deliverOpacClaimBonus({ delivery, ...opacClaimBonus });
  }

  const membership = parseMembershipCommand(command);
  if (membership) {
    return deliverMembership({ delivery, ...membership });
  }

  return config.dryRun
    ? `dry-run: ${command}`
    : rconCommand(command).then((output) => {
      ensureDeliveryOutputSucceeded(output, command);
      return output;
    });
};

const deliver = async (delivery) => {
  const claim = await requestJson("/api/shop/claim", {
    method: "POST",
    body: JSON.stringify({
      orderId: delivery.orderId,
      workerId: config.workerId,
    }),
  });

  if (!claim.ok) return;

  const command = String(delivery.command || "").replace(/^\//, "");
  if (!command) throw new Error(`Delivery ${delivery.orderId} has no command.`);

  console.log(`[shop] delivering ${delivery.orderId}: ${command}`);
  let output = "";
  try {
    output = await executeDeliveryCommand(delivery, command);
  } catch (error) {
    if (error instanceof RetryableDeliveryError) {
      await retryDelivery(delivery.orderId, error.message);
      console.warn(`[shop] delivery ${delivery.orderId} will retry: ${error.message}`);
      return;
    }
    await failDelivery(delivery.orderId, error);
    throw error;
  }

  try {
    await requestJson("/api/shop/delivered", {
      method: "POST",
      body: JSON.stringify({
        orderId: delivery.orderId,
        deliveryLog: output || "Command executed.",
      }),
    });
    console.log(`[shop] delivered ${delivery.orderId}`);
  } catch (error) {
    if (String(error.message || "").includes("Entrega precisa estar em processamento")) {
      console.warn(`[shop] delivery ${delivery.orderId} was already finalized or reset after command execution.`);
      return;
    }
    throw error;
  }
};

const updateLeaderboardIfNeeded = async () => {
  if (!config.leaderboardEnabled) return;
  if (Date.now() < nextLeaderboardAt) return;
  nextLeaderboardAt = Date.now() + config.leaderboardPollMs;

  try {
    const text = await rconCommand(config.leaderboardCommand);
    if (!String(text || "").trim()) throw new Error("RCON nao retornou texto para o ranking.");

    const result = await requestJson("/api/shop/pending?leaderboard=1", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    console.log(`[shop] leaderboard updated: ${result.entries.length} rows`);
  } catch (error) {
    console.error(`[shop] leaderboard update failed: ${error.message}`);
  }
};

const tick = async () => {
  const payload = await requestJson("/api/shop/pending");
  for (const row of payload.synced || []) {
    console.log(`[shop] reconciled paid order ${row.orderId}: ${row.paymentId}`);
  }

  for (const delivery of payload.deliveries || []) {
    try {
      await deliver(delivery);
    } catch (error) {
      console.error(`[shop] delivery ${delivery.orderId} failed: ${error.message}`);
    }
  }

  await updateLeaderboardIfNeeded();
};

const main = async () => {
  assertConfig();
  console.log(`[shop] worker started for ${config.siteUrl} (${config.dryRun ? "dry-run" : "rcon"})`);

  while (true) {
    try {
      await tick();
    } catch (error) {
      console.error(`[shop] ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, config.pollMs));
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
