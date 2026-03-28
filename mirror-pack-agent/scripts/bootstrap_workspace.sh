#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
mkdir -p "$ROOT/docs/source_set" "$ROOT/logs" "$ROOT/out/pack_registry" "$ROOT/out/field_bindings" "$ROOT/out/unresolved" "$ROOT/out/summary" "$ROOT/handoff/packet_profiles" "$ROOT/handoff/field_binding_matrices" "$ROOT/handoff/mirrored_pack_assets" "$ROOT/handoff/export_overlay_candidates" "$ROOT/handoff/stage_artifact_maps"
chmod +x "$ROOT/scripts/run_claude_agent.sh" || true
chmod +x "$ROOT/scripts/validate_outputs.py" || true
chmod +x "$ROOT/scripts/merge_summaries.py" || true
chmod +x "$ROOT/scripts/build_product_handoff.py" || true

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude CLI not found in PATH. Install/authorize Claude Code before running tasks."
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
  echo "Python not found. Install Python 3.11+ before running tasks."
  exit 1
fi
if [ ! -f "$ROOT/docs/source_set/source_catalog.yaml" ]; then
  echo "Missing docs/source_set/source_catalog.yaml"
  exit 1
fi
python3 "$ROOT/scripts/validate_catalog.py" "$ROOT" >/dev/null
for task in "$ROOT"/tasks/*.yaml; do
  python3 "$ROOT/scripts/preflight_task_inputs.py" "$task" --workspace-root "$ROOT" --acquired-root "$ROOT/acquired" --json >/dev/null || true
done

echo "Workspace bootstrapped and source catalog validated."
