"""Load camera credentials under the current Windows account, without shell arguments."""
import ctypes,json,os,pathlib,xml.etree.ElementTree as ET
from ctypes import wintypes

def load_config():
    root=pathlib.Path(__file__).resolve().parents[1]
    config=json.loads((root/'.camera-local/config.json').read_text(encoding='utf-8-sig'))
    secure=ET.parse(root/'.camera-local/upload-token.xml').find('.//{http://schemas.microsoft.com/powershell/2004/04}SS')
    protected=bytes.fromhex(secure.text)
    class Blob(ctypes.Structure):
        _fields_=[('size',wintypes.DWORD),('data',ctypes.POINTER(ctypes.c_byte))]
    source=ctypes.create_string_buffer(protected)
    incoming=Blob(len(protected),ctypes.cast(source,ctypes.POINTER(ctypes.c_byte)))
    outgoing=Blob()
    if not ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(incoming),None,None,None,None,0,ctypes.byref(outgoing)):
        raise RuntimeError('Cannot decrypt camera upload key for this Windows user')
    try:config['token']=ctypes.string_at(outgoing.data,outgoing.size).decode('utf-16-le')
    finally:
        ctypes.memset(outgoing.data,0,outgoing.size)
        ctypes.windll.kernel32.LocalFree(outgoing.data)
    raw=(pathlib.Path(os.environ['APPDATA'])/'BambuStudio/BambuStudio.conf').read_text(encoding='utf-8-sig')
    bambu=json.loads(raw.split('# MD5 checksum')[0])
    config['code']=next(iter(bambu['access_code'].values()))
    return config
