export const PROJECTS = [
  { id: 'proj_sf_001', name: 'Mission Creek Mixed Use', jurisdictionKey: 'san_francisco', countyGroup: 'San Francisco County', activePrograms: ['swppp_cgp', 'special_inspections', 'dust_control'], site: { disturbedAcres: 1.25, sensitiveReceptorsWithin1000ft: true }, swppp: { lrpName: 'Jane Doe', darName: 'Rob Roe' } },
  { id: 'proj_contra_001', name: 'Walnut Creek Retail TI', jurisdictionKey: 'contra_costa_county', countyGroup: 'Contra Costa County', activePrograms: ['special_inspections', 'trade_inspections'], site: { disturbedAcres: 0.1, sensitiveReceptorsWithin1000ft: false }, specialInspections: { flagged: true, selectedAgency: '' } },
  { id: 'proj_marin_001', name: 'San Rafael Hillside Residence', jurisdictionKey: 'marin_county', countyGroup: 'Marin County', activePrograms: ['special_inspections', 'trade_inspections'], structuralDrawingsRequired: true, specialInspections: { triggerAcknowledged: false } }
];

export const PROGRAMS = [
  { key: 'swppp_cgp', name: 'SWPPP / CGP' },
  { key: 'special_inspections', name: 'Special Inspections' },
  { key: 'dust_control', name: 'Dust Control' },
  { key: 'trade_inspections', name: 'Trade Inspections' }
];

export const WORKFLOWS = {
  swppp_cgp: { stages: [{ code: 'swppp.enrollment_gate', name: 'Enrollment / threshold gate' }, { code: 'swppp.noi_ready', name: 'NOI readiness / signer path' }, { code: 'swppp.opening_conditions', name: 'Field opening conditions' }, { code: 'swppp.weekly', name: 'Routine inspections' }, { code: 'swppp.not_closeout', name: 'NOT closeout' }], inspectionTypes: [{ code: 'swppp.enrollment', name: 'SWPPP enrollment' }, { code: 'swppp.active_series', name: 'SWPPP active series' }] },
  special_inspections: { stages: [{ code: 'special.pre_permit', name: 'Pre-permit packet' }, { code: 'special.reporting', name: 'Construction reporting' }, { code: 'special.closeout', name: 'Closeout / verification' }], inspectionTypes: [{ code: 'special.cbc17', name: 'CBC Chapter 17 special inspections' }, { code: 'special.calgreen', name: 'CALGreen special verification' }] },
  dust_control: { stages: [{ code: 'dust.applicability', name: 'Applicability gate' }, { code: 'dust.plan_approval', name: 'Plan approval' }, { code: 'dust.monitoring', name: 'Monitoring' }], inspectionTypes: [{ code: 'dust.sf_construction', name: 'SF Dust Control' }] },
  trade_inspections: { stages: [{ code: 'trade.request', name: 'Request capture' }, { code: 'trade.scheduling', name: 'Scheduling' }, { code: 'trade.result_capture', name: 'Result handling' }], inspectionTypes: [{ code: 'trade.building', name: 'Building trade inspection' }] }
};

export const SOURCE_RECORDS = [
  { id: 'src_d1', title: 'CGP Attachment D.1 Risk Worksheet', packetRole: 'source_reference', verificationStatus: 'verified-direct', fingerprintHash: 'd1-risk-2026', jurisdictionKey: 'ca_statewide', verifiedAt: '2026-01-20T00:00:00.000Z', lastSeenAt: '2026-03-20T00:00:00.000Z' },
  { id: 'src_d2', title: 'CGP Attachment D.2 PRD Requirements', packetRole: 'source_reference', verificationStatus: 'verified-direct', fingerprintHash: 'd2-prd-2026', jurisdictionKey: 'ca_statewide', verifiedAt: '2026-01-20T00:00:00.000Z', lastSeenAt: '2026-03-20T00:00:00.000Z' },
  { id: 'src_eauth', title: 'SMARTS eAuthorization Guide', packetRole: 'source_reference', verificationStatus: 'verified-direct', fingerprintHash: 'eauth-2026', jurisdictionKey: 'ca_statewide', verifiedAt: '2026-01-25T00:00:00.000Z', lastSeenAt: '2026-03-22T00:00:00.000Z' },
  { id: 'src_sf_coi', title: 'SF DBI Conflict of Interest Attestation', packetRole: 'rule', verificationStatus: 'verified-direct', fingerprintHash: 'sf-coi-2026', jurisdictionKey: 'san_francisco', verifiedAt: '2026-02-01T00:00:00.000Z', lastSeenAt: '2026-03-21T00:00:00.000Z' },
  { id: 'src_contra_agencies', title: 'Contra Costa Recognized Agencies', packetRole: 'agencies_list', verificationStatus: 'verified-direct', fingerprintHash: 'contra-agencies-2026', jurisdictionKey: 'contra_costa_county', verifiedAt: '2026-01-10T00:00:00.000Z', lastSeenAt: '2026-03-18T00:00:00.000Z' },
  { id: 'src_marin_trigger', title: 'Marin Submittal Checklist Special Inspection Trigger', packetRole: 'permit_trigger', verificationStatus: 'verified-indirect', fingerprintHash: 'marin-trigger-2026', jurisdictionKey: 'marin_county', verifiedAt: '2026-02-05T00:00:00.000Z', lastSeenAt: '2026-03-19T00:00:00.000Z' },
  { id: 'src_not', title: 'SMARTS Notice of Termination Guide', packetRole: 'closeout_reference', verificationStatus: 'gap-note', fingerprintHash: 'not-2026', jurisdictionKey: 'ca_statewide', verifiedAt: '2025-05-15T00:00:00.000Z', lastSeenAt: '2025-09-10T00:00:00.000Z' },
  { id: 'src_sf_dust', title: 'SF Dust Control Submission Guidance', packetRole: 'program_overview', verificationStatus: 'inferred-direct', fingerprintHash: 'sf-dust-2026', jurisdictionKey: 'san_francisco', verifiedAt: '2026-02-10T00:00:00.000Z', lastSeenAt: '2026-03-24T00:00:00.000Z' }
];

export const PACKET_RULES = [
  {
    id: 'rule_swppp_enrollment',
    scopeLevel: 'statewide',
    scopeKey: 'ca_statewide',
    priority: 100,
    jurisdictionKey: 'ca_statewide',
    programKey: 'swppp_cgp',
    inspectionTypeCode: 'swppp.enrollment',
    stageCode: 'swppp.enrollment_gate',
    severity: 'blocker',
    packetRole: 'threshold_gate_reference',
    requiredFields: ['site.disturbedAcres'],
    requiredDocuments: ['swppp_prd_set'],
    requiredSourceRecordIds: ['src_d1', 'src_d2'],
    blockerCode: 'SWPPP_ENROLLMENT_INCOMPLETE',
    message: 'Enrollment requires disturbed acres and PRD set attachment.'
  },
  {
    id: 'rule_swppp_noi',
    scopeLevel: 'statewide',
    scopeKey: 'ca_statewide',
    priority: 100,
    jurisdictionKey: 'ca_statewide',
    programKey: 'swppp_cgp',
    inspectionTypeCode: 'swppp.enrollment',
    stageCode: 'swppp.noi_ready',
    severity: 'blocker',
    packetRole: 'signer_control_reference',
    requiredFields: ['swppp.lrpName', 'swppp.darName'],
    requiredDocuments: ['swppp_eauthorization'],
    requiredSourceRecordIds: ['src_eauth'],
    blockerCode: 'SWPPP_SIGNER_PATH_INCOMPLETE',
    message: 'NOI readiness requires LRP, DAR, and eAuthorization evidence.'
  },
  {
    id: 'rule_swppp_opening',
    scopeLevel: 'statewide',
    scopeKey: 'ca_statewide',
    priority: 100,
    jurisdictionKey: 'ca_statewide',
    programKey: 'swppp_cgp',
    inspectionTypeCode: 'swppp.active_series',
    stageCode: 'swppp.opening_conditions',
    severity: 'blocker',
    packetRole: 'governing_order',
    requiredQuestions: ['opening.wdid_posted', 'opening.swppp_onsite', 'opening.contacts_confirmed'],
    requiredDocuments: ['swppp_wdid_posting', 'swppp_training_roster'],
    blockerCode: 'SWPPP_OPENING_CONDITIONS_MISSING',
    message: 'Opening conditions require posted WDID, onsite SWPPP, contacts, and training roster.'
  },
  {
    id: 'rule_special_sf',
    scopeLevel: 'city',
    scopeKey: 'san_francisco',
    priority: 700,
    jurisdictionKey: 'san_francisco',
    programKey: 'special_inspections',
    inspectionTypeCode: 'special.cbc17',
    stageCode: 'special.reporting',
    severity: 'blocker',
    packetRole: 'coi_requirement',
    requiredSourceRecordIds: ['src_sf_coi'],
    blockerCode: 'SF_COI_ATTESTATION_REQUIRED',
    message: 'San Francisco reporting must carry the conflict-of-interest attestation.'
  },
  {
    id: 'rule_special_contra_project_override',
    scopeLevel: 'project',
    scopeKey: 'proj_contra_001',
    priority: 900,
    mergeKey: 'special_agency_selection_requirement',
    jurisdictionKey: 'contra_costa_county',
    programKey: 'special_inspections',
    inspectionTypeCode: 'special.cbc17',
    stageCode: 'special.pre_permit',
    severity: 'blocker',
    packetRole: 'agencies_list',
    requiredFields: ['specialInspections.selectedAgency'],
    requiredSourceRecordIds: ['src_contra_agencies'],
    blockerCode: 'CONTRA_RECOGNIZED_AGENCY_REQUIRED',
    message: 'Contra Costa pre-permit packet requires recognized agency selection.'
  },
  {
    id: 'rule_special_contra',
    scopeLevel: 'county',
    scopeKey: 'contra_costa_county',
    priority: 500,
    mergeKey: 'special_agency_selection_requirement',
    jurisdictionKey: 'contra_costa_county',
    programKey: 'special_inspections',
    inspectionTypeCode: 'special.cbc17',
    stageCode: 'special.pre_permit',
    severity: 'blocker',
    packetRole: 'agencies_list',
    requiredFields: ['specialInspections.selectedAgency'],
    requiredSourceRecordIds: ['src_contra_agencies'],
    blockerCode: 'CONTRA_RECOGNIZED_AGENCY_REQUIRED',
    message: 'Contra Costa pre-permit packet requires recognized agency selection.'
  },
  {
    id: 'rule_special_marin',
    scopeLevel: 'county',
    scopeKey: 'marin_county',
    priority: 500,
    jurisdictionKey: 'marin_county',
    programKey: 'special_inspections',
    inspectionTypeCode: 'special.cbc17',
    stageCode: 'special.pre_permit',
    severity: 'blocker',
    packetRole: 'permit_trigger',
    requiredFields: ['specialInspections.triggerAcknowledged'],
    requiredSourceRecordIds: ['src_marin_trigger'],
    blockerCode: 'MARIN_TRIGGER_ACK_REQUIRED',
    message: 'Marin pre-permit path requires trigger acknowledgment.'
  },
  {
    id: 'rule_special_marin_warning',
    scopeLevel: 'county',
    scopeKey: 'marin_county',
    priority: 500,
    jurisdictionKey: 'marin_county',
    programKey: 'special_inspections',
    inspectionTypeCode: 'special.cbc17',
    stageCode: 'special.pre_permit',
    severity: 'warning',
    packetRole: 'permit_trigger',
    requiredFields: ['specialInspections.engineerOfRecordProvided'],
    requiredSourceRecordIds: ['src_marin_trigger'],
    blockerCode: 'MARIN_ENGINEER_OF_RECORD_RECOMMENDED',
    message: 'Marin pre-permit path should include engineer-of-record disclosure where available.'
  },
  {
    id: 'rule_dust_sf',
    scopeLevel: 'city',
    scopeKey: 'san_francisco',
    priority: 700,
    jurisdictionKey: 'san_francisco',
    programKey: 'dust_control',
    inspectionTypeCode: 'dust.sf_construction',
    stageCode: 'dust.applicability',
    severity: 'blocker',
    packetRole: 'program_overview',
    requiredFields: ['site.disturbedAcres', 'site.sensitiveReceptorsWithin1000ft'],
    requiredSourceRecordIds: ['src_sf_dust'],
    blockerCode: 'SF_DUST_APPLICABILITY_REQUIRES_SITE_FACTS',
    message: 'Dust applicability needs site disturbance and receptor facts.'
  },
  {
    id: 'rule_swppp_not',
    scopeLevel: 'statewide',
    scopeKey: 'ca_statewide',
    priority: 100,
    jurisdictionKey: 'ca_statewide',
    programKey: 'swppp_cgp',
    inspectionTypeCode: 'swppp.active_series',
    stageCode: 'swppp.not_closeout',
    severity: 'blocker',
    packetRole: 'closeout_reference',
    requiredQuestions: ['closeout.final_stabilization_confirmed'],
    requiredAttachments: [{ kind: 'photo', tag: 'final_stabilization', minimum: 3 }],
    requiredSourceRecordIds: ['src_not'],
    blockerCode: 'NOT_CLOSEOUT_INCOMPLETE',
    message: 'NOT closeout requires final stabilization confirmation and photo evidence.'
  }
];

export const TEMPLATE_LIBRARY = {
  'swppp.enrollment_gate': { title: 'SWPPP Enrollment Wizard', fields: [{ key: 'site.disturbedAcres', label: 'Disturbed Acres', type: 'number', required: true }], documents: [{ key: 'swppp_prd_set', label: 'PRD Set', required: true }], prompts: ['Confirm threshold applicability.', 'Attach the current PRD set.'] },
  'swppp.noi_ready': { title: 'SWPPP NOI Readiness', fields: [{ key: 'swppp.lrpName', label: 'LRP Name', type: 'text', required: true }, { key: 'swppp.darName', label: 'DAR Name', type: 'text', required: true }], documents: [{ key: 'swppp_eauthorization', label: 'eAuthorization Evidence', required: true }], prompts: ['Confirm the signer path.', 'Attach current eAuthorization evidence.'] },
  'swppp.opening_conditions': { title: 'SWPPP Opening Conditions', questions: [{ key: 'opening.wdid_posted', label: 'WDID posted?', type: 'boolean', required: true }, { key: 'opening.swppp_onsite', label: 'SWPPP onsite and available?', type: 'boolean', required: true }, { key: 'opening.contacts_confirmed', label: 'Contacts confirmed?', type: 'boolean', required: true }], documents: [{ key: 'swppp_wdid_posting', label: 'WDID Posting Proof', required: true }, { key: 'swppp_training_roster', label: 'Training Roster', required: true }], prompts: ['Capture opening-stage evidence before recurring inspections begin.'] },
  'special.pre_permit': { title: 'Special Inspections Pre-Permit Packet', fields: [{ key: 'specialInspections.selectedAgency', label: 'Selected Agency', type: 'text', required: false }, { key: 'specialInspections.triggerAcknowledged', label: 'Trigger Acknowledged', type: 'boolean', required: false }], documents: [{ key: 'special_cover_packet', label: 'Special Inspection Cover Packet', required: false }], prompts: ['Select the jurisdiction path and assemble the packet set.'] },
  'special.reporting': { title: 'Special Inspection Reporting', questions: [{ key: 'special.reporting_complete', label: 'Reporting complete for this period?', type: 'boolean', required: true }], prompts: ['Capture recurring or event-based reporting details.'] },
  'dust.applicability': { title: 'Dust Control Applicability', fields: [{ key: 'site.disturbedAcres', label: 'Disturbed Acres', type: 'number', required: true }, { key: 'site.sensitiveReceptorsWithin1000ft', label: 'Sensitive receptors within 1000 ft', type: 'boolean', required: true }], prompts: ['Determine if a dust control plan is required for this site.'] },
  'swppp.not_closeout': { title: 'SWPPP NOT Closeout', questions: [{ key: 'closeout.final_stabilization_confirmed', label: 'Final stabilization confirmed?', type: 'boolean', required: true }], prompts: ['Capture final stabilization proof and closeout evidence.'] }
};
