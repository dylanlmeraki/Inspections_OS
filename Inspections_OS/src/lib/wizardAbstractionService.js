import {
  PACKET_RULES,
  PROGRAMS,
  TEMPLATE_LIBRARY,
  WORKFLOWS,
} from "@/domain/seedData";
import { localDb } from "@/lib/localDb";

const EMPTY_TEMPLATE = {
  title: "Untitled Template",
  fields: [],
  questions: [],
  documents: [],
  prompts: [],
};

const getProgram = (key) => PROGRAMS.find((program) => program.key === key);
const getWorkflow = (key) => WORKFLOWS[key];

const SCOPE_PRECEDENCE = {
  project: 5,
  city: 4,
  county: 3,
  regional: 2,
  statewide: 1,
};

const DEFAULT_SCOPE_PRIORITY = {
  project: 900,
  city: 700,
  county: 500,
  regional: 300,
  statewide: 100,
};

function normalizeScopeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function inferLegacyScope(rule) {
  if (rule.scopeLevel && rule.scopeKey) {
    return {
      scopeLevel: rule.scopeLevel,
      scopeKey: rule.scopeKey,
      priority: rule.priority ?? DEFAULT_SCOPE_PRIORITY[rule.scopeLevel] ?? 0,
    };
  }

  if (rule.jurisdictionKey === "ca_statewide") {
    return {
      scopeLevel: "statewide",
      scopeKey: "ca_statewide",
      priority: DEFAULT_SCOPE_PRIORITY.statewide,
    };
  }

  if (String(rule.jurisdictionKey || "").includes("_county")) {
    return {
      scopeLevel: "county",
      scopeKey: rule.jurisdictionKey,
      priority: DEFAULT_SCOPE_PRIORITY.county,
    };
  }

  return {
    scopeLevel: "city",
    scopeKey: rule.jurisdictionKey,
    priority: DEFAULT_SCOPE_PRIORITY.city,
  };
}

function buildContextScopes(context) {
  const normalizedCounty = normalizeScopeKey(context.countyGroup);
  const countyFromJurisdiction = String(context.jurisdictionKey || "").includes("_county")
    ? context.jurisdictionKey
    : null;
  const cityFromJurisdiction = countyFromJurisdiction ? null : context.jurisdictionKey;

  return {
    project: new Set([context.projectId]),
    city: new Set([cityFromJurisdiction, context.cityKey].filter(Boolean)),
    county: new Set([countyFromJurisdiction, context.countyKey, normalizedCounty].filter(Boolean)),
    regional: new Set(context.regionalKeys || []),
    statewide: new Set(["ca_statewide"]),
  };
}

function ruleMatchesScope(rule, contextScopes) {
  const normalizedScopeKey = normalizeScopeKey(rule.scopeKey);

  if (rule.scopeLevel === "project") {
    return contextScopes.project.has(rule.scopeKey);
  }
  if (rule.scopeLevel === "city") {
    return contextScopes.city.has(rule.scopeKey);
  }
  if (rule.scopeLevel === "county") {
    return (
      contextScopes.county.has(rule.scopeKey) ||
      contextScopes.county.has(normalizedScopeKey)
    );
  }
  if (rule.scopeLevel === "regional") {
    return contextScopes.regional.has(rule.scopeKey);
  }
  if (rule.scopeLevel === "statewide") {
    return rule.scopeKey === "ca_statewide";
  }

  return false;
}

function getRulesForContext(context) {
  const contextScopes = buildContextScopes(context);
  const scopedCandidates = PACKET_RULES
    .filter(
      (rule) =>
        rule.programKey === context.programFamilyKey &&
        rule.inspectionTypeCode === context.inspectionTypeCode &&
        rule.stageCode === context.workflowStageCode
    )
    .map((rule) => ({
      ...rule,
      ...inferLegacyScope(rule),
    }))
    .filter((rule) => ruleMatchesScope(rule, contextScopes))
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }
      const leftScope = SCOPE_PRECEDENCE[left.scopeLevel] ?? 0;
      const rightScope = SCOPE_PRECEDENCE[right.scopeLevel] ?? 0;
      if (rightScope !== leftScope) {
        return rightScope - leftScope;
      }
      return left.id.localeCompare(right.id);
    });

  const mergedRules = [];
  const seenMergeKeys = new Set();
  for (const rule of scopedCandidates) {
    const mergeKey =
      rule.mergeKey ||
      `${rule.programKey}:${rule.inspectionTypeCode}:${rule.stageCode}:${
        rule.blockerCode || rule.id
      }`;
    if (seenMergeKeys.has(mergeKey)) continue;
    seenMergeKeys.add(mergeKey);
    mergedRules.push(rule);
  }
  return mergedRules;
}

function getPacketClass(stageCode) {
  if (stageCode.includes("closeout")) return "closeout_packet";
  if (stageCode.includes("not_")) return "closeout_packet";
  return "inspection_packet";
}

/**
 * @param {{
 *   projectId: string
 *   programKey: string
 *   inspectionTypeCode: string
 *   stageCode: string
 * }} selection
 * @returns {import("@/contracts/types").WizardSelectionContext}
 */
export function resolveWizardContext(selection) {
  const project = localDb.getProject(selection.projectId);
  const program = getProgram(selection.programKey);
  const workflow = getWorkflow(selection.programKey);
  const stage = workflow?.stages.find((item) => item.code === selection.stageCode);
  const inspectionType = workflow?.inspectionTypes.find(
    (item) => item.code === selection.inspectionTypeCode
  );

  if (!project || !program || !workflow || !stage || !inspectionType) {
    throw new Error("Invalid wizard selection");
  }

  return {
    projectId: project.id,
    projectName: project.name,
    jurisdictionKey: project.jurisdictionKey,
    countyGroup: project.countyGroup,
    countyKey: normalizeScopeKey(project.countyGroup),
    cityKey: String(project.jurisdictionKey || "").includes("_county")
      ? null
      : project.jurisdictionKey,
    regionalKeys: ["bay_area"],
    programFamilyKey: program.key,
    inspectionTypeCode: inspectionType.code,
    workflowStageCode: stage.code,
  };
}

export function listWizardOptions() {
  return localDb.listProjects().map((project) => ({
    project,
    availablePrograms: project.activePrograms
      .map((key) => {
        const program = getProgram(key);
        const workflow = getWorkflow(key);
        if (!program || !workflow) return null;
        return {
          ...program,
          stages: workflow.stages,
          inspectionTypes: workflow.inspectionTypes,
        };
      })
      .filter(Boolean),
  }));
}

/**
 * @param {{
 *   projectId: string
 *   programKey: string
 *   inspectionTypeCode: string
 *   stageCode: string
 *   mode?: "mobile"|"desktop"
 * }} input
 */
export function buildWizardPlan(input) {
  const mode = input.mode ?? "mobile";
  const context = resolveWizardContext(input);
  const project = localDb.getProject(context.projectId);
  const program = getProgram(context.programFamilyKey);
  const workflow = getWorkflow(context.programFamilyKey);
  const stage = workflow?.stages.find(
    (item) => item.code === context.workflowStageCode
  );
  const inspectionType = workflow?.inspectionTypes.find(
    (item) => item.code === context.inspectionTypeCode
  );
  if (!project || !program || !workflow || !stage || !inspectionType) {
    throw new Error("Invalid wizard selection");
  }

  const rules = getRulesForContext(context);
  const template = TEMPLATE_LIBRARY[context.workflowStageCode] || {
    ...EMPTY_TEMPLATE,
    title: stage.name,
  };

  const sourceRecordIds = [
    ...new Set(rules.flatMap((rule) => rule.requiredSourceRecordIds || [])),
  ];
  const sourceRecords = localDb.listSourceRecords().filter((src) =>
    sourceRecordIds.includes(src.id)
  );

  return {
    mode,
    context,
    project,
    program,
    inspectionType,
    stage,
    template,
    rules,
    sourceRecords,
    requiredFieldKeys: [
      ...new Set([
        ...(template.fields || []).filter((item) => item.required).map((item) => item.key),
        ...rules.flatMap((rule) => rule.requiredFields || []),
      ]),
    ],
    requiredQuestionKeys: [
      ...new Set([
        ...(template.questions || [])
          .filter((item) => item.required)
          .map((item) => item.key),
        ...rules.flatMap((rule) => rule.requiredQuestions || []),
      ]),
    ],
    requiredDocumentKeys: [
      ...new Set([
        ...(template.documents || [])
          .filter((item) => item.required)
          .map((item) => item.key),
        ...rules.flatMap((rule) => rule.requiredDocuments || []),
      ]),
    ],
    sourceRecordIds,
    packetClass: getPacketClass(stage.code),
  };
}
