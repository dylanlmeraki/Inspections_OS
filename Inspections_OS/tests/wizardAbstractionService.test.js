import { describe, expect, it } from "vitest";
import { buildWizardPlan, listWizardOptions } from "@/lib/wizardAbstractionService";
import { wizardScenarios } from "./fixtures/wizardScenarios";

describe("wizardAbstractionService", () => {
  it("resolves project, jurisdiction, program family, inspection type, and workflow stage explicitly", () => {
    const plan = buildWizardPlan(wizardScenarios.contraCostaPrePermit.selection);

    expect(plan.context.projectId).toBe("proj_contra_001");
    expect(plan.context.jurisdictionKey).toBe("contra_costa_county");
    expect(plan.context.programFamilyKey).toBe("special_inspections");
    expect(plan.context.inspectionTypeCode).toBe("special.cbc17");
    expect(plan.context.workflowStageCode).toBe("special.pre_permit");
  });

  it("lists deterministic wizard options without backend dependencies", () => {
    const options = listWizardOptions();
    const projectOption = options.find((item) => item.project.id === "proj_sf_001");

    expect(options.length).toBeGreaterThan(0);
    expect(projectOption?.availablePrograms.length).toBeGreaterThan(0);
    expect(projectOption?.availablePrograms[0]).toHaveProperty("stages");
    expect(projectOption?.availablePrograms[0]).toHaveProperty("inspectionTypes");
  });

  it("includes only source records resolved by the selected rule path", () => {
    const plan = buildWizardPlan(wizardScenarios.marinPrePermit.selection);
    expect(plan.sourceRecords.some((item) => item.id === "src_marin_trigger")).toBe(true);
    expect(plan.sourceRecords.some((item) => item.id === "src_contra_agencies")).toBe(false);
  });

  it("applies layered scope precedence (project > county > city > regional > statewide)", () => {
    const plan = buildWizardPlan(wizardScenarios.contraCostaPrePermit.selection);
    const contraRules = plan.rules.filter((item) => item.blockerCode === "CONTRA_RECOGNIZED_AGENCY_REQUIRED");

    expect(contraRules).toHaveLength(1);
    expect(contraRules[0].scopeLevel).toBe("project");
    expect(contraRules[0].id).toBe("rule_special_contra_project_override");
  });
});
