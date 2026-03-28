import { beforeEach, describe, expect, it } from "vitest";
import { buildWizardPlan } from "@/lib/wizardAbstractionService";
import { evaluateGate } from "@/lib/gateEngine";
import { createExportJob } from "@/lib/exportEngine";
import { localDb } from "@/lib/localDb";
import { wizardScenarios } from "./fixtures/wizardScenarios";

describe("exportEngine", () => {
  beforeEach(() => {
    localDb.resetForTests();
  });

  it("creates export job and manifest linked by export job id", async () => {
    const plan = buildWizardPlan(wizardScenarios.marinPrePermit.selection);
    const evaluation = evaluateGate({
      plan,
      answers: wizardScenarios.marinPrePermit.answersPassWithWarning,
      attachedDocuments: [],
      attachments: [],
    });
    const run = localDb.createRun({
      projectId: plan.context.projectId,
      projectName: plan.context.projectName,
      programKey: plan.context.programFamilyKey,
      inspectionTypeCode: plan.context.inspectionTypeCode,
      stageCode: plan.context.workflowStageCode,
      mode: "desktop",
      answers: wizardScenarios.marinPrePermit.answersPassWithWarning,
      attachedDocuments: [],
      attachments: [],
      status: "submitted",
    });
    const stageGateEvaluation = localDb.createStageGateEvaluation({
      runId: run.id,
      context: plan.context,
      evaluation,
      ruleSnapshotId: evaluation.ruleSnapshotId,
      sourceRecordIdsUsed: evaluation.sourceRecordIdsUsed,
    });

    const { exportRecord, manifestRecord } = await createExportJob({
      runId: run.id,
      stageGateEvaluationId: stageGateEvaluation.id,
      attachments: [],
    });

    expect(exportRecord.workflowRunId).toBe(run.id);
    expect(exportRecord.manifestId).toBe(manifestRecord.id);
    expect(manifestRecord.exportJobId).toBe(exportRecord.id);
  });

  it("uses exact evaluated source records and includes evidence inventory", async () => {
    const plan = buildWizardPlan(wizardScenarios.swpppNotCloseout.selection);
    const evaluation = evaluateGate({
      plan,
      answers: wizardScenarios.swpppNotCloseout.answersBase,
      attachedDocuments: wizardScenarios.swpppNotCloseout.attachedDocuments,
      attachments: wizardScenarios.swpppNotCloseout.attachmentsPass,
    });
    const run = localDb.createRun({
      projectId: plan.context.projectId,
      projectName: plan.context.projectName,
      programKey: plan.context.programFamilyKey,
      inspectionTypeCode: plan.context.inspectionTypeCode,
      stageCode: plan.context.workflowStageCode,
      mode: "mobile",
      answers: wizardScenarios.swpppNotCloseout.answersBase,
      attachedDocuments: wizardScenarios.swpppNotCloseout.attachedDocuments,
      attachments: wizardScenarios.swpppNotCloseout.attachmentsPass,
      status: "submitted",
    });
    const stageGateEvaluation = localDb.createStageGateEvaluation({
      runId: run.id,
      context: plan.context,
      evaluation,
      ruleSnapshotId: evaluation.ruleSnapshotId,
      sourceRecordIdsUsed: evaluation.sourceRecordIdsUsed,
    });

    const { manifestRecord } = await createExportJob({
      runId: run.id,
      stageGateEvaluationId: stageGateEvaluation.id,
      attachments: wizardScenarios.swpppNotCloseout.attachmentsPass,
    });

    expect(manifestRecord.sourceEntries.map((item) => item.sourceRecordId)).toEqual(
      evaluation.sourceRecordIdsUsed
    );
    expect(manifestRecord.evidenceInventory.attachmentCount).toBe(3);
    expect(manifestRecord.evidenceInventory.evidenceItems).toHaveLength(3);
    expect(manifestRecord.evidenceInventory.evidenceItems[0]).toHaveProperty("hash");
    expect(manifestRecord.basisDisclosures.some((item) => item.verificationStatus === "gap-note")).toBe(
      true
    );
    expect(manifestRecord.basisDisclosures.some((item) => item.note.includes("stale"))).toBe(true);
  });

  it("discloses unmet requirements in the assembly graph", async () => {
    const plan = buildWizardPlan(wizardScenarios.contraCostaPrePermit.selection);
    const evaluation = evaluateGate({
      plan,
      answers: wizardScenarios.contraCostaPrePermit.answersBlocked,
      attachedDocuments: wizardScenarios.contraCostaPrePermit.attachedDocuments,
      attachments: wizardScenarios.contraCostaPrePermit.attachments,
    });
    const run = localDb.createRun({
      projectId: plan.context.projectId,
      projectName: plan.context.projectName,
      programKey: plan.context.programFamilyKey,
      inspectionTypeCode: plan.context.inspectionTypeCode,
      stageCode: plan.context.workflowStageCode,
      mode: "desktop",
      answers: wizardScenarios.contraCostaPrePermit.answersBlocked,
      attachedDocuments: [],
      attachments: [],
      status: "draft",
    });
    const stageGateEvaluation = localDb.createStageGateEvaluation({
      runId: run.id,
      context: plan.context,
      evaluation,
      ruleSnapshotId: evaluation.ruleSnapshotId,
      sourceRecordIdsUsed: evaluation.sourceRecordIdsUsed,
    });

    const { manifestRecord } = await createExportJob({
      runId: run.id,
      stageGateEvaluationId: stageGateEvaluation.id,
      attachments: [],
    });

    expect(manifestRecord.assemblyGraph.omissionDisclosures.length).toBeGreaterThan(0);
    expect(manifestRecord.exceptions.some((item) => item.code === "CONTRA_RECOGNIZED_AGENCY_REQUIRED")).toBe(
      true
    );
  });
});
