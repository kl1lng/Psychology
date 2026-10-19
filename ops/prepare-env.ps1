param([string]$Domain = "localhost")
$ErrorActionPreference = "Stop"
$envPath = Join-Path (Split-Path -Parent $PSScriptRoot) ".env"
if (Test-Path -LiteralPath $envPath) {
  throw "A .env file already exists. It was left unchanged."
}

function New-RandomHexSecret {
  $bytes = [byte[]]::new(32)
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  return [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
}

$corsOrigins = if ($Domain -eq "localhost") { "http://localhost:3000" } else { "https://$Domain" }
$contents = @(
  "POSTGRES_PASSWORD=$(New-RandomHexSecret)"
  "POSTGREST_DB_PASSWORD=$(New-RandomHexSecret)"
  "JWT_SECRET_KEY=$(New-RandomHexSecret)"
  "INTERNAL_DATABASE_JWT_SECRET=$(New-RandomHexSecret)"
  "DOMAIN=$Domain"
  "CORS_ORIGINS=$corsOrigins"
) -join "`n"
[System.IO.File]::WriteAllText($envPath, $contents + "`n", [System.Text.UTF8Encoding]::new($false))
Write-Host "Created a private .env with four random secrets. Keep it out of Git."
