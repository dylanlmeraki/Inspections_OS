import json
import shutil
import subprocess
import sys
import unittest
import uuid
from pathlib import Path

import yaml


SCRIPT_PATH = Path(__file__).resolve().parent / "scripts" / "validate_outputs.py"


class TestValidateOutputs(unittest.TestCase):
    def test_validation_passes(self) -> None:
        root = make_repo_tempdir()
        try:
            self._write_valid_output_tree(root)
            result = self._run_validator(root)
            self.assertEqual(result.returncode, 0)
            self.assertIn("Validation passed.", result.stdout)
        finally:
            shutil.rmtree(root, ignore_errors=True)

    def test_duplicate_binding_fails(self) -> None:
        root = make_repo_tempdir()
        try:
            self._write_valid_output_tree(root)
            binding_file = root / "out" / "field_bindings" / "task.yaml"
            payload = yaml.safe_load(binding_file.read_text(encoding="utf-8"))
            payload["bindings"].append(dict(payload["bindings"][0]))
            binding_file.write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")
            result = self._run_validator(root)
            self.assertEqual(result.returncode, 1)
            self.assertIn("duplicate binding_key", result.stdout)
        finally:
            shutil.rmtree(root, ignore_errors=True)

    def _run_validator(self, root: Path) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT_PATH), str(root)],
            capture_output=True,
            text=True,
            check=False,
        )

    def _write_valid_output_tree(self, root: Path) -> None:
        pack_dir = root / "out" / "pack_registry"
        binding_dir = root / "out" / "field_bindings"
        unresolved_dir = root / "out" / "unresolved"
        summary_dir = root / "out" / "summary"
        for directory in (pack_dir, binding_dir, unresolved_dir, summary_dir):
            directory.mkdir(parents=True, exist_ok=True)

        pack_payload = {
            "task_key": "task",
            "jurisdiction_keys": ["ca_statewide"],
            "inspection_type_keys": ["swppp_active_series"],
            "workflow_stage_codes": ["swppp.weekly"],
            "pack_families": ["swppp_weekly_family"],
            "packet_roles_present": ["reference_asset"],
            "fallback_behavior": "source_reference_composition_allowed",
            "completeness_rating": "medium",
            "confidence_band": "medium",
            "unresolved_count": 0,
            "readiness_score": {
                "score_0_to_100": 50,
                "direct_mirror_present": False,
                "authoritative_source_present": True,
                "field_map_completeness": "partial",
                "stage_completeness": "partial",
                "export_readiness": "prototype_only",
                "unresolved_blockers": []
            },
            "asset_entries": [
                {
                    "asset_key": "asset.one",
                    "title": "Asset One",
                    "classification": "source_reference_only",
                    "jurisdiction_scope": ["ca_statewide"],
                    "inspection_type_scope": ["swppp_active_series"],
                    "workflow_stage_scope": ["swppp.weekly"],
                    "packet_roles": ["reference_asset"],
                    "source_evidence": [{"source_type": "official_page", "ref": "x", "relevance": "base"}],
                    "direct_mirror_candidate": False,
                    "fallback_behavior": "use_source_reference_composition",
                    "confidence_band": "medium",
                    "completeness_rating": "medium",
                    "acquisition_state": "source_reference_verified",
                    "notes": "note"
                }
            ]
        }
        binding_payload = {
            "task_key": "task",
            "canonical_field_sets": ["set.one"],
            "bindings": [
                {
                    "binding_key": "bind.one",
                    "canonical_field_key": "inspection.inspector_name",
                    "packet_field_key": "packet.inspector_name",
                    "target_section_key": "certification",
                    "target_field_key": "inspector_name",
                    "requiredness": "required",
                    "status": "mapped",
                    "transform": "identity",
                    "evidence_basis": [{"kind": "sample_output", "ref": "sample.pdf"}],
                    "notes": "asset.one supports mapping"
                }
            ],
            "unresolved_bindings": [],
            "completeness_matrix": [
                {
                    "canonical_field_set": "set.one",
                    "mapped_count": 1,
                    "partial_count": 0,
                    "unresolved_count": 0,
                    "completeness_rating": "high"
                }
            ]
        }
        summary_payload = {
            "task_key": "task",
            "pack_family_count": 1,
            "asset_count": 1,
            "direct_mirror_count": 0,
            "source_reference_only_count": 1,
            "trigger_only_count": 0,
            "recognition_control_only_count": 0,
            "example_output_only_count": 0,
            "unresolved_count": 0,
            "completeness_rating": "medium",
            "classification_notes": {
                "direct_mirror_assets": [],
                "source_reference_only_assets": ["asset.one"],
                "trigger_only_assets": [],
                "recognition_control_only_assets": [],
                "example_output_only_assets": [],
                "unresolved_assets": [],
                "note": "test fixture",
            },
            "confidence_band": "medium",
            "blocker_items": [],
            "readiness_score": {
                "score_0_to_100": 50,
                "direct_mirror_present": False,
                "authoritative_source_present": True,
                "field_map_completeness": "partial",
                "stage_completeness": "partial",
                "export_readiness": "prototype_only",
                "unresolved_blockers": []
            }
        }
        unresolved_payload = "\n".join([
            "# Missing direct mirrors",
            "# Missing field mappings",
            "# Missing stage-specific artifacts",
            "# Ambiguous county/city paths",
            "# Recommended next acquisition steps",
        ])
        (pack_dir / "task.yaml").write_text(yaml.safe_dump(pack_payload, sort_keys=False), encoding="utf-8")
        (binding_dir / "task.yaml").write_text(yaml.safe_dump(binding_payload, sort_keys=False), encoding="utf-8")
        (summary_dir / "task.json").write_text(json.dumps(summary_payload), encoding="utf-8")
        (unresolved_dir / "task.md").write_text(unresolved_payload, encoding="utf-8")


def make_repo_tempdir() -> Path:
    temp_root = Path(__file__).resolve().parent / "test_scratch"
    temp_root.mkdir(exist_ok=True)
    path = temp_root / f"case_{uuid.uuid4().hex}"
    path.mkdir(parents=True, exist_ok=False)
    return path


if __name__ == "__main__":
    unittest.main()
