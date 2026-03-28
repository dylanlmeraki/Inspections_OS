#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from utils import load_json, load_yaml, validate_with_schema


REQUIRED_UNRESOLVED_SECTIONS = [
    "Missing direct mirrors",
    "Missing field mappings",
    "Missing stage-specific artifacts",
    "Ambiguous county/city paths",
    "Recommended next acquisition steps",
]
EXPECTED_CLASSIFICATIONS = (
    "direct_mirror",
    "source_reference_only",
    "trigger_only",
    "recognition_control_only",
    "example_output_only",
    "unresolved",
)
ALLOWED_BINDING_STATUSES = {"mapped", "partial", "unresolved", "partially_mapped", "inferred"}


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    required_dirs = {
        "pack_registry": root / "out" / "pack_registry",
        "field_bindings": root / "out" / "field_bindings",
        "unresolved": root / "out" / "unresolved",
        "summary": root / "out" / "summary",
    }
    for name, directory in required_dirs.items():
        if not directory.exists():
            print(f"Missing directory ({name}): {directory}")
            return 1

    schema_dir = ROOT / "schemas"
    pack_schema = load_yaml(schema_dir / "pack_registry.schema.yaml")
    binding_schema = load_yaml(schema_dir / "field_bindings.schema.yaml")
    summary_schema = load_yaml(schema_dir / "summary.schema.yaml")

    errors: list[str] = []

    pack_by_task: dict[str, dict[str, Any]] = {}
    bindings_by_task: dict[str, dict[str, Any]] = {}
    summary_by_task: dict[str, dict[str, Any]] = {}
    unresolved_paths: dict[str, Path] = {}

    for path in sorted(required_dirs["pack_registry"].glob("*.yaml")):
        data = safe_load_yaml(path, errors)
        if data is None:
            continue
        errors.extend([f"{path}: {entry}" for entry in validate_with_schema(data, pack_schema)])
        task_key = infer_task_key(path, data, errors)
        if task_key is None:
            continue
        pack_by_task[task_key] = data
        validate_pack_duplicates(path, data, errors)

    for path in sorted(required_dirs["field_bindings"].glob("*.yaml")):
        data = safe_load_yaml(path, errors)
        if data is None:
            continue
        errors.extend([f"{path}: {entry}" for entry in validate_with_schema(data, binding_schema)])
        task_key = infer_task_key(path, data, errors)
        if task_key is None:
            continue
        bindings_by_task[task_key] = data
        validate_binding_duplicates(path, data, errors)
        validate_binding_statuses(path, data, errors)

    for path in sorted(required_dirs["summary"].glob("*.json")):
        data = safe_load_json(path, errors)
        if data is None:
            continue
        errors.extend([f"{path}: {entry}" for entry in validate_with_schema(data, summary_schema)])
        task_key = infer_task_key(path, data, errors)
        if task_key is None:
            continue
        summary_by_task[task_key] = data

    for path in sorted(required_dirs["unresolved"].glob("*.md")):
        task_key = path.stem
        unresolved_paths[task_key] = path
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as exc:
            errors.append(f"{path}: failed to read unresolved markdown ({exc})")
            continue
        for section in REQUIRED_UNRESOLVED_SECTIONS:
            if not has_markdown_section(text, section):
                errors.append(f"{path}: missing section heading '{section}'")

    all_task_keys = sorted(
        set(pack_by_task) | set(bindings_by_task) | set(summary_by_task) | set(unresolved_paths)
    )
    for task_key in all_task_keys:
        if task_key not in pack_by_task:
            errors.append(f"task {task_key}: missing pack registry output")
        if task_key not in bindings_by_task:
            errors.append(f"task {task_key}: missing field bindings output")
        if task_key not in summary_by_task:
            errors.append(f"task {task_key}: missing summary output")
        if task_key not in unresolved_paths:
            errors.append(f"task {task_key}: missing unresolved markdown output")

    for task_key in sorted(set(pack_by_task) & set(summary_by_task)):
        validate_summary_alignment(
            task_key=task_key,
            pack=pack_by_task[task_key],
            summary=summary_by_task[task_key],
            errors=errors,
        )

    if errors:
        print("Validation failed:")
        for entry in errors:
            print("-", entry)
        return 1
    print("Validation passed.")
    return 0


def safe_load_yaml(path: Path, errors: list[str]) -> dict[str, Any] | None:
    try:
        data = load_yaml(path)
    except Exception as exc:  # pragma: no cover - defensive parsing
        errors.append(f"{path}: invalid YAML ({exc})")
        return None
    if not isinstance(data, dict):
        errors.append(f"{path}: expected YAML object at top level")
        return None
    return data


def safe_load_json(path: Path, errors: list[str]) -> dict[str, Any] | None:
    try:
        data = load_json(path)
    except Exception as exc:  # pragma: no cover - defensive parsing
        errors.append(f"{path}: invalid JSON ({exc})")
        return None
    if not isinstance(data, dict):
        errors.append(f"{path}: expected JSON object at top level")
        return None
    return data


def infer_task_key(path: Path, payload: dict[str, Any], errors: list[str]) -> str | None:
    task_key = payload.get("task_key")
    if not isinstance(task_key, str) or not task_key:
        errors.append(f"{path}: missing or invalid task_key")
        return None
    if path.stem != task_key:
        errors.append(f"{path}: filename stem '{path.stem}' does not match task_key '{task_key}'")
    return task_key


def validate_pack_duplicates(path: Path, payload: dict[str, Any], errors: list[str]) -> None:
    seen_assets: set[str] = set()
    for item in payload.get("asset_entries") or []:
        if not isinstance(item, dict):
            continue
        asset_key = item.get("asset_key")
        if isinstance(asset_key, str) and asset_key in seen_assets:
            errors.append(f"{path}: duplicate asset_key {asset_key}")
        if isinstance(asset_key, str):
            seen_assets.add(asset_key)


def validate_binding_duplicates(path: Path, payload: dict[str, Any], errors: list[str]) -> None:
    seen_binding_keys: set[str] = set()
    seen_canonical: set[str] = set()
    seen_targets: set[tuple[str, str]] = set()
    for item in payload.get("bindings") or []:
        if not isinstance(item, dict):
            continue
        binding_key = item.get("binding_key")
        if isinstance(binding_key, str) and binding_key in seen_binding_keys:
            errors.append(f"{path}: duplicate binding_key {binding_key}")
        if isinstance(binding_key, str):
            seen_binding_keys.add(binding_key)

        canonical = item.get("canonical_field_key")
        if isinstance(canonical, str) and canonical in seen_canonical:
            errors.append(f"{path}: duplicate canonical_field_key {canonical}")
        if isinstance(canonical, str):
            seen_canonical.add(canonical)

        section = item.get("target_section_key")
        field = item.get("target_field_key")
        if isinstance(section, str) and isinstance(field, str):
            target = (section, field)
            if target in seen_targets:
                errors.append(f"{path}: duplicate target field mapping {section}/{field}")
            seen_targets.add(target)


def validate_binding_statuses(path: Path, payload: dict[str, Any], errors: list[str]) -> None:
    for collection_name in ("bindings", "unresolved_bindings"):
        for item in payload.get(collection_name) or []:
            if not isinstance(item, dict):
                continue
            status = item.get("status")
            if status is None:
                continue
            if status not in ALLOWED_BINDING_STATUSES:
                errors.append(f"{path}: unsupported status '{status}' in {collection_name}")
            if collection_name == "unresolved_bindings" and status in {"mapped", "partial", "partially_mapped"}:
                errors.append(
                    f"{path}: unresolved_bindings entry '{item.get('binding_key')}' has non-unresolved status '{status}'"
                )


def has_markdown_section(text: str, section_name: str) -> bool:
    pattern = rf"^\s*#{{1,6}}\s*{re.escape(section_name)}\s*$"
    return re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE) is not None


def validate_summary_alignment(
    task_key: str,
    pack: dict[str, Any],
    summary: dict[str, Any],
    errors: list[str],
) -> None:
    assets = [item for item in (pack.get("asset_entries") or []) if isinstance(item, dict)]
    classification_counts = {key: 0 for key in EXPECTED_CLASSIFICATIONS}
    for item in assets:
        classification = item.get("classification")
        if classification in classification_counts:
            classification_counts[classification] += 1

    if summary.get("asset_count") != len(assets):
        errors.append(
            f"task {task_key}: summary asset_count {summary.get('asset_count')} "
            f"does not match pack asset_entries {len(assets)}"
        )

    pack_family_count = len(set(pack.get("pack_families") or []))
    if summary.get("pack_family_count") != pack_family_count:
        errors.append(
            f"task {task_key}: summary pack_family_count {summary.get('pack_family_count')} "
            f"does not match unique pack_families {pack_family_count}"
        )

    summary_map = {
        "direct_mirror": "direct_mirror_count",
        "source_reference_only": "source_reference_only_count",
        "trigger_only": "trigger_only_count",
        "recognition_control_only": "recognition_control_only_count",
        "example_output_only": "example_output_only_count",
    }
    for classification, summary_key in summary_map.items():
        expected = classification_counts[classification]
        observed = summary.get(summary_key)
        if observed != expected:
            errors.append(
                f"task {task_key}: summary {summary_key}={observed} "
                f"does not match classification count {expected}"
            )

    summary_unresolved = summary.get("unresolved_count")
    if isinstance(summary_unresolved, int) and summary_unresolved < classification_counts["unresolved"]:
        errors.append(
            f"task {task_key}: summary unresolved_count {summary_unresolved} "
            f"is lower than unresolved asset count {classification_counts['unresolved']}"
        )

    pack_unresolved = pack.get("unresolved_count")
    if isinstance(pack_unresolved, int) and pack_unresolved < classification_counts["unresolved"]:
        errors.append(
            f"task {task_key}: pack unresolved_count {pack_unresolved} "
            f"is lower than unresolved assets {classification_counts['unresolved']}"
        )

    if (
        isinstance(pack.get("completeness_rating"), str)
        and isinstance(summary.get("completeness_rating"), str)
        and pack.get("completeness_rating") != summary.get("completeness_rating")
    ):
        errors.append(
            f"task {task_key}: completeness_rating mismatch "
            f"(pack={pack.get('completeness_rating')}, summary={summary.get('completeness_rating')})"
        )

    has_classification_notes = isinstance(summary.get("classification_notes"), dict)
    notes_omitted_exception = summary.get("notes_omitted_for_validation") is True
    omission_reason = summary.get("notes_omission_reason")
    if not has_classification_notes and not notes_omitted_exception:
        errors.append(
            f"task {task_key}: summary must include classification_notes "
            f"or set notes_omitted_for_validation=true when omission is strictly required for validation"
        )
    if notes_omitted_exception and not isinstance(omission_reason, str):
        errors.append(
            f"task {task_key}: notes_omitted_for_validation=true requires notes_omission_reason"
        )
    if notes_omitted_exception and isinstance(omission_reason, str) and not omission_reason.strip():
        errors.append(
            f"task {task_key}: notes_omission_reason must be non-empty when notes are omitted"
        )
    if notes_omitted_exception and has_classification_notes:
        errors.append(
            f"task {task_key}: notes_omitted_for_validation=true cannot be set when classification_notes are present"
        )


if __name__ == "__main__":
    raise SystemExit(main())
