import { describe, expect, it } from "vitest";
import { buildWizardPlan } from "@/lib/wizardAbstractionService";
import { evaluateGate } from "@/lib/gateEngine";
import { createTransitionAttempt } from "@/lib/transitionEngine";
import { wizardScenarios } from "./fixtures/wizardScenarios";

describe("gateEngine", () => {
  it("blocks Contra Costa pre-permit when recognized agency is missing", () => {
    const plan = buildWizardPlan(wizardScenarios.contraCostaPrePermit.selection);
    const evaluation = evaluateGate({
      plan,
      answers: wizardScenarios.contraCostaPrePermit.answersBlocked,
      attachedDocuments: wizardScenarios.contraCostaPrePermit.attachedDocuments,
      attachments: wizardScenarios.contraCostaPrePermit.attachments,
    });

    expect(evaluation.status).toBe("blocked");
    expect(evaluation.blockers.some((item) => item.code === "CONTRA_RECOGNIZED_AGENCY_REQUIRED")).toBe(true);
  });

  it("shows Marin trigger as blocker and engineer-of-record as warning", () => {
    const plan = buildWizardPlan(wizardScenarios.marinPrePermit.selection);
    const evaluation = evaluateGate({
      plan,
      answers: wizardScenarios.marinPrePermit.answersBlocked,
      attachedDocuments: wizardScenarios.marinPrePermit.attachedDocuments,
      attachments: wizardScenarios.marinPrePermit.attachments,
    });

    expect(evaluation.status).toBe("blocked");
    expect(evaluation.blockers.some((item) => item.code === "MARIN_TRIGGER_ACK_REQUIRED")).toBe(true);
    expect(evaluation.warnings.some((item) => item.code === "MARIN_ENGINEER_OF_RECORD_RECOMMENDED")).toBe(true);
  });

  it("passes Marin trigger path with warning when trigger is acknowledged", () => {
    const plan = buildWizardPlan(wizardScenarios.marinPrePermit.selection);
    const evaluation = evaluateGate({
      plan,
      answers: wizardScenarios.marinPrePermit.answersPassWithWarning,
      attachedDocuments: wizardScenarios.marinPrePermit.attachedDocuments,
      attachments: wizardScenarios.marinPrePermit.attachments,
    });

    expect(evaluation.status).toBe("pass");
    expect(evaluation.blockers).toHaveLength(0);
    expect(evaluation.warnings.some((item) => item.code === "MARIN_ENGINEER_OF_RECORD_RECOMMENDED")).toBe(true);
  });

  it("blocks SWPPP opening conditions until all conditions and documents are present", () => {
    const plan = buildWizardPlan(wizardScenarios.swpppOpeningConditions.selection);
    const blocked = evaluateGate({
      plan,
      answers: wizardScenarios.swpppOpeningConditions.answersBlocked,
      attachedDocuments: wizardScenarios.swpppOpeningConditions.attachedDocumentsBlocked,
      attachments: wizardScenarios.swpppOpeningConditions.attachments,
    });
    const pass = evaluateGate({
      plan,
      answers: wizardScenarios.swpppOpeningConditions.answersPass,
      attachedDocuments: wizardScenarios.swpppOpeningConditions.attachedDocumentsPass,
      attachments: wizardScenarios.swpppOpeningConditions.attachments,
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.blockers.some((item) => item.code === "SWPPP_OPENING_CONDITIONS_MISSING")).toBe(true);
    expect(pass.status).toBe("pass");
  });

  it("blocks NOT closeout without required stabilization photos", () => {
    const plan = buildWizardPlan(wizardScenarios.swpppNotCloseout.selection);
    const blocked = evaluateGate({
      plan,
      answers: wizardScenarios.swpppNotCloseout.answersBase,
      attachedDocuments: wizardScenarios.swpppNotCloseout.attachedDocuments,
      attachments: wizardScenarios.swpppNotCloseout.attachmentsBlocked,
    });
    const pass = evaluateGate({
      plan,
      answers: wizardScenarios.swpppNotCloseout.answersBase,
      attachedDocuments: wizardScenarios.swpppNotCloseout.attachedDocuments,
      attachments: wizardScenarios.swpppNotCloseout.attachmentsPass,
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.blockers.some((item) => item.code === "NOT_CLOSEOUT_INCOMPLETE")).toBe(true);
    expect(pass.status).toBe("pass");
  });

  it("evaluates waiver permissions consistently from gate output", () => {
    const plan = buildWizardPlan(wizardScenarios.contraCostaPrePermit.selection);
    const evaluation = evaluateGate({
      plan,
      answers: wizardScenarios.contraCostaPrePermit.answersBlocked,
      attachedDocuments: wizardScenarios.contraCostaPrePermit.attachedDocuments,
      attachments: wizardScenarios.contraCostaPrePermit.attachments,
    });
    const deniedAdvance = createTransitionAttempt({
      runId: "run_test",
      context: plan.context,
      evaluation,
      action: "advance",
    });
    const deniedWaive = createTransitionAttempt({
      runId: "run_test",
      context: plan.context,
      evaluation,
      action: "waive",
      waiverReason: "Need manual bypass",
    });

    expect(deniedAdvance.allowed).toBe(false);
    expect(deniedWaive.allowed).toBe(false);
  });

  it("persists waiver reason on transition attempts", () => {
    const plan = buildWizardPlan(wizardScenarios.marinPrePermit.selection);
    const evaluation = evaluateGate({
      plan,
      answers: wizardScenarios.marinPrePermit.answersBlocked,
      attachedDocuments: [],
      attachments: [],
    });
    const waived = createTransitionAttempt({
      runId: "run_test",
      context: plan.context,
      evaluation: {
        ...evaluation,
        blockers: evaluation.blockers.map((item) => ({ ...item, waiverAllowed: true })),
      },
      action: "waive",
      waiverReason: "Inspector authorization override",
    });

    expect(waived.waiverReason).toBe("Inspector authorization override");
  });
});
