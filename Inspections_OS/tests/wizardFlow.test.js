import { beforeEach, describe, expect, it } from "vitest";
import { buildWizardPlan } from "@/lib/wizardAbstractionService";
import { evaluateGate } from "@/lib/gateEngine";
import { localDb } from "@/lib/localDb";
import { wizardScenarios } from "./fixtures/wizardScenarios";

function getRunStatusFromEvaluation(evaluation) {
  return evaluation.status === "pass" ? "submitted" : "draft";
}

describe("wizard flow", () => {
  beforeEach(() => {
    localDb.resetForTests();
  });

  it("resolves project/program/stage/inspection selections into a deterministic plan", () => {
    const plan = buildWizardPlan(wizardScenarios.swpppOpeningConditions.selection);

    expect(plan.context.projectId).toBe("proj_sf_001");
    expect(plan.context.programFamilyKey).toBe("swppp_cgp");
    expect(plan.context.workflowStageCode).toBe("swppp.opening_conditions");
    expect(plan.context.inspectionTypeCode).toBe("swppp.active_series");
  });

  it("renders conditional questions via the selected stage template", () => {
    const plan = buildWizardPlan(wizardScenarios.swpppOpeningConditions.selection);
    const templateQuestionKeys = (plan.template.questions || []).map((item) => item.key);

    expect(templateQuestionKeys).toContain("opening.wdid_posted");
    expect(plan.requiredQuestionKeys).toContain("opening.contacts_confirmed");
  });

  it("surfaces unmet blockers with actionable codes/messages", () => {
    const plan = buildWizardPlan(wizardScenarios.swpppOpeningConditions.selection);
    const evaluation = evaluateGate({
      plan,
      answers: wizardScenarios.swpppOpeningConditions.answersBlocked,
      attachedDocuments: wizardScenarios.swpppOpeningConditions.attachedDocumentsBlocked,
      attachments: [],
    });

    expect(evaluation.status).toBe("blocked");
    expect(evaluation.blockers[0]).toHaveProperty("code");
    expect(evaluation.blockers[0]).toHaveProperty("message");
  });

  it("persists draft vs submitted runs deterministically from gate status", () => {
    const blockedPlan = buildWizardPlan(wizardScenarios.contraCostaPrePermit.selection);
    const blockedEvaluation = evaluateGate({
      plan: blockedPlan,
      answers: wizardScenarios.contraCostaPrePermit.answersBlocked,
      attachedDocuments: [],
      attachments: [],
    });
    const blockedRun = localDb.createRun({
      projectId: blockedPlan.context.projectId,
      projectName: blockedPlan.context.projectName,
      programKey: blockedPlan.context.programFamilyKey,
      inspectionTypeCode: blockedPlan.context.inspectionTypeCode,
      stageCode: blockedPlan.context.workflowStageCode,
      mode: "desktop",
      answers: wizardScenarios.contraCostaPrePermit.answersBlocked,
      attachedDocuments: [],
      attachments: [],
      status: getRunStatusFromEvaluation(blockedEvaluation),
    });

    const passPlan = buildWizardPlan(wizardScenarios.swpppOpeningConditions.selection);
    const passEvaluation = evaluateGate({
      plan: passPlan,
      answers: wizardScenarios.swpppOpeningConditions.answersPass,
      attachedDocuments: wizardScenarios.swpppOpeningConditions.attachedDocumentsPass,
      attachments: [],
    });
    const passRun = localDb.createRun({
      projectId: passPlan.context.projectId,
      projectName: passPlan.context.projectName,
      programKey: passPlan.context.programFamilyKey,
      inspectionTypeCode: passPlan.context.inspectionTypeCode,
      stageCode: passPlan.context.workflowStageCode,
      mode: "mobile",
      answers: wizardScenarios.swpppOpeningConditions.answersPass,
      attachedDocuments: wizardScenarios.swpppOpeningConditions.attachedDocumentsPass,
      attachments: [],
      status: getRunStatusFromEvaluation(passEvaluation),
    });

    expect(blockedRun.status).toBe("draft");
    expect(passRun.status).toBe("submitted");
  });
});
