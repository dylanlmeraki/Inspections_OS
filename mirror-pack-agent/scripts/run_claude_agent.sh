#!/usr/bin/env bash
set -euo pipefail

TASK_FILE="${1:?usage: ./scripts/run_claude_agent.sh tasks/<task>.yaml [workspace]}"
WORKDIR="${2:-$PWD}"
PROMPT_FILE="$WORKDIR/agent_prompts/mirror_pack_resolver_sonnet45.md"
LOG_DIR="$WORKDIR/logs"
mkdir -p "$LOG_DIR"

if [ -x "$WORKDIR/.venv/Scripts/python.exe" ]; then
  PYTHON_BIN="$WORKDIR/.venv/Scripts/python.exe"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
else
  echo "Python not found. Expected .venv/Scripts/python.exe, python3, or python."
  exit 1
fi

CLAUDE_MODEL="${CLAUDE_MODEL:-sonnet}"
TASK_BASENAME="$(basename "$TASK_FILE" .yaml)"
RUN_LOG="$LOG_DIR/${TASK_BASENAME}.json"

TASK_CONTENT="$(cat "$TASK_FILE")"
PROMPT_CONTENT="$(cat "$PROMPT_FILE")"
if ! PREFLIGHT_REPORT="$($PYTHON_BIN "$WORKDIR/scripts/preflight_task_inputs.py" "$TASK_FILE" --workspace-root "$WORKDIR" --acquired-root "$WORKDIR/acquired" --json)"; then
  printf '%s\n' "$PREFLIGHT_REPORT"
  echo "Task preflight failed. Fix unresolved inputs above before running the mirror agent."
  exit 1
fi

claude -p "$(cat <<PROMPT
$PROMPT_CONTENT

# TASK PREFLIGHT
$PREFLIGHT_REPORT

# TASK MANIFEST
$TASK_CONTENT
PROMPT
)" \
  --model "$CLAUDE_MODEL" \
  --allowedTools "Bash,Read,Write,Grep,Glob" \
  --permission-mode acceptEdits \
  --output-format json \
  --cwd "$WORKDIR" | tee "$RUN_LOG"

echo "Run complete. Validate outputs with: ./scripts/validate_outputs.py ."
echo "Build handoff artifacts with: ./scripts/build_product_handoff.py ."
