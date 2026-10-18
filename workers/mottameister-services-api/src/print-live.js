const base = '/api/fila-3d/camera/live/';
const respond = (error, status) => new Response(JSON.stringify({error}), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function handlePrintLive(request, env) {
  const name = new URL(request.url).pathname.slice(base.length);
  const playlist = name === 'index.m3u8';
  if (!playlist && !/^s\d{13}_\d+\.ts$/.test(name)) return respond('Not found',404);
  if (!['GET','POST'].includes(request.method)) return respond('Method not allowed',405);
  if(request.method==='POST'){
    if(!env.PRINT_CAMERA_TOKEN || request.headers.get('Authorization')!==`Bearer ${env.PRINT_CAMERA_TOKEN}`)return respond('Unauthorized',401);
    const limit=playlist?65536:1500000;
    if(Number(request.headers.get('Content-Length'))>limit)return respond('Too large',413);
    const reader=request.body?.getReader();if(!reader)return respond('Missing data',400);
    let size=0;const chunks=[];
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();return respond('Too large',413);}chunks.push(value);}
    const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
    if(playlist){
      const text=new TextDecoder().decode(data);
      if(!text.startsWith('#EXTM3U') || /URI=|https?:|\.\./i.test(text) || text.split(/\r?\n/).some(line=>line&&!line.startsWith('#')&&!/^s\d{13}_\d+\.ts$/.test(line)))return respond('Invalid playlist',400);
    }else if(data.length<188||data[0]!==0x47||data.length%188!==0)return respond('Invalid segment',400);
    await ensure(env);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO print_camera_live (name,data,updated_at) VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(name,data.buffer,Date.now()),
      env.DB.prepare("DELETE FROM print_camera_live WHERE name != 'index.m3u8' AND name NOT IN (SELECT name FROM print_camera_live WHERE name != 'index.m3u8' ORDER BY updated_at DESC LIMIT 18)")
    ]);
    return new Response('{"ok":true}',{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }
  await ensure(env);
  const row=await env.DB.prepare('SELECT data,updated_at FROM print_camera_live WHERE name=?').bind(name).first();
  if(!row||Date.now()-row.updated_at>(playlist?20000:120000))return respond('Camera offline',503);
  return new Response(new Uint8Array(row.data),{headers:{'Content-Type':playlist?'application/vnd.apple.mpegurl':'video/mp2t','Cache-Control':playlist?'no-store':'public, max-age=60, immutable','X-Captured-At':String(row.updated_at)}});
}
async function ensure(env){await env.DB.prepare('CREATE TABLE IF NOT EXISTS print_camera_live (name TEXT PRIMARY KEY,data BLOB NOT NULL,updated_at INTEGER NOT NULL)').run();}
