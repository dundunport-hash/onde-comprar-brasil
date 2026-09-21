param(
  [string]$EnvFile = ".env.staging",
  [string]$ComposeFile = "docker-compose.staging.yml",
  [string]$HealthUrl = "http://127.0.0.1:3001/api/health"
)

$ErrorActionPreference = "Stop"

function Assert-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name nao encontrado no PATH."
  }
}

Assert-Command "docker"

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Arquivo $EnvFile nao encontrado. Crie a partir de .env.staging.example."
}

if (-not (Test-Path -LiteralPath $ComposeFile)) {
  throw "Arquivo $ComposeFile nao encontrado."
}

Write-Host "Validando staging antes do deploy..."
npm run prod:check

Write-Host "Subindo staging com Docker Compose..."
docker compose --env-file $EnvFile -f $ComposeFile up --build -d

Write-Host "Aguardando healthcheck..."
$deadline = (Get-Date).AddSeconds(90)
do {
  try {
    $response = Invoke-WebRequest -UseBasicParsing $HealthUrl -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
      Write-Host "Staging online: $HealthUrl"
      exit 0
    }
  } catch {
    Start-Sleep -Seconds 3
  }
} while ((Get-Date) -lt $deadline)

docker compose --env-file $EnvFile -f $ComposeFile ps
throw "Staging nao respondeu com sucesso em $HealthUrl."
