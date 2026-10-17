$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$local = Join-Path $project '.camera-local'
$config = Get-Content (Join-Path $local 'config.json') -Raw | ConvertFrom-Json
$secure = Import-Clixml (Join-Path $local 'upload-token.xml')
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$raw = (Get-Content "$env:APPDATA/BambuStudio/BambuStudio.conf" -Raw) -replace '(?m)^# MD5 checksum.*$', ''
$bambu = $raw | ConvertFrom-Json
$code = $bambu.access_code.PSObject.Properties | Select-Object -First 1 -ExpandProperty Value
if (-not $code) { throw 'Bambu Studio has no saved access code.' }
@{ip=$config.ip;code=$code;token=$token;endpoint=$config.endpoint} | ConvertTo-Json -Compress | & C:/Python314/python.exe (Join-Path $PSScriptRoot 'print-camera-bridge.py')
