/* @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GateManagerPanel from "@/components/GateManagerPanel";

function makeEvaluation(overrides = {}) {
  return {
    status: "blocked",
    requirements: [],
    blockers: [
      {
        code: "BLOCKER_1",
        message: "Missing requirement",
        packetRole: "rule",
        sourceRecordIds: [],
        waiverAllowed: false,
        severity: "blocker",
      },
    ],
    warnings: [],
    metCount: 0,
    unmetCount: 1,
    ruleSnapshotId: "rs_test",
    ruleIdsUsed: ["rule_1"],
    sourceRecordIdsUsed: [],
    ...overrides,
  };
}

describe("GateManagerPanel", () => {
  it("renders blocker details and disables actions when blocked/non-waivable", () => {
    render(
      <GateManagerPanel
        evaluation={makeEvaluation()}
        onAdvance={vi.fn()}
        onWaive={vi.fn()}
        canWaive={false}
      />
    );

    expect(screen.getByText("BLOCKER")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Advance Stage" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Waive Blockers" })).toBeDisabled();
  });

  it("enables advance when evaluation passes", () => {
    const onAdvance = vi.fn();
    render(
      <GateManagerPanel
        evaluation={makeEvaluation({ status: "pass", blockers: [], unmetCount: 0, metCount: 1 })}
        onAdvance={onAdvance}
        onWaive={vi.fn()}
        canWaive={false}
      />
    );

    const advanceButton = screen.getByRole("button", { name: "Advance Stage" });
    expect(advanceButton).toBeEnabled();
    fireEvent.click(advanceButton);
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("enables waive only when all blockers are waivable and canWaive is true", () => {
    const onWaive = vi.fn();
    render(
      <GateManagerPanel
        evaluation={makeEvaluation({
          blockers: [
            {
              code: "BLOCKER_1",
              message: "Waivable blocker",
              packetRole: "rule",
              sourceRecordIds: [],
              waiverAllowed: true,
              severity: "blocker",
            },
          ],
        })}
        onAdvance={vi.fn()}
        onWaive={onWaive}
        canWaive
      />
    );

    const waiveButton = screen.getByRole("button", { name: "Waive Blockers" });
    expect(waiveButton).toBeEnabled();
    fireEvent.click(waiveButton);
    expect(onWaive).toHaveBeenCalledTimes(1);
  });
});
