/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GateSummaryPanel from "@/components/GateSummaryPanel";

describe("GateSummaryPanel", () => {
  it("renders unmet requirements and gate status", () => {
    render(
      <GateSummaryPanel
        evaluation={{
          status: "blocked",
          requirements: [
            {
              type: "field",
              key: "specialInspections.selectedAgency",
              met: false,
              message: "specialInspections.selectedAgency is required",
              severity: "blocker",
            },
          ],
          blockers: [],
          warnings: [],
          metCount: 0,
          unmetCount: 1,
          ruleSnapshotId: "rs_test",
          ruleIdsUsed: ["rule_special_contra"],
          sourceRecordIdsUsed: ["src_contra_agencies"],
        }}
      />
    );

    expect(screen.getByText("BLOCKED")).toBeInTheDocument();
    expect(screen.getByText("specialInspections.selectedAgency")).toBeInTheDocument();
    expect(screen.getByText("specialInspections.selectedAgency is required")).toBeInTheDocument();
  });
});
