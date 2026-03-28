#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from acquisition.engine import AcquisitionSettings, run_acquisition


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Crawl seeded public sources, download official PDFs/pages, and emit acquisition manifests.",
    )
    parser.add_argument(
        "--seed-input",
        default=default_seed_path("source_records.seed.yaml"),
        help="Path to source_records.seed.yaml",
    )
    parser.add_argument(
        "--form-seed-input",
        default=default_seed_path("form_records.seed.yaml"),
        help="Path to form_records.seed.yaml",
    )
    parser.add_argument(
        "--output-root",
        default="acquired",
        help="Root directory for acquired/files, acquired/manifests, and acquired/reports",
    )
    parser.add_argument(
        "--jurisdiction",
        action="append",
        default=[],
        help="Filter by jurisdiction_name; can be repeated",
    )
    parser.add_argument(
        "--program",
        action="append",
        default=[],
        help="Filter by program_label; can be repeated",
    )
    parser.add_argument(
        "--source-record-key",
        action="append",
        default=[],
        dest="source_record_keys",
        help="Filter by explicit source_record_key; can be repeated",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=float,
        default=30.0,
        help="Per-request timeout in seconds",
    )
    parser.add_argument(
        "--max-linked-pdfs",
        type=int,
        default=20,
        help="Maximum PDF links to download from a single HTML page",
    )
    parser.add_argument(
        "--user-agent",
        default="InspectionOS-Acquisition/1.0",
        help="HTTP user agent string",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    seed_input = Path(args.seed_input)
    form_seed_input = Path(args.form_seed_input)
    if not seed_input.exists():
        parser.error(f"Seed input not found: {seed_input}")

    settings = AcquisitionSettings(
        output_root=Path(args.output_root),
        timeout_seconds=args.timeout_seconds,
        user_agent=args.user_agent,
        max_linked_pdfs=args.max_linked_pdfs,
    )
    result = run_acquisition(
        source_seed_path=seed_input,
        form_seed_path=form_seed_input if form_seed_input.exists() else None,
        settings=settings,
        jurisdictions=args.jurisdiction,
        programs=args.program,
        source_record_keys=args.source_record_keys,
    )
    json.dump(result["summary"], sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


def default_seed_path(filename: str) -> str:
    preferred = Path("docs") / "source_set" / "seeds" / filename
    if preferred.exists():
        return str(preferred)
    fallback = Path("docs") / "source_set" / filename
    return str(fallback)


if __name__ == "__main__":
    raise SystemExit(main())
