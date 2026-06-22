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
};

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
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
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

const parseOpacClaimBonusCommand = (command) => {
  const match = String(command || "").trim().match(/^opac-claims\s+add\s+([A-Za-z0-9_]{3,16})\s+(\d+)$/i);
  if (!match) return null;
  return {
    minecraftNick: match[1],
    claimChunks: Number(match[2]),
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

  const getCommand = `openpac player-config for ${minecraftNick} get ${opacBonusClaimsKey}`;
  if (config.dryRun) {
    const setCommand = `openpac player-config for ${minecraftNick} set ${opacBonusClaimsKey} ${claimChunks}`;
    return `dry-run: ${getCommand}\ndry-run: ${setCommand}`;
  }

  const currentOutput = await rconCommand(getCommand);
  const currentClaims = parseOpacBonusClaims(currentOutput);
  const nextClaims = currentClaims + claimChunks;
  const setCommand = `openpac player-config for ${minecraftNick} set ${opacBonusClaimsKey} ${nextClaims}`;
  const setOutput = await rconCommand(setCommand);
  return [
    `OPAC bonus claims: ${currentClaims} + ${claimChunks} = ${nextClaims}`,
    `get: ${currentOutput || "Command executed."}`,
    `set: ${setOutput || "Command executed."}`,
  ].join("\n");
};

const executeDeliveryCommand = async (delivery, command) => {
  const opacClaimBonus = parseOpacClaimBonusCommand(command);
  if (opacClaimBonus) {
    return deliverOpacClaimBonus({ delivery, ...opacClaimBonus });
  }

  return config.dryRun
    ? `dry-run: ${command}`
    : rconCommand(command);
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
