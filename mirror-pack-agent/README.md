# InspectionOS Mirror Agent Bundle + Seed Acquisition Pipeline

This workspace now has three related jobs:

1. `scripts/acquire_sources.py` is the upstream acquisition pipeline. It crawls seeded public sources, downloads official PDFs or page snapshots, fingerprints them, and emits enriched metadata under `acquired/`.
2. `scripts/run_claude_agent.sh` is the downstream Claude slice runner. It resolves mirrored pack candidates, field-binding candidates, and unresolved acquisition gaps for one jurisdiction/program/stage slice at a time.
3. `scripts/build_product_handoff.py` converts validated agent outputs into product-facing handoff artifacts for the real build.

The mirror agent remains intentionally narrow. It does **not** build product code. It produces machine-usable outputs that can feed the real runtime layer.

## What changed in this hardened bundle

- Added `docs/source_set/source_catalog.yaml` with canonical keys, aliases, version/substitution metadata, and task eligibility.
- Upgraded preflight resolution order to:
  1. exact path
  2. canonical catalog key
  3. catalog alias
  4. normalized filename
  5. acquired resolution index
- Tightened the output schemas.
- Replaced shallow validation with real schema validation plus duplicate/collision checks.
- Added readiness scoring to pack outputs.
- Expanded acquisition state vocabulary.
- Added product-facing handoff generation.

## Recommended workflow

1. Unzip this bundle into a clean workspace.
2. Install Python dependencies with `pip install -r requirements.txt` and optionally `pip install -r requirements-dev.txt`.
3. Review and update `docs/source_set/source_catalog.yaml` if you add or rename source files.
4. Run bootstrap:
   - `./scripts/bootstrap_workspace.sh`
5. Run the acquisition pipeline first if needed:
   - `python scripts/acquire_sources.py --output-root acquired`
6. Review:
   - `acquired/reports/acquisition_summary.json`
   - `acquired/reports/source_records.enriched.yaml`
   - `acquired/reports/form_records.enriched.yaml`
   - `acquired/reports/resolution_index.json`
7. Run exactly one task slice with:
   - `./scripts/run_claude_agent.sh tasks/<task>.yaml`
   - On Windows PowerShell: `.\scripts\run_claude_agent.ps1 -TaskFile tasks/<task>.yaml -Workspace .`
8. Validate outputs with:
   - `python scripts/validate_outputs.py .`
9. Build product-facing handoff artifacts with:
   - `python scripts/build_product_handoff.py .`
10. Send back the `out/` folder, `handoff/` folder, and the exact task YAML that was run.

## Source documents to place in `docs/source_set/`

Use `docs/source_set/source_catalog.yaml` as the canonical source inventory. Tasks may ask for a newer file name than the bundle currently includes; the catalog resolves version substitutions explicitly and reports that substitution in preflight.

## Acquisition states

The acquisition layer now uses these main statuses:

- `direct_mirror_downloaded`
- `source_reference_verified`
- `html_page_snapshotted`
- `pdf_link_discovered_not_downloaded`
- `requires_manual_login`
- `requires_manual_review`
- `ambiguous_source`
- `superseded_source`
- `obsolete_source`
- `http_error`
- `wrong_content_type`
- `fetch_failed`

## Output folders

The agent may write only to:
- `out/pack_registry/`
- `out/field_bindings/`
- `out/unresolved/`
- `out/summary/`

The handoff builder writes only to:
- `handoff/packet_profiles/`
- `handoff/field_binding_matrices/`
- `handoff/mirrored_pack_assets/`
- `handoff/export_overlay_candidates/`
- `handoff/stage_artifact_maps/`

## Important restrictions

- No product runtime code edits
- No fake direct mirrors
- No multi-county mega-pass in one run
- Preserve verification nuance: direct mirror, source reference only, trigger only, recognition control only, example output only, unresolved
