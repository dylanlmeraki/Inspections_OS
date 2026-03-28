/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DocumentVaultTab from "@/components/DocumentVaultTab";
import { localDb } from "@/lib/localDb";

function renderWithQuery(ui) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("DocumentVaultTab", () => {
  it("marks required slots as attached/missing deterministically", async () => {
    localDb.resetForTests();
    renderWithQuery(
      <DocumentVaultTab
        projectId="proj_sf_001"
        attachedDocuments={["swppp_prd_set", "swppp_wdid_posting"]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("swppp_prd_set")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Attached").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Missing").length).toBeGreaterThan(0);
  });
});
