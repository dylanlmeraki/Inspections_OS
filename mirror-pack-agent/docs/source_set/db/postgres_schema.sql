-- Inspection.OS build-start PostgreSQL schema
create extension if not exists "pgcrypto";

create type verification_status as enum ('verified-direct','verified-indirect','inferred-direct','gap-note');
create type packet_role as enum (
  'cover_form','agencies_list','coi_requirement','process_note','forms_index','permit_trigger',
  'scheduling_guide','code_reference','requirements_detail','approval_submission','signer_control_reference',
  'threshold_gate_reference','prd_reference','closeout_reference','annual_reporting_reference','governing_order',
  'portal_guidance','program_overview','coordination_guidance','revision_control_guidance','pre_demo_guidance',
  'closeout_verification_form','result_card','ambiguity_note','reference_asset'
);
create type run_status as enum ('draft','in_progress','submitted','approved','returned','closed','superseded');
create type gate_status as enum ('pass','blocked','warning','waived');

create table jurisdictions (
  jurisdiction_id uuid primary key default gen_random_uuid(),
  jurisdiction_key text not null unique,
  name text not null,
  level text not null,
  parent_jurisdiction_id uuid references jurisdictions(jurisdiction_id),
  county_group text,
  created_at timestamptz not null default now()
);

create table agencies (
  agency_id uuid primary key default gen_random_uuid(),
  agency_key text not null unique,
  jurisdiction_id uuid not null references jurisdictions(jurisdiction_id),
  name text not null,
  program_owner_flag boolean not null default true,
  created_at timestamptz not null default now()
);

create table regulatory_programs (
  program_id uuid primary key default gen_random_uuid(),
  program_key text not null unique,
  code text not null unique,
  name text not null,
  scope_level text not null
);

create table inspection_types (
  inspection_type_id uuid primary key default gen_random_uuid(),
  inspection_type_key text not null unique,
  program_id uuid not null references regulatory_programs(program_id),
  code text not null unique,
  name text not null
);

create table workflow_stages (
  workflow_stage_id uuid primary key default gen_random_uuid(),
  workflow_stage_key text not null unique,
  program_id uuid not null references regulatory_programs(program_id),
  code text not null unique,
  ordinal integer not null,
  name text not null
);

create table source_records (
  source_record_id uuid primary key default gen_random_uuid(),
  source_record_key text not null unique,
  agency_id uuid references agencies(agency_id),
  title text not null,
  local_file_name text,
  source_url text,
  source_type text,
  fingerprint_hash text,
  verification_status verification_status not null,
  packet_role packet_role not null,
  jurisdiction_name text,
  county_group text,
  program_label text,
  inspection_type_label text,
  workflow_stage_label text,
  trigger_use_condition text,
  status_note text,
  operational_highlights text,
  validation_note text,
  superseded_by_source_record_id uuid references source_records(source_record_id),
  active_for_runtime boolean not null default true,
  created_at timestamptz not null default now()
);
create index source_records_lookup_idx on source_records (county_group, verification_status, packet_role);

create table form_records (
  form_record_id uuid primary key default gen_random_uuid(),
  form_record_key text not null unique,
  source_record_id uuid not null references source_records(source_record_id),
  packet_role packet_role not null,
  form_kind text not null,
  runtime_visibility text not null,
  jurisdiction_name text,
  program_label text,
  workflow_stage_label text,
  verification_status verification_status not null
);

create table document_vault_slots (
  slot_id uuid primary key default gen_random_uuid(),
  slot_key text not null unique,
  jurisdiction_id uuid not null references jurisdictions(jurisdiction_id),
  program_id uuid not null references regulatory_programs(program_id),
  slot_code text not null unique,
  required_stage_code text not null,
  kind text not null,
  label text not null
);

create table task_cadence_rules (
  task_rule_id uuid primary key default gen_random_uuid(),
  task_rule_key text not null unique,
  jurisdiction_id uuid not null references jurisdictions(jurisdiction_id),
  inspection_type_id uuid not null references inspection_types(inspection_type_id),
  cadence_code text not null,
  trigger_rule text not null
);

create table packet_rules (
  rule_id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  jurisdiction_id uuid not null references jurisdictions(jurisdiction_id),
  inspection_type_id uuid not null references inspection_types(inspection_type_id),
  workflow_stage_id uuid not null references workflow_stages(workflow_stage_id),
  required_flag boolean not null,
  severity text not null,
  packet_role packet_role not null,
  rule_expression jsonb not null,
  created_at timestamptz not null default now()
);
create index packet_rules_lookup_idx on packet_rules (jurisdiction_id, inspection_type_id, workflow_stage_id);

create table projects (
  project_id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name text not null,
  jurisdiction_id uuid references jurisdictions(jurisdiction_id),
  county_group text,
  site_address text,
  disturbed_acres numeric(10,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table templates (
  template_id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  family text not null,
  inspection_type_id uuid not null references inspection_types(inspection_type_id),
  display_name text not null
);

create table template_versions (
  template_version_id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(template_id),
  version_no integer not null,
  stage_code text not null,
  manifest jsonb not null,
  published_at timestamptz,
  retired_at timestamptz,
  unique(template_id, version_no)
);

create table workflow_runs (
  run_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(project_id),
  inspection_type_id uuid not null references inspection_types(inspection_type_id),
  current_stage_id uuid not null references workflow_stages(workflow_stage_id),
  template_version_id uuid references template_versions(template_version_id),
  status run_status not null default 'draft',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  closed_at timestamptz,
  gps_point text,
  data jsonb not null default '{}'::jsonb
);

create table wizard_sessions (
  wizard_session_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(project_id),
  inspection_type_id uuid not null references inspection_types(inspection_type_id),
  stage_code text not null,
  surface_mode text not null,
  status text not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gate_evaluations (
  gate_evaluation_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(run_id),
  jurisdiction_id uuid not null references jurisdictions(jurisdiction_id),
  workflow_stage_id uuid not null references workflow_stages(workflow_stage_id),
  status gate_status not null,
  rule_snapshot_ref text not null,
  requirements jsonb not null default '[]'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table stage_transitions (
  stage_transition_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(run_id),
  from_stage_id uuid references workflow_stages(workflow_stage_id),
  to_stage_id uuid not null references workflow_stages(workflow_stage_id),
  gate_evaluation_id uuid references gate_evaluations(gate_evaluation_id),
  result text not null,
  waiver_reason text,
  created_at timestamptz not null default now()
);

create table attachments (
  attachment_id uuid primary key default gen_random_uuid(),
  run_id uuid references workflow_runs(run_id),
  slot_id uuid references document_vault_slots(slot_id),
  kind text not null,
  file_name text not null,
  storage_key text not null,
  sha256_hash text not null,
  created_at timestamptz not null default now()
);

create table issues (
  issue_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(run_id),
  severity text not null,
  title text not null,
  description text,
  status text not null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table corrective_actions (
  corrective_action_id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(issue_id),
  assignee_id uuid,
  verification_evidence_required boolean not null default true,
  closed_at timestamptz
);

create table signatures (
  signature_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(run_id),
  signer_role text not null,
  signer_name text not null,
  signed_at timestamptz not null default now()
);

create table exports (
  export_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(run_id),
  packet_class text not null,
  status text not null default 'queued',
  output_storage_key text,
  created_at timestamptz not null default now()
);

create table verification_manifests (
  manifest_id uuid primary key default gen_random_uuid(),
  export_id uuid not null references exports(export_id),
  manifest jsonb not null,
  created_at timestamptz not null default now()
);

create table audit_events (
  audit_event_id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  object_type text not null,
  object_id uuid not null,
  event_code text not null,
  previous_state jsonb,
  new_state jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index audit_events_object_idx on audit_events (object_type, object_id, created_at);
