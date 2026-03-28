# Unresolved Report: contra_costa_special_pre_permit

task_key: contra_costa_special_pre_permit
generated_at: 2026-03-25

---

## Missing Direct Mirrors

### Contra Costa County Special Inspections Cover Form
- **Classification**: unresolved
- **Evidence**: No county-issued pre-permit special inspection statement/cover form is present in the source set. The provided PDF (4.3 KB) covers the program overview and agencies listing, not a fillable statement form.
- **Impact**: Projects in unincorporated Contra Costa County cannot complete the cover_form slot without this document.
- **Next step**: Contact Contra Costa County Building Inspection Division and obtain the current special inspection statement form. Verify revision date.

### Contra Costa Complete Recognized Agencies List
- **Classification**: source_reference_only (partially present)
- **Evidence**: A small PDF (4.3 KB) is present at `docs/source_set/[COUNTY-Contra-Costa]_Special-Inspections-Program-and-Recognized-Agencies (1).pdf`. This is too small to be a complete agencies list. May be a summary page or index page only.
- **Impact**: The recognized-agency gate rule requires a complete list to validate agency selection. A 4.3 KB PDF cannot be the full list if it contains firm names, certifications, and contacts.
- **Next step**: Retrieve the complete Contra Costa recognized agencies list from the county building inspection website. Compare content against the small PDF; if it is only a cover page, acquire the full list separately.

---

## Missing Field Mappings

### Unincorporated County Cover Form
- **Binding key**: contra_costa_unincorporated_cover_form
- **Issue**: No cover form available for projects in unincorporated Contra Costa County.
- **Next step**: See above. Acquire county form, then map fields.

### Machine-Readable Agencies List
- **Binding key**: contra_costa_agencies_list_machine_readable
- **Issue**: The small PDF's structure is unconfirmed. If it is a narrative reference rather than a structured list, the agency selector cannot be populated.
- **Next step**: Retrieve and parse the full agencies list.

### City vs County Routing
- **Binding key**: contra_costa_city_vs_county_routing
- **Issue**: Projects within incorporated cities in Contra Costa County route to city-specific forms (Walnut Creek, Concord, etc.), while unincorporated projects route to the county form. The routing resolver is not yet implemented and the county form is unresolved.
- **Next step**: Implement jurisdiction boundary lookup logic using city incorporation boundaries for Contra Costa County.

---

## Missing Stage-Specific Artifacts

### City-Level Forms for Contra Costa Incorporated Cities
- Walnut Creek: form present (`source_reference_only`, URL verified-direct, fingerprint `d15253a9f643`). Needs local mirror.
- Other Contra Costa cities (Concord, Antioch, Pittsburg, Richmond, Brentwood, etc.): No forms are present in the source set for these cities.
- **Next step**: Systematically acquire special inspection forms for incorporated cities in Contra Costa County in a future pass.

---

## Ambiguous County/City Paths

This task slice has a significant county/city path ambiguity:

1. **Unincorporated vs incorporated**: Projects must route to either the county AHJ or a city AHJ depending on the project address. The routing logic requires a GIS boundary lookup or an address-based city-vs-county resolver.
2. **Walnut Creek**: Form available (source_reference_only). Can proceed.
3. **Other cities**: No forms available. Must be acquired.
4. **Unincorporated**: County form is unresolved.

The runtime jurisdiction selector must surface this as a required intake field ("Is this project within an incorporated city?") with follow-on routing to the correct AHJ.

---

## Recommended Next Acquisition Steps

1. **Priority 1 — County cover form**: Contact Contra Costa Building Inspection Division directly. Request current Special Inspection Statement form for unincorporated county projects.
2. **Priority 2 — Full agencies list**: Retrieve complete recognized agencies list from county website. If the 4.3 KB PDF is incomplete, get the full version.
3. **Priority 3 — City forms**: Add Concord, Antioch, Pittsburg, Richmond, Brentwood, Walnut Creek (mirror), and other Contra Costa incorporated cities to the next acquisition task. Use county city directory to enumerate.
4. **Priority 4 — Jurisdiction resolver**: Implement project address → AHJ routing for Contra Costa County using GIS or zip code → city mapping.
