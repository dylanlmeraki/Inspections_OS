import { describe, expect, it } from "vitest";
import { PACKET_RULES, PROJECTS, SOURCE_RECORDS, WORKFLOWS } from "@/domain/seedData";

describe("seed smoke", () => {
  it("contains required county and statewide scenario coverage", () => {
    expect(PROJECTS.some((item) => item.jurisdictionKey === "contra_costa_county")).toBe(true);
    expect(PROJECTS.some((item) => item.jurisdictionKey === "marin_county")).toBe(true);
    expect(WORKFLOWS.swppp_cgp.stages.some((item) => item.code === "swppp.opening_conditions")).toBe(true);
    expect(WORKFLOWS.swppp_cgp.stages.some((item) => item.code === "swppp.not_closeout")).toBe(true);
  });

  it("contains all verification status categories used by gate/export evidence", () => {
    const statuses = new Set(SOURCE_RECORDS.map((item) => item.verificationStatus));
    expect(statuses.has("verified-direct")).toBe(true);
    expect(statuses.has("verified-indirect")).toBe(true);
    expect(statuses.has("inferred-direct")).toBe(true);
    expect(statuses.has("gap-note")).toBe(true);
  });

  it("contains source freshness timestamps for stale/fresh handling", () => {
    expect(SOURCE_RECORDS.every((item) => Boolean(item.verifiedAt))).toBe(true);
    expect(SOURCE_RECORDS.every((item) => Boolean(item.lastSeenAt))).toBe(true);
  });

  it("contains blocker and warning rules for deterministic gate behavior", () => {
    const severities = new Set(PACKET_RULES.map((item) => item.severity));
    expect(severities.has("blocker")).toBe(true);
    expect(severities.has("warning")).toBe(true);
  });
});
