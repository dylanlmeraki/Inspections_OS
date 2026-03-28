#!/usr/bin/env python3
from pathlib import Path
import yaml

TASKS = [
    {
        "task_key": "statewide_swppp_weekly_family",
        "jurisdiction_keys": ["ca_statewide"],
        "inspection_type_keys": ["swppp_active_series"],
        "workflow_stage_codes": ["swppp.weekly"],
    },
    {
        "task_key": "statewide_swppp_qpe_family",
        "jurisdiction_keys": ["ca_statewide"],
        "inspection_type_keys": ["swppp_active_series"],
        "workflow_stage_codes": ["swppp.pre_qpe", "swppp.during_qpe", "swppp.post_qpe"],
    },
    {
        "task_key": "sf_special_inspections_reporting",
        "jurisdiction_keys": ["san_francisco"],
        "inspection_type_keys": ["special_cbc17"],
        "workflow_stage_codes": ["special.reporting"],
    },
    {
        "task_key": "contra_costa_special_pre_permit",
        "jurisdiction_keys": ["contra_costa_county"],
        "inspection_type_keys": ["special_cbc17"],
        "workflow_stage_codes": ["special.pre_permit"],
    },
    {
        "task_key": "marin_special_pre_permit",
        "jurisdiction_keys": ["marin_county"],
        "inspection_type_keys": ["special_cbc17"],
        "workflow_stage_codes": ["special.pre_permit"],
    },
    {
        "task_key": "sf_dust_control_monitoring",
        "jurisdiction_keys": ["san_francisco"],
        "inspection_type_keys": ["dust_sf"],
        "workflow_stage_codes": ["dust.applicability", "dust.plan_approval", "dust.monitoring"],
    },
    {
        "task_key": "baaqmd_asbestos_readiness",
        "jurisdiction_keys": ["bay_area_regional"],
        "inspection_type_keys": ["asbestos_j"],
        "workflow_stage_codes": ["asbestos.j_ready", "asbestos.date_revision", "asbestos.pre_demo"],
    },
]

out = Path("tasks")
out.mkdir(exist_ok=True)

for task in TASKS:
    payload = {
        "task_key": task["task_key"],
        "scope": {
            "jurisdiction_keys": task["jurisdiction_keys"],
            "inspection_type_keys": task["inspection_type_keys"],
            "workflow_stage_codes": task["workflow_stage_codes"],
        },
        "inputs": {
            "required_files": [],
            "optional_files": [],
        },
        "outputs": {
            "pack_registry": f"out/pack_registry/{task['task_key']}.yaml",
            "field_bindings": f"out/field_bindings/{task['task_key']}.yaml",
            "unresolved": f"out/unresolved/{task['task_key']}.md",
            "summary": f"out/summary/{task['task_key']}.json",
        },
        "rules": {
            "no_runtime_code_edits": True,
            "no_fake_direct_mirrors": True,
            "max_output_files": 4,
        },
    }
    with open(out / f"{task['task_key']}.yaml", "w") as f:
        yaml.safe_dump(payload, f, sort_keys=False)