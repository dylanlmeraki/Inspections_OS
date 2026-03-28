import { uid } from "@/lib/ids";

/** @type {import("@/contracts/types").AuditLogEvent[]} */
const auditEvents = [];

/**
 * @param {import("@/contracts/types").AuditLogInput} payload
 * @returns {import("@/contracts/types").AuditLogEvent}
 */
export function logAuditEvent(payload) {
  const { eventType, actorId, projectId } = payload;
  if (!eventType || !actorId || !projectId) {
    throw new Error("logAuditEvent requires eventType, actorId, and projectId");
  }

  const event = {
    id: uid("audit"),
    eventType,
    actorId,
    projectId,
    runId: payload.runId ?? null,
    exportJobId: payload.exportJobId ?? null,
    transitionAttemptId: payload.transitionAttemptId ?? null,
    details: payload.details ?? {},
    occurredAt: payload.occurredAt ?? new Date().toISOString(),
  };

  auditEvents.unshift(event);
  return structuredClone(event);
}

export function listAuditEvents() {
  return structuredClone(auditEvents);
}

export function clearAuditEvents() {
  auditEvents.length = 0;
}
