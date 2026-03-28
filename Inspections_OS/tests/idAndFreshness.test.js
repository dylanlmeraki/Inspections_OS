import { beforeEach, describe, expect, it } from "vitest";
import {
  createContentHash,
  createEvidenceId,
  createExportJobId,
  createManifestId,
  createManifestSourceEntryId,
  resetIdState,
} from "@/lib/ids";
import { localDb } from "@/lib/localDb";

describe("P2 id/hash and freshness hardening", () => {
  beforeEach(() => {
    resetIdState();
    localDb.resetForTests();
  });

  it("creates normalized deterministic ids across export surfaces", () => {
    const expId = createExportJobId();
    const manifestId = createManifestId();
    const sourceEntryId = createManifestSourceEntryId();
    const evidenceId = createEvidenceId();

    expect(expId).toMatch(/^exp_\d{6}$/);
    expect(manifestId).toMatch(/^manifest_\d{6}$/);
    expect(sourceEntryId).toMatch(/^mse_\d{6}$/);
    expect(evidenceId).toMatch(/^evidence_\d{6}$/);
  });

  it("hashes object content stably regardless of key order", () => {
    const hashOne = createContentHash({ b: 2, a: 1 }, "mse");
    const hashTwo = createContentHash({ a: 1, b: 2 }, "mse");
    const hashThree = createContentHash({ a: 1, b: 3 }, "mse");

    expect(hashOne).toBe(hashTwo);
    expect(hashOne).not.toBe(hashThree);
  });

  it("hydrates source freshness fields and computes stale status", () => {
    const sourceRecords = localDb.listSourceRecords();
    const staleNotSource = sourceRecords.find((item) => item.id === "src_not");
    const freshD1 = sourceRecords.find((item) => item.id === "src_d1");

    expect(staleNotSource?.verifiedAt).toBeDefined();
    expect(staleNotSource?.lastSeenAt).toBeDefined();
    expect(staleNotSource?.stale).toBe(true);
    expect(freshD1?.stale).toBe(false);
  });
});
