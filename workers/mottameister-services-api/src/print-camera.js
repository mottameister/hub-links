const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function handlePrintCamera(request, env) {
  if (request.method === 'POST') {
    if (!env.PRINT_CAMERA_TOKEN) return json({error:'Camera not configured'},503);
    if (request.headers.get('Authorization') !== `Bearer ${env.PRINT_CAMERA_TOKEN}`) return json({error:'Unauthorized'},401);
    if (!request.headers.get('Content-Type')?.startsWith('image/jpeg')) return json({error:'JPEG required'},415);
    if (Number(request.headers.get('Content-Length')) > 250000) return json({error:'Frame too large'},413);
    const reader = request.body?.getReader(); if (!reader) return json({error:'Missing frame'},400);
    const chunks=[];let length=0;
    while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>250000){await reader.cancel();return json({error:'Frame too large'},413);}chunks.push(value);}
    const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    if(bytes[0]!==255||bytes[1]!==216||bytes[length-2]!==255||bytes[length-1]!==217) return json({error:'Invalid JPEG'},400);
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    await ensure(env);
    await env.DB.prepare('INSERT INTO print_camera (id, frame, captured_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET frame=excluded.frame,captured_at=excluded.captured_at').bind(btoa(binary),Date.now()).run();
    return json({ok:true});
  }
  if(request.method!=='GET')return json({error:'Method not allowed'},405);
  await ensure(env);
  const row=await env.DB.prepare('SELECT frame,captured_at FROM print_camera WHERE id=1').first();
  if(!row||Date.now()-row.captured_at>60000)return json({error:'Camera offline'},503);
  return new Response(Uint8Array.from(atob(row.frame),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/jpeg','Cache-Control':'no-store','X-Captured-At':String(row.captured_at)}});
}
async function ensure(env){await env.DB.prepare('CREATE TABLE IF NOT EXISTS print_camera (id INTEGER PRIMARY KEY CHECK(id=1), frame TEXT NOT NULL, captured_at INTEGER NOT NULL)').run();}
