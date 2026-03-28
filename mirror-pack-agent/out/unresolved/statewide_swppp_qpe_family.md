# Unresolved Report: statewide_swppp_qpe_family

task_key: statewide_swppp_qpe_family
generated_at: 2026-03-25

---

## Missing Direct Mirrors

### CGP Order 2022-0057-DWQ (governing_order)
- **Classification**: source_reference_only
- **Impact**: Governs QPE thresholds, inspector qualifications, storm inspection cadence. Source URL is verified-direct but no local mirror present.
- **Next step**: Mirror alongside the weekly family CGP order in the same crawler pass. Same file.

---

## Missing Field Mappings

### During-QPE All Fields
- **Binding key**: during_qpe_all_fields
- **Issue**: The `swppp.during_qpe` stage is defined in programs_and_stages but no wizard manifest exists. Cannot map any fields for this stage.
- **Next step**: Wizard engineering team must author a `swppp.during_qpe.v1` manifest. Field structure should include: discharge_observed, turbidity_estimate, bmp_status_update, corrective_action, photos. Derive from CGP requirements and Mosswood example outputs.

### Post-QPE All Fields
- **Binding key**: post_qpe_all_fields
- **Issue**: Same as during_qpe — stage is defined but no manifest exists.
- **Next step**: Wizard engineering team must author a `swppp.post_qpe.v1` manifest covering: post-storm BMP inspection, corrective actions completed, discharge cessation confirmation.

### QSP/QSD Inspector Qualification Field
- **Binding key**: qpe_inspector_qualifications
- **Issue**: CGP requires QPE inspections by a Qualified SWPPP Practitioner (QSP) or Developer (QSD). No field for QSP cert number or qualification is present in any manifest.
- **Next step**: Add `inspector.qsp_cert_number` and `inspector.qsp_qualified` fields to signoff section of pre/during/post QPE wizard manifests. Source section reference: CGP 2022-0057-DWQ Attachment G.

---

## Missing Stage-Specific Artifacts

### During-QPE Wizard Manifest
- No `swppp.during_qpe.v1` manifest file exists in `docs/source_set/manifests/`.
- **Severity**: Blocker — this stage cannot be run or exported.

### Post-QPE Wizard Manifest
- No `swppp.post_qpe.v1` manifest file exists in `docs/source_set/manifests/`.
- **Severity**: Blocker — this stage cannot be run or exported.

---

## Ambiguous County/City Paths

No county/city ambiguity applies to the statewide QPE family. The CGP applies statewide. However, local RWQCB regions may impose stricter inspection requirements in some Bay Area counties — this is out of scope for this task slice and should be addressed in a future jurisdiction-specific overlay task.

---

## Recommended Next Acquisition Steps

1. **Priority 1 — Wizard manifests**: Author `swppp.during_qpe.v1` and `swppp.post_qpe.v1` wizard manifests. Source structure from CGP Attachment G (inspection requirements) and Mosswood example inputs as reference for real-world density.
2. **Priority 2 — QSP field spec**: Add QSP/QSD qualification fields to signoff sections of all QPE wizard manifests. Confirm with engineering before binding.
3. **Priority 3 — CGP mirror**: Run controlled crawler to mirror `cgp2022_order.pdf` bytes. Same acquisition step as weekly family. Do not duplicate effort.
4. **Priority 4 — CGP section cite**: Extract specific CGP section numbers (Attachment G) governing QPE inspection obligations into a citation field on the governing_order asset entry for runtime linking.
