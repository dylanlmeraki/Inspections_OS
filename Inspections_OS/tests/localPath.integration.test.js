import { beforeEach, describe, expect, it } from "vitest";
import { buildWizardPlan } from "@/lib/wizardAbstractionService";
import { evaluateGate } from "@/lib/gateEngine";
import { createExportJob } from "@/lib/exportEngine";
import { localDb } from "@/lib/localDb";
import { wizardScenarios } from "./fixtures/wizardScenarios";

describe("local end-to-end seam", () => {
  beforeEach(() => {
    localDb.resetForTests();
  });

  it("runs project -> plan -> evaluation -> run -> stage eval -> export -> manifest deterministically", async () => {
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
      status: evaluation.status === "pass" ? "submitted" : "draft",
    });
    localDb.upsertRuleSnapshot({
      id: evaluation.ruleSnapshotId,
      context: plan.context,
      ruleIds: evaluation.ruleIdsUsed,
      sourceRecordIds: evaluation.sourceRecordIdsUsed,
      generatedAt: new Date().toISOString(),
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
      attachments: [{ kind: "photo", tag: "field", durableRef: "file://field.jpg" }],
    });

    expect(exportRecord.workflowRunId).toBe(run.id);
    expect(exportRecord.stageGateEvaluationId).toBe(stageGateEvaluation.id);
    expect(manifestRecord.ruleSnapshotId).toBe(evaluation.ruleSnapshotId);
    expect(manifestRecord.sourceEntries.map((item) => item.sourceRecordId)).toEqual(
      evaluation.sourceRecordIdsUsed
    );
    expect(manifestRecord.basisDisclosures.some((item) => item.verificationStatus === "verified-indirect")).toBe(
      true
    );
    expect(manifestRecord.evidenceInventory.attachmentCount).toBe(1);
  });
});
