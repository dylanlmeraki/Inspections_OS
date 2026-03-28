param(
    [Parameter(Mandatory = $true)]
    [string]$TaskFile,
    [Parameter(Mandatory = $false)]
    [string]$Workspace = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$PromptFile = Join-Path $Workspace "agent_prompts\mirror_pack_resolver_sonnet45.md"
$LogDir = Join-Path $Workspace "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (Test-Path (Join-Path $Workspace ".venv\Scripts\python.exe")) {
    $PythonBin = Join-Path $Workspace ".venv\Scripts\python.exe"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $PythonBin = (Get-Command python3).Source
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $PythonBin = (Get-Command python).Source
} else {
    Write-Error "Python not found. Expected .venv\Scripts\python.exe, python3, or python."
}

$ClaudeModel = if ($env:CLAUDE_MODEL) { $env:CLAUDE_MODEL } else { "sonnet" }
$TaskBasename = [System.IO.Path]::GetFileNameWithoutExtension($TaskFile)
$RunLog = Join-Path $LogDir "$TaskBasename.json"

$TaskContent = Get-Content -Path $TaskFile -Raw -Encoding UTF8
$PromptContent = Get-Content -Path $PromptFile -Raw -Encoding UTF8

$PreflightArgs = @(
    (Join-Path $Workspace "scripts\preflight_task_inputs.py"),
    $TaskFile,
    "--workspace-root",
    $Workspace,
    "--acquired-root",
    (Join-Path $Workspace "acquired"),
    "--json"
)

$PreflightReport = & $PythonBin @PreflightArgs 2>&1
if ($LASTEXITCODE -ne 0) {
    $PreflightReport | Out-String | Write-Host
    Write-Error "Task preflight failed. Fix unresolved inputs above before running the mirror agent."
}

$PromptPayload = @"
$PromptContent

# TASK PREFLIGHT
$PreflightReport

# TASK MANIFEST
$TaskContent
"@

Push-Location $Workspace
try {
    claude -p $PromptPayload `
      --model $ClaudeModel `
      --allowedTools "Bash,Read,Write,Grep,Glob" `
      --permission-mode acceptEdits `
      --output-format json | Tee-Object -FilePath $RunLog
    if ($LASTEXITCODE -ne 0) {
        throw "Claude CLI failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

Write-Host "Run complete. Validate outputs with: python scripts/validate_outputs.py ."
Write-Host "Build handoff artifacts with: python scripts/build_product_handoff.py ."
