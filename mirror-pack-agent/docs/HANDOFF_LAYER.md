# Product-facing handoff layer

After a task slice is completed and validated, run:

```bash
python scripts/build_product_handoff.py .
```

This creates the following artifacts for the real product build:

- `handoff/packet_profiles/<task>.yaml`
- `handoff/field_binding_matrices/<task>.csv`
- `handoff/mirrored_pack_assets/<task>.yaml`
- `handoff/export_overlay_candidates/<task>.yaml`
- `handoff/stage_artifact_maps/<task>.yaml`

## Purpose

These files bridge the grunt-work mirror agent and the real runtime codebase.

### Packet profiles
Runtime-oriented summary of jurisdictions, stages, roles, fallback behavior, and readiness.

### Field binding matrices
Human-reviewable CSV for canonical-to-packet field coverage.

### Mirrored pack asset registry
Clean list of asset classifications and acquisition states.

### Export overlay candidates
Early list of which assets are usable for direct overlay or fallback composition.

### Stage artifact maps
Stage-specific artifact and packet-role map for the packet-profile resolver and gate engine.
