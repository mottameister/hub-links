const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
export async function handlePrintQueue(request, env) {
  const path = new URL(request.url).pathname.replace(/\/$/, '');
  const match = path.match(/^\/api\/fila-3d(?:\/([a-f0-9-]{36}))?$/);
  if (!match) return reply({ error: 'Pedido não encontrado.' }, 404);
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) return reply({ error: 'Método não permitido.' }, 405);
  if (request.method !== 'GET') {
    const origin = request.headers.get('Origin');
    if (origin && !['https://mottameister.xyz', 'https://www.mottameister.xyz', 'http://127.0.0.1:5173', 'http://localhost:5173'].includes(origin)) return reply({ error: 'Origem não permitida.' }, 403);
    if (request.method !== 'DELETE' && !request.headers.get('Content-Type')?.includes('application/json')) return reply({ error: 'Envie JSON.' }, 415);
  }
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS print_queue (id TEXT PRIMARY KEY, name TEXT NOT NULL, link TEXT NOT NULL DEFAULT '', priority INTEGER NOT NULL, owner TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', created_at TEXT NOT NULL, filament_color TEXT NOT NULL DEFAULT '')`).run();
  const columns = await env.DB.prepare('PRAGMA table_info(print_queue)').all();
  if (!columns.results.some(column => column.name === 'filament_color')) {
    try { await env.DB.prepare("ALTER TABLE print_queue ADD COLUMN filament_color TEXT NOT NULL DEFAULT ''").run(); }
    catch (error) { if (!/duplicate column name/i.test(error.message)) throw error; }
  }
  const id = match[1];
  if (request.method === 'GET' && !id) {
    const { results } = await env.DB.prepare(`SELECT * FROM print_queue ORDER BY CASE status WHEN 'printing' THEN 0 WHEN 'queued' THEN 1 ELSE 2 END, priority DESC, created_at ASC, id ASC`).all();
    return reply({ items: results });
  }
  if (request.method === 'POST' && !id) {
    let body; try { body = await request.json(); } catch { return reply({ error: 'Cadastro inválido.' }, 400); }
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const link = typeof body?.link === 'string' ? body.link.trim() : '';
    const owner = typeof body?.owner === 'string' ? body.owner.trim() : '';
    const color = typeof body?.filament_color === 'string' ? body.filament_color.trim() : '';
    if (color.length > 80) return reply({ error: 'A cor deve ter até 80 caracteres.' }, 400);
    if (!name || name.length > 120 || link.length > 2048 || ![1, 2, 3].includes(body.priority) || !owner || owner.length > 60) return reply({ error: 'Confira nome, prioridade e quem está pedindo.' }, 400);
    if (link) { try { if (!['https:', 'http:'].includes(new URL(link).protocol)) throw new Error(); } catch { return reply({ error: 'Use um link completo, começando com https://.' }, 400); } }
    await env.DB.prepare('INSERT INTO print_queue (id, name, link, priority, owner, created_at, filament_color) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), name, link, body.priority, owner, new Date().toISOString(), color).run();
    return reply({ ok: true }, 201);
  }
  if (id && ['PATCH', 'DELETE'].includes(request.method)) {
    let result;
    if (request.method === 'DELETE') result = await env.DB.prepare('DELETE FROM print_queue WHERE id = ?').bind(id).run();
    else {
      let body; try { body = await request.json(); } catch { return reply({ error: 'Alteração inválida.' }, 400); }
      if (!['queued', 'printing', 'done'].includes(body?.status)) return reply({ error: 'Status inválido.' }, 400);
      result = await env.DB.prepare('UPDATE print_queue SET status = ? WHERE id = ?').bind(body.status, id).run();
    }
    return result.meta.changes ? reply({ ok: true }) : reply({ error: 'Esse pedido já foi removido.' }, 404);
  }
  return reply({ error: 'Ação não permitida.' }, 405);
}
