# MagpieBridge-Edu — Living Work Tracker

> Updated after every agent job per AGENTS.md rule 5. Latest state first.

## NOW

- Baseline is green and verified (2026-10-01). All four gates pass: `typecheck` (0 errors), `test` (31/31), `lint` (exit 0, warnings only), `build` (exit 0). Git initialized with `.gitignore`.
- Next unit of work: **Phase 2 — Security and data-integrity fixes** (`outputs/ACTION_PLAN_2026-10-01.md` Part 2). Named output: `outputs/SECURITY_INTEGRITY_FIX_2026-10-01.md`.

## DONE

- **2026-10-01 — Phase 1: Baseline restore** (see `outputs/BASELINE_RESTORE_2026-10-01.md`). Fixed B1/B2 (JSX-in-`.ts` test broke typecheck), B3 (no git), B27/B28 (docs drift). Also fixed the `next lint` "Invalid Options" failure by downgrading ESLint to v8, registered jest-dom matchers, and converted the certificate detail page to the canonical dynamic-route signature. Initial git commit + Phase 1 commit landed.
- **2026-10-01 — Full-review action plan** (see `outputs/ACTION_PLAN_2026-10-01.md`). Catalogued 28 confirmed bugs (B1–B28) and a 6-phase enhancement plan after scrutinizing schema, auth, all API routes, key components, lib, tests, and config.
- **2026-10-01 — Certificate download button** (see LOG row). Added `onDownload` handler to the certificate detail page.
- **2026-09-30 — Build plan + execution** (see `outputs/BUILD_PLAN_2026-09-30.md` and `outputs/BUILD_PLAN_EXECUTION_REPORT_2026-09-30.md`). Certificate component consolidation, catalog image fix, lint activation. (Note: the execution report's "typecheck passes" claim was corrected on 2026-10-01 — see B28.)
- **2026-09-23 — Phase 1 MVP complete** (see `outputs/PHASE1_REPORT_2026-09-23.md`). Course archiving, module/lesson reordering, course assignment, user and role management, instructor and learner progress views, course preview, role-aware navigation. External video embedding added same day.

## NEXT

1. **Phase 2 — Security and data-integrity fixes** (highest priority; 3 correctness defects in a system that already issues certificates):
   - B4: `auth.ts` `authorize()` ignores `user.status` — suspended users can still sign in.
   - B9/B10: `checkCompletionRequirements` ignores `Lesson.required` and `Quiz.requiredForCompletion` — optional content blocks certificate issuance.
   - B5: certificate download route uses a blanket `instructor` role check instead of `canEditCourse` — any instructor can download any learner's certificate.
   - Also: B6 (reset tokens not fully invalidated), B7 (middleware gaps), B8 (duplicate loosely-typed auth helpers), B11/B13 (quiz scoring/validation duplication), B12 (attempt-count race), B14 (best-attempt logic), B17 (`Math.random` cert number), B18/B19 (missing `onDelete: Cascade`).
2. **Phase 3 — Fix the broken learner flows**: B21 (cert list has no view/download wiring), B22 (dead `certificate-page.tsx`), B23/B24 (catalog references missing fields), B25/B26 (dead links), B15/B16 (silent cert-issuance failure; env-var institution name).
3. **Phase 4 — Regression protection**: replace placeholder tests with real component + route tests; browser-verify the certificate and catalog flows.
4. **Phase 5 — Enhancements**: file upload/storage (BLK-003), transactional email (BLK-005), manager team view (BLK-004), reporting dashboard, audit coverage, learning paths, identity provider (BLK-002).
5. **Phase 6 — Production readiness**: rate limiting, CSRF/cookie review, env validation, backup verification.

## BLOCKED

- **BLK-002 — Identity provider.** Open (Entra, Google, or email-first). Credentials provider is the only one wired. Phase 5.
- **BLK-003 — File upload / media storage.** No upload endpoint or storage integration. Lesson media is external URLs only. Phase 5.
- **BLK-004 — Manager team view.** DB self-relation (`User.managerId`) exists; no UI. Phase 5.
- **BLK-005 — Transactional email.** `lib/email.ts` only logs; password reset tokens are written to the DB only. Phase 5.

---

## LOG


| 2026-09-30 | Grok | Enhanced course catalog with hero banner and rich course cards (NEXT-029). Added thumbnail support, duration badges, metadata display, improved hover states, and responsive grid layout. | `components/course-catalog.tsx` | Finished the design pass started on 2026-09-23. Course catalog now features a hero banner and richer course cards with thumbnail, duration, author, and level information. |
| 2026-09-30 | Grok | Consolidated duplicate certificate components (NEXT-015). Removed duplicate certificate components from `components/certificate-card.tsx`, `components/certificate-detail.tsx`, `components/certificate-list.tsx`, and `components/certificate-page.tsx`, keeping only the versions in `components/certificates/`. Updated all imports to use the consolidated components. | `components/certificate-card.tsx`, `components/certificate-detail.tsx`, `components/certificate-list.tsx`, `components/certificate-page.tsx`, `components/certificates/certificate-card.tsx`, `components/certificates/certificate-details.tsx`, `components/certificates/certificate-list.tsx`, `components/certificates/certificate-page.tsx` | Eliminated duplicate certificate components to reduce code complexity and maintenance burden. All certificate-related components now reside in the `components/certificates/` directory. |
| 2026-09-30 | Grok | Produced a systematic build plan after deep diagnostics, including verified failures, phased stabilization work, regression-protection tasks, enhancement sequencing, and definition of done. | `outputs/BUILD_PLAN_2026-09-30.md` | Plan is execution-ready and prioritized to restore green build gates before further feature expansion. |
| 2026-09-30 | Grok | Executed Phase 1 (stabilization) of systematic build plan: consolidated certificate components to canonical path, fixed catalog image import, activated linting. | `outputs/BUILD_PLAN_EXECUTION_REPORT_2026-09-30.md`, `components/certificate-card.tsx`, `components/certificate-detail.tsx`, `components/certificate-list.tsx`, `components/certificate-page.tsx`, `components/certificates/certificate-card.tsx`, `components/certificates/certificate-details.tsx`, `components/certificates/certificate-list.tsx`, `components/certificates/certificate-page.tsx`, `components/course-catalog.tsx`, `.eslintrc.json` | Addressed build blockers: certificate import/export mismatches, Next.js image import bug, lint pipeline not active. |
| 2026-09-30 | Grok | Fixed certificate list runtime error: added defensive check to prevent 'certificates.map is not a function' when API returns unexpected data structure. | `components/certificates/certificate-list.tsx` | Fixed TypeError that occurred when accessing /dashboard/certificates page. Added Array.isArray() check to ensure certificates prop is always an array before calling .map(). |
| 2026-09-30 | Grok | Verified certificate generation and display working end-to-end: earned certificate CERT-1790750196332-JFLD8MGMY for course "Microsoft Project 2019: Beginner to Advanced" completed on September 30, 2026. | http://localhost:3000/dashboard/certificates, http://localhost:3000/dashboard/certificates/[id] | Confirmed that the certificate fix resolved the runtime error and that users can successfully earn, view, and access certificates. |
| 2026-10-01 | Grok | Fixed missing download button in certificate detail page: added onDownload handler to CertificatePage component that navigates to the download API endpoint. | `app/dashboard/certificates/[id]/page.tsx` | Added download functionality to certificate detail UI. Users can now click "Download Certificate" button to generate and download PDF certificates. |
| 2026-10-01 | User | Requested update to PICKUP file before restarting window to preserve work history. | `agents/plans/PICKUP.md` | File updated to record latest work on certificate download button fix. |
| 2026-10-01 | Grok | Produced a full-review action plan after scrutinizing the entire project (schema, auth, all API routes, key components, lib, tests, config). Catalogued 28 confirmed bugs (B1–B28) and a 6-phase enhancement plan. | `outputs/ACTION_PLAN_2026-10-01.md` | Plan is execution-ready. Phase 1 (baseline) first, then Phase 2 (security/integrity), Phase 3 (learner flows), Phase 4 (regression protection), Phase 5 (upgrades), Phase 6 (production readiness). |
| 2026-10-01 | Grok | Executed Phase 1 (baseline restore) of the action plan. Fixed the JSX-in-`.ts` test that broke typecheck (B1/B2), downgraded ESLint to v8 to fix the `next lint` "Invalid Options" failure, registered jest-dom matchers, converted the certificate detail page to the canonical dynamic-route signature, initialized git with a `.gitignore` (B3), and reconciled README + build execution report drift (B27/B28). All four gates now green and verified. | `outputs/BASELINE_RESTORE_2026-10-01.md`, `test/certificate-card.test.tsx`, `test/setup.ts`, `test/certificate-utils.test.ts`, `test/utils.test.ts`, `app/dashboard/certificates/[id]/page.tsx`, `.eslintrc.json`, `package.json`, `.gitignore`, `README.md`, `outputs/BUILD_PLAN_EXECUTION_REPORT_2026-09-30.md` | typecheck 0 errors · test 31/31 passing · lint exit 0 (warnings only) · build exit 0. Git repo initialized (initial commit). Unblocks Phase 2. |