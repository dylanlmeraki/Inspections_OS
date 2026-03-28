from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import yaml

SUCCESS_STATUSES = {
    "direct_mirror_downloaded",
    "source_reference_verified",
    "html_page_snapshotted",
    "pdf_link_discovered_not_downloaded",
}


def resolve_task_inputs(
    task_path: Path,
    workspace_root: Path,
    acquired_root: Path,
) -> dict[str, Any]:
    with task_path.open("r", encoding="utf-8") as handle:
        task = yaml.safe_load(handle) or {}

    required_files = list(task.get("inputs", {}).get("required_files", []))
    source_set_root = workspace_root / "docs" / "source_set"
    local_index = build_local_index(source_set_root)
    source_catalog = load_source_catalog(source_set_root / "source_catalog.yaml")
    resolution_index = load_resolution_index(acquired_root)

    resolutions: list[dict[str, Any]] = []
    for required_path in required_files:
        resolutions.append(
            resolve_required_path(
                required_path=required_path,
                workspace_root=workspace_root,
                local_index=local_index,
                source_catalog=source_catalog,
                resolution_index=resolution_index,
            )
        )

    return {
        "task_key": task.get("task_key"),
        "all_resolved": all(entry["resolved"] for entry in resolutions),
        "required_files": resolutions,
    }


def build_local_index(source_set_root: Path) -> dict[str, list[str]]:
    index: dict[str, list[str]] = {}
    if not source_set_root.exists():
        return index
    for path in source_set_root.rglob("*"):
        if not path.is_file():
            continue
        basename = path.name
        normalized = normalize_file_key(basename)
        index.setdefault(basename.lower(), []).append(str(path.as_posix()))
        index.setdefault(normalized, []).append(str(path.as_posix()))
    return index


def load_source_catalog(catalog_path: Path) -> dict[str, Any]:
    if not catalog_path.exists():
        return {"entries": []}
    with catalog_path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    entries = data.get("entries") or []
    by_canonical: dict[str, dict[str, Any]] = {}
    by_alias: dict[str, list[dict[str, Any]]] = {}
    for entry in entries:
        canonical_key = str(entry.get("canonical_key") or "").strip()
        if canonical_key:
            for key in {
                canonical_key,
                canonical_key.lower(),
                normalize_file_key(canonical_key),
            }:
                if key:
                    by_canonical[key] = entry
        aliases = set(entry.get("aliases") or [])
        expected = entry.get("expected_basename")
        if expected:
            aliases.add(expected)
        actual = entry.get("actual_relative_path")
        if actual:
            aliases.add(Path(actual).name)
        for alias in aliases:
            key = normalize_file_key(str(alias))
            bucket = by_alias.setdefault(key, [])
            if all(existing.get("canonical_key") != entry.get("canonical_key") for existing in bucket):
                bucket.append(entry)
    return {"entries": entries, "by_canonical": by_canonical, "by_alias": by_alias}


def load_resolution_index(acquired_root: Path) -> list[dict[str, Any]]:
    index_path = acquired_root / "reports" / "resolution_index.json"
    if not index_path.exists():
        return []
    with index_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle) or {}
    return list(data.get("entries", []))


def resolve_required_path(
    required_path: str,
    workspace_root: Path,
    local_index: dict[str, list[str]],
    source_catalog: dict[str, Any],
    resolution_index: list[dict[str, Any]],
) -> dict[str, Any]:
    # 1. exact path
    absolute_path = workspace_root / Path(required_path)
    if absolute_path.exists():
        return resolved_result(required_path, "exact_workspace_match", str(absolute_path.as_posix()))

    basename = Path(required_path).name
    normalized_basename = normalize_file_key(basename)
    required_token = str(required_path).strip()

    # 2. canonical key
    canonical_lookup_keys = [required_token, required_token.lower()]
    if required_token and "/" not in required_token and "\\" not in required_token:
        canonical_lookup_keys.append(normalize_file_key(required_token))
    for key in canonical_lookup_keys:
        if key not in source_catalog.get("by_canonical", {}):
            continue
        entry = source_catalog["by_canonical"][key]
        actual = workspace_root / Path(str(entry.get("actual_relative_path")))
        if actual.exists():
            return {
                **resolved_result(required_path, "canonical_catalog_match", str(actual.as_posix())),
                "source_record_key": entry.get("canonical_key"),
                "note": catalog_note(entry),
                "catalog_entry": entry,
            }

    # 3. alias
    alias_entries = source_catalog.get("by_alias", {}).get(normalized_basename, [])
    if len(alias_entries) == 1:
        entry = alias_entries[0]
        actual = workspace_root / Path(str(entry.get("actual_relative_path")))
        if actual.exists():
            return {
                **resolved_result(required_path, "catalog_alias_match", str(actual.as_posix())),
                "source_record_key": entry.get("canonical_key"),
                "note": catalog_note(entry),
                "catalog_entry": entry,
            }
    if len(alias_entries) > 1:
        return unresolved_result(required_path, "Ambiguous catalog alias matches.", [str((workspace_root / Path(str(e.get('actual_relative_path')))).as_posix()) for e in alias_entries])

    # 4. normalized filename
    local_candidates = dedupe_candidates(
        local_index.get(basename.lower(), []) + local_index.get(normalized_basename, [])
    )
    if len(local_candidates) == 1:
        return {
            **resolved_result(required_path, "normalized_workspace_match", local_candidates[0]),
            "note": "Resolved by normalized local filename match.",
        }
    if len(local_candidates) > 1:
        return unresolved_result(required_path, "Ambiguous local matches.", local_candidates)

    # 5. acquired resolution index
    acquired_matches = match_acquired_artifacts(basename, normalized_basename, resolution_index)
    if len(acquired_matches) == 1:
        match = acquired_matches[0]
        return {
            **resolved_result(required_path, "acquisition_manifest_match", match["resolved_path"]),
            "source_record_key": match.get("source_record_key"),
            "note": match.get("note"),
        }
    if len(acquired_matches) > 1:
        return unresolved_result(required_path, "Ambiguous acquired artifact matches.", [match["resolved_path"] for match in acquired_matches])

    return unresolved_result(required_path, "No workspace, catalog, or acquired artifact match found.", [])


def match_acquired_artifacts(
    basename: str,
    normalized_basename: str,
    resolution_index: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    matches: list[dict[str, Any]] = []
    required_extension = Path(basename).suffix.lower()
    for entry in resolution_index:
        if entry.get("status") not in SUCCESS_STATUSES:
            continue
        local_file_name = str(entry.get("local_file_name") or "")
        if not local_file_name:
            continue
        aliases = entry.get("aliases") or []
        candidate_names = [local_file_name, *aliases]
        if not any(matches_required_name(name, basename, normalized_basename) for name in candidate_names):
            continue
        resolved_path = select_best_artifact_path(entry, required_extension)
        if not resolved_path:
            continue
        matches.append({
            "resolved_path": resolved_path,
            "source_record_key": entry.get("source_record_key"),
            "note": "Resolved through acquisition manifest metadata.",
        })
    return dedupe_match_objects(matches)


def select_best_artifact_path(entry: dict[str, Any], required_extension: str) -> str | None:
    artifact_paths = list(entry.get("pdf_artifact_paths") or [])
    if required_extension and required_extension != ".pdf":
        artifact_paths = [path for path in (entry.get("artifact_paths") or []) if Path(path).suffix.lower() == required_extension]
    if not artifact_paths:
        artifact_paths = list(entry.get("artifact_paths") or [])
    return artifact_paths[0] if artifact_paths else None


def matches_required_name(local_file_name: str, basename: str, normalized_basename: str) -> bool:
    return local_file_name.lower() == basename.lower() or normalize_file_key(local_file_name) == normalized_basename


def normalize_file_key(value: str) -> str:
    stem = Path(value).stem.lower()
    stem = re.sub(r"(\s*\(\d+\))+$", "", stem)
    stem = re.sub(r"(_0+\d+)$", "", stem)
    stem = re.sub(r"(_copy\d*)$", "", stem)
    return re.sub(r"[^a-z0-9]+", "", stem)


def catalog_note(entry: dict[str, Any]) -> str:
    version_status = entry.get("version_status") or "direct"
    actual = entry.get("version_actual")
    declared = entry.get("version_declared")
    note = entry.get("notes") or "Resolved via source catalog."
    if version_status != "direct" and declared and actual:
        return f"Resolved via source catalog using {actual} to satisfy requested {declared}. {note}"
    return f"Resolved via source catalog. {note}"


def dedupe_candidates(candidates: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        deduped.append(candidate)
    return deduped


def dedupe_match_objects(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str | None, str | None]] = set()
    deduped: list[dict[str, Any]] = []
    for match in matches:
        key = (match.get("source_record_key"), match.get("resolved_path"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(match)
    return deduped


def resolved_result(required_path: str, resolution_type: str, resolved_path: str) -> dict[str, Any]:
    return {
        "required_path": required_path,
        "resolved": True,
        "resolution_type": resolution_type,
        "resolved_path": resolved_path,
        "source_record_key": None,
        "candidates": [],
        "note": None,
    }


def unresolved_result(required_path: str, note: str, candidates: list[str]) -> dict[str, Any]:
    return {
        "required_path": required_path,
        "resolved": False,
        "resolution_type": "unresolved",
        "resolved_path": None,
        "source_record_key": None,
        "candidates": candidates,
        "note": note,
    }
