param(
    [string]$SeedInput = "docs/source_set/seeds/source_records.seed.yaml",
    [string]$FormSeedInput = "docs/source_set/seeds/form_records.seed.yaml",
    [string]$OutputRoot = "acquired",
    [string[]]$Jurisdiction = @(),
    [string[]]$Program = @(),
    [string[]]$SourceRecordKey = @(),
    [double]$TimeoutSeconds = 30.0,
    [int]$MaxLinkedPdfs = 20,
    [string]$UserAgent = "InspectionOS-Acquisition/1.0"
)

$python = Join-Path $PSScriptRoot "..\\.venv\\Scripts\\python.exe"
if (-not (Test-Path $python)) {
    $python = "python"
}

$arguments = @(
    (Join-Path $PSScriptRoot "acquire_sources.py"),
    "--seed-input", $SeedInput,
    "--form-seed-input", $FormSeedInput,
    "--output-root", $OutputRoot,
    "--timeout-seconds", "$TimeoutSeconds",
    "--max-linked-pdfs", "$MaxLinkedPdfs",
    "--user-agent", $UserAgent
)

foreach ($value in $Jurisdiction) {
    $arguments += @("--jurisdiction", $value)
}
foreach ($value in $Program) {
    $arguments += @("--program", $value)
}
foreach ($value in $SourceRecordKey) {
    $arguments += @("--source-record-key", $value)
}

& $python @arguments
exit $LASTEXITCODE
