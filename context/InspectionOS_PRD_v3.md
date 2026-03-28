# Inspection.OS

## Product Requirements Document v3

**Dashboards, management suite, auth, and operations surfaces tranche**

- **Version:** v3.0 working revision
- **Date:** March 23, 2026
- **Purpose:** Specify the next layer of the product: operational dashboards, project and inspection management, auth/RBAC/tenanting, UX/system-logic tightening, and Tier 1 integration entrypoints.
- **Audience:** Product, engineering, design, QA, operations

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

## 1. Product scope of this tranche

This tranche does not revisit the core field wizard, gate service, or export-manifest foundations except where they must be extended to support operations/admin surfaces. The purpose here is to define the web control plane that sits above the runner: dashboards, project workspaces, review and issue suites, auth/RBAC/tenanting, and UX/system-logic conventions that make the lifecycle/gate/export model operable at scale.

### Primary principle

- Do not build generic dashboards. Build operational control surfaces for lifecycle state, blockers, evidence completeness, review throughput, and packet defensibility.
- Do not flatten verification nuance. Direct, indirect, inferred, and gap-note statuses must stay visible where they affect decisions, exports, or trust.
- Do not add integrations as a substitute for operational clarity. Internal system behavior remains canonical; integrations are destinations or notifications, not the source of truth.

## 2. Dashboard and reporting architecture

### 2.1 Portfolio dashboard

The portfolio dashboard is for org-level monitoring. It aggregates state across all active projects and must answer: what is blocked now, what is due or overdue, where are review queues backing up, which exports are incomplete, and where does jurisdiction ambiguity still exist.

| Widget | Metric logic | Why it matters |
|---|---|---|
| Blocked projects | Count of projects with at least one active program whose current stage has status fail | Shows true operational friction, not just activity volume |
| Overdue inspections | Recurring runs due before now and not completed | Highlights execution risk |
| Overdue corrective actions | Open issues past due date | Shows field quality and responsiveness |
| Packet completeness | Project/program pair with unmet `document_vault_slot` or required export prerequisites | Prevents false sense of readiness |
| Verification status distribution | Counts of verified-direct, verified-indirect, inferred-direct, gap-note sources used by active projects | Shows trustworthiness of current jurisdiction coverage |
| Export failures or pending exports | `export_job` statuses pending/failed | Shows reporting bottlenecks |

### 2.2 Project dashboard

The project dashboard is the daily PM/compliance home. It must make one project legible at a glance: current stage per program, blockers, due items, document completeness, open issues, and export history.

- Overview card: project metadata, jurisdictions, active programs, assigned team.
- Program state cards: one per active program with current stage, due next action, and gate status.
- Blocker rail: all unmet requirements and unresolved ambiguity badges that affect advancement or exports.
- Recent activity feed: runs submitted, runs returned, issue closures, export jobs completed, source changes impacting this project.

### 2.3 Operations dashboard

The operations dashboard is a throughput console for reviewers and coordinators. It prioritizes drafts, submitted runs, returned runs, failed syncs, stale drafts, and recurring-run cadence health.

### 2.4 Compliance dashboard

The compliance dashboard is program-specific and must surface lifecycle health, not generic charts. Example: SWPPP should show PRD/NOI/signer/opening-condition/annual-report/NOT readiness; special inspections should show packet cover selection, recognition control, weekly-report cadence, and final closeout status.

## 3. Project and inspection management suite

The management suite is the web operational layer around the runner. It must be strong enough that teams can manage a project, its inspections, its issues, its required documents, and its exports without bouncing between ad hoc spreadsheets, shared drives, and inboxes.

| Workspace tab | Purpose | Key capabilities |
|---|---|---|
| Overview | One-page project state | project metadata, active programs, lifecycle summary, blocker summary, recent activity |
| Programs | Program-specific health | stage cards, packet completeness, due tasks, unresolved blockers |
| Inspections | Run management | drafts, submitted, returned, approved, exported, clone/resume/supersede |
| Issues | Corrective action suite | assignment, due dates, verification evidence, escalation, closure |
| Documents | Document-vault operations | official-source references, user evidence, required slots, generated artifacts |
| Exports | Packet management | export jobs, manifests, share/archive destinations |
| Audit | Traceability | events, transition attempts, exports, waivers, source impacts |

### 3.1 Inspection review queue

- Review queue must support draft, submitted, returned, approved, exported states with bulk filters by program, stage, inspector, jurisdiction, and due date.
- Review detail must show answers, media, signatures, gate summary, missing evidence, and official-source basis when the rule layer depends on it.
- Returned runs must preserve reviewer comments and explicitly mark which requirement or evidence item caused the return.

### 3.2 Corrective action management

- Issue records must distinguish origin, severity, blocking scope, closure requirements, verification actor, and verification time.
- Not all issues are equal: some block stage advancement, some block packet export, some are informational only. The data model and UI must distinguish these cases.
- Issue list views must support by-assignee, by-project, by-program, by-severity, by-due-date, and by-blocking-scope filtering.

## 4. Export center and manifest viewer requirements

The export center is a management surface, not a single button. It must make exports searchable, reproducible, explainable, and ready for external share or archival destination.

| Packet class | Minimum included components | Typical use |
|---|---|---|
| Inspection packet | Run data, answers, media, signatures, audit summary | Manager review or owner share |
| Issue packet | Issue list, assignees, due dates, closure evidence, verification state | Corrective-action management |
| Compliance packet | Inspection packet + jurisdiction cover elements + official-source manifest | Agency-facing or formal program report |
| Closeout packet | Final verification artifacts, unresolved-item sweep, approvals, closeout evidence | Final/occupancy/termination support |

- Every `export_job` must store `packet_class`, `workflow_run` or project scope, `generated_by`, `generated_at`, `rule_snapshot_id`, `verification_manifest_id`, and artifact metadata.
- Every manifest must disclose `source_record` title, `packet_role`, `source_type`, `fingerprint_hash`, `verification_status`, and any unresolved caution conditions.
- Exports that rely on indirect, inferred, or gap-note sources must show that visibly rather than presenting false certainty.

## 5. Authentication architecture

Authentication must be treated as a first-class architectural concern in this tranche because waivers, exports, review approvals, and source-rule management are all permission-sensitive.

| Area | Requirement |
|---|---|
| Identity model | organization, tenant, user, `project_membership`, team, invited external reviewer |
| Auth strategy | first-party auth with email/password, password reset, email verification, MFA-ready, SSO-ready abstraction |
| Session controls | session issue/revoke, device awareness, expired-session handling, login failure tracking |
| Auth audit events | login, failed login, password reset, invite sent/accepted, role change, session revoke |

## 6. Authorization, RBAC, and tenanting

RBAC must reflect real risk boundaries, not generic SaaS roles. The central question is: who can waive blockers, supersede source records, alter packet rules, export externally, or mark ambiguity as acceptable?

| Role layer | Roles | High-risk permissions |
|---|---|---|
| Org-level | `org_owner`, `org_admin`, `compliance_admin`, `operations_admin` | tenant settings, rule governance, source governance, export policy |
| Project-level | `project_manager`, `reviewer`, `inspector`, `coordinator` | project membership, run review, issue verification, standard exports |
| Restricted/external | `external_reviewer`, `read_only_stakeholder` | view-only packet access and acknowledgments |

- Do not allow arbitrary tenant forking of canonical source/rule records in early stages. Prefer canonical system rules with tenant-local annotations and controlled override workflows.
- Waiver permissions should be narrower than review permissions.
- External share permissions should be narrower than internal export permissions.

## 7. Web IA and UI system logic requirements

The design system and IA must now reflect the runtime model directly. Core nouns should remain stable everywhere: lifecycle, stage, blocker, requirement, evidence, packet, verification status.

| Primary nav | Purpose |
|---|---|
| Dashboard | portfolio, operations, compliance, and personal work views |
| Projects | project workspace entry |
| Inspections | run list and review queue |
| Issues | corrective action suite |
| Exports | packet management |
| Sources & Forms | controlled forms library |
| Templates | template studio and manifests |
| Rules | packet rules, cadence, and previews |
| Admin | org/users/tenants/settings |

- UI primitives to formalize now: lifecycle timeline, stage pill, blocker card, requirement checklist, evidence tray, verification-status badge, packet completeness meter, manifest reference card, overdue chip.
- Every screen should answer: what am I doing, what stage is this, what is missing, why is it required, what resolves it, and what happens next?
- The same stage names and issue statuses must appear consistently across mobile, web, admin, and exports.

## 8. Tier 1 integration entrypoints (planning only)

Tier 1 integrations remain secondary in this tranche. They should be planned as safe extensions of the operational core rather than as structural dependencies.

| Integration | Entrypoint focus | Do not do yet |
|---|---|---|
| Slack | notifications for run submitted, run returned, blocker raised, issue overdue, export completed, source stale | do not use Slack as the system of record |
| Google Drive | archive/export destination, share target, packet folder binding | do not make Drive the operational document vault of record |

- All integration events should originate from canonical internal records and audit events.
- Every external destination push should store status and retry metadata in the export or notification record, not only in logs.

## 9. Acceptance criteria for this tranche

- A PM or compliance lead can open a project and understand lifecycle status, blockers, due work, and export readiness without leaving the app.
- A reviewer can see exactly why a stage cannot advance and what evidence or packet element is missing.
- An admin can manage source records, forms, rules, and templates with visible verification nuance.
- Exports are browseable, reproducible, and manifest-backed.
- Permissions around waiver, source supersession, and external share are explicit and enforced.

*March 2026 working set*
