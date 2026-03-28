import { uid } from "@/lib/ids";

/**
 * @param {{
 *   runId: string
 *   context: import("@/contracts/types").WizardSelectionContext
 *   evaluation: import("@/contracts/types").GateEvaluation
 *   action: "advance"|"waive"|"save_draft"
 *   waiverReason?: string
 * }} input
 * @returns {import("@/contracts/types").TransitionAttempt}
 */
export function createTransitionAttempt(input) {
  const blockers = input.evaluation.blockers ?? [];
  const hasBlockers = blockers.length > 0;
  const attemptingWaive = input.action === "waive";
  const waivable = blockers.every((blocker) => blocker.waiverAllowed);

  const allowed =
    input.action === "save_draft"
      ? true
      : attemptingWaive
      ? hasBlockers && waivable && Boolean(input.waiverReason)
      : !hasBlockers;

  const reason = allowed
    ? "Transition allowed"
    : attemptingWaive
    ? "Waiver denied: blockers are non-waivable or waiver reason missing"
    : "Transition denied: unresolved blockers";

  return {
    attemptId: uid("transition"),
    runId: input.runId,
    context: input.context,
    evaluationStatus: input.evaluation.status,
    blockerCodes: blockers.map((item) => item.code),
    action: input.action,
    waiverReason: input.waiverReason ?? null,
    allowed,
    reason,
    createdAt: new Date().toISOString(),
  };
}
