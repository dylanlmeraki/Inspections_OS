# Unresolved Report: baaqmd_asbestos_readiness

task_key: baaqmd_asbestos_readiness
generated_at: 2026-03-25

---

## Missing Direct Mirrors

### BAAQMD Asbestos Program Page
- **Classification**: source_reference_only
- **Source URL**: https://www.baaqmd.gov/permits/asbestos (verified-indirect)
- **Impact**: No local mirrored content. Must be exposed as a vault reference link.
- **Next step**: Crawl the BAAQMD asbestos page and cache a rendered snapshot for offline reference. This is a webpage, not a static PDF, so a page snapshot is the appropriate artifact.

### BAAQMD Compliance Tips and Demolition Flowchart PDF
- **Classification**: source_reference_only
- **Source URL**: https://www.baaqmd.gov/~/media/files/compliance-and-enforcement/asbestos/asbestos_tips.pdf
- **Impact**: PDF URL known but not locally mirrored.
- **Next step**: Include in the same BAAQMD crawl pass. Verify fingerprint hash against seed value `825ecaa30efb`.

### BAAQMD Date Revision Advisory for Contractors PDF (2024)
- **Classification**: source_reference_only
- **Source URL**: https://www.baaqmd.gov/~/media/files/compliance-and-enforcement/asbestos/online_asbestos_notifications_advisory_contractors_2024.pdf
- **Impact**: PDF URL known but not locally mirrored.
- **Next step**: Include in the same BAAQMD crawl pass. Verify fingerprint hash against seed value `6210ff18fd9f`.

---

## Missing Field Mappings

### Acknowledgment Letter Format
- **Binding key**: asbestos_ack_letter_format
- **Issue**: The BAAQMD online portal issues some form of acknowledgment when a notice is submitted, but the format (PDF receipt, confirmation number, email, scan upload) is not documented in the available source evidence.
- **Next step**: Access the BAAQMD online notification portal (https://www.baaqmd.gov/permits/asbestos) or contact BAAQMD compliance staff to document the exact acknowledgment output format. Update after confirmation.

---

## Missing Stage-Specific Artifacts

### date_revision Stage Wizard Manifest
- No dedicated wizard manifest exists for `asbestos.date_revision`. The gate rule exists in packet_rules.seed.yaml but the wizard step for notifying users and capturing date revision confirmation is not manifested.
- **Impact**: Date revision workflow cannot be surfaced as a guided wizard step.
- **Next step**: Author a `asbestos.date_revision.v1` manifest with sections for: revised_start_date, revised_end_date, revision_submitted_flag, revision_confirmation_number. Derive from BAAQMD contractor advisory.

### pre_demo Stage Wizard Manifest
- No dedicated wizard manifest exists for `asbestos.pre_demo`. The pre_demo checklist is described in the BAAQMD compliance tips PDF.
- **Impact**: The pre-demolition checklist cannot be surfaced as a guided wizard step.
- **Next step**: Author a `asbestos.pre_demo.v1` manifest covering demolition readiness items as described in the BAAQMD compliance tips flowchart.

---

## Ambiguous County/City Paths

No county/city ambiguity: BAAQMD jurisdiction covers all 9 Bay Area counties uniformly for asbestos notification. No per-city overlay is required for these stages.

However, there is a known interaction between BAAQMD notices and local building department demolition permits (see `[REGIONAL]_BAAQMD_Online-Asbestos-Notifications-Advisory_Building-Departments.pdf` in source records). The handshake between BAAQMD and local AHJs is not fully mapped. This is an inter-agency path ambiguity that affects orchestration but not the direct asbestos wizard fields.

---

## Recommended Next Acquisition Steps

1. **Priority 1 — BAAQMD portal inspection**: Manually test the BAAQMD online notification portal to document the exact acknowledgment output format. Update `asbestos_ack_letter_format` binding after confirming.
2. **Priority 2 — BAAQMD crawler pass**: Fetch and fingerprint-verify `asbestos_tips.pdf`, `online_asbestos_notifications_advisory_contractors_2024.pdf`, and `online-asbestos-notifications-advisory-building-departments.pdf` from BAAQMD.
3. **Priority 3 — Wizard manifests for date_revision and pre_demo stages**: Author both manifests before activating those stages in the runtime.
4. **Priority 4 — AHJ coordination note**: Add an inter-agency coordination note to the project metadata for projects with BAAQMD notices, flagging the building permit / demolition permit intersection. This is an orchestration concern, not an asbestos-specific form gap.
