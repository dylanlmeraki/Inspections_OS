# Unresolved Report: marin_special_pre_permit

task_key: marin_special_pre_permit
generated_at: 2026-03-25
pass: 2
pass_notes: >
  This pass resolves the trigger classification (checklist reclassified from
  source_reference_only to trigger_only per BayArea Next Pass Binder 2026-03-21).
  The prior gap-note artifact is superseded. Core blockers (cover form, agencies list,
  city routing) remain open.

---

## Missing Direct Mirrors

### Marin County Special Inspections Cover Form (Unincorporated)
- **Classification**: unresolved
- **Evidence**: No Marin County-issued special inspection statement/cover form is present in the source set. The trigger checklist PDF (4274 bytes, county-replacement version 2024-12-20) is a general permit submittal checklist that establishes the trigger requirement — it is explicitly "not a dedicated special-inspection cover form" (BayArea Next Pass Binder 2026-03-21). The prior gap-note artifact (`county_marin_special_inspections_city_county_gap_note`) is superseded by the trigger checklist but the cover-form gap it documented remains open.
- **Impact**: Projects in unincorporated Marin County cannot complete the cover_form slot. Hard blocker.
- **Next step**: Contact Marin County Community Development Agency (CDA) Building and Safety Division. Request the current special inspection statement form. URL to start: https://www.marincounty.gov/depts/cd/divisions/building-and-safety.

### Marin County Recognized Agencies List
- **Classification**: unresolved
- **Evidence**: No Marin County recognized special inspection agencies list is present in the source set. (Contra Costa has a small PDF; Marin has nothing identified.)
- **Impact**: The agency selector cannot be validated against an approved list. Agency name field must remain free-text until acquired.
- **Next step**: Retrieve the Marin CDA recognized special inspection agencies list from the county building safety website.

---

## Missing Field Mappings

### Unincorporated Cover Form
- **Binding key**: marin_unincorporated_cover_form
- See above. Cannot map until form is acquired.

### Recognized Agencies List Validation
- **Binding key**: marin_recognized_agencies_list
- See above. Cannot validate until list is acquired.

### City vs County Routing
- **Binding key**: marin_city_jurisdiction_routing
- **Issue**: Projects within Marin incorporated cities (San Rafael, Mill Valley, Novato, Tiburon, Sausalito, etc.) route to city-specific forms; unincorporated projects route to the county form. Neither routing nor all city forms are resolved.
- **Next step**: Implement Marin jurisdiction resolver. San Rafael form is available (source_reference_only). Other cities' forms must be acquired.

---

## Missing Stage-Specific Artifacts

### City-Level Forms for Marin Incorporated Cities
- San Rafael: form present (`source_reference_only`, URL verified-direct, fingerprint `81b949e097ee`). Needs local mirror.
- Other Marin cities (Mill Valley, Novato, Sausalito, Tiburon, Belvedere, San Anselmo, Fairfax, Corte Madera, Larkspur, Ross): No forms present in source set.
- **Next step**: Systematically acquire special inspection forms for incorporated Marin cities in a future pass.

---

## Ambiguous County/City Paths

Like Contra Costa, Marin County presents a significant county/city path ambiguity:

1. **Unincorporated vs incorporated**: Routing to county AHJ vs city AHJ requires project address → jurisdiction lookup.
2. **San Rafael (Marin County seat)**: Form available (source_reference_only). Ready for vault reference.
3. **Other Marin cities**: No forms available.
4. **Unincorporated Marin**: County form is unresolved (harder than Contra Costa since no partial PDF exists).

The source records seed explicitly flags this as a `gap-note` (verification_status: gap-note): `county_marin_special_inspections_city_county_gap_note`.

The runtime jurisdiction selector must surface this as: "Is this project within an incorporated city?" with follow-on routing.

---

## Recommended Next Acquisition Steps

1. **Priority 1 — County cover form**: Contact Marin CDA Building and Safety Division to obtain the unincorporated Marin County special inspection statement form.
2. **Priority 2 — Recognized agencies list**: Search Marin CDA building safety pages for a recognized agencies list. If none is maintained at the county level, check if Marin defers to IAS, ICC-ES, or AASHTO recognition, and document accordingly.
3. **Priority 3 — San Rafael form mirror**: Mirror the San Rafael special inspection form PDF from the verified URL. Fingerprint against seed hash `81b949e097ee`.
4. **Priority 4 — City forms**: Enumerate Marin incorporated cities and acquire special inspection forms for each in a future pass.
5. **Priority 5 — Jurisdiction resolver**: Implement Marin city/county boundary routing logic, consistent with the Contra Costa approach.
