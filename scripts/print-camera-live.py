"""Read-only P2S HLS bridge. Credentials arrive on stdin and stay out of logs."""
import sys,pathlib,json,time,urllib.request,urllib.error,logging,logging.handlers,threading,tempfile,re
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'.camera-runtime'))
import av
av.logging.set_level(av.logging.PANIC)
root=pathlib.Path(__file__).resolve().parents[1]
log=logging.getLogger('print-camera-live');log.setLevel(logging.INFO)
handler=logging.handlers.RotatingFileHandler(root/'.camera-local/live.log',maxBytes=200000,backupCount=2)
handler.setFormatter(logging.Formatter('%(asctime)s %(message)s'));log.addHandler(handler)
config=json.loads(sys.stdin.readline())
from urllib.parse import quote
url='rtsps://bblp:'+quote(config['code'],safe='')+'@'+config['ip']+':322/streaming/live/1'
endpoint=config.get('endpoint','https://mottameister-services-api.mottameister.xyz/api/fila-3d/camera').rstrip('/')+'/live/'
def upload(name,data):
    req=urllib.request.Request(endpoint+name,data=data,headers={'Content-Type':'application/vnd.apple.mpegurl' if name.endswith('.m3u8') else 'video/mp2t','User-Agent':'MottameisterCamera/1.0','Authorization':'Bearer '+config['token']},method='POST')
    with urllib.request.urlopen(req,timeout=12) as response:
        if response.status!=200:raise RuntimeError('Upload rejected')
def publisher(folder,stop):
    sent=set();last=None
    while not stop.wait(.2):
        try:
            playlist=(folder/'index.m3u8').read_text()
            if playlist==last:continue
            names=[line for line in playlist.splitlines() if line and not line.startswith('#')]
            if len(names)<2:continue
            for name in names:
                if name not in sent:
                    upload(name,(folder/name).read_bytes());sent.add(name)
            upload('index.m3u8',playlist.replace('#EXT-X-ENDLIST','').encode())
            sent.intersection_update(names);last=playlist
            log.info('Live playlist delivered; %s segments',len(names))
        except FileNotFoundError:pass
        except urllib.error.HTTPError as error:log.warning('Upload HTTP %s; retrying',error.code);stop.wait(2)
        except Exception as error:log.warning('Upload unavailable (%s); retrying',type(error).__name__);stop.wait(2)
while True:
    try:
        with tempfile.TemporaryDirectory(prefix='live-',dir=root/'.camera-local') as directory:
            folder=pathlib.Path(directory);stop=threading.Event()
            worker=threading.Thread(target=publisher,args=(folder,stop),daemon=True);worker.start()
            try:
                with av.open(url,options={'rtsp_transport':'tcp','tls_verify':'0'},timeout=(12,20)) as src:
                    prefix='s'+str(int(time.time()*1000))+'_'
                    with av.open(str(folder/'index.m3u8'),'w',format='hls',options={'hls_time':'2','hls_list_size':'6','hls_start_number_source':'epoch','hls_flags':'delete_segments+independent_segments+temp_file','hls_segment_filename':str(folder/(prefix+'%d.ts'))}) as dst:
                        video=src.streams.video[0];out=dst.add_stream_from_template(video)
                        log.info('Printer video connected')
                        for packet in src.demux(video):
                            if packet.dts is None:continue
                            packet.stream=out;dst.mux(packet)
            finally:
                stop.set();worker.join(timeout=30)
    except Exception as error:
        log.warning('Camera unavailable (%s); retrying in 10 seconds',type(error).__name__);time.sleep(10)
