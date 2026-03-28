# Inspection.OS

## Dashboards, Auth, and UX/System Logic Build Spec

**Detailed build spec for operational surfaces, permissions, and UX semantics tightening**

- **Version:** v1.0 working revision
- **Date:** March 23, 2026
- **Purpose:** Provide an implementation-grade mapping for dashboards, project and inspection management suites, auth/RBAC, tenanting, UI primitives, and UX/system-logic tightening, with Tier 1 entrypoints planned but constrained.
- **Audience:** Engineering lead, frontend lead, product designer, backend lead

## Source basis

- Inspection.OS.txt
- InspectionOS_Source_of_Truth_v1.docx
- InspectionOS_MVP_and_Phasing_Plan_v1.docx
- InspectionOS_PRD_v1.docx
- InspectionOS_Upgrade_Companion_v1.docx
- InspectionOS_BayArea_Next_Pass_Binder_2026-03-21.pdf
- InspectionOS_BayArea_Official_Forms_Index_v2_2026-03-21.pdf
- InspectionOS_MVP_App_Native_Schema_Tables_2026-03-21.pdf
- [COUNTY-Marin]_Building-Permit-Submittal-Checklist_Special-Inspection-Trigger.pdf
- [COUNTY-Contra-Costa]_Special-Inspections-Program-and-Recognized-Agencies.pdf

## 1. Information architecture

| Primary nav | Sub-areas | Primary user intent |
|---|---|---|
| Dashboard | Portfolio, Operations, Compliance, My Work | See risk, due work, blockers, and throughput |
| Projects | Overview, Programs, Inspections, Issues, Documents, Exports, Team, Audit | Manage one project end to end |
| Inspections | All runs, review queue, recurring cadence views | Run and review inspection work |
| Issues | All issues, verification queue, overdue view | Manage corrective actions |
| Exports | Export center, manifests, share/archive status | Manage packet outputs |
| Sources & Forms | Source records, form records, verification statuses | Govern official-source library |
| Templates | Template families, versions, manifests | Govern internal template packs |
| Rules | Packet rules, cadence rules, previews, snapshots | Govern runtime behavior |
| Admin | Organizations, users, roles, settings, integrations | Govern system access and configuration |

## 2. Dashboard build mapping

### 2.1 Portfolio dashboard

- Widgets: blocked projects, overdue inspections, overdue issues, pending reviews, packet completeness, unresolved verification status counts, export failures, stale source records.
- Filters: org, county, city, program, stage, PM, reviewer, time window.
- Drill-down behavior: every widget must land in a filtered operational list, not just a static chart.

### 2.2 Project dashboard

- Program cards: stage, due-next, gate status, packet completeness, last run, next due run, issue count.
- Blocker rail: unmet requirements, unresolved source nuance, missing evidence, pending approvals.
- Recent activity: runs, issues, exports, stage attempts, source changes affecting the project.

### 2.3 Operations dashboard

- Views for drafts, submitted, returned, approved, exported, failed sync, stale drafts, due recurring runs.
- Must support queue operations and fast transitions to review detail.

### 2.4 Compliance dashboard

- SWPPP: threshold, PRD, signer, opening, routine, annual, NOT health.
- Special inspections: packet cover, recognition control, weekly cadence, final packet health.
- Dust: applicability and plan-approval health.
- Asbestos: readiness and stale-date health.

## 3. Project and inspections management suite build mapping

| Surface | Must show | Must allow |
|---|---|---|
| Project overview | metadata, jurisdiction binding, active programs, blocker summary | jump to program, create work, inspect recent activity |
| Programs | stage cards, packet completeness, due tasks, ambiguity badges | enter stage-specific actions |
| Inspections | run list, statuses, inspector, due state, gate state | create, continue, clone, review, approve, return |
| Issues | origin, severity, blocking scope, assignee, due date, verification status | assign, verify, close, escalate |
| Documents | official references, evidence files, required slots, artifacts | upload, verify, supersede project files where allowed |
| Exports | packet class, status, manifest presence, share/archive status | render, re-render, share, archive |

### Key logic distinction

- Run status is not the same as lifecycle stage status.
- Issue severity is not the same as blocking scope.
- Packet completeness is not the same as export existence.
- Verification status of a source is not the same as validity of user evidence.

## 4. Authentication, RBAC, and tenanting build mapping

| Area | Design decision | Implementation note |
|---|---|---|
| Identity | org -> tenant -> user -> project membership | Keep project membership separate from org role |
| Roles | org roles + project roles + restricted external roles | Evaluate permissions by action and scope |
| High-risk actions | waive blocker, supersede source, edit rules, export externally | Require explicit permission checks and audit events |
| Tenanting | canonical system rules with controlled tenant annotations, not freeform forks | Prefer overlay model over tenant-owned canonical records |
| External reviewers | view-only or comment-limited access | Never expose admin/source governance by default |

## 5. UX/UI system-logic tightening

### 5.1 Component primitives to finalize

- Lifecycle timeline
- Workflow stage pill
- Blocker card
- Requirement checklist
- Evidence tray
- Verification badge
- Packet completeness meter
- Manifest reference card
- Overdue / due-soon chip
- Caution / ambiguity note block

### 5.2 System-logic tightening checklist

| Area | What must be tightened | Why |
|---|---|---|
| Status vocabulary | one canonical set of stage, run, issue, export, and source statuses | prevents semantic drift across web/mobile/export/admin |
| Error payloads | standard structure for inline errors, blocker summaries, and transition failures | avoids inconsistent UI interpretation |
| Waiver pattern | single UI and audit model for waivers | keeps sensitive exceptions explainable |
| Manifest language | plain-language explanations for caution and ambiguity states | supports external review and user trust |
| Drill-down rules | what is inline vs expandable vs details-only | prevents clutter while preserving defensibility |

### 5.3 UX language rules

- Always tell the user what stage they are in.
- Always tell the user what is missing, why it matters, and what resolves it.
- Never hide whether a packet depends on indirect or unresolved source logic.
- Use the same nouns across runner, web, admin, and exports.

## 6. Tier 1 entrypoint planning

- Slack entrypoint events: `run_submitted_for_review`, `run_returned`, `stage_transition_blocked`, `issue_overdue`, `export_completed`, `source_record_stale`.
- Google Drive entrypoints: export archive destination, project packet folder binding, external share destination.
- All integration sends should originate from canonical internal events and store retry/status metadata.

## 7. Build-sequence deliverables

| Sequence | Artifact | Owner |
|---|---|---|
| 1 | Dashboard IA wireframes and query contracts | Product + design + backend |
| 2 | Project workspace and inspection management detailed spec | Product + backend + frontend |
| 3 | Auth/RBAC matrix and tenant overlay model | Product + backend + security-minded engineer |
| 4 | Design-system primitives and state vocabulary | Design + frontend |
| 5 | Tier 1 event contract list and destination settings model | Backend + product |

*March 2026 working set*
