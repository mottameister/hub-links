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
npm run shop:worker
```

## Comando atual

Os pacotes estao gerando comandos no backend assim:

- `cobbledollars give {nick} 1000000`
- `cobbledollars give {nick} 5000000`
- `cobbledollars give {nick} 10000000`

Se o plugin de economia usa outro comando, altere o mapa `products` em `workers/mottameister-services-api/src/index.js` antes do teste real.

## Checklist antes de publicar

- Compra teste cria checkout.
- Webhook recebe evento assinado.
- Pedido pago vira entrega pendente.
- Worker em dry-run busca e marca entrega.
- Worker em RCON executa comando em uma conta teste.
- Pedido pago nao entrega duas vezes se webhook repetir.
