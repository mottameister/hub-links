# Lojinha do Servidor - setup de teste

Este fluxo ainda nao deve ir para producao antes de uma compra teste completa.

## O que precisa existir fora do codigo

1. Cloudflare D1 e Worker conectados ao projeto.
   - Worker: `mottameister-services-api`.
   - Banco: `mottameister-services`.
   - URL publica: `https://mottameister-services-api.mottameister.xyz`.

2. App do Mercado Pago em modo teste.
   - Criar uma aplicacao em Mercado Pago Developers.
   - Configurar webhook de teste para:
     `https://mottameister-services-api.mottameister.xyz/api/shop/webhook/mercadopago`
   - Evento necessario: `payment`.
   - Copiar o access token de teste e o secret de webhook.
   - O codigo de verificacao do usuario de teste nao e o secret do webhook.
   - Como o access token ja foi compartilhado no chat, rotacione o token antes de producao.

3. Secrets/variaveis no Worker da Cloudflare.
   - `SHOP_ENV=test`
   - `SITE_URL=https://mottameister.xyz`
   - `API_URL=https://mottameister-services-api.mottameister.xyz`
   - `MERCADOPAGO_ACCESS_TOKEN=APP_USR...` ou token de teste
   - `MERCADOPAGO_WEBHOOK_SECRET=...`
   - `SHOP_DELIVERY_SECRET=um_token_longo_aleatorio`
   - `SHOP_TEST_COUPONS={"CORUJA-CLAIMS-C33E27B7":"claims_5","CORUJA-CD1M-4F8A9C2B":"cobbledollars_1m"}`
   - Nao use `um_token_longo` literalmente. Gere um valor forte, por exemplo:
     `ea49ba24f35b6ea11730d7be92a06ae37ce06f2708404fad0283a4ce7fb300b7`

4. Server Minecraft com RCON habilitado apenas localmente.
   - `enable-rcon=true`
   - `rcon.port=25575`
   - `rcon.password=uma_senha_longa`
   - Firewall sem expor a porta RCON para a internet.

## Worker de entrega

Rode perto do servidor Minecraft.

Modo teste sem executar comando:

```powershell
$env:SHOP_API_URL="https://mottameister-services-api.mottameister.xyz"
$env:SHOP_DELIVERY_SECRET="mesmo_valor_da_cloudflare"
$env:SHOP_DRY_RUN="true"
npm run shop:worker
```

Modo RCON:

```powershell
$env:SHOP_API_URL="https://mottameister-services-api.mottameister.xyz"
$env:SHOP_DELIVERY_SECRET="mesmo_valor_da_cloudflare"
$env:SHOP_DRY_RUN="false"
$env:RCON_HOST="127.0.0.1"
$env:RCON_PORT="25575"
$env:RCON_PASSWORD="senha_do_server_properties"
$env:SHOP_LEADERBOARD_ENABLED="true"
$env:SHOP_LEADERBOARD_POLL_MS="60000"
$env:SHOP_LEADERBOARD_COMMAND="cobbledollars leaderboard"
npm run shop:worker
```

O mesmo worker tambem atualiza o ranking da pagina. Por padrao ele roda o comando
`cobbledollars leaderboard` a cada 60 segundos e publica o resultado em
`/api/shop/pending?leaderboard=1`.

## Cupons de teste

Cupons configurados para teste completo sem Mercado Pago:

- `CORUJA-CLAIMS-C33E27B7` -> `claims_5`
- `CORUJA-CD1M-4F8A9C2B` -> `cobbledollars_1m`

O Worker da Cloudflare aceita esses pares pelo secret `SHOP_TEST_COUPONS`.
O formato recomendado e um JSON simples:

```json
{
  "CORUJA-CLAIMS-C33E27B7": "claims_5",
  "CORUJA-CD1M-4F8A9C2B": "cobbledollars_1m"
}
```

## Comando atual

Os pacotes estao gerando comandos no backend assim:

- `cobbledollars give {nick} 1000000`
- `cobbledollars give {nick} 5000000`
- `cobbledollars give {nick} 10000000`
- `opac-claims add {nick} 5`
- `opac-claims add {nick} 12`
- `opac-claims add {nick} 30`

O worker traduz `opac-claims add` para Open Parties and Claims via RCON.
Como o comando `openpac player-config` exige um jogador como executor, ele roda via `execute as`.
Isso exige que o jogador esteja online no momento da entrega; se estiver offline, o pedido volta para retry.

1. `execute as {nick} run openpac player-config get claims.bonusChunkClaims`
2. soma o pacote comprado ao valor atual
3. `execute as {nick} run openpac player-config set claims.bonusChunkClaims {novo_total}`

Se o plugin de economia usa outro comando, altere o mapa `products` em `workers/mottameister-services-api/src/index.js` antes do teste real.

## Checklist antes de publicar

- Compra teste cria checkout.
- Webhook recebe evento assinado.
- Pedido pago vira entrega pendente.
- Worker em dry-run busca e marca entrega.
- Worker em RCON executa comando em uma conta teste.
- Pedido pago nao entrega duas vezes se webhook repetir.
