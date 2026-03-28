# Unresolved Report: statewide_swppp_weekly_family

task_key: statewide_swppp_weekly_family
generated_at: 2026-03-25

---

## Missing Direct Mirrors

### CGP Order 2022-0057-DWQ (governing_order)
- **Classification**: source_reference_only
- **Source URL verified**: Yes (verified-direct in source_records.seed.yaml)
- **Local mirrored PDF in pack directory**: No — the local_file_name reference appears in seed records but the actual PDF is not present in `docs/source_set/` locally within this bundle.
- **Impact**: Cannot reference mirrored bytes in the pack export manifest. The document vault must use the source URL as the reference link.
- **Next step**: Run a controlled crawler fetch for `cgp2022_order.pdf` from `https://www.waterboards.ca.gov/water_issues/programs/stormwater/construction/docs/2022-0057-dwq-with-attachments/` and deposit it in the designated mirror store with a fingerprint hash check.

### CGP Attachment D.1 Risk Determination Worksheet
- **Classification**: source_reference_only
- **Impact**: Used as context for risk-level field on weekly inspection runs but not physically present.
- **Next step**: Mirror alongside the governing order in the same crawl pass.

---

## Missing Field Mappings

### BMP Item-Level Detail Narrative
- **Binding key**: weekly_bmp_item_detail_fields
- **Issue**: The BMP inspection example (`BMP Inspection 11-22-24.pdf`) is a filled output showing per-item narrative rows, but no blank official form provides a labeled field schema. The wizard manifest only specifies section items at a high level.
- **Next step**: Wizard engineering team must specify the exact field schema for per-BMP-item narrative (item label, BMP type code, location, status, note text). Then re-classify this binding as mapped.

### Photo Attachment Metadata
- **Binding key**: weekly_photo_attachment_metadata
- **Issue**: The gate rule (photo_on_fail) is defined, but the exact metadata fields per photo upload (GPS, timestamp, BMP reference tag, file format constraints) are absent from available manifests.
- **Next step**: Wizard engineering specification needed. Do not invent field names without engineering confirmation.

---

## Missing Stage-Specific Artifacts

### SWPPP Weekly Blank Official Report Sheet
- No blank, unbranded, authority-issued weekly SWPPP inspection form has been mirrored. The only example is `BMP Inspection 11-22-24.pdf` (example_output_only).
- The wizard manifest (`swppp.manifest.yaml`) defines the structure but is not a regulatorily-issued form.
- **Impact**: For jurisdictions that require submission of a specific authority form rather than a system-generated report, this is a gap.
- **Next step**: Acquire a California SMARTS-compatible or CGP-compliant blank weekly inspection template if one exists from the Water Board. If none exists (the CGP does not mandate a specific form), document this explicitly in program metadata.

---

## Ambiguous County/City Paths

### Statewide vs Bay Area Risk Level
- The CGP 2022 applies statewide, but Bay Area projects may intersect with regional requirements (BAAQMD, RWQCB). The weekly inspection scope at this stage is purely statewide/CGP-driven, so no county-specific ambiguity applies directly to `swppp.weekly`.
- Risk type (Type 1, 2, 3) drives inspection frequency and must be stored on the project before the weekly series activates.
- **Next step**: Verify that risk level is captured upstream in the enrollment gate and surfaced on the project metadata during weekly stage activation. No additional acquisition needed here.

---

## Recommended Next Acquisition Steps

1. **Priority 1 — Crawler fetch**: Mirror `[STATEWIDE]_CA-WaterBoards_Construction-General-Permit_Order-2022-0057-DWQ.pdf` and `[STATEWIDE]_CA-WaterBoards_CGP_Attachment-D1_Risk-Determination-Worksheet.pdf` from verified source URLs. Verify fingerprint hash against seed records.
2. **Priority 2 — Engineering spec**: Wizard team to publish field spec for (a) per-BMP-item detail rows and (b) photo attachment metadata fields. Update field_bindings after receipt.
3. **Priority 3 — Authority form inquiry**: Query State Water Board whether a specific blank weekly inspection form is prescribed for CGP compliance. If none, document in program metadata and proceed with wizard-native report generation.
