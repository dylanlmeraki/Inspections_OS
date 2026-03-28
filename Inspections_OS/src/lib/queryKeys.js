export const queryKeys = {
  projects: () => ["projects"],
  sourceRecords: () => ["source_records"],
  runs: () => ["runs"],
  issues: () => ["issues"],
  exports: () => ["exports"],
  manifests: () => ["manifests"],
  auditEvents: () => ["audit_events"],
  vaultSlots: (projectId) => ["vault_slots", projectId]
};
