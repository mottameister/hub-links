# Lojinha do Servidor - setup de teste

Este fluxo ainda nao deve ir para producao antes de uma compra teste completa.

## O que precisa existir fora do codigo

1. Vercel Blob conectado ao projeto.
   - O projeto ja usa `@vercel/blob`.
   - A env `BLOB_READ_WRITE_TOKEN` precisa existir na Vercel.

2. App do Mercado Pago em modo teste.
   - Criar uma aplicacao em Mercado Pago Developers.
   - Configurar webhook de teste para:
     `https://SEU_DOMINIO/api/shop/webhook/mercadopago`
   - Evento necessario: `payment`.
   - Copiar o access token de teste e o secret de webhook.
   - O codigo de verificacao do usuario de teste nao e o secret do webhook.
   - Como o access token ja foi compartilhado no chat, rotacione o token antes de producao.

3. Environment variables na Vercel.
   - `SHOP_ENV=test`
   - `SITE_URL=https://SEU_DOMINIO`
   - `MERCADOPAGO_ACCESS_TOKEN=APP_USR...` ou token de teste
   - `MERCADOPAGO_WEBHOOK_SECRET=...`
   - `SHOP_DELIVERY_SECRET=um_token_longo_aleatorio`
   - `SHOP_TEST_COUPON=um_cupom_secreto_temporario` apenas durante testes de entrega sem pagamento.
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
$env:SHOP_SITE_URL="https://SEU_DOMINIO"
$env:SHOP_DELIVERY_SECRET="mesmo_valor_da_vercel"
$env:SHOP_DRY_RUN="true"
npm run shop:worker
```

Modo RCON:

```powershell
$env:SHOP_SITE_URL="https://SEU_DOMINIO"
$env:SHOP_DELIVERY_SECRET="mesmo_valor_da_vercel"
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

Se o plugin de economia usa outro comando, altere `lib/coruja-shop-store.js` antes do teste real.

## Checklist antes de publicar

- Compra teste cria checkout.
- Cupom de teste cria entrega pendente sem Mercado Pago.
- Webhook recebe evento assinado.
- Pedido pago vira entrega pendente.
- Worker em dry-run busca e marca entrega.
- Worker em RCON executa comando em uma conta teste.
- Pedido pago nao entrega duas vezes se webhook repetir.
