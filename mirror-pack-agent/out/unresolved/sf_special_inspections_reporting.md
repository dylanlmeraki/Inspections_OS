# Unresolved Report: sf_special_inspections_reporting

task_key: sf_special_inspections_reporting
generated_at: 2026-03-25

---

## Missing Direct Mirrors

### SF DBI Special Inspection and Structural Observation Form (2025)
- **Classification**: source_reference_only
- **Source URL**: https://media.api.sf.gov/documents/Special_Inspection_and_Structural_Observation_Form_2025.pdf
- **verification_status**: verified-direct
- **Impact**: The cover form is referenced but not locally mirrored. Must be tracked with annual hash monitoring since SF updates by year.
- **Next step**: Mirror the PDF, fingerprint against seed hash `7d48367a9735`, and activate annual revision check in the document vault.

### SF DBI Special Inspections Process PDF (2025)
- **Classification**: source_reference_only
- **Source URL**: https://media.api.sf.gov/documents/Special_Inspections_Process_2025.pdf
- **verification_status**: verified-indirect
- **Impact**: Process guidance PDF not locally mirrored.
- **Next step**: Crawl and fingerprint alongside the cover form.

---

## Missing Field Mappings

### SF COI Attestation Verbatim Text
- **Binding key**: sf_coi_attestation_exact_text
- **Issue**: The existence of the COI attestation requirement is confirmed (effective 2024-02-05, source_record verified-direct). However, the exact verbatim text that must appear beneath the signature line is not present in the available source materials. The source URL is known but the text requires page retrieval.
- **Next step**: Access https://www.sf.gov/departments/department-building-inspection/inspection-services and extract the exact COI attestation language verbatim. Store in a product constant / string resource keyed to `sf_coi_attestation_text_v20240205`. Do not approximate or paraphrase.

---

## Missing Stage-Specific Artifacts

### SF DBI Weekly Reporting Form (Blank)
- No blank SF DBI-issued weekly special inspection reporting form has been identified or mirrored. The wizard template (`special.reporting.weekly.v1`) provides the product-native structure, but the SF AHJ-issued reporting form, if any, is not in the source set.
- **Assessment**: Based on the source evidence, SF DBI uses the statement/cover form at pre-permit and does not mandate a specific AHJ-issued weekly report format — weekly reporting is typically done on inspector's own letterhead or firm-generated format supplemented by the COI attestation. This should be confirmed.
- **Next step**: Query SF DBI to confirm whether a specific weekly report form is mandated or whether firm-generated reports with COI attestation language are acceptable.

---

## Ambiguous County/City Paths

San Francisco is both a city and county with a single AHJ (DBI). No county/city path ambiguity exists — there is no separate county overlay. However:

- SF DBI has updated forms and requirements annually. The 2025 forms are the current versions. A 2026 version may supersede them post-cutoff.
- **Next step**: Add a revision monitor watch record for the `media.api.sf.gov/documents/Special_Inspection*` URL pattern to detect future form updates.

---

## Recommended Next Acquisition Steps

1. **Priority 1 — COI text extraction**: Retrieve exact COI attestation language from the SF DBI inspection services page. This is a simple web fetch. Store text as a versioned product constant with effective date `2024-02-05`.
2. **Priority 2 — PDF mirrors**: Crawl and mirror `Special_Inspection_and_Structural_Observation_Form_2025.pdf` and `Special_Inspections_Process_2025.pdf`. Verify fingerprints against seed.
3. **Priority 3 — AHJ query**: Confirm with SF DBI whether a specific weekly report form is required or whether firm-generated reports with COI footer are acceptable.
4. **Priority 4 — Revision monitoring**: Register annual revision monitor for SF DBI forms at `media.api.sf.gov/documents/`.
