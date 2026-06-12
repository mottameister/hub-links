# Coruja Cup - Deploy das Inscricoes

O hub possui a pagina publica em `/coruja-cup/`, admin em `/coruja-cup/admin/` e rotas em `/api/coruja-cup/*`.

O backend oficial das inscricoes roda em Cloudflare Workers + KV.

Endpoint ativo:

- `https://coruja-cup-api.mottameister.xyz/api/coruja-cup/*`

Tambem existem Worker Routes configuradas para `mottameister.xyz/api/coruja-cup/*` e `www.mottameister.xyz/api/coruja-cup/*`, mas elas so interceptam se o DNS do host estiver proxied pela Cloudflare. Como o dominio principal esta servindo pela Vercel, o frontend aponta explicitamente para o Custom Domain do Worker.

Recursos:

- Worker: `coruja-cup-api`
- KV binding: `CORUJA_CUP`
- Secret: `CORUJA_CUP_ADMIN_TOKEN`
- Evento atual: `coruja-cup-2026-06-28`
- Capacidade: 9 vagas

Rotas usadas:

- `GET /api/coruja-cup/status?eventId=coruja-cup-2026-06-28`
- `POST /api/coruja-cup/register`
- `GET /api/coruja-cup/registrations?eventId=coruja-cup-2026-06-28`
- `GET /api/coruja-cup/registrations?eventId=coruja-cup-2026-06-28&format=csv`

O CSV e exportado pelo admin usando o token via header `Authorization: Bearer`.

Deploy manual, se precisar:

1. Criar um namespace KV e colocar o ID em `workers/coruja-cup-api/wrangler.jsonc`.
2. Configurar o secret `CORUJA_CUP_ADMIN_TOKEN`.
3. Rodar `wrangler deploy` dentro de `workers/coruja-cup-api`.

As rotas Vercel antigas em `api/coruja-cup/*` permanecem no repo apenas como fallback historico, mas dependem do Vercel Blob e nao sao mais o caminho recomendado.
