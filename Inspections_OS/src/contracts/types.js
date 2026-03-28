/**
 * Shared seam contracts for the Wizard -> Gate -> Transition -> Export path.
 * We keep these focused on boundary payloads where defects are highest-impact.
 */

/**
 * @typedef {"verified-direct"|"verified-indirect"|"inferred-direct"|"gap-note"} VerificationStatus
 */

/**
 * @typedef {"blocker"|"warning"} GateSeverity
 */

/**
 * @typedef {{
 *   projectId: string
 *   projectName: string
 *   jurisdictionKey: string
 *   countyGroup: string
 *   countyKey?: string
 *   cityKey?: string | null
 *   regionalKeys?: string[]
 *   programFamilyKey: string
 *   inspectionTypeCode: string
 *   workflowStageCode: string
 * }} WizardSelectionContext
 */

/**
 * @typedef {{
 *   evidenceId: string
 *   kind: string
 *   tag: string | null
 *   durableRef: string
 *   hash: string
 *   order: number
 * }} EvidenceItem
 */

/**
 * @typedef {{
 *   sourceRecordId: string
 *   title: string
 *   packetRole: string
 *   verificationStatus: VerificationStatus
 *   fingerprintHash: string
 *   verifiedAt?: string
 *   lastSeenAt?: string
 *   stale?: boolean
 * }} ManifestSourceEntry
 */

/**
 * @typedef {{
 *   type: "field"|"question"|"document"|"attachment"
 *   key: string
 *   met: boolean
 *   message: string
 *   severity: GateSeverity
 * }} GateRequirement
 */

/**
 * @typedef {{
 *   code: string
 *   message: string
 *   packetRole: string
 *   sourceRecordIds: string[]
 *   waiverAllowed: boolean
 *   severity: GateSeverity
 * }} GateBlocker
 */

/**
 * @typedef {{
 *   status: "pass"|"blocked"
 *   requirements: GateRequirement[]
 *   blockers: GateBlocker[]
 *   warnings: GateBlocker[]
 *   metCount: number
 *   unmetCount: number
 *   ruleSnapshotId: string
 *   ruleIdsUsed: string[]
 *   sourceRecordIdsUsed: string[]
 * }} GateEvaluation
 */

/**
 * @typedef {{
 *   attemptId: string
 *   runId: string
 *   context: WizardSelectionContext
 *   evaluationStatus: GateEvaluation["status"]
 *   blockerCodes: string[]
 *   action: "advance"|"waive"|"save_draft"
 *   waiverReason: string | null
 *   allowed: boolean
 *   reason: string
 *   createdAt: string
 * }} TransitionAttempt
 */

/**
 * @typedef {{
 *   id: string
 *   context: WizardSelectionContext
 *   ruleIds: string[]
 *   sourceRecordIds: string[]
 *   generatedAt: string
 *   createdAt?: string
 * }} RuleSnapshot
 */

/**
 * @typedef {{
 *   id: string
 *   exportJobId: string
 *   ruleSnapshotId: string
 *   jurisdictionKey: string
 *   countyGroup: string
 *   inspectionTypeCode: string
 *   stageCode: string
 *   sourceEntries: ManifestSourceEntry[]
 *   evidenceInventory: {
 *     attachedDocuments: string[]
 *     evidenceItems: EvidenceItem[]
 *     attachmentCount: number
 *   }
 *   assemblyGraph: {
 *     requiredSections: string[]
 *     optionalSections: string[]
 *     blockerSections: string[]
 *     manifestAppendixSections: string[]
 *     omissionDisclosures: string[]
 *   }
 *   basisDisclosures: Array<{
 *     sourceRecordId: string
 *     title: string
 *     verificationStatus: VerificationStatus
 *     note: string
 *   }>
 *   exceptions: Array<{code: string, message: string, packetRole: string}>
 *   createdAt: string
 * }} VerificationManifest
 */

/**
 * @typedef {{
 *   id: string
 *   workflowRunId: string
 *   stageGateEvaluationId?: string | null
 *   packetClass: string
 *   title: string
 *   ruleSnapshotId: string
 *   sourceRecordIdsUsed?: string[]
 *   manifestId: string
 *   createdAt: string
 *   status: "completed"|"failed"|"pending"
 * }} ExportJob
 */

/**
 * @typedef {{
 *   eventType: string
 *   actorId: string
 *   projectId: string
 *   runId?: string
 *   exportJobId?: string
 *   transitionAttemptId?: string
 *   details?: Record<string, unknown>
 *   occurredAt?: string
 * }} AuditLogInput
 */

/**
 * @typedef {{
 *   id: string
 *   eventType: string
 *   actorId: string
 *   projectId: string
 *   runId: string | null
 *   exportJobId: string | null
 *   transitionAttemptId: string | null
 *   details: Record<string, unknown>
 *   occurredAt: string
 * }} AuditLogEvent
 */

/**
 * @param {unknown} value
 * @param {string} message
 */
export function assertDefined(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

export {};
