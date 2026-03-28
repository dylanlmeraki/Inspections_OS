import { PROJECTS, SOURCE_RECORDS } from '@/domain/seedData';
import {
  createContentHash,
  createExportJobId,
  createManifestId,
  createManifestSourceEntryId,
  resetIdState,
  uid,
} from '@/lib/ids';

const STALE_WINDOW_DAYS = 120;

function isStaleTimestamp(lastSeenAt) {
  const timestamp = Date.parse(lastSeenAt);
  if (Number.isNaN(timestamp)) return true;
  const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  return ageDays > STALE_WINDOW_DAYS;
}

function withSourceFreshness(sourceRecord) {
  const verifiedAt = sourceRecord.verifiedAt || '2026-01-15T00:00:00.000Z';
  const lastSeenAt = sourceRecord.lastSeenAt || verifiedAt;
  return {
    ...sourceRecord,
    verifiedAt,
    lastSeenAt,
    stale: typeof sourceRecord.stale === 'boolean' ? sourceRecord.stale : isStaleTimestamp(lastSeenAt),
  };
}

function hydrateSourceRecords(records) {
  return records.map(withSourceFreshness);
}

const memory = {
  projects: structuredClone(PROJECTS),
  runs: [],
  issues: [],
  exports: [],
  manifests: [],
  manifestSourceEntries: [],
  stageGateEvaluations: [],
  transitionAttempts: [],
  ruleSnapshots: [],
  sourceRecords: hydrateSourceRecords(structuredClone(SOURCE_RECORDS)),
};

export const localDb = {
  listProjects: () => structuredClone(memory.projects),
  getProject: (id) => structuredClone(memory.projects.find((p) => p.id === id)),
  listSourceRecords: () => structuredClone(memory.sourceRecords),
  getSourceRecordById: (id) => structuredClone(memory.sourceRecords.find((item) => item.id === id)),
  createRun(run) {
    const r = { id: uid('run'), createdAt: new Date().toISOString(), status: 'draft', ...run };
    memory.runs.unshift(r);
    return structuredClone(r);
  },
  getRun: (id) => structuredClone(memory.runs.find((item) => item.id === id)),
  updateRun(id, patch) {
    const idx = memory.runs.findIndex((item) => item.id === id);
    if (idx < 0) return null;
    memory.runs[idx] = { ...memory.runs[idx], ...patch };
    return structuredClone(memory.runs[idx]);
  },
  listRuns: () => structuredClone(memory.runs),
  createIssue(issue) {
    const i = { id: uid('issue'), createdAt: new Date().toISOString(), status: 'open', ...issue };
    memory.issues.unshift(i);
    return structuredClone(i);
  },
  listIssues: () => structuredClone(memory.issues),
  createExport(exp) {
    const e = {
      id: createExportJobId(),
      createdAt: new Date().toISOString(),
      status: 'completed',
      manifestId: null,
      ...exp,
    };
    memory.exports.unshift(e);
    return structuredClone(e);
  },
  getExport: (id) => structuredClone(memory.exports.find((item) => item.id === id)),
  updateExport(id, patch) {
    const idx = memory.exports.findIndex((item) => item.id === id);
    if (idx < 0) return null;
    memory.exports[idx] = { ...memory.exports[idx], ...patch };
    return structuredClone(memory.exports[idx]);
  },
  listExports: () => structuredClone(memory.exports),
  createManifest(man) {
    const m = { id: createManifestId(), createdAt: new Date().toISOString(), ...man };
    memory.manifests.unshift(m);
    return structuredClone(m);
  },
  getManifest: (id) => structuredClone(memory.manifests.find((item) => item.id === id)),
  listManifests: () => structuredClone(memory.manifests),
  createManifestSourceEntries(entries) {
    const persisted = entries.map((entry) => ({
      id: createManifestSourceEntryId(),
      entryHash: entry.entryHash || createContentHash(entry, 'mse'),
      createdAt: new Date().toISOString(),
      ...entry,
    }));
    memory.manifestSourceEntries.unshift(...persisted);
    return structuredClone(persisted);
  },
  listManifestSourceEntries(manifestId = null) {
    const rows = manifestId
      ? memory.manifestSourceEntries.filter((item) => item.manifestId === manifestId)
      : memory.manifestSourceEntries;
    return structuredClone(rows);
  },
  createStageGateEvaluation(record) {
    const row = { id: uid('eval'), createdAt: new Date().toISOString(), ...record };
    memory.stageGateEvaluations.unshift(row);
    return structuredClone(row);
  },
  getStageGateEvaluation: (id) =>
    structuredClone(memory.stageGateEvaluations.find((item) => item.id === id)),
  listStageGateEvaluations: () => structuredClone(memory.stageGateEvaluations),
  createTransitionAttempt(record) {
    const row = { id: uid('transition'), createdAt: new Date().toISOString(), ...record };
    memory.transitionAttempts.unshift(row);
    return structuredClone(row);
  },
  listTransitionAttempts: () => structuredClone(memory.transitionAttempts),
  updateSourceRecord(id, patch) {
    const index = memory.sourceRecords.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const next = withSourceFreshness({
      ...memory.sourceRecords[index],
      ...patch,
    });
    memory.sourceRecords[index] = next;
    return structuredClone(next);
  },
  upsertRuleSnapshot(snapshot) {
    const index = memory.ruleSnapshots.findIndex((item) => item.id === snapshot.id);
    if (index === -1) {
      memory.ruleSnapshots.unshift({
        createdAt: new Date().toISOString(),
        ...snapshot,
      });
    } else {
      memory.ruleSnapshots[index] = {
        ...memory.ruleSnapshots[index],
        ...snapshot,
      };
    }
    const item = memory.ruleSnapshots.find((entry) => entry.id === snapshot.id);
    return structuredClone(item);
  },
  getRuleSnapshot: (id) => structuredClone(memory.ruleSnapshots.find((item) => item.id === id)),
  listRuleSnapshots: () => structuredClone(memory.ruleSnapshots),
  resetForTests() {
    resetIdState();
    memory.projects = structuredClone(PROJECTS);
    memory.sourceRecords = hydrateSourceRecords(structuredClone(SOURCE_RECORDS));
    memory.runs = [];
    memory.issues = [];
    memory.exports = [];
    memory.manifests = [];
    memory.manifestSourceEntries = [];
    memory.stageGateEvaluations = [];
    memory.transitionAttempts = [];
    memory.ruleSnapshots = [];
  },
};
