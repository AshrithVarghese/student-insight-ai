param(
    [string]$Space = "Ashrith-Varghese/student-insight-ai-ml"
)

# Deploys the staged ML service to a Hugging Face Space.
#
# Hugging Face removed password login - you MUST use a USER ACCESS TOKEN
# (role: Write). Create one at  https://huggingface.co/settings/tokens
# Do NOT enter your email as the username: HF only checks the token, so the
# script uses a fixed placeholder username ("user") to avoid email addresses
# (which contain @) breaking the git URL.

$ErrorActionPreference = "Stop"

$src = $PSScriptRoot
$tmp = Join-Path $env:TEMP "hf-space-$(Get-Random)"

function Get-PlainText([System.Security.SecureString]$sec) {
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try { [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

Write-Host ""
Write-Host "Create a WRITE token first: https://huggingface.co/settings/tokens"
$token = Get-PlainText (Read-Host -AsSecureString "  HF write token (hidden)")

# Fixed username is fine - Hugging Face authenticates by token only.
$authUrl = "https://user:${token}@huggingface.co/spaces/$Space"
$cleanUrl = "https://huggingface.co/spaces/$Space"

Write-Host "1/4 Cloning Space"
git -c credential.helper= clone $authUrl $tmp
if ($LASTEXITCODE -ne 0) { throw "Clone failed - is the token valid and role=Write?" }
git -C $tmp remote set-url origin $cleanUrl
Write-Host "    ok (token scrubbed from local repo config)"

Write-Host "2/4 Copying ML service files"
robocopy $src $tmp /E /XD ".git" /XF "push.ps1" "sync.ps1" /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -gt 7) { throw "File copy failed (robocopy exit $LASTEXITCODE)." }

Write-Host "3/4 Committing"
git -C $tmp add -A
git -C $tmp commit -m "Deploy ML service (FastAPI + InsightFace)"
if ($LASTEXITCODE -ne 0) { throw "Commit failed." }

Write-Host "4/4 Pushing (this triggers the Space build)"
git -C $tmp -c credential.helper= push $authUrl HEAD:main
if ($LASTEXITCODE -ne 0) { throw "Push failed." }

Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Deployed. The Space is building now:"
Write-Host "  https://huggingface.co/spaces/$Space"
Write-Host "First boot downloads the buffalo_l model (~few min)."
Write-Host "Then verify:  https://$($Space -replace '/', '-').hf.space/health"