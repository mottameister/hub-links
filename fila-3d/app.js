import Hls from 'hls.js/dist/hls.light.mjs';
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

const video = $('camera');
const liveUrl = endpoint + '/camera/live/index.m3u8';
let player = null, starting = false, lastProgress = 0, previousTime = -1;
function cameraState(online, text) {
  $('camera-state').textContent = text;
  $('camera-state').className = 'camera-state' + (online ? ' online' : '');
  video.hidden = !online; $('camera-empty').hidden = online;
}
function stopCamera() {
  if (player) { player.destroy(); player = null; }
  video.pause(); video.removeAttribute('src'); video.load();
  lastProgress = 0; previousTime = -1;
}
async function startCamera() {
  if (starting || document.hidden) return;
  starting = true;
  try {
    const response = await fetch(liveUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error();
    stopCamera(); cameraState(false, 'Conectando…');
    if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = liveUrl;
    else if (Hls.isSupported()) {
      player = new Hls({ enableWorker: false, liveSyncDurationCount: 2, liveMaxLatencyDurationCount: 5, maxBufferLength: 15, backBufferLength: 10 });
      player.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) { stopCamera(); cameraState(false, 'Reconectando…'); } });
      player.loadSource(liveUrl); player.attachMedia(video);
    } else {
      $('camera-empty').querySelector('strong').textContent = 'Este navegador não reproduz o vídeo.';
      cameraState(false, 'Indisponível'); return;
    }
    lastProgress = Date.now();
    video.play().catch(() => cameraState(true, 'Toque para assistir'));
  } catch { stopCamera(); cameraState(false, 'Desconectada'); }
  finally { starting = false; }
}
video.addEventListener('playing', () => { lastProgress = Date.now(); cameraState(true, 'Ao vivo'); });
video.addEventListener('error', () => { cameraState(false, 'Desconectada'); });
video.addEventListener('timeupdate', () => {
  if (Math.abs(video.currentTime - previousTime) > .1) { previousTime = video.currentTime; lastProgress = Date.now(); cameraState(true, 'Ao vivo'); }
});
setInterval(() => {
  if (!video.hidden && video.paused) return;
  if (!document.hidden && (!lastProgress || Date.now() - lastProgress > 15000)) startCamera();
}, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); else startCamera(); });
startCamera();
