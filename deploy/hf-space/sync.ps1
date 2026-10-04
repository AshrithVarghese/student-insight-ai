# Syncs the inference code and committed models from ml-service into the
# Hugging Face Space staging folder so it stays in sync with development.
# Run from this folder:  powershell -ExecutionPolicy Bypass -File .\sync.ps1

$ErrorActionPreference = "Stop"

$src = Resolve-Path "..\..\ml-service"
$dst = $PSScriptRoot

if (-not (Test-Path $src)) {
    throw "ml-service not found at $src"
}

# Files
foreach ($item in @("requirements.txt", ".env.example")) {
    $p = Join-Path $src $item
    if (Test-Path $p) { Copy-Item -LiteralPath $p -Destination $dst -Force }
}

# Directories (training code intentionally excluded - inference only)
foreach ($dir in @("app", "models")) {
    $p = Join-Path $src $dir
    if (-not (Test-Path $p)) { continue }
    $target = Join-Path $dst $dir
    # Clean the destination then copy fresh to avoid stale files
    if (Test-Path $target) { Remove-Item -LiteralPath $target -Recurse -Force }
    Copy-Item -LiteralPath $p -Destination $target -Recurse -Force
}

# Remove compiled bytecode caches
Get-ChildItem -Path $dst -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force

Write-Host "Synced ml-service -> $dst"
Write-Host "Next: git add -A; git commit; git push in the Space repo."