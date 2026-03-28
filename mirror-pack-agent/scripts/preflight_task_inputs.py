#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from acquisition.preflight import resolve_task_inputs
from utils import load_yaml, validate_with_schema


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Resolve task required_files against workspace inputs and acquisition manifests.",
    )
    parser.add_argument("task_file", help="Path to task manifest YAML")
    parser.add_argument(
        "--workspace-root",
        default=".",
        help="Workspace root containing docs/source_set and acquired/",
    )
    parser.add_argument(
        "--acquired-root",
        default="acquired",
        help="Acquisition output root",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="json_output",
        help="Emit machine-readable JSON only",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    task_path = Path(args.task_file)
    task = load_yaml(task_path)
    schema_path = ROOT / "schemas" / "task_manifest.schema.yaml"
    schema = load_yaml(schema_path)
    errors = validate_with_schema(task, schema)
    if errors:
      print(json.dumps({"task_key": task.get("task_key"), "schema_valid": False, "errors": errors}, indent=2))
      return 2

    report = resolve_task_inputs(
        task_path=task_path,
        workspace_root=Path(args.workspace_root),
        acquired_root=Path(args.acquired_root),
    )
    report["schema_valid"] = True
    print(json.dumps(report, indent=2))
    return 0 if report["all_resolved"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
