import json
import shutil
import unittest
import uuid
from pathlib import Path

import yaml

from acquisition.preflight import resolve_task_inputs


class TestPreflightTaskInputs(unittest.TestCase):
    def test_preflight_resolves_exact_catalog_alias_and_acquired_inputs(self) -> None:
        root = make_repo_tempdir()
        try:
            task_dir = root / "tasks"
            source_set_dir = root / "docs" / "source_set"
            acquired_reports_dir = root / "acquired" / "reports"
            acquired_files_dir = root / "acquired" / "files"
            task_dir.mkdir(parents=True)
            source_set_dir.mkdir(parents=True)
            acquired_reports_dir.mkdir(parents=True)
            acquired_files_dir.mkdir(parents=True)

            # local examples
            actual_v1 = source_set_dir / "InspectionOS_Source_of_Truth_v1 (1).docx"
            actual_v1.write_bytes(b"docx")
            local_weekly = source_set_dir / "mosswood 2-20-25.pdf"
            local_weekly.write_bytes(b"pdf")

            # catalog
            catalog = {
                "entries": [
                    {
                        "canonical_key": "inspectionos_source_of_truth_v2",
                        "expected_basename": "InspectionOS_Source_of_Truth_v2.docx",
                        "actual_relative_path": "docs/source_set/InspectionOS_Source_of_Truth_v1 (1).docx",
                        "aliases": ["InspectionOS_Source_of_Truth_v2.docx"],
                        "version_status": "substitute_older_version",
                        "version_declared": "v2",
                        "version_actual": "v1",
                        "notes": "v1 substitute in test bundle",
                    },
                    {
                        "canonical_key": "mosswood_swppp_weekly",
                        "expected_basename": "mosswood_swppp_weekly.pdf",
                        "actual_relative_path": "docs/source_set/mosswood 2-20-25.pdf",
                        "aliases": ["mosswood_swppp_weekly.pdf"],
                        "version_status": "example_output_only",
                        "version_declared": "weekly-example",
                        "version_actual": "weekly-example",
                        "notes": "weekly example alias",
                    },
                ]
            }
            (source_set_dir / "source_catalog.yaml").write_text(yaml.safe_dump(catalog, sort_keys=False), encoding="utf-8")

            acquired_pdf = acquired_files_dir / "county_marin__special.pdf"
            acquired_pdf.write_bytes(b"pdf")

            task_payload = {
                "task_key": "marin_special_pre_permit",
                "scope": {
                    "jurisdiction_keys": ["marin_county"],
                    "inspection_type_keys": ["special_cbc17"],
                    "workflow_stage_codes": ["special.pre_permit"],
                },
                "inputs": {
                    "required_files": [
                        "docs/source_set/InspectionOS_Source_of_Truth_v2.docx",
                        "docs/source_set/mosswood_swppp_weekly.pdf",
                        "docs/source_set/[COUNTY-Marin]_Building-Permit-Submittal-Checklist_Special-Inspection-Trigger.pdf",
                    ],
                    "optional_files": [],
                },
                "outputs": {
                    "pack_registry": "out/pack_registry/x.yaml",
                    "field_bindings": "out/field_bindings/x.yaml",
                    "unresolved": "out/unresolved/x.md",
                    "summary": "out/summary/x.json",
                },
                "rules": {
                    "no_runtime_code_edits": True,
                    "no_fake_direct_mirrors": True,
                    "max_output_files": 4,
                },
            }
            (task_dir / "task.yaml").write_text(
                yaml.safe_dump(task_payload, sort_keys=False),
                encoding="utf-8",
            )

            resolution_index = {
                "generated_at": "2026-03-25T22:00:00Z",
                "entries": [
                    {
                        "source_record_key": "county_marin_building_permit_submittal_checklist_special_inspection_trigger",
                        "local_file_name": "[COUNTY-Marin]_Building-Permit-Submittal-Checklist_Special-Inspection-Trigger.pdf",
                        "aliases": ["[COUNTY-Marin]_Building-Permit-Submittal-Checklist_Special-Inspection-Trigger (1).pdf"],
                        "status": "direct_mirror_downloaded",
                        "stored_path": str(acquired_pdf.as_posix()),
                        "artifact_paths": [str(acquired_pdf.as_posix())],
                        "pdf_artifact_paths": [str(acquired_pdf.as_posix())],
                        "final_url": "https://example.test/county-marin.pdf",
                    }
                ],
            }
            (acquired_reports_dir / "resolution_index.json").write_text(
                json.dumps(resolution_index, indent=2),
                encoding="utf-8",
            )

            report = resolve_task_inputs(
                task_path=task_dir / "task.yaml",
                workspace_root=root,
                acquired_root=root / "acquired",
            )

            self.assertTrue(report["all_resolved"])
            self.assertEqual(report["required_files"][0]["resolution_type"], "catalog_alias_match")
            self.assertEqual(report["required_files"][1]["resolution_type"], "catalog_alias_match")
            self.assertEqual(report["required_files"][2]["resolution_type"], "acquisition_manifest_match")
            self.assertEqual(
                report["required_files"][2]["source_record_key"],
                "county_marin_building_permit_submittal_checklist_special_inspection_trigger",
            )
        finally:
            shutil.rmtree(root, ignore_errors=True)


def make_repo_tempdir() -> Path:
    temp_root = Path(__file__).resolve().parent / "test_scratch"
    temp_root.mkdir(exist_ok=True)
    path = temp_root / f"case_{uuid.uuid4().hex}"
    path.mkdir(parents=True, exist_ok=False)
    return path


if __name__ == "__main__":
    unittest.main()
