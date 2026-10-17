const $ = (id) => document.getElementById(id);
const endpoint = '/api/fila-3d';
let loading = false;
async function api(path = '', options = {}) {
  const response = await fetch(endpoint + path, { ...options, headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível salvar. Tente novamente.');
  return data;
}
function card(item, index) {
  const el = document.createElement('article'); el.className = 'card';
  el.innerHTML = '<span class="number"></span><div class="info"><h3></h3><div class="meta"><span class="badge"></span><span class="owner"></span></div></div><div class="actions"><select aria-label="Status da impressão"><option value="queued">Na fila</option><option value="printing">Imprimindo</option><option value="done">Concluído</option></select><button class="quiet remove" aria-label="Excluir pedido">×</button></div>';
  el.querySelector('.number').textContent = String(index + 1).padStart(2, '0');
  el.querySelector('h3').textContent = item.name;
  const badge = el.querySelector('.badge'); badge.textContent = ['', 'Sem pressa', 'Normal', 'Quero logo!'][item.priority]; badge.classList.add('p' + item.priority);
  el.querySelector('.owner').textContent = item.owner;
  if (item.link) {
    try { const url = new URL(item.link); if (['https:', 'http:'].includes(url.protocol)) { const a = document.createElement('a'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Ver projeto ↗'; el.querySelector('.meta').append(a); } } catch {}
  }
  const select = el.querySelector('select'); select.value = item.status;
  select.addEventListener('change', async () => { select.disabled = true; try { await api('/' + item.id, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); await load(); } catch (e) { select.value = item.status; $('message').textContent = e.message; } finally { select.disabled = false; } });
  const remove = el.querySelector('button'); remove.addEventListener('click', async () => { if (!confirm(`Excluir “${item.name}” da fila?`)) return; remove.disabled = true; try { await api('/' + item.id, { method: 'DELETE' }); await load(); } catch (e) { $('message').textContent = e.message; } finally { remove.disabled = false; } });
  return el;
}
async function load() {
  if (loading) return; loading = true; $('refresh').disabled = true;
  try {
    const { items } = await api(); const active = items.filter(i => i.status !== 'done'), done = items.filter(i => i.status === 'done');
    $('list').replaceChildren(...active.map(card)); $('done').replaceChildren(...done.map(card));
    if (!active.length) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'A fila está livre. Qual vai ser a próxima ideia?'; $('list').append(empty); }
    $('count').textContent = active.length; $('done-count').textContent = `(${done.length})`; $('history').hidden = !done.length; $('message').textContent = '';
  } catch { $('message').textContent = 'Não conseguimos atualizar a fila. Toque em Atualizar para tentar de novo.'; }
  finally { loading = false; $('refresh').disabled = false; }
}
$('add').onclick = () => { $('form-error').textContent = ''; $('dialog').showModal(); };
$('close').onclick = () => $('dialog').close();
$('refresh').onclick = load;
$('form').onsubmit = async (event) => {
  event.preventDefault(); $('save').disabled = true; $('form-error').textContent = '';
  const data = Object.fromEntries(new FormData(event.target)); data.priority = Number(data.priority);
  try { await api('', { method: 'POST', body: JSON.stringify(data) }); event.target.reset(); $('dialog').close(); await load(); }
  catch (e) { $('form-error').textContent = e.message; }
  finally { $('save').disabled = false; }
};
load(); setInterval(() => { if (!document.hidden && !$('dialog').open) load(); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
let cameraBusy = false;
async function updateCamera() {
  if (document.hidden || cameraBusy) return;
  cameraBusy = true;
  try {
    const response = await fetch(endpoint + '/camera?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const blob = await response.blob(); const url = URL.createObjectURL(blob);
    const img = $('camera'); const previous = img.src;
    img.onload = () => { if (previous.startsWith('blob:')) URL.revokeObjectURL(previous); };
    img.src = url; img.hidden = false; $('camera-empty').hidden = true;
    $('camera-state').textContent = 'Atualiza a cada 5 s'; $('camera-state').className = 'camera-state online';
  } catch {
    $('camera').hidden = true; $('camera-empty').hidden = false;
    $('camera-state').textContent = 'Desconectada'; $('camera-state').className = 'camera-state';
  } finally { cameraBusy = false; }
}
updateCamera(); setInterval(updateCamera, 5000);
