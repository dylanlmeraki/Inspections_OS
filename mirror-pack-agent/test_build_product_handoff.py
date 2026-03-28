import json
import shutil
import subprocess
import sys
import unittest
import uuid
from pathlib import Path

import yaml

SCRIPT_PATH = Path(__file__).resolve().parent / 'scripts' / 'build_product_handoff.py'

class TestBuildProductHandoff(unittest.TestCase):
    def test_builds_handoff_outputs(self):
        root = make_repo_tempdir()
        try:
            for d in [root/'out'/'pack_registry', root/'out'/'field_bindings', root/'out'/'summary', root/'out'/'unresolved']:
                d.mkdir(parents=True, exist_ok=True)
            (root/'out'/'pack_registry'/'task.yaml').write_text(yaml.safe_dump({
                'task_key':'task','jurisdiction_keys':['ca_statewide'],'inspection_type_keys':['swppp_active_series'],'workflow_stage_codes':['swppp.weekly'],'packet_roles_present':['reference_asset'],'fallback_behavior':'source_reference_composition_allowed','readiness_score':{'score_0_to_100':50,'direct_mirror_present':False,'authoritative_source_present':True,'field_map_completeness':'partial','stage_completeness':'partial','export_readiness':'prototype_only','unresolved_blockers':[]},'asset_entries':[{'asset_key':'asset.one','title':'Asset One','classification':'source_reference_only','acquisition_state':'source_reference_verified','direct_mirror_candidate':False,'fallback_behavior':'use_source_reference_composition','confidence_band':'medium','completeness_rating':'medium','workflow_stage_scope':['swppp.weekly'],'packet_roles':['reference_asset']}]}, sort_keys=False), encoding='utf-8')
            (root/'out'/'field_bindings'/'task.yaml').write_text(yaml.safe_dump({'task_key':'task','bindings':[{'binding_key':'bind.one','canonical_field_key':'a','packet_field_key':'b','target_section_key':'sec','target_field_key':'field','requiredness':'required','status':'mapped','transform':'identity'}],'completeness_matrix':[]}, sort_keys=False), encoding='utf-8')
            (root/'out'/'summary'/'task.json').write_text(json.dumps({'task_key':'task'}), encoding='utf-8')
            result = subprocess.run([sys.executable, str(SCRIPT_PATH), str(root)], capture_output=True, text=True, check=False)
            self.assertEqual(result.returncode, 0)
            self.assertTrue((root/'handoff'/'packet_profiles'/'task.yaml').exists())
            self.assertTrue((root/'handoff'/'field_binding_matrices'/'task.csv').exists())
            self.assertTrue((root/'handoff'/'mirrored_pack_assets'/'task.yaml').exists())
            self.assertTrue((root/'handoff'/'export_overlay_candidates'/'task.yaml').exists())
            self.assertTrue((root/'handoff'/'stage_artifact_maps'/'task.yaml').exists())
        finally:
            shutil.rmtree(root, ignore_errors=True)


def make_repo_tempdir() -> Path:
    temp_root = Path(__file__).resolve().parent / 'test_scratch'
    temp_root.mkdir(exist_ok=True)
    path = temp_root / f'case_{uuid.uuid4().hex}'
    path.mkdir(parents=True, exist_ok=False)
    return path

if __name__ == '__main__':
    unittest.main()
