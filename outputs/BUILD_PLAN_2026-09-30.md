# MagpieBridge-Edu — Systematic Build Plan

Date: 2026-09-30  
Author: Grok  
Scope: Stabilize current build, fix regressions, and sequence feature enhancement safely.

---

## 1) Executive Summary

The project has solid functional groundwork, and the current priority is technical stabilization.

Current status from diagnostics:
- `npm run test` ✅ passes
- `npm run typecheck` ❌ fails
- `npm run build` ❌ fails
- `npm run lint` ⚠ not configured yet (interactive setup prompt)

Primary issues are import/export mismatches from partial certificate-component consolidation and a Next.js image import bug in the catalog component.

---

## 2) Verified Findings

### 2.1 Build blockers

1. **Certificate component import/export mismatch**
   - `components/certificate-list.tsx` imports a default `CertificateCard`
   - `components/certificate-card.tsx` exports named `CertificateCard`
   - Result: TypeScript and build failure

2. **Certificate details import mismatch in consolidated path**
   - `components/certificates/certificate-details.tsx` exports named `CertificateDetails`
   - `components/certificates/certificate-page.tsx` imports default `CertificateDetail`
   - Result: TypeScript failure

3. **Catalog image import bug**
   - `components/course-catalog.tsx` uses `import { Image } from 'next/image'`
   - Correct usage is default import `import Image from 'next/image'`
   - Result: TypeScript failure

### 2.2 Quality gate gap

4. **Lint pipeline not active yet**
   - `npm run lint` opens initial Next.js ESLint setup prompt
   - Result: No reliable static quality gate in normal workflow

### 2.3 Process gap

5. **Tracker/docs state drift risk**
   - Recent tracker notes claim completed consolidation while build still fails
   - Result: Planning and execution history can become unreliable if not synchronized after verification

---

## 3) Build Objectives

### Objective A — Restore a clean engineering baseline
- Achieve green `typecheck`, `build`, `test`, and `lint`
- Remove certificate component ambiguity (single canonical path)

### Objective B — Add confidence against regressions
- Expand tests from minimal baseline to critical flows
- Verify UI behavior end-to-end on affected pages

### Objective C — Resume enhancement work from stable baseline
- Continue catalog and certificate UX improvements with quality gates active

---

## 4) Delivery Plan (Phased)

## Phase 1 — Stabilization (Critical)

### Task 1.1: Finalize certificate component architecture
- Decide and enforce one canonical certificate component location:
  - Recommended canonical path: `components/certificates/*`
- Normalize all imports/exports to one style (named or default) and apply consistently
- Remove or adapt legacy wrappers in `components/*` to avoid split behavior

**Acceptance criteria**
- No certificate-related import/export errors
- `npm run typecheck` passes
- `npm run build` passes

### Task 1.2: Fix catalog image import and compatibility
- Replace named `Image` import with default `Image` import
- Confirm `next/image` usage aligns with Next.js 14 behavior

**Acceptance criteria**
- No catalog-related type errors
- Catalog route compiles and renders

### Task 1.3: Activate linting as a non-interactive gate
- Add ESLint config compatible with Next.js + TypeScript
- Ensure `npm run lint` executes without setup prompts

**Acceptance criteria**
- `npm run lint` runs in local and CI-style environments

---

## Phase 2 — Regression Protection

### Task 2.1: Strengthen test coverage
Add tests for:
- Certificate card/list/detail rendering paths
- Course catalog card behavior with and without thumbnail
- Key utility paths tied to certificate/progress logic

**Acceptance criteria**
- Tests cover critical learner certificate and catalog flows
- Regressions in imports or rendering are caught automatically

### Task 2.2: Verification checklist (UI)
Perform end-to-end browser verification for touched areas:
- `/catalog`
- `/dashboard` certificate tab
- `/dashboard/certificates`
- `/dashboard/certificates/[id]`
- `/admin/certificates`

Include:
- Desktop viewport checks
- Mobile viewport checks
- Error and empty state checks

**Acceptance criteria**
- No functional regression in affected routes
- Visual and interaction checks complete for desktop/mobile

---

## Phase 3 — Enhancement Continuation

### Task 3.1: Catalog enhancement completion
- Convert placeholder filter/sort controls into real behavior
- Ensure course metadata values are accurate and consistently sourced

### Task 3.2: Certificate UX improvement pass
- Standardize action patterns (View/Download) across certificate surfaces
- Improve revoked-state visibility in learner-facing views

### Task 3.3: Decision-dependent roadmap items
Proceed after blockers are resolved:
- Transactional email integration (BLK-005)
- Media storage pipeline (BLK-003)
- Manager-scoped reporting (BLK-004)

---

## 5) Execution Sequence (Recommended)

1. Task 1.1 (certificate consolidation correctness)
2. Task 1.2 (catalog image fix)
3. Task 1.3 (lint setup)
4. Run full gate: `typecheck` → `build` → `test` → `lint`
5. Task 2.1 (tests expansion)
6. Task 2.2 (browser verification)
7. Phase 3 enhancements from stable baseline

---

## 6) Risks and Controls

- **Risk:** Partial refactors leave mixed import styles  
  **Control:** Apply project-wide search for certificate imports before closing Task 1.1

- **Risk:** UI appears correct in one route while broken in another shared component route  
  **Control:** Mandatory multi-route browser verification checklist (Task 2.2)

- **Risk:** Build appears green while lint remains unconfigured  
  **Control:** Treat lint setup as required completion gate, not optional follow-up

---

## 7) Definition of Done for this Plan

Plan is considered executed when:
- `npm run typecheck` passes
- `npm run build` passes
- `npm run test` passes
- `npm run lint` passes without interactive setup
- Certificate and catalog routes are browser-verified on desktop and mobile
- Tracker and durable registry entries match verified technical state

---

## 8) Immediate Next Action

Begin **Phase 1 Task 1.1** (certificate consolidation correctness), then run full build gates before any additional feature work.