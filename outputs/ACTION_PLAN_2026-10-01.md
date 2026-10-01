# MagpieBridge-Edu — Full Review, Bug Fixes, and Enhancement Action Plan

Date: 2026-10-01
Author: Grok
Scope: Comprehensive review of the entire project, confirmed bug list, and a sequenced fix-and-enhancement plan to significantly upgrade the platform.

---

## 0. How to read this document

- **Part 1** lists defects confirmed by reading the code (not speculation). Each item has an ID (B1…B28) used by the plan in Part 2.
- **Part 2** is the sequenced action plan. Phases 1–2 are stabilization and security; 3–5 are the real upgrades; 6 is production readiness.
- Each phase has a Goal and an Acceptance gate. Work one phase at a time per AGENTS.md rule 2 ("One job at a time").

---

## Part 1 — Confirmed Bugs and Defects

### A. Build / type gate (blocking)

**B1. `lib/certificate-card.test.ts` contains JSX but has a `.ts` extension.**
`tsc --noEmit` fails with ~24 `TS1005`/`TS1109` errors on the `<CertificateCard ... />` lines. This is a real component render test placed in `lib/` instead of `test/`. It breaks the typecheck gate the build plan claims is green. Highest-priority fix.

**B2. Duplicate / competing test files.**
`test/certificate-card.test.ts` and `lib/certificate-card.test.ts` both exist. The `lib/` one renders the real component; the `test/` one is a trivial placeholder (`expect(true).toBe(true)`). The `test/` versions for `certificate-page`, `certificate-details`, `certificate-list`, and `course-catalog` are all trivial placeholders asserting nothing about the actual components. The "18 passing tests" give almost no real regression protection.

**B3. No `.gitignore` and no git repository.**
OneDrive file history is the only backup. `node_modules`, `.next`, `.env`, and `tsconfig.tsbuildinfo` have no protection from accidental commit later, and there is no real version history for source code.

### B. Auth / security

**B4. Suspended users can still sign in.**
`auth.ts` `authorize()` checks email + password but never checks `user.status`. An admin who suspends a user expects them to be locked out; they are not. The `status` field exists in the schema and the admin UI toggles it, but the sign-in path ignores it.

**B5. Instructor role grants overly broad certificate access.**
`app/api/certificates/[id]/download/route.tsx` allows any user with the `instructor` role to download *any* learner's certificate (`session.user.roles?.includes('instructor')`), regardless of whether that instructor owns the course. An instructor of course A can download certificates earned in course B. `getCertificateById` in `lib/certificate-utils.ts` correctly restricts to owner-or-admin; the download route bypasses that and widens it.

**B6. Password reset tokens are not fully invalidated after a password change.**
`reset/route.ts` deletes the one token used, but any other unused tokens for the same email remain valid for their full 1-hour window. A reset should revoke all pending tokens for that user.

**B7. `auth.config.ts` middleware does not protect several authenticated routes.**
The `authorized` callback only guards `/admin*` and `/dashboard*`. `/instructor`, `/courses`, `/my-progress`, `/enrollments`, `/catalog`, `/lessons` rely on client-side redirects. A signed-out user hitting those routes gets a flash of the page shell before the client redirect. Middleware should cover all authenticated routes.

**B8. Duplicate, loosely-typed auth helpers.**
`lib/auth.ts` exports `hasRole` / `canEditCourse` that take `any` types, duplicating the typed `getSessionUser` / `canEditCourse` in `lib/api-auth.ts`. Two parallel auth helper files with different signatures is a maintenance hazard; the `any`-typed one could let a refactor introduce a bypass.

### C. Course completion and certificate logic

**B9. `checkCompletionRequirements` counts ALL quizzes, including optional ones.**
The `Quiz` model has `requiredForCompletion Boolean @default(true)`, but `lib/certificate-utils.ts` ignores it: it counts all `courseQuizzes` and requires `passedQuizzes >= courseQuizzes.length`. A course with one optional quiz a learner skips will never issue a certificate, even if every required lesson and required quiz is done. Logic bug against the schema's own intent.

**B10. `checkCompletionRequirements` counts ALL lessons, including non-required ones.**
Same shape: `Lesson.required` exists but the completion check requires `completedLessons >= totalLessons` across all lessons. A non-required lesson a learner skips blocks completion. `/api/me/progress` correctly distinguishes `requiredLessons`, so the two views disagree.

**B11. `quiz-attempts` route duplicates scoring logic from `lib/quiz-utils.ts`.**
The route inlines the scoring instead of calling `calculateQuizScore`. The two implementations are identical today, but a future fix (e.g., partial credit) has to be made in two places. `lib/quiz-utils.ts` exports `calculateQuizScore` and `validateQuizSubmission`, but no route uses them.

**B12. `quiz-attempts` has a TOCTOU race on attempt counting.**
It counts `attemptCount` for the limit check, then counts it again for `attemptNumber: attemptCount + 1`. Two concurrent submissions could both pass the limit check and both create an attempt beyond the limit. The attempt number could also collide. Should be a single atomic query or a unique constraint.

**B13. `quiz-attempts` does not validate that all required questions are answered before scoring.**
`validateQuizSubmission` exists in `lib/quiz-utils.ts` but is never called. A learner can submit an empty quiz, receive a 0, and have a failed attempt count toward their attempt limit.

**B14. `me/progress` "best attempt" logic is wrong for failed attempts.**
The reduce returns the first `passed` attempt, otherwise the first attempt's score — it does not find the highest score among failed attempts. "Best quiz score" shows the first attempt's score, not the best.

**B15. Certificate auto-issue can silently fail with no user-visible signal.**
Both `lesson-progress` and `quiz-attempts` routes wrap `autoIssueCertificate` in a try/catch that logs and swallows. If issuance fails (e.g., a DB constraint), the enrollment shows 100% but no certificate appears, with no retry path or surfaced error.

**B16. `issueCertificate` reads `INSTITUTION_NAME` from `process.env` at issue time.**
`lib/settings.ts` has a `platform.name` setting and the certificate flow uses `institutionName`. The institution name on a certificate depends on an env var that may not be set, while the platform name comes from the admin-configurable setting. These two sources of truth should be reconciled — the certificate should use the platform setting, not an env var.

**B17. `issueCertificate` uses `Math.random()` for the certificate number suffix.**
Not cryptographically random and can collide. `generateSecureToken` exists in `lib/prisma.ts` and is used for password reset; the same secure source should feed certificate numbers.

### D. Data integrity

**B18. No DB-level cascade protection on `LessonProgress.lesson`.**
The schema declares `LessonProgress.lesson Lesson @relation(fields: [lessonId], references: [id])` with no `onDelete`, defaulting to `Restrict`. The `lessons/[id]` DELETE route manually deletes progress first (correct). The admin `courses` DELETE route's module→lesson cascade relies on `onDelete: Cascade` from `Module` to `Lesson`; if any `LessonProgress` references those lessons, the cascade delete of the lesson throws at the DB level. The admin route deletes `lessonProgress` explicitly so it's safe today, but it's fragile. A schema-level `onDelete: Cascade` on `LessonProgress.lesson` (progress is meaningless without the lesson) would make this robust.

**B19. `Certificate.course` and `Certificate.enrollment` relations have no `onDelete`.**
Deleting a course with certificates is blocked at the API level (`admin/courses` DELETE refuses when certificates exist), but the schema itself doesn't defend the FK. If the API guard is ever bypassed, the DB will throw a restrict error rather than failing gracefully.

**B20. `Setting.updatedById` is set but has no relation to `User`.**
It's a plain `String?`. The audit log records who changed settings, but the setting row's `updatedById` is just an unenforced ID. Minor, but you can't join to find who last touched a setting without an audit-log query.

### E. UX / front-end

**B21. Certificate list page has no `onView` / `onDownload` wiring.**
`app/dashboard/certificates/page.tsx` renders `<CertificateList certificates={certificates} />` with no `onView` or `onDownload` props, so the cards show no buttons. The cards are read-only. There is no path to the detail page from the list. The detail page at `/dashboard/certificates/[id]` has a working download button (fixed 2026-10-01), but the list doesn't link to it. Real broken flow.

**B22. `components/certificates/certificate-page.tsx` is dead code.**
Identical to `app/dashboard/certificates/[id]/page.tsx` but never imported anywhere. The `app/` page is the one that renders. Two copies invite drift.

**B23. Course catalog references fields the API doesn't return.**
`components/course-catalog.tsx` reads `course.thumbnailUrl`, `course.durationMinutes`, `course.lessonCount`, `course.level`, `course.instructorName` — none are returned by `/api/courses` or present in the `Course` model. So the catalog shows no thumbnails, no duration badge, "0 Lessons", "Beginner", and "MagpieBridge Instructor" for every course. The hero "All Categories" and "Newest First" buttons are non-functional decorations.

**B24. Catalog enroll button has no success feedback and no error surfacing.**
`handleEnroll` sets `enrolling` but never clears `error` on success; the parent page's `handleEnroll` redirects on success so it works, but the component-level error state is set and never shown in the card.

**B25. `nav-bar.tsx` shows "Team" for managers pointing at `/my-progress`.**
Same page the learner uses for their own progress. There is no manager team view at that route; the README says manager views are Phase 3. The nav link implies a feature that doesn't exist.

**B26. Login page "Don't have an account? Contact your administrator" link is `href="#"`.**
Dead anchor.

### F. Documentation / tracker drift

**B27. `README.md` "Known limitations" is stale.**
Says "No automated tests" (tests exist), "Two parallel certificate component sets exist" (consolidated), and the "Attaching video" section still references old paths. Foundation says Phase 1 complete but README limitations read as pre-Phase-1.

**B28. The build plan execution report claims typecheck passes.**
It does not (B1). The tracker and docs have drifted from verified technical state — exactly the risk the build plan §2.3 calls out, now realized.

---

## Part 2 — Sequenced Action Plan

### Phase 1 — Restore the engineering baseline (must-do, blocking)

**Goal:** green `typecheck`, `build`, `test`, `lint` and a real version-control backup.

1. **Fix B1/B2.** Move `lib/certificate-card.test.ts` → `test/certificate-card.test.tsx` (rename to `.tsx`). Delete or rewrite the trivial placeholder tests in `test/` so they actually exercise the components (render, assert text, assert callbacks). Keep `lib/certificate-utils.test.ts` and `lib/utils.test.ts` where they are, or move them to `test/` for consistency.
2. **Fix B3.** Initialize git, add a `.gitignore` covering `node_modules/`, `.next/`, `.env*`, `tsconfig.tsbuildinfo`, `*.log`, and the `coverage/` dir. Make an initial commit. This gives real history alongside OneDrive.
3. **Run the full gate.** `typecheck` → `test` → `lint` → `build` (with dev server stopped). Record the verified result in the tracker.
4. **Fix B27/B28.** Reconcile README "Known limitations" and the build execution report with verified state.

**Acceptance:** all four gates green; git repo initialized; tracker LOG row added; named output `outputs/BASELINE_RESTORE_2026-10-01.md`.

---

### Phase 2 — Security and data-integrity fixes (must-do)

**Goal:** close the auth and completion-logic holes before any new features.

5. **Fix B4.** In `auth.ts` `authorize()`, after bcrypt verify, check `user.status === 'active'`; return `null` (or a dedicated error) when suspended.
6. **Fix B5.** In the certificate download route, restrict instructor access to courses they author or manage — reuse `canEditCourse`. Remove the blanket `instructor` role check.
7. **Fix B6.** In `reset-password/reset/route.ts`, after a successful password change, delete all `VerificationToken` rows for that `identifier`, not just the one used.
8. **Fix B7.** Extend `auth.config.ts` `authorized` to cover `/catalog`, `/courses`, `/instructor`, `/my-progress`, `/enrollments`, `/lessons` — return `isLoggedIn` for those, true otherwise.
9. **Fix B8.** Remove `lib/auth.ts`'s `hasRole`/`canEditCourse` (`any`-typed); point any callers at the typed `lib/api-auth.ts` versions.
10. **Fix B9/B10.** Rewrite `checkCompletionRequirements` to respect `Quiz.requiredForCompletion` and `Lesson.required`. Count only required lessons and required quizzes. This makes the schema's own flags meaningful and unblocks courses with optional content.
11. **Fix B11/B13.** In `quiz-attempts`, call `calculateQuizScore` and `validateQuizSubmission` from `lib/quiz-utils.ts` instead of the inline copy; reject submissions that fail validation with 400.
12. **Fix B12.** Compute attempt count once and create the attempt in a transaction; add a DB unique constraint or derive `attemptNumber` from a count inside the transaction.
13. **Fix B14.** In `me/progress`, compute best attempt as the max score (prefer a passed one), not the first.
14. **Fix B17.** Generate certificate number suffix from `crypto.randomBytes`, not `Math.random`.
15. **Fix B18/B19.** Add `onDelete: Cascade` to `LessonProgress.lesson`, `Certificate.course`, `Certificate.enrollment` in `schema.prisma`; create and apply a migration.

**Acceptance:** suspended user cannot sign in; instructor cannot download other courses' certificates; a course with optional quizzes/lessons issues a certificate when only required work is done; all quiz submissions validated; cascades are DB-enforced. New tests cover each.

**Named output:** `outputs/SECURITY_INTEGRITY_FIX_2026-10-01.md`.

---

### Phase 3 — Fix the broken learner flows (high-value UX)

**Goal:** make the existing features actually usable end-to-end.

16. **Fix B21.** Wire `onView` (navigate to `/dashboard/certificates/[id]`) and `onDownload` (navigate to the download endpoint) on the certificate list page. This restores the primary learner certificate flow.
17. **Fix B22.** Delete the dead `components/certificates/certificate-page.tsx`.
18. **Fix B23.** Either return real metadata from `/api/courses` (author name, lesson count, estimated duration, a derived level) and add `thumbnailUrl`/`level` to the `Course` schema, or remove the catalog's references to fields that don't exist. Recommended: add `thumbnailUrl String?` and `level String?` to `Course`, populate them in the authoring flow, and have the catalog API return `lessonCount`, `durationMinutes` (sum of `estimatedDuration`), `instructorName` (author name). This makes the catalog cards real.
19. **Fix B25.** Remove the manager "Team" nav link until a team view exists, or build a minimal manager-scoped report (Phase 5).
20. **Fix B26.** Make the login "Contact your administrator" a real `mailto:` using the `platform.supportEmail` setting, or remove it.
21. **Fix B15/B16.** Surface certificate auto-issue failures (toast on next dashboard load) and read institution name from `platform.name` setting, falling back to env var only for legacy certs.

**Acceptance:** learner can view and download a certificate from the list; catalog cards show real metadata; dead links removed; certificate institution name is admin-configurable. Browser-verified on desktop and mobile.

**Named output:** `outputs/LEARNER_FLOWS_FIX_2026-10-01.md`.

---

### Phase 4 — Regression protection (quality gate)

**Goal:** the "18 passing tests" number should mean something.

22. **Replace placeholder tests with real ones.** For each of `certificate-card`, `certificate-list`, `certificate-details`, `certificate-page`, `course-catalog`: render with realistic props, assert the text that should appear, assert the callback fires on click, assert the empty state. Use `@testing-library/react` (already a dependency).
23. **Add API-route-level tests** for the completion logic: a course with an optional quiz issues a certificate; a course with an optional lesson issues a certificate; a suspended user's token is rejected; an instructor outside the course cannot download. Mock Prisma or use a test database.
24. **Add the browser verification checklist** from `outputs/CERTIFICATE_VERIFICATION_CHECKLIST_2026-09-30.md` as an actual run-through and record results.

**Acceptance:** test count reflects real coverage; a deliberate regression in any touched component/route fails a test.

**Named output:** `outputs/REGRESSION_PROTECTION_2026-10-01.md`.

---

### Phase 5 — Enhancements that significantly upgrade the platform

**Goal:** move the project from "MVP works" to "ready for real users".

25. **File upload and storage (BLK-003).** Add an S3-compatible upload endpoint, wire `Lesson.contentUrl` for uploaded media, and add an admin upload UI. Biggest single capability gap. Start with a presigned-URL flow (client uploads directly to S3; server signs).
26. **Transactional email (BLK-005).** Replace `lib/email.ts`'s `console.log` with a real provider (Resend, SES, or Nodemailer+SMTP). Make password reset actually deliver. Gate behind the `notifications.passwordResetEnabled` setting that already exists.
27. **Manager team view (BLK-004).** Build `/manager/team` listing a manager's direct reports (using the `User.managerId` self-relation already in the schema) with their enrollment progress and certificates. Reuse the `/api/me/progress` shape scoped to reports.
28. **Reporting dashboard.** `/api/instructor/progress` already computes completion rates per course. Add an admin/platform-wide rollup route and a dashboard page: completion rate by course, certificates issued over time, active learners. The data is nearly all already queryable.
29. **Audit log coverage.** `AuditLog` has a writer (`recordAudit`) and reader (`listAudit`) and an admin page at `/admin/audit`. Audit writes only fire on user update, user delete, course delete, and settings update. Add `recordAudit` calls to certificate revoke, course archive/restore, enrollment assignment, and role changes so the audit trail is complete.
30. **Learning paths.** `LearningPath` and `LearningPathCourse` tables exist with no implementation. Build a minimal authoring + learner view: an admin creates a path, adds courses in order, a learner sees the path as a sequenced list. Differentiator vs. the flat catalog.
31. **Identity provider (BLK-002).** The foundation flags this as open. Wire one OAuth provider (Microsoft Entra ID or Google) via Auth.js, keeping credentials as fallback. Last "real users" prerequisite for an org deployment.

**Acceptance:** each item ships with its own tracker LOG row and a short report under `outputs/`. Sequence within Phase 5 follows BLK priority: 003 → 005 → 004 → reporting → audit → learning paths → identity.

---

### Phase 6 — Production readiness (later)

**Goal:** harden for an organizational deployment.

32. **Rate-limit** the password reset request and login endpoints (in-memory or Upstash) to blunt brute force.
33. **CSRF / same-site** review on cookie settings.
34. **Environment variable validation** with a startup guard (fail fast if `DATABASE_URL` / `NEXTAUTH_SECRET` missing).
35. **Backup verification:** document the OneDrive + git story and add `npm run verify:backup` that checks the git working tree is clean.

**Acceptance:** rate limits in place; cookie flags reviewed; startup env guard active; backup story documented.

---

## Part 3 — Recommended next job

Start with **Phase 1**. It is the smallest, unblocks everything else, and the build plan already calls for it. Concretely: fix B1/B2 (the `.tsx` test file), initialize git with a `.gitignore`, run the full gate, and reconcile the tracker/README. One coherent job with a named output (`outputs/BASELINE_RESTORE_2026-10-01.md`) and a tracker LOG row.

After that, **Phase 2** (security + completion logic) is the highest-value work because B4 (suspended users can log in), B9/B10 (optional content blocks certificates), and B5 (instructor over-broad certificate access) are real correctness defects in a system that already issues certificates.

---

## Part 4 — Bug-to-Phase cross-reference

| Bug ID | Phase | Summary |
|---|---|---|
| B1, B2 | 1 | JSX test in `.ts` file; placeholder tests |
| B3 | 1 | No git / no `.gitignore` |
| B27, B28 | 1 | Docs/tracker drift |
| B4 | 2 | Suspended users can sign in |
| B5 | 2 | Instructor over-broad cert access |
| B6 | 2 | Reset tokens not fully invalidated |
| B7 | 2 | Middleware gaps |
| B8 | 2 | Duplicate loosely-typed auth helpers |
| B9, B10 | 2 | Optional content blocks completion |
| B11, B13 | 2 | Quiz scoring/validation duplication |
| B12 | 2 | Attempt-count TOCTOU race |
| B14 | 2 | Best-attempt logic wrong |
| B17 | 2 | `Math.random` cert number |
| B18, B19 | 2 | Missing `onDelete: Cascade` |
| B21 | 3 | Cert list has no view/download wiring |
| B22 | 3 | Dead `certificate-page.tsx` |
| B23, B24 | 3 | Catalog references missing fields |
| B25, B26 | 3 | Dead nav link / dead anchor |
| B15, B16 | 3 | Silent cert-issuance failure; env-var institution |
| B20 | 4 | `Setting.updatedById` no relation (test coverage) |
| (tests) | 4 | Real component + route tests |
| BLK-003 | 5 | File upload / storage |
| BLK-005 | 5 | Transactional email |
| BLK-004 | 5 | Manager team view |
| (reporting) | 5 | Platform-wide reporting dashboard |
| (audit) | 5 | Complete audit log coverage |
| (learning paths) | 5 | Learning path implementation |
| BLK-002 | 5 | Identity provider |
| (rate limit) | 6 | Rate limiting |
| (csrf) | 6 | Cookie / CSRF review |
| (env guard) | 6 | Startup env validation |
| (backup) | 6 | Backup verification |

---

## Part 5 — Definition of Done for this plan

The plan is considered fully executed when:

- All four build gates (`typecheck`, `build`, `test`, `lint`) are green and verified.
- Git is initialized with a `.gitignore`.
- No user can sign in while suspended.
- An instructor cannot download certificates for courses they do not own.
- A course with optional quizzes or lessons issues a certificate when only required work is complete.
- All quiz submissions are validated; attempt counting is race-free.
- DB cascades enforce referential integrity for progress and certificates.
- Learners can view and download a certificate from the list page.
- The course catalog shows real metadata (thumbnail, duration, lesson count, instructor, level).
- The test suite contains real component and route tests, not placeholders.
- File upload, transactional email, manager team view, reporting dashboard, audit coverage, learning paths, and an identity provider are implemented.
- Rate limiting, cookie/CSRF review, env validation, and backup verification are in place.
- `agents/plans/PICKUP.md` has a LOG row for each phase; `AGENTS.md` §8 lists each phase's named output.
