#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path
from typing import Any

import yaml


CLASSIFICATION_TO_ACQUISITION_STATE = {
    "direct_mirror": "direct_mirror_downloaded",
    "source_reference_only": "source_reference_verified",
    "trigger_only": "source_reference_verified",
    "recognition_control_only": "source_reference_verified",
    "example_output_only": "source_reference_verified",
    "unresolved": "unresolved",
}


def load_yaml(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    out_root = root / "out"
    handoff_root = root / "handoff"
    errors: list[str] = []

    for directory in [
        handoff_root / "packet_profiles",
        handoff_root / "field_binding_matrices",
        handoff_root / "mirrored_pack_assets",
        handoff_root / "export_overlay_candidates",
        handoff_root / "stage_artifact_maps",
    ]:
        directory.mkdir(parents=True, exist_ok=True)

    pack_files = sorted((out_root / "pack_registry").glob("*.yaml"))
    if not pack_files:
        print(f"No pack registry files found under {(out_root / 'pack_registry').as_posix()}")
        return 1

    for pack_file in pack_files:
        task_key = pack_file.stem
        pack = safe_read_yaml(pack_file, errors, default={})
        if not isinstance(pack, dict):
            continue

        bindings_file = out_root / "field_bindings" / f"{task_key}.yaml"
        summary_file = out_root / "summary" / f"{task_key}.json"
        bindings = safe_read_yaml(bindings_file, errors, default={"bindings": [], "unresolved_bindings": []})
        summary = safe_read_json(summary_file, errors, default={})
        if not isinstance(bindings, dict):
            bindings = {"bindings": [], "unresolved_bindings": []}
        if not isinstance(summary, dict):
            summary = {}

        assets = [item for item in (pack.get("asset_entries") or []) if isinstance(item, dict)]
        asset_keys = [item.get("asset_key") for item in assets if isinstance(item.get("asset_key"), str)]
        binding_rows = [item for item in (bindings.get("bindings") or []) if isinstance(item, dict)]
        unresolved_binding_rows = [
            item for item in (bindings.get("unresolved_bindings") or []) if isinstance(item, dict)
        ]

        readiness_score = derive_readiness_score(pack, summary, assets, binding_rows, unresolved_binding_rows)
        packet_profile = {
            "task_key": task_key,
            "jurisdiction_keys": normalize_to_str_list(pack.get("jurisdiction_keys")),
            "inspection_type_keys": normalize_to_str_list(pack.get("inspection_type_keys")),
            "workflow_stage_codes": normalize_to_str_list(pack.get("workflow_stage_codes")),
            "packet_roles_present": normalize_to_str_list(pack.get("packet_roles_present")),
            "fallback_behavior": str(pack.get("fallback_behavior") or "manual_review_required"),
            "readiness_score": readiness_score,
            "source_asset_keys": asset_keys,
        }
        write_yaml(
            handoff_root / "packet_profiles" / f"{task_key}.yaml",
            packet_profile,
        )

        matrix_rows = binding_rows + unresolved_binding_rows
        matrix_path = handoff_root / "field_binding_matrices" / f"{task_key}.csv"
        with matrix_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(
                [
                    "binding_key",
                    "canonical_field_key",
                    "packet_field_key",
                    "target_section_key",
                    "target_field_key",
                    "requiredness",
                    "status",
                    "transform",
                ]
            )
            for row in matrix_rows:
                writer.writerow(
                    [
                        row.get("binding_key"),
                        row.get("canonical_field_key"),
                        row.get("packet_field_key"),
                        row.get("target_section_key"),
                        row.get("target_field_key"),
                        row.get("requiredness"),
                        row.get("status"),
                        row.get("transform"),
                    ]
                )

        asset_registry = {
            "task_key": task_key,
            "assets": [
                {
                    "asset_key": item.get("asset_key"),
                    "title": item.get("title"),
                    "classification": item.get("classification"),
                    "acquisition_state": infer_acquisition_state(item),
                    "direct_mirror_candidate": bool(item.get("direct_mirror_candidate", False)),
                    "fallback_behavior": str(item.get("fallback_behavior") or "block_until_acquired"),
                    "confidence_band": infer_confidence_band(item),
                    "completeness_rating": str(
                        item.get("completeness_rating")
                        or pack.get("completeness_rating")
                        or "partial"
                    ),
                }
                for item in assets
            ],
        }
        write_yaml(
            handoff_root / "mirrored_pack_assets" / f"{task_key}.yaml",
            asset_registry,
        )

        sections_by_asset = infer_sections_by_asset(assets, matrix_rows)
        overlays = {
            "task_key": task_key,
            "overlay_candidates": [
                {
                    "asset_key": item.get("asset_key"),
                    "classification": item.get("classification"),
                    "eligible_for_overlay": is_overlay_eligible(item),
                    "target_sections": sorted(sections_by_asset.get(str(item.get("asset_key")), set())),
                }
                for item in assets
            ],
        }
        write_yaml(
            handoff_root / "export_overlay_candidates" / f"{task_key}.yaml",
            overlays,
        )

        workflow_stage_codes = normalize_to_str_list(pack.get("workflow_stage_codes"))
        required_artifacts_by_stage = []
        for stage in workflow_stage_codes:
            stage_asset_keys: list[str] = []
            stage_packet_roles: set[str] = set()
            for item in assets:
                stages = normalize_to_str_list(item.get("workflow_stage_scope"))
                if stage not in stages:
                    continue
                asset_key = item.get("asset_key")
                if isinstance(asset_key, str):
                    stage_asset_keys.append(asset_key)
                stage_packet_roles.update(normalize_to_str_list(item.get("packet_roles")))
            required_artifacts_by_stage.append(
                {
                    "workflow_stage_code": stage,
                    "asset_keys": dedupe_preserve_order(stage_asset_keys),
                    "packet_roles": sorted(stage_packet_roles),
                }
            )

        stage_map = {
            "task_key": task_key,
            "workflow_stage_codes": workflow_stage_codes,
            "required_artifacts_by_stage": required_artifacts_by_stage,
            "summary": summary,
        }
        write_yaml(
            handoff_root / "stage_artifact_maps" / f"{task_key}.yaml",
            stage_map,
        )

    if errors:
        print("Product handoff artifacts built with errors:")
        for entry in errors:
            print("-", entry)
        return 1

    print("Product handoff artifacts built.")
    return 0


def safe_read_yaml(path: Path, errors: list[str], default: Any) -> Any:
    if not path.exists():
        errors.append(f"Missing expected YAML input: {path}")
        return default
    try:
        return load_yaml(path)
    except Exception as exc:  # pragma: no cover - defensive parsing
        errors.append(f"Invalid YAML at {path}: {exc}")
        return default


def safe_read_json(path: Path, errors: list[str], default: Any) -> Any:
    if not path.exists():
        errors.append(f"Missing expected JSON input: {path}")
        return default
    try:
        return load_json(path)
    except Exception as exc:  # pragma: no cover - defensive parsing
        errors.append(f"Invalid JSON at {path}: {exc}")
        return default


def write_yaml(path: Path, payload: Any) -> None:
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")


def normalize_to_str_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if item is not None and str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value]
    return []


def dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for item in values:
        if item in seen:
            continue
        seen.add(item)
        deduped.append(item)
    return deduped


def infer_confidence_band(asset: dict[str, Any]) -> str:
    candidate = str(asset.get("confidence_band") or asset.get("confidence") or "").strip().lower()
    if candidate in {"low", "medium", "high"}:
        return candidate
    return "medium"


def infer_acquisition_state(asset: dict[str, Any]) -> str:
    state = asset.get("acquisition_state")
    if isinstance(state, str) and state.strip():
        return state
    classification = str(asset.get("classification") or "").strip()
    return CLASSIFICATION_TO_ACQUISITION_STATE.get(classification, "unresolved")


def is_overlay_eligible(asset: dict[str, Any]) -> bool:
    classification = str(asset.get("classification") or "")
    acquisition_state = infer_acquisition_state(asset)
    return classification in {"direct_mirror", "source_reference_only"} and acquisition_state in {
        "direct_mirror_downloaded",
        "source_reference_verified",
    }


def infer_sections_by_asset(
    assets: list[dict[str, Any]],
    matrix_rows: list[dict[str, Any]],
) -> dict[str, set[str]]:
    asset_keys = [item.get("asset_key") for item in assets if isinstance(item.get("asset_key"), str)]
    sections_by_asset: dict[str, set[str]] = {key: set() for key in asset_keys}

    all_sections = {
        str(row.get("target_section_key"))
        for row in matrix_rows
        if isinstance(row.get("target_section_key"), str) and row.get("target_section_key")
    }
    if len(asset_keys) == 1:
        sections_by_asset[asset_keys[0]].update(all_sections)
        return sections_by_asset

    for row in matrix_rows:
        section = row.get("target_section_key")
        if not isinstance(section, str) or not section:
            continue
        text_blobs = [str(row.get("notes") or ""), str(row.get("evidence_basis") or "")]
        combined = " ".join(text_blobs)
        for asset_key in asset_keys:
            if asset_key in combined:
                sections_by_asset[asset_key].add(section)
    return sections_by_asset


def derive_readiness_score(
    pack: dict[str, Any],
    summary: dict[str, Any],
    assets: list[dict[str, Any]],
    bindings: list[dict[str, Any]],
    unresolved_bindings: list[dict[str, Any]],
) -> dict[str, Any]:
    existing = pack.get("readiness_score") or summary.get("readiness_score")
    if isinstance(existing, dict):
        return existing

    classifications = [str(item.get("classification") or "") for item in assets]
    unresolved_asset_count = sum(1 for item in classifications if item == "unresolved")
    direct_mirror_present = any(item == "direct_mirror" for item in classifications)
    authoritative_source_present = any(
        item in {
            "direct_mirror",
            "source_reference_only",
            "trigger_only",
            "recognition_control_only",
            "example_output_only",
        }
        for item in classifications
    )

    statuses = [str(item.get("status") or "") for item in bindings]
    mapped_count = sum(1 for status in statuses if status == "mapped")
    total_count = len(statuses)
    mapped_ratio = (mapped_count / total_count) if total_count else 0.0
    field_map_completeness = bucket_completeness(mapped_ratio)

    stage_codes = normalize_to_str_list(pack.get("workflow_stage_codes"))
    stage_coverage = []
    for stage in stage_codes:
        covered = any(stage in normalize_to_str_list(item.get("workflow_stage_scope")) for item in assets)
        stage_coverage.append(covered)
    covered_count = sum(1 for item in stage_coverage if item)
    stage_ratio = (covered_count / len(stage_coverage)) if stage_coverage else 0.0
    stage_completeness = bucket_completeness(stage_ratio)

    unresolved_binding_count = sum(
        1
        for item in unresolved_bindings
        if str(item.get("status") or "unresolved") in {"unresolved", "partial", "partially_mapped"}
    )
    blocker_items = [
        str(item)
        for item in (summary.get("blocker_items") or [])
        if isinstance(item, str) and item.strip()
    ]

    if direct_mirror_present and unresolved_asset_count == 0 and unresolved_binding_count == 0:
        export_readiness = "direct_mirror_ready"
    elif authoritative_source_present and unresolved_asset_count <= 1:
        export_readiness = "fallback_ready"
    elif authoritative_source_present:
        export_readiness = "prototype_only"
    else:
        export_readiness = "not_ready"

    score = 0
    score += 30 if authoritative_source_present else 0
    score += 20 if direct_mirror_present else 0
    score += int(round(25 * mapped_ratio))
    score += int(round(15 * stage_ratio))
    score -= min(unresolved_asset_count * 10, 30)
    score -= min(unresolved_binding_count * 5, 20)
    score = max(0, min(100, score))

    return {
        "score_0_to_100": score,
        "direct_mirror_present": direct_mirror_present,
        "authoritative_source_present": authoritative_source_present,
        "field_map_completeness": field_map_completeness,
        "stage_completeness": stage_completeness,
        "export_readiness": export_readiness,
        "unresolved_blockers": blocker_items,
    }


def bucket_completeness(ratio: float) -> str:
    if ratio <= 0.0:
        return "none"
    if ratio < 0.5:
        return "partial"
    if ratio < 0.9:
        return "mostly_complete"
    return "complete"


if __name__ == "__main__":
    raise SystemExit(main())
