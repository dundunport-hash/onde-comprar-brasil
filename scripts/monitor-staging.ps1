param(
  [string]$HealthUrl = "http://127.0.0.1:3001/api/health",
  [int]$IntervalSeconds = 60,
  [int]$FailureThreshold = 3,
  [string]$LogFile = ".monitoring/staging-health.ndjson",
  [switch]$Once
)

$ErrorActionPreference = "Stop"

if ($IntervalSeconds -lt 5) {
  throw "IntervalSeconds deve ser pelo menos 5."
}

if ($FailureThreshold -lt 1) {
  throw "FailureThreshold deve ser pelo menos 1."
}

$logDirectory = Split-Path -Parent $LogFile
if ($logDirectory -and -not (Test-Path -LiteralPath $logDirectory)) {
  New-Item -ItemType Directory -Path $logDirectory | Out-Null
}

function Write-MonitoringRecord($Record) {
  $json = $Record | ConvertTo-Json -Compress -Depth 6
  Add-Content -LiteralPath $LogFile -Value $json

  if ($Record.ok) {
    Write-Host "[$($Record.timestamp)] OK $($Record.statusCode) $($Record.latencyMs)ms $HealthUrl"
  } else {
    Write-Warning "[$($Record.timestamp)] FALHA $($Record.error) $HealthUrl"
  }
}

$consecutiveFailures = 0

do {
  $timestamp = (Get-Date).ToUniversalTime().ToString("o")
  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

  try {
    $response = Invoke-WebRequest -UseBasicParsing $HealthUrl -TimeoutSec 10
    $stopwatch.Stop()

    $isOk = $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
    if ($isOk) {
      $consecutiveFailures = 0
    } else {
      $consecutiveFailures += 1
    }

    Write-MonitoringRecord @{
      timestamp = $timestamp
      ok = $isOk
      statusCode = $response.StatusCode
      latencyMs = [Math]::Round($stopwatch.Elapsed.TotalMilliseconds)
      consecutiveFailures = $consecutiveFailures
      body = $response.Content
    }
  } catch {
    $stopwatch.Stop()
    $consecutiveFailures += 1

    Write-MonitoringRecord @{
      timestamp = $timestamp
      ok = $false
      statusCode = $null
      latencyMs = [Math]::Round($stopwatch.Elapsed.TotalMilliseconds)
      consecutiveFailures = $consecutiveFailures
      error = $_.Exception.Message
    }
  }

  if ($consecutiveFailures -ge $FailureThreshold) {
    throw "Staging indisponivel apos $consecutiveFailures falhas consecutivas em $HealthUrl."
  }

  if (-not $Once) {
    Start-Sleep -Seconds $IntervalSeconds
  }
} while (-not $Once)
