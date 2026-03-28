# Packet Rule Expression Guide

The build-start package uses a deliberately simple, seed-friendly rule object instead of a custom parser.

## Shape

```yaml
rule_key: swppp.noi.requires_signer_controls
jurisdiction_key: ca_statewide
inspection_type_key: swppp_enrollment
workflow_stage_code: swppp.noi_ready
required_flag: true
severity: blocker
packet_role: signer_control_reference
rule_expression:
  all:
    - fact: project.programs.swppp.enabled
      op: eq
      value: true
  require:
    fields:
      - project.swppp.lrp_name
      - project.swppp.dar_name
    documents:
      - swppp_eauthorization
    source_records:
      - statewide_smarts_eauthorization_help_guide_pdf
  blockers:
    - code: SWPPP_EAUTH_MISSING
      message: SMARTS eAuthorization evidence is required before NOI readiness.
```

## Evaluation contract

1. Resolve `all` conditions first.
2. If conditions do not match, return `not_applicable`.
3. If conditions match, evaluate `require`.
4. Return:
   - `pass` when all requirements are met
   - `warning` when non-blocking requirements are missing
   - `blocked` when blocker-level requirements are missing
   - `waived` only when a privileged actor provides a waiver reason

## Supported requirement buckets

- `fields`: scalar values in project, run, or wizard answer payloads
- `documents`: document-vault slot codes
- `source_records`: official source references that must be visible in admin / packet contexts
- `inspection_answers`: normalized wizard / inspection answer keys
- `attachments`: evidence constraints such as photo minimums
- `text_snippets`: required rendered text fragments such as COI language

## Why this shape

This keeps county and city variance in data rather than UI branches. The source-of-truth and PRD require packet rules to remain metadata-driven and explainable rather than hidden in code paths.  # noqa
