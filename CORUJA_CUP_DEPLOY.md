# Coruja Cup - Deploy das Inscricoes

O hub ja possui a pagina publica em `/coruja-cup/`, admin em `/coruja-cup/admin/` e rotas Vercel Serverless Functions em `/api/coruja-cup/*`.

Para as inscricoes funcionarem em producao:

1. Criar ou conectar um Vercel Blob store ao projeto do hub.
2. Garantir que a env `BLOB_READ_WRITE_TOKEN` exista no projeto.
3. Criar uma variavel secreta `CORUJA_CUP_ADMIN_TOKEN` para proteger o admin.

Rotas usadas:

- `GET /api/coruja-cup/status?eventId=poison-edition-001`
- `POST /api/coruja-cup/register`
- `GET /api/coruja-cup/registrations?eventId=poison-edition-001`
- `GET /api/coruja-cup/registrations?eventId=poison-edition-001&format=csv`

O CSV e exportado pelo admin usando o token via header `Authorization: Bearer`.

Observacao: existe uma versao antiga das rotas em `functions/api/coruja-cup/*` para Cloudflare Pages Functions. O dominio atual roda na Vercel, entao a versao ativa fica em `api/coruja-cup/*`.
