# Coruja Cup - Deploy das Inscricoes

O hub ja possui a pagina publica em `/coruja-cup/`, admin em `/coruja-cup/admin/` e rotas Cloudflare Pages Functions em `/api/coruja-cup/*`.

Para as inscricoes funcionarem em producao:

1. Hospedar o hub em Cloudflare Pages ou conectar essas Functions ao deploy existente.
2. Criar um KV namespace no Cloudflare.
3. Adicionar o binding do KV com o nome `CORUJA_CUP`.
4. Criar uma variavel secreta `CORUJA_CUP_ADMIN_TOKEN` para proteger o admin.

Rotas usadas:

- `GET /api/coruja-cup/status?eventId=poison-edition-001`
- `POST /api/coruja-cup/register`
- `GET /api/coruja-cup/registrations?eventId=poison-edition-001`
- `GET /api/coruja-cup/registrations?eventId=poison-edition-001&format=csv`

O CSV e exportado pelo admin usando o token via header `Authorization: Bearer`.
