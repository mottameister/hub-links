# mottameister-home

## Click analytics

O hub registra cliques em links e botoes principais via `POST /api/analytics/click`.
Os eventos sao salvos no Vercel Blob em JSON privado, sem armazenar IP bruto.

Para consultar um resumo:

```bash
curl -H "Authorization: Bearer $SHOP_ADMIN_TOKEN" "https://mottameister.xyz/api/analytics/click?days=30"
```

Variaveis recomendadas na Vercel:

- `BLOB_READ_WRITE_TOKEN`: obrigatoria para gravar eventos.
- `CLICK_ANALYTICS_ADMIN_TOKEN`: opcional; se ausente, usa `SHOP_ADMIN_TOKEN` ou `CORUJA_CUP_ADMIN_TOKEN`.
- `CLICK_ANALYTICS_SALT`: opcional, mas recomendada para gerar hashes de visitantes sem depender do token admin.
HUB for @mottameister content
