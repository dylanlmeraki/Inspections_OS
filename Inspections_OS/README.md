# Inspection.OS Wizard / Gate / Export Handoff

This is a cleanroom Vite/React handoff package for the **wizard -> abstraction layer -> gate manager -> PDF export** path.

## Included
- local seed-backed project/program/stage model
- wizard abstraction service
- gate evaluation engine
- verification-manifest aware export engine
- PDF packet generation using jsPDF
- minimal UI surfaces to exercise the flow
- unit tests for wizard, gate, and export logic

## Quick start (new engineer, local only)
No Base44 or hosted platform setup is required.

```bash
npm ci
npm run build
npm run lint
npm run typecheck
npm run test
npm run dev
```

## Design boundary
This package is focused on the handoff-ready wizard/gate/export infrastructure only. It uses a local repository pattern (`src/lib/localDb.js`) so you can later swap in a real backend without changing the UI contracts.

## What to inspect first
- `src/components/WizardRunner.jsx`: canonical wizard -> gate -> transition -> export control surface
- `src/lib/wizardAbstractionService.js`: project/jurisdiction/program/inspection/stage resolution
- `src/lib/gateEngine.js`: deterministic rule evaluation and blocker/warning outcome
- `src/lib/exportEngine.js`: export job + verification manifest + source/evidence basis
- `src/lib/localDb.js`: local repository abstraction boundary
- `src/contracts/types.js`: shared seam payload contracts

## P2 hardening now included
- normalized id/hash helpers in `src/lib/ids.js`
- standardized evidence/export/manifest/source-entry id generation
- stable content hashing for manifest/evidence rows
- source freshness metadata (`verifiedAt`, `lastSeenAt`, `stale`) surfaced in Source Library and manifests

## Final packaging checklist
Before shipping the handoff bundle, remove generated artifacts:
- `node_modules/`
- `dist/`
- any local logs/render scratch output
