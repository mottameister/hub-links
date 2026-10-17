"""Read-only P2S camera bridge. Connection secrets arrive on stdin, never in logs."""
import sys, pathlib, json, time, io, urllib.request, urllib.error, logging, logging.handlers
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / '.camera-runtime'))
import av
av.logging.set_level(av.logging.PANIC)
log = logging.getLogger('print-camera')
log.setLevel(logging.INFO)
handler = logging.handlers.RotatingFileHandler(pathlib.Path(__file__).resolve().parents[1] / '.camera-local' / 'bridge.log', maxBytes=200000, backupCount=2)
handler.setFormatter(logging.Formatter('%(asctime)s %(message)s'))
log.addHandler(handler)
config = json.loads(sys.stdin.readline())
from urllib.parse import quote
url = 'rtsps://bblp:' + quote(config['code'], safe='') + '@' + config['ip'] + ':322/streaming/live/1'
endpoint = config.get('endpoint', 'https://mottameister-services-api.mottameister.xyz/api/fila-3d/camera')
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
                req = urllib.request.Request(endpoint, data=data.getvalue(), headers={'Content-Type':'image/jpeg', 'User-Agent':'MottameisterCamera/1.0', 'Authorization':'Bearer ' + config['token']}, method='POST')
                try:
                    with urllib.request.urlopen(req, timeout=15) as response:
                        if response.status == 200: log.info('Camera frame delivered')
                except urllib.error.HTTPError as error:
                    log.warning('Upload HTTP %s; retrying.', error.code)
                except Exception as error:
                    log.warning('Upload unavailable (%s); retrying.', type(error).__name__)
    except Exception:
        log.warning('Printer camera unavailable; retrying in 15 seconds.')
        time.sleep(15)



