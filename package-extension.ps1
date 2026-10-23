# Script para empacotamento da extensão para a Chrome Web Store
$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$manifestPath = Join-Path $repoRoot "manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version

$distDir = Join-Path $repoRoot "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
}

$zipFileName = "looper-for-youtube-v$version.zip"
$zipFilePath = Join-Path $distDir $zipFileName

if (Test-Path $zipFilePath) {
    Remove-Item $zipFilePath -Force
}

$tempStagingDir = Join-Path $distDir "staging"
if (Test-Path $tempStagingDir) {
    Remove-Item $tempStagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempStagingDir | Out-Null

# Copia arquivos essenciais para o pacote da Web Store
Copy-Item (Join-Path $repoRoot "manifest.json") -Destination $tempStagingDir
Copy-Item (Join-Path $repoRoot "content.js") -Destination $tempStagingDir
Copy-Item (Join-Path $repoRoot "content.css") -Destination $tempStagingDir
Copy-Item (Join-Path $repoRoot "icons") -Destination $tempStagingDir -Recurse

# Cria o arquivo ZIP
Compress-Archive -Path "$tempStagingDir\*" -DestinationPath $zipFilePath -CompressionLevel Optimal

# Limpa o diretório de staging
Remove-Item $tempStagingDir -Recurse -Force

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Pacote gerado com sucesso para a Chrome Web Store!" -ForegroundColor Green
Write-Host " Arquivo: $zipFilePath" -ForegroundColor Cyan
Write-Host " Versao:  $version" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
