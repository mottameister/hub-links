$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot "..\.env.worker"
if (-not (Test-Path -LiteralPath $envPath)) {
  throw "Crie o arquivo .env.worker a partir de .env.worker.example antes de iniciar o worker."
}

Get-Content -LiteralPath $envPath | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) {
    return
  }

  $parts = $line.Split("=", 2)
  if ($parts.Length -ne 2) {
    return
  }

  [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
}

npm run shop:worker

