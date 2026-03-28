#!/usr/bin/env bash
set -euo pipefail

TASK_FILE="${1:?usage: ./run_agent.sh tasks/<task>.yaml [workspace]}"
WORKDIR="${2:-$PWD}"

"$WORKDIR/scripts/run_claude_agent.sh" "$TASK_FILE" "$WORKDIR"
