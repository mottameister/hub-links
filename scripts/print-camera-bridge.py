"""Read-only P2S camera bridge. Connection secrets arrive on stdin, never in logs."""
import sys, pathlib, json, time, io, urllib.request
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / '.camera-runtime'))
import av
av.logging.set_level(av.logging.PANIC)
config = json.loads(sys.stdin.readline())
from urllib.parse import quote
url = 'rtsps://bblp:' + quote(config['code'], safe='') + '@' + config['ip'] + ':322/streaming/live/1'
endpoint = config.get('endpoint', 'https://www.mottameister.xyz/api/fila-3d/camera')
while True:
    try:
        with av.open(url, options={'rtsp_transport':'tcp', 'tls_verify':'0'}, timeout=(12, 20)) as stream:
            last = 0
            for frame in stream.decode(video=0):
                if time.monotonic() - last < 5: continue
                last = time.monotonic()
                image = frame.to_image()
                image.thumbnail((640, 360))
                data = io.BytesIO()
                image.save(data, format='JPEG', quality=70)
                req = urllib.request.Request(endpoint, data=data.getvalue(), headers={'Content-Type':'image/jpeg', 'Authorization':'Bearer ' + config['token']}, method='POST')
                try:
                    with urllib.request.urlopen(req, timeout=15) as response:
                        if response.status == 200: print('Camera frame delivered', flush=True)
                except Exception:
                    print('Upload unavailable; retrying.', flush=True)
    except Exception:
        print('Printer camera unavailable; retrying in 15 seconds.', flush=True)
        time.sleep(15)
