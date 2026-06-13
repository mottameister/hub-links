const net = require("node:net");

const config = {
  host: process.env.RCON_HOST || "127.0.0.1",
  port: Number(process.env.RCON_PORT || 25575),
  password: process.env.RCON_PASSWORD || "",
  command: (process.env.RCON_COMMAND || "cobbledollares leaderboard").replace(/^\//, ""),
  endpoint: process.env.SHOP_LEADERBOARD_ENDPOINT || "https://mottameister-services-api.mottameister.xyz/api/shop/pending?leaderboard=1",
  secret: process.env.SHOP_DELIVERY_SECRET || "",
};

const packetTypes = {
  response: 0,
  command: 2,
  auth: 3,
};

const encodePacket = (id, type, body) => {
  const bodyBuffer = Buffer.from(String(body || ""), "utf8");
  const packet = Buffer.alloc(4 + 4 + bodyBuffer.length + 2);
  packet.writeInt32LE(id, 0);
  packet.writeInt32LE(type, 4);
  bodyBuffer.copy(packet, 8);

  const frame = Buffer.alloc(4 + packet.length);
  frame.writeInt32LE(packet.length, 0);
  packet.copy(frame, 4);
  return frame;
};

const decodePackets = (buffer) => {
  const packets = [];
  let offset = 0;

  while (offset + 4 <= buffer.length) {
    const length = buffer.readInt32LE(offset);
    if (offset + 4 + length > buffer.length) break;

    const start = offset + 4;
    packets.push({
      id: buffer.readInt32LE(start),
      type: buffer.readInt32LE(start + 4),
      body: buffer.slice(start + 8, start + length - 2).toString("utf8"),
    });
    offset += 4 + length;
  }

  return { packets, rest: buffer.slice(offset) };
};

const sendRcon = () => new Promise((resolve, reject) => {
  if (!config.password) {
    reject(new Error("Defina RCON_PASSWORD."));
    return;
  }

  const socket = net.createConnection({ host: config.host, port: config.port });
  let buffer = Buffer.alloc(0);
  let authed = false;
  let response = "";

  const fail = (error) => {
    socket.destroy();
    reject(error);
  };

  socket.setTimeout(10000, () => fail(new Error("Timeout no RCON.")));

  socket.on("connect", () => {
    socket.write(encodePacket(1, packetTypes.auth, config.password));
  });

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    const decoded = decodePackets(buffer);
    buffer = decoded.rest;

    for (const packet of decoded.packets) {
      if (!authed) {
        if (packet.id === -1) {
          fail(new Error("RCON_PASSWORD invalido."));
          return;
        }

        authed = true;
        socket.write(encodePacket(2, packetTypes.command, config.command));
        socket.write(encodePacket(3, packetTypes.command, ""));
        continue;
      }

      if (packet.id === 2 && packet.body) response += packet.body;
      if (packet.id === 3) {
        socket.end();
        resolve(response.trim());
      }
    }
  });

  socket.on("error", fail);
});

const publish = async (text) => {
  if (!config.secret) throw new Error("Defina SHOP_DELIVERY_SECRET.");

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shop-delivery-secret": config.secret,
    },
    body: JSON.stringify({ text }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Falha ao publicar leaderboard (${response.status}).`);
  }

  return payload;
};

(async () => {
  const text = await sendRcon();
  if (!text) throw new Error("RCON nao retornou texto.");

  const result = await publish(text);
  console.log(`Leaderboard atualizado: ${result.entries.length} linhas.`);
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
