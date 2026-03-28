---
name: Run InspectionOS Pipeline
description: Execute the mirroring agent and product-facing handoff builder for a specific jurisdiction slice.
---
# Instructions

When the user asks to run an extraction or build out the pack for a jurisdiction, use this skill to run the necessary bash scripts in the exact expected order.

1. First, read the `d:\Hardened_pack (3)\Hardened_pack\mirror-pack-agent\README.md` to refresh on output directories and constraints.
2. Run the agent using `run_command` and pass the target task: 
   `cd mirror-pack-agent/ && ./scripts/run_claude_agent.sh tasks/<USER_SPECIFIED_TASK>.yaml`
   *Note: On Windows, use `powershell -ExecutionPolicy Bypass -File .\scripts\run_claude_agent.ps1 -TaskFile tasks/<USER_SPECIFIED_TASK>.yaml` if the sh shell is unavailable.*
3. Run the validation:
   `cd mirror-pack-agent/ && python scripts/validate_outputs.py .`
4. Run the handoff generator:
   `cd mirror-pack-agent/ && python scripts/build_product_handoff.py .`
5. Report the generated arrays in `mirror-pack-agent/handoff/` back to the user, identifying which components in `Inspections_OS` can consume them.
