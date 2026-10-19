$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

try {
    Get-Command docker -ErrorAction Stop | Out-Null
    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker is installed but not running. Start Docker Desktop and run this launcher again.'
    }

    $envPath = Join-Path $projectRoot '.env'
    if (-not (Test-Path -LiteralPath $envPath)) {
        & (Join-Path $projectRoot 'ops/prepare-env.ps1')
    }

    Get-Content -LiteralPath $envPath | ForEach-Object {
        if ($_ -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
        }
    }

    $composeArgs = @('-f', 'docker-compose.yml', '-f', 'docker-compose.desktop.yml')
    docker compose @composeArgs config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose configuration is invalid. Check the .env file.' }

    docker compose @composeArgs up --build -d --wait --wait-timeout 180
    if ($LASTEXITCODE -ne 0) { throw 'AISezim did not start. Review the Docker output above.' }

    Write-Host ''
    Write-Host 'AISezim is starting. Open http://localhost:3000.' -ForegroundColor Green
    Write-Host 'The first build may take several minutes while Docker downloads and builds images.'
}
catch {
    Write-Error $_
    exit 1
}

Read-Host 'Press Enter to close this window' | Out-Null
