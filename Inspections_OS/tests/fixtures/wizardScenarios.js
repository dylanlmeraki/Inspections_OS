export const wizardScenarios = /** @type {const} */ ({
  contraCostaPrePermit: {
    selection: {
      projectId: "proj_contra_001",
      programKey: "special_inspections",
      inspectionTypeCode: "special.cbc17",
      stageCode: "special.pre_permit",
      mode: "desktop",
    },
    answersBlocked: {
      specialInspections: {},
    },
    answersPass: {
      specialInspections: {
        selectedAgency: "Agency A",
      },
    },
    attachedDocuments: [],
    attachments: [],
  },
  marinPrePermit: {
    selection: {
      projectId: "proj_marin_001",
      programKey: "special_inspections",
      inspectionTypeCode: "special.cbc17",
      stageCode: "special.pre_permit",
      mode: "desktop",
    },
    answersBlocked: {
      specialInspections: {
        triggerAcknowledged: false,
      },
    },
    answersPassWithWarning: {
      specialInspections: {
        triggerAcknowledged: true,
      },
    },
    attachedDocuments: [],
    attachments: [],
  },
  swpppOpeningConditions: {
    selection: {
      projectId: "proj_sf_001",
      programKey: "swppp_cgp",
      inspectionTypeCode: "swppp.active_series",
      stageCode: "swppp.opening_conditions",
      mode: "mobile",
    },
    answersBlocked: {
      opening: {
        wdid_posted: true,
        swppp_onsite: true,
        contacts_confirmed: false,
      },
    },
    answersPass: {
      opening: {
        wdid_posted: true,
        swppp_onsite: true,
        contacts_confirmed: true,
      },
    },
    attachedDocumentsBlocked: ["swppp_training_roster"],
    attachedDocumentsPass: ["swppp_wdid_posting", "swppp_training_roster"],
    attachments: [],
  },
  swpppNotCloseout: {
    selection: {
      projectId: "proj_sf_001",
      programKey: "swppp_cgp",
      inspectionTypeCode: "swppp.active_series",
      stageCode: "swppp.not_closeout",
      mode: "mobile",
    },
    answersBase: {
      closeout: {
        final_stabilization_confirmed: true,
      },
    },
    attachedDocuments: [],
    attachmentsBlocked: [
      { kind: "photo", tag: "final_stabilization", durableRef: "file://photo-1.jpg" },
      { kind: "photo", tag: "final_stabilization", durableRef: "file://photo-2.jpg" },
    ],
    attachmentsPass: [
      { kind: "photo", tag: "final_stabilization", durableRef: "file://photo-1.jpg" },
      { kind: "photo", tag: "final_stabilization", durableRef: "file://photo-2.jpg" },
      { kind: "photo", tag: "final_stabilization", durableRef: "file://photo-3.jpg" },
    ],
  },
});
