# mottameister-home

## Click analytics

O hub registra cliques em links e botoes principais via Cloudflare Worker:
`POST https://mottameister-services-api.mottameister.xyz/api/analytics/click`.
Os eventos sao salvos no Cloudflare D1, sem armazenar IP bruto.

Para consultar um resumo:

```bash
curl -H "Authorization: Bearer $SHOP_ADMIN_TOKEN" "https://mottameister-services-api.mottameister.xyz/api/analytics/click?days=30"
```

Secrets/variaveis recomendadas na Cloudflare:

- `SHOP_ADMIN_TOKEN`: obrigatoria para consultar analytics e admin da lojinha.
- `CLICK_ANALYTICS_ADMIN_TOKEN`: opcional; se ausente, usa `SHOP_ADMIN_TOKEN`.
- `CLICK_ANALYTICS_SALT`: opcional, mas recomendada para gerar hashes de visitantes sem depender do token admin.
HUB for @mottameister content
