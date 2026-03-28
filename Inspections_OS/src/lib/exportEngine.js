import { jsPDF } from "jspdf";
import {
  createContentHash,
  createEvidenceId,
  createManifestId,
  createPacketId,
} from "@/lib/ids";
import { localDb } from "@/lib/localDb";
import { buildWizardPlan } from "@/lib/wizardAbstractionService";

/**
 * @param {import("@/contracts/types").GateEvaluation} evaluation
 */
function resolveManifestSourceEntries(evaluation) {
  const sourceIds = evaluation.sourceRecordIdsUsed || [];
  return sourceIds
    .map((sourceRecordId) => localDb.getSourceRecordById(sourceRecordId))
    .filter(Boolean)
    .map((src) => ({
      sourceRecordId: src.id,
      title: src.title,
      packetRole: src.packetRole,
      verificationStatus: src.verificationStatus,
      fingerprintHash: src.fingerprintHash,
      verifiedAt: src.verifiedAt,
      lastSeenAt: src.lastSeenAt,
      stale: src.stale,
    }));
}

/**
 * @param {ReturnType<typeof resolveManifestSourceEntries>} sourceEntries
 */
function buildBasisDisclosures(sourceEntries) {
  const nuanceStatuses = new Set(["verified-indirect", "inferred-direct", "gap-note"]);
  const staleSources = sourceEntries.filter((entry) => entry.stale);
  return sourceEntries
    .filter((entry) => nuanceStatuses.has(entry.verificationStatus))
    .map((entry) => ({
      sourceRecordId: entry.sourceRecordId,
      title: entry.title,
      verificationStatus: entry.verificationStatus,
      note: `Source basis is ${entry.verificationStatus} and should be disclosed in export defensibility records.`,
    }))
    .concat(
      staleSources.map((entry) => ({
        sourceRecordId: entry.sourceRecordId,
        title: entry.title,
        verificationStatus: entry.verificationStatus,
        note: "Source record appears stale and should be refreshed before submission.",
      }))
    );
}

/**
 * @param {ReadonlyArray<Record<string, unknown>>} attachments
 */
function normalizeEvidenceItems(attachments) {
  return attachments
    .map((attachment, index) => {
      const kind = typeof attachment.kind === "string" ? attachment.kind : "file";
      const tag = typeof attachment.tag === "string" ? attachment.tag : null;
      const durableRef =
        typeof attachment.durableRef === "string"
          ? attachment.durableRef
          : typeof attachment.url === "string"
          ? attachment.url
          : `local://${kind}/${index + 1}`;
      const hashSource = JSON.stringify({ kind, tag, durableRef, attachment });
      const hash =
        typeof attachment.hash === "string"
          ? attachment.hash
          : createContentHash(hashSource, "evh");

      return {
        evidenceId:
          typeof attachment.evidenceId === "string"
            ? attachment.evidenceId
            : createEvidenceId(),
        kind,
        tag,
        durableRef,
        hash,
        order: index + 1,
      };
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * @param {import("@/contracts/types").GateEvaluation} evaluation
 */
function buildOmissionDisclosures(evaluation) {
  return evaluation.requirements
    .filter((item) => !item.met)
    .map((item) => `${item.type}:${item.key}`);
}

/**
 * @param {ReturnType<import("@/lib/wizardAbstractionService").buildWizardPlan>} plan
 * @param {import("@/contracts/types").GateEvaluation} evaluation
 */
function buildAssemblyGraph(plan, evaluation) {
  const requiredSections = ["cover_sheet", "gate_summary", "verification_manifest"];
  const optionalSections = ["supporting_evidence", "issue_log"];
  const blockerSections =
    evaluation.status === "blocked"
      ? ["blocker_disclosure", "waiver_disclosure"]
      : [];

  return {
    requiredSections,
    optionalSections,
    blockerSections,
    manifestAppendixSections: ["manifest_source_entries", "evidence_inventory"],
    omissionDisclosures: buildOmissionDisclosures(evaluation),
  };
}

/**
 * @param {{
 *  exportJobId: string
 *  plan: ReturnType<import("@/lib/wizardAbstractionService").buildWizardPlan>
 *  evaluation: import("@/contracts/types").GateEvaluation
 *  run: Record<string, unknown>
 *  attachments?: ReadonlyArray<Record<string, unknown>>
 * }} input
 */
export function buildVerificationManifest({
  exportJobId,
  plan,
  evaluation,
  run,
  attachments = [],
}) {
  const evidenceItems = normalizeEvidenceItems(attachments);
  const sourceEntries = resolveManifestSourceEntries(evaluation);

  return {
    manifestId: createManifestId(),
    exportJobId,
    ruleSnapshotId: evaluation.ruleSnapshotId,
    jurisdictionKey: plan.context.jurisdictionKey,
    countyGroup: plan.context.countyGroup,
    inspectionTypeCode: plan.context.inspectionTypeCode,
    stageCode: plan.context.workflowStageCode,
    sourceEntries,
    evidenceInventory: {
      attachedDocuments: run.attachedDocuments || [],
      evidenceItems,
      attachmentCount: evidenceItems.length,
    },
    assemblyGraph: buildAssemblyGraph(plan, evaluation),
    basisDisclosures: buildBasisDisclosures(sourceEntries),
    exceptions: evaluation.blockers.map((blocker) => ({
      code: blocker.code,
      message: blocker.message,
      packetRole: blocker.packetRole,
    })),
  };
}

/**
 * @param {{
 *  plan: ReturnType<import("@/lib/wizardAbstractionService").buildWizardPlan>
 *  evaluation: import("@/contracts/types").GateEvaluation
 *  run: Record<string, unknown>
 *  manifest: import("@/contracts/types").VerificationManifest
 * }} input
 */
export function buildPacketModel({ plan, evaluation, run, manifest }) {
  return {
    packetId: createPacketId(),
    packetClass: plan.packetClass,
    title: `${plan.program.name} - ${plan.stage.name}`,
    projectName: plan.project.name,
    runId: run.id,
    generatedAt: new Date().toISOString(),
    evaluation,
    manifest,
    answers: run.answers,
  };
}

export function renderPacketPdf(packet) {
  const pdf = new jsPDF();
  let y = 18;
  const write = (text, size = 11, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, 170);
    pdf.text(lines, 20, y);
    y += lines.length * 7;
  };
  write("Inspection.OS Packet", 16, true);
  write(packet.title, 12, true);
  write(`Project: ${packet.projectName}`);
  write(`Run ID: ${packet.runId}`);
  write(`Packet class: ${packet.packetClass}`);
  write(`Rule snapshot: ${packet.manifest.ruleSnapshotId}`);
  write(`Stage status: ${packet.evaluation.status}`);
  y += 4;
  write("Official source records", 11, true);
  packet.manifest.sourceEntries.forEach((entry) =>
    write(`- ${entry.title} (${entry.verificationStatus} / ${entry.packetRole})`, 10)
  );
  y += 4;
  write("Evidence inventory", 11, true);
  packet.manifest.evidenceInventory.evidenceItems.forEach((item) =>
    write(`- #${item.order} ${item.kind} (${item.hash})`, 10)
  );
  if (packet.manifest.basisDisclosures.length) {
    y += 4;
    write("Basis disclosures", 11, true);
    packet.manifest.basisDisclosures.forEach((item) =>
      write(`- ${item.title}: ${item.verificationStatus}`, 10)
    );
  }
  if (packet.manifest.exceptions.length) {
    y += 4;
    write("Blockers / exceptions", 11, true);
    packet.manifest.exceptions.forEach((exceptionItem) =>
      write(`- ${exceptionItem.code}: ${exceptionItem.message}`, 10)
    );
  }
  return pdf.output("blob");
}

/**
 * @param {{
 *  plan?: ReturnType<import("@/lib/wizardAbstractionService").buildWizardPlan>
 *  evaluation?: import("@/contracts/types").GateEvaluation
 *  run?: Record<string, unknown>
 *  runId?: string
 *  stageGateEvaluationId?: string
 *  attachments?: ReadonlyArray<Record<string, unknown>>
 * }} input
 */
function normalizeExportInput(input) {
  const run = input.run || (input.runId ? localDb.getRun(input.runId) : null);
  const stageEvaluation = input.stageGateEvaluationId
    ? localDb.getStageGateEvaluation(input.stageGateEvaluationId)
    : null;

  if (!run) {
    throw new Error("Export requires a workflow run");
  }

  const plan =
    input.plan ||
    buildWizardPlan({
      projectId: run.projectId,
      programKey: run.programKey,
      inspectionTypeCode: run.inspectionTypeCode,
      stageCode: run.stageCode,
      mode: run.mode,
    });

  const evaluation = input.evaluation || stageEvaluation?.evaluation;
  if (!evaluation) {
    throw new Error("Export requires a gate evaluation payload");
  }

  return {
    plan,
    run,
    evaluation,
    stageGateEvaluationId: stageEvaluation?.id || input.stageGateEvaluationId || null,
    attachments: input.attachments || run.attachments || [],
  };
}

/**
 * @param {{
 *  plan?: ReturnType<import("@/lib/wizardAbstractionService").buildWizardPlan>
 *  evaluation?: import("@/contracts/types").GateEvaluation
 *  run?: Record<string, unknown>
 *  runId?: string
 *  stageGateEvaluationId?: string
 *  attachments?: ReadonlyArray<Record<string, unknown>>
 * }} input
 */
export async function createExportJob(input) {
  const { plan, evaluation, run, stageGateEvaluationId, attachments } = normalizeExportInput(input);

  const exportRecord = localDb.createExport({
    workflowRunId: run.id,
    stageGateEvaluationId,
    packetClass: plan.packetClass,
    title: `${plan.program.name} - ${plan.stage.name}`,
    ruleSnapshotId: evaluation.ruleSnapshotId,
    sourceRecordIdsUsed: evaluation.sourceRecordIdsUsed,
  });

  const manifest = buildVerificationManifest({
    exportJobId: exportRecord.id,
    plan,
    evaluation,
    run,
    attachments,
  });

  const manifestRecord = localDb.createManifest(manifest);

  const manifestSourceEntries = localDb.createManifestSourceEntries(
    manifest.sourceEntries.map((entry) => ({
      manifestId: manifestRecord.id,
      exportJobId: exportRecord.id,
      ...entry,
    }))
  );

  const linkedExport = localDb.updateExport(exportRecord.id, {
    manifestId: manifestRecord.id,
  });

  const packet = buildPacketModel({
    plan,
    evaluation,
    run,
    manifest: {
      ...manifestRecord,
      sourceEntries: manifestSourceEntries,
    },
  });

  return {
    packet,
    manifestRecord: { ...manifestRecord, sourceEntries: manifestSourceEntries },
    exportRecord: linkedExport || exportRecord,
  };
}
