#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from utils import load_yaml, validate_with_schema


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    schema_root = ROOT / "schemas" / "handoff"
    targets = {
        "packet_profiles": load_yaml(schema_root / "packet_profile_registry.schema.yaml"),
        "mirrored_pack_assets": load_yaml(schema_root / "mirrored_pack_asset_registry.schema.yaml"),
        "export_overlay_candidates": load_yaml(schema_root / "export_overlay_candidates.schema.yaml"),
        "stage_artifact_maps": load_yaml(schema_root / "stage_artifact_map.schema.yaml"),
    }

    errors: list[str] = []
    task_keys_by_folder: dict[str, set[str]] = {}

    for folder, schema in targets.items():
        folder_path = root / "handoff" / folder
        if not folder_path.exists():
            errors.append(f"missing handoff folder: {folder_path}")
            continue
        task_keys: set[str] = set()
        for path in sorted(folder_path.glob("*.yaml")):
            try:
                data = load_yaml(path)
            except Exception as exc:
                errors.append(f"{path}: invalid YAML ({exc})")
                continue
            errors.extend([f"{path}: {entry}" for entry in validate_with_schema(data, schema)])
            if isinstance(data, dict) and isinstance(data.get("task_key"), str):
                task_key = data["task_key"]
                task_keys.add(task_key)
                if path.stem != task_key:
                    errors.append(f"{path}: filename stem '{path.stem}' does not match task_key '{task_key}'")
            else:
                errors.append(f"{path}: missing task_key")
        task_keys_by_folder[folder] = task_keys

    matrix_dir = root / "handoff" / "field_binding_matrices"
    matrix_task_keys = {path.stem for path in sorted(matrix_dir.glob("*.csv"))} if matrix_dir.exists() else set()
    if not matrix_dir.exists():
        errors.append(f"missing handoff folder: {matrix_dir}")

    expected_task_keys = set.intersection(*task_keys_by_folder.values()) if task_keys_by_folder else set()
    all_task_keys = set.union(*task_keys_by_folder.values(), matrix_task_keys) if task_keys_by_folder else matrix_task_keys
    for task_key in sorted(all_task_keys):
        for folder, keys in task_keys_by_folder.items():
            if task_key not in keys:
                errors.append(f"task {task_key}: missing {folder} artifact")
        if task_key not in matrix_task_keys:
            errors.append(f"task {task_key}: missing field_binding_matrices/{task_key}.csv")

    if expected_task_keys and expected_task_keys != matrix_task_keys:
        # catch drift where only CSVs or only YAML sets exist
        missing_csv = sorted(expected_task_keys - matrix_task_keys)
        extra_csv = sorted(matrix_task_keys - expected_task_keys)
        if missing_csv:
            errors.append(f"missing CSV matrices for tasks: {', '.join(missing_csv)}")
        if extra_csv:
            errors.append(f"orphan CSV matrices without matching YAML artifacts: {', '.join(extra_csv)}")

    if errors:
        print("Handoff validation failed:")
        for entry in errors:
            print("-", entry)
        return 1
    print("Handoff validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
