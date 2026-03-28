/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { localDb } from "@/lib/localDb";
import WizardRunner from "@/components/WizardRunner";

const createExportJobMock = vi.fn(async (_input) => ({
  packet: {
    packetId: "packet_test",
    packetClass: "inspection_packet",
    title: "Test Packet",
    projectName: "Test Project",
    runId: "run_test",
    generatedAt: new Date().toISOString(),
    evaluation: {
      status: "blocked",
      blockers: [],
    },
    manifest: {
      ruleSnapshotId: "rs_test",
      sourceEntries: [],
      evidenceInventory: { evidenceItems: [] },
      basisDisclosures: [],
      exceptions: [],
    },
  },
  exportRecord: { id: "exp_test" },
  manifestRecord: { id: "manifest_test" },
}));

const renderPacketPdfMock = vi.fn(() => new Blob(["pdf"], { type: "application/pdf" }));

vi.mock("@/lib/exportEngine", () => ({
  createExportJob: createExportJobMock,
  renderPacketPdf: renderPacketPdfMock,
}));

function renderWithQuery(ui) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("WizardRunner", () => {
  beforeEach(() => {
    localDb.resetForTests();
    createExportJobMock.mockClear();
    renderPacketPdfMock.mockClear();
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it("renders selected project/program/stage plan after resolve", async () => {
    renderWithQuery(<WizardRunner />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Enrollment / threshold gate")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Resolve Wizard Plan"));

    expect(await screen.findByText("SWPPP Enrollment Wizard")).toBeInTheDocument();
    expect(screen.getByText(/Program/)).toBeInTheDocument();
  });

  it("exports using stored stage evaluation basis identifiers", async () => {
    renderWithQuery(<WizardRunner />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Enrollment / threshold gate")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Resolve Wizard Plan"));
    fireEvent.click(screen.getByText("Run Gate Evaluation"));
    fireEvent.click(screen.getByText("Save Run + Export PDF"));

    await waitFor(() => {
      expect(createExportJobMock).toHaveBeenCalledTimes(1);
    });

    const firstCallArg = createExportJobMock.mock.calls[0][0];
    expect(firstCallArg).toBeDefined();
    expect(firstCallArg).toHaveProperty("runId");
    expect(firstCallArg).toHaveProperty("stageGateEvaluationId");
    expect(firstCallArg).not.toHaveProperty("plan");
    expect(firstCallArg).not.toHaveProperty("evaluation");
  });
});
