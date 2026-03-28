# Unresolved Report: sf_dust_control_monitoring

task_key: sf_dust_control_monitoring
generated_at: 2026-03-25

---

## Missing Direct Mirrors

### SF DPH Dust Control Plan Submission Page
- **Classification**: source_reference_only
- **Source URL**: https://www.sf.gov/submit-dust-control-plan (verified-indirect)
- **Impact**: No local mirror. This is a dynamic webpage, not a static PDF.
- **Next step**: Cache a rendered snapshot for offline reference. The applicability threshold (0.5 acres / 1000 ft receptors) is already recorded in the source evidence; the snapshot provides supporting detail.

### SF DPH Dust Control Overview and Requirements PDF
- **Classification**: source_reference_only
- **Source URL**: https://www.sf.gov/sites/default/files/2024-03/Dust%20Control%20--%20Department%20of%20Public%20Health.pdf (verified-indirect)
- **Impact**: PDF not locally mirrored.
- **Next step**: Crawl and fingerprint-verify against seed hash `63be33ddacb0`.

### SF Article 22B Regulatory Basis
- **Classification**: source_reference_only
- **Source URL**: unknown — referenced in form_records seed but source_url not retrieved in available evidence
- **Impact**: Regulatory citation in wizard cannot be linked to a source URL.
- **Next step**: Search SF Environment Code or query SF DPH directly for the canonical Article 22B URL.

---

## Missing Field Mappings

### Article 22B Source URL
- **Binding key**: dust_sf_article_22b_source_url
- **Issue**: The regulatory basis URL for SF dust control Article 22B requirements is not present in the available source evidence.
- **Next step**: Retrieve and record the URL. Update vault reference record.

### Monitoring Form Format
- **Binding key**: dust_sf_monitoring_form_format
- **Issue**: It is unclear whether SF DPH mandates a specific monitoring log form or whether the product-native wizard monitoring log satisfies the requirement.
- **Next step**: Query SF DPH directly or review the dust control plan approval documentation for monitoring form requirements.

---

## Missing Stage-Specific Artifacts

### SF DPH Prescribed Monitoring Checklist
- No blank SF DPH-issued monitoring checklist form has been identified. If one exists, it would be the reference form for the monitoring stage.
- **Impact**: If an AHJ-prescribed form is required, the wizard output format may need to match it.
- **Next step**: Confirm with SF DPH whether a specific monitoring checklist form is required.

---

## Ambiguous County/City Paths

San Francisco is both city and county. The dust control program is administered by SF DPH. No county/city path ambiguity.

However, there is an inter-agency split: DBI governs some dust aspects connected to permit conditions, DPW governs street/sidewalk work, and DPH governs the plan approval and monitoring program. The monitoring wizard currently targets DPH requirements. If a project triggers DBI or DPW dust conditions as well, the wizard scope may be incomplete.

- **Next step**: Review if DBI or DPW have separate dust monitoring obligations that would require additional wizard sections or packages beyond DPH monitoring.

---

## Recommended Next Acquisition Steps

1. **Priority 1 — SF DPH monitoring form confirmation**: Query SF DPH to confirm whether a specific monitoring log form is prescribed or whether system-generated reports satisfy the requirement.
2. **Priority 2 — Article 22B URL**: Retrieve the SF Environment Code citation for Article 22B and store as vault reference.
3. **Priority 3 — PDF mirror**: Crawl and fingerprint the DPH overview PDF; cache the dust control plan submission page snapshot.
4. **Priority 4 — Inter-agency scope check**: Confirm DBI and DPW dust obligation scope to determine if the monitoring wizard needs expansion beyond DPH requirements.
