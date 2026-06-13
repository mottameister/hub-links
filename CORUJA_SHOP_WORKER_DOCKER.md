# Worker da Lojinha via Docker

Este container deve rodar no mesmo servidor fisico/VPS do Minecraft, perto do RCON.

## Arquivos privados

Crie `.env.worker` no servidor. Este arquivo nao deve ir para o git.

```env
SHOP_API_URL=https://mottameister-services-api.mottameister.xyz
SHOP_SITE_URL=https://mottameister.xyz
SHOP_DELIVERY_SECRET=mesmo_valor_da_vercel
SHOP_DRY_RUN=false
SHOP_WORKER_POLL_MS=15000
SHOP_WORKER_ID=coruja-main
RCON_HOST=127.0.0.1
RCON_PORT=25575
RCON_PASSWORD=senha_do_rcon_do_server_properties
```

## Subir o container

```bash
git clone https://github.com/mottameister/hub-links.git
cd hub-links
cp .env.worker.example .env.worker
nano .env.worker
cp docker-compose.worker.example.yml docker-compose.yml
docker compose up -d --build
```

Ver logs:

```bash
docker compose logs -f coruja-shop-worker
```

Parar:

```bash
docker compose down
```

Atualizar:

```bash
git pull
docker compose up -d --build
```

## RCON

No `server.properties` do Minecraft:

```properties
enable-rcon=true
rcon.port=25575
rcon.password=uma_senha_forte
```

Com `network_mode: host`, o container acessa o RCON local em `127.0.0.1:25575`.

Nao abra a porta RCON para a internet.

## Primeiro teste seguro

Para testar sem executar comando no Minecraft:

```env
SHOP_DRY_RUN=true
```

Depois de validar logs e fila, altere para:

```env
SHOP_DRY_RUN=false
```

e suba novamente:

```bash
docker compose up -d
```
