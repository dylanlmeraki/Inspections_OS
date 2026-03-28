# Inspection.OS

## MVP and Phasing Plan v3

**Production-order execution plan: dashboards -> project/inspection management -> auth/RBAC -> UX/system logic -> Tier 1 entrypoints**

- **Version:** v3.0 working revision
- **Date:** March 23, 2026
- **Purpose:** Make the production order executable for engineering and design by specifying phase outcomes, dependencies, exit gates, and the exact build logic expected in each phase.
- **Audience:** Founder, engineering lead, product lead, design lead, operations lead

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

## 1. Production order and rationale

The sequence remains correct: first define and build the web/admin information architecture and dashboard model, then the project and inspection management suite, then auth/RBAC/tenanting, then design-system and UX/system-logic tightening, and only then the first integration entrypoints. This order preserves the operational core before connecting outside systems.

| Production order | Why this comes first |
|---|---|
| 1. Dashboard + admin IA | Without the control plane, the system remains runner-centric and opaque |
| 2. Project + inspection management | Operational work needs queueing, review, issue, and export management before outside users arrive |
| 3. Auth / RBAC / tenanting | Permissions matter once real management and external sharing exist |
| 4. UX/system-logic tightening | Design should harden after the control surfaces and permission model are real |
| 5. Tier 1 entrypoints | Notifications and archive destinations should attach to proven internal events |

## Phase A - Dashboard and admin IA foundation (weeks 1-3)

This phase creates the top-level web control plane and admin information architecture. The output is not just screens, but a stable navigation model, a working dashboard domain model, and query surfaces that can power metrics, queues, and project state cards.

### Engineering deliverables

- Define dashboard query contracts and portfolio/project/operations/compliance view models.
- Implement base read APIs for projects, runs, issues, exports, source statuses, and blocker summaries.
- Implement web shell navigation and role-based menu visibility.
- Add project summary aggregations and current-stage summary endpoints.

### Product / UX deliverables

- Finalize primary and secondary navigation.
- Define widget taxonomy and card patterns for all dashboard types.
- Design blocker-summary and status-summary patterns.

### Dependencies and design assumptions

- Lifecycle and rule models from the earlier source set must be stable enough to aggregate.
- The team must resist turning this into pure analytics before the operational surfaces exist.

### Exit gate

- A lead reviewer or PM can open the web app and answer: what is blocked, what is due, what is overdue, and which projects need attention now.

### Questions this phase must answer

- What data model powers dashboard truth? Which statuses are rolled up and which remain local?
- How do unresolved verification statuses appear in high-level views without overwhelming the user?

## Phase B - Project and inspection management suite (weeks 4-7)

This phase turns the product from a field runner with admin scaffolding into a usable operations system. It focuses on project workspaces, inspection management, review queues, issues, document vault behavior, and export-center visibility.

### Engineering deliverables

- Implement project workspace tabs and their backing resources.
- Build inspection list/query APIs with filters by stage, status, program, inspector, and jurisdiction.
- Implement review queue state transitions and manager actions.
- Implement issue board/list APIs and blocking-scope fields.
- Implement export-center list and artifact history endpoints.

### Product / UX deliverables

- Project overview, programs, inspections, issues, documents, exports, and audit tabs.
- Review detail layouts with evidence and blocker context.
- Corrective-action suite and overdue views.

### Dependencies and design assumptions

- Dashboard IA must already exist so these surfaces land into a coherent shell.
- Runner and export artifacts must be present enough to populate these management screens.

### Exit gate

- A project can be managed end to end inside the web suite without fallback to spreadsheets for status, issue, or export tracking.

### Questions this phase must answer

- How do run statuses differ from lifecycle stage statuses?
- Which issue types block advancement vs export only?

## Phase C - Authentication, RBAC, and tenanting (weeks 8-10)

This phase formalizes who can see and do what. It should not be started before management surfaces exist because permissions must be shaped around real actions like review, waiver, export, and source-rule governance.

### Engineering deliverables

- Implement auth service, session issuance, password reset, and auth audit events.
- Implement org, tenant, membership, and role-assignment models.
- Attach authorization checks to project, issue, export, rule, and source actions.
- Implement external reviewer and view-only share boundaries.

### Product / UX deliverables

- Login flows, invite flows, role-management screens, and permission-aware UI states.
- Plain-language permission language for high-risk actions such as waivers and external shares.

### Dependencies and design assumptions

- Management surfaces and sensitive actions must already exist so auth can be mapped to real behavior rather than theoretical roles.

### Exit gate

- Users see only the projects, actions, and exports allowed by role; waiver, source-edit, and external-share permissions are enforced.

### Questions this phase must answer

- Who can waive blockers? Who can supersede source records? Who can export externally? These must be concretely answered in both backend and UI.

## Phase D - UX/UI system logic and design hardening (weeks 11-13)

This phase removes ambiguity and ensures the same concepts render coherently across the web suite, runner, admin library, gate manager, and exports. It is not just a visual polish phase; it is a system-logic tightening phase.

### Engineering deliverables

- Standardize shared status vocabularies and UI component contracts.
- Implement blocker card, lifecycle timeline, manifest viewer, packet completeness meter, and verification badge components.
- Normalize error payload rendering and gate-summary presentation.
- Add component usage rules to prevent inconsistent semantics across web and mobile.

### Product / UX deliverables

- Design system tokens and state variants.
- Screen-level UX refinement for dashboards, workspaces, review detail, exports, and admin library.
- Human-readable language for caution and ambiguity states.

### Dependencies and design assumptions

- Control surfaces and permissions must already exist; otherwise the design system has no stable semantics to encode.

### Exit gate

- A user sees consistent stage names, blocker patterns, and verification badges across dashboard, review, export, and admin contexts.

### Questions this phase must answer

- How do we show complexity without clutter? Which information is inline vs drill-down? What caution language is clear without sounding like system failure?

## Phase E - Tier 1 integration entrypoints (weeks 14-15)

This phase is deliberately small. It attaches notifications and archive/share destinations to canonical internal events and export jobs, but does not change the internal operating model.

### Engineering deliverables

- Implement notification event publisher for Slack-targetable events.
- Implement export/archive destination hooks for Google Drive-targetable packet pushes.
- Add retry and status tracking for notification and destination delivery.

### Product / UX deliverables

- Admin settings for channel or folder bindings.
- Per-event routing preferences and delivery status visibility.

### Dependencies and design assumptions

- Internal event model, export center, and auth model must already be reliable.

### Exit gate

- A completed export or overdue issue can trigger a trusted notification or archive push without creating a second source of truth.

### Questions this phase must answer

- Which events are worth notifying? Which are noise? How do we prevent Drive from becoming the operational vault instead of a destination?

## 2. Cross-phase dependencies

| Dependency | Why it matters |
|---|---|
| Stable lifecycle and stage vocabulary | Dashboards, queues, and manifests all rely on the same stage semantics |
| Source/form/rule verification model | High-level UI must surface nuance without misrepresenting trust |
| Export reproducibility | Later auth and integrations depend on canonical export metadata |
| Runner + gate foundation | Management surfaces cannot be real unless run/gate/export records are already canonical |

## 3. Phase-level acceptance model

- No phase is complete if the user still has to leave the system to understand lifecycle state or blockers.
- No phase is complete if the UI uses different names for the same status concept across screens.
- No phase is complete if exports cannot be traced back to rule snapshots and manifest source entries.
- No phase is complete if permissions are unclear for waiver, source governance, or external share actions.

*March 2026 working set*
