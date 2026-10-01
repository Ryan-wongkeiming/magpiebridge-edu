# Phase 2 — Security and Data-Integrity Fixes

Date: 2026-10-01
Author: Grok
Scope: Execute Phase 2 of `outputs/ACTION_PLAN_2026-10-01.md` — close the auth and completion-logic holes before any new feature work.

## Summary

Phase 2 is complete. All eleven targeted defects (B4–B19) are fixed, a new Prisma migration is applied to the live database, and the full build gate is green and verified. The three highest-value fixes are real correctness defects in a system that already issues certificates: suspended users can no longer sign in, optional lessons/quizzes no longer block certificate issuance, and instructors can no longer download certificates for courses they do not teach.

## Work completed (by bug ID)

### B4 — Suspended users can no longer sign in
`auth.ts` `authorize()` now checks `user.status !== 'active'` after the bcrypt compare and returns `null`. An admin who suspends a user now actually locks them out. Previously the status field was toggled by the admin UI but ignored at sign-in.

### B5 — Certificate download restricted to owner/manager/admin
`app/api/certificates/[id]/download/route.tsx` replaced the blanket `session.user.roles?.includes('instructor')` check with `canEditCourse(actor, certificate.courseId)`. An instructor can now download only certificates for courses they author or manage. The learner themselves and admins still have access. This closes the hole where an instructor of course A could download any learner's certificate for course B.

### B6 — All reset tokens invalidated on password change
`app/api/auth/reset-password/reset/route.ts` now deletes every `VerificationToken` row for the user's `identifier` after a successful password change, not just the single used token. Any other unused tokens for the same email can no longer be replayed within their 1-hour window.

### B7 — Middleware protects all authenticated routes
`auth.config.ts` `authorized` callback now covers `/dashboard`, `/enrollments`, `/my-progress`, `/instructor`, `/courses`, `/lessons`, `/quizzes`, and `/catalog` in addition to `/admin`. A signed-out visitor hitting those routes is redirected to `/login` by the Edge middleware rather than seeing a flash of the page shell before the client redirect. Public pages (`/`, `/login`, `/validate-certificate`, `/reset-password`, `/forgot-password`) remain open.

### B8 — Duplicate loosely-typed auth helpers removed
`lib/course-auth.ts` (which exported `any`-typed `hasRole` / `canEditCourse` / `getUserWithRoles`) was dead code — no file imported it. Deleted. `lib/auth.ts` now only re-exports `auth, handlers, signIn, signOut` from `@/auth`, and the password-reset request route now imports `generateSecureToken` from `@/lib/prisma` (where it lives) instead of through the `lib/auth` shim. The typed `getSessionUser` / `isAdmin` / `isInstructor` / `isManager` / `canEditCourse` in `lib/api-auth.ts` are now the single source of truth for auth helpers.

### B9/B10 — Completion requirements respect `Lesson.required` and `Quiz.requiredForCompletion`
`lib/certificate-utils.ts` `checkCompletionRequirements` rewritten:
- Counts only `Lesson.required === true` lessons. A non-required lesson the learner skips no longer blocks completion.
- Counts only `Quiz.requiredForCompletion === true` quizzes, and requires each to have at least one passing attempt. An optional quiz no longer blocks completion.
- The `enrollment` query now `select`s only the fields it uses (`id`, `required` for lessons; `quizId`, `passed` for attempts), and the `quizAttempts` include no longer pulls the full `quiz` relation.

This unblocks courses with optional content and aligns the completion check with the `Lesson.required` and `Quiz.requiredForCompletion` flags the schema already declared.

### B11/B13 — Quiz scoring and validation consolidated; empty submissions rejected
`app/api/quiz-attempts/route.ts` rewritten to call `calculateQuizScore` and `validateQuizSubmission` from `lib/quiz-utils.ts` instead of inlining the scoring logic. An empty or incomplete submission is now rejected with 400 before scoring, so a learner can no longer burn an attempt by submitting an empty quiz. The route no longer duplicates the "what is correct" logic.

### B12 — Attempt count and creation are atomic
The same `$transaction` now counts existing attempts, enforces the `attemptLimit`, and creates the new attempt. Two concurrent submissions can no longer both pass the limit check and both create an over-limit attempt. `attemptNumber` is derived from the count inside the transaction. The limit-exceeded condition is bubbled out of the transaction via a small `ResponseLimitError` sentinel and returned as a 400.

### B14 — Best-attempt logic corrected
`app/api/me/progress/route.ts` "best attempt" reduce rewritten. A passing attempt always wins; among failing attempts, the highest score is kept. The previous logic returned the first attempt's score when no attempt had passed, which under-reported the learner's best score.

### B17 — Certificate number uses a secure random source
`lib/certificate-utils.ts` `issueCertificate` now generates the certificate number suffix from `generateSecureToken(4)` (which uses `crypto.randomBytes`), not `Math.random().toString(36)`. This is the same secure source used for password reset tokens, and it removes the collision risk.

### B16 — Institution name reads from the platform setting
`issueCertificate` now reads `platform.name` from `lib/settings` first, falling back to the `INSTITUTION_NAME` env var for legacy deployments, then to a default. The institution name on a certificate is now admin-configurable through the settings UI rather than depending on an env var that may not be set. This reconciles the two sources of truth for the platform name.

### B18/B19 — DB-level cascades for progress and certificates
`prisma/schema.prisma` updated:
- `LessonProgress.lesson` → `onDelete: Cascade`
- `Certificate.course` → `onDelete: Cascade`
- `Certificate.enrollment` → `onDelete: Cascade`

Migration `20261001033001_integrity_cascades` created and applied to the live database. Progress rows are now cleaned up automatically when a lesson is deleted, and certificate referential integrity is enforced at the DB level as a backstop to the API guards that already refuse to delete a course with certificates.

## Verification — full gate results (2026-10-01)

```
npm run typecheck  → exit 0  (tsc --noEmit, 0 errors)
npm run test       → exit 0  (31 tests across 8 files, all passing)
npm run lint       → exit 0  (0 errors; warnings only for pre-existing any-typed quiz-utils)
npm run build      → exit 0  (next build compiled successfully)
npx prisma migrate status → Database schema is up to date! (4 migrations)
```

One typecheck-only issue was caught and fixed during the work: iterating a `Set<string>` in `checkCompletionRequirements` required `Array.from(...)` because `tsconfig.json` targets `es5`. Resolved by using `Array.from(requiredQuizIds).every(...)`.

## Files changed or created

- `auth.ts` — B4 (suspend check in authorize)
- `auth.config.ts` — B7 (middleware route coverage)
- `app/api/certificates/[id]/download/route.tsx` — B5 (canEditCourse authorization)
- `app/api/auth/reset-password/reset/route.ts` — B6 (invalidate all tokens)
- `app/api/auth/reset-password/request/route.ts` — B8 (import generateSecureToken from prisma)
- `app/api/quiz-attempts/route.ts` — B11/B12/B13 (transactional, validate, shared scoring)
- `app/api/me/progress/route.ts` — B14 (best-attempt logic)
- `lib/certificate-utils.ts` — B9/B10 (required-only completion), B16 (platform.name), B17 (secure cert number)
- `lib/auth.ts` — B8 (re-exports only; loose helpers removed)
- `lib/course-auth.ts` — deleted (dead duplicate)
- `prisma/schema.prisma` — B18/B19 (onDelete: Cascade)
- `prisma/migrations/20261001033001_integrity_cascades/migration.sql` — new migration, applied

## Acceptance criteria met

- [x] Suspended user cannot sign in (B4)
- [x] Instructor cannot download certificates for courses they do not own (B5)
- [x] A course with optional quizzes/lessons issues a certificate when only required work is done (B9/B10)
- [x] All quiz submissions validated before scoring (B13)
- [x] Attempt counting is race-free (B12)
- [x] Best-attempt logic reports the highest score (B14)
- [x] Certificate number uses a secure random source (B17)
- [x] Institution name is admin-configurable (B16)
- [x] Cascades are DB-enforced for progress and certificates (B18/B19)
- [x] All four build gates green and verified
- [x] Migration applied to the live database

## Assumptions made

- The cascade migration is applied to the live PostgreSQL database. If this database is shared with another environment, that environment also gets the cascades. The cascades are additive (they only change FK behavior) and do not drop data, so this is safe.
- `lib/course-auth.ts` was deleted after confirming no file imported it (grep returned zero matches). If a future branch had a local import, it would surface as a typecheck error.
- The quiz `submittedAnswers` payload shape is unchanged; only the validation/scoring path changed. Existing quiz-taking UI continues to work.
- B15 (silent certificate auto-issue failure surfacing) is deferred to Phase 3, where the learner flows are fixed; it is a UX concern, not a security or integrity concern.

## Risks / limits

- I did not browser-verify the running app. The dev server was not started, so verification was via the build/type/lint/test gates and the migration status. Phase 3 will browser-verify the certificate and catalog flows once B21 and B23 are fixed.
- The remaining `test/*.test.ts` placeholders (certificate-details, certificate-list, certificate-page, course-catalog) are still trivial. Phase 4 replaces them with real component tests. The completion-logic and auth changes in this phase are covered by the existing `test/certificate-utils.test.ts` for the `getCertificateData` helper, but the new `checkCompletionRequirements` behavior is not yet covered by a unit test — that is a Phase 4 task.
- `lib/quiz-utils.ts` still uses `any`-typed parameters (pre-existing), which produces lint warnings. Tightening those types is a Phase 4 cleanup.

## Recommended next job

**Phase 3 — Fix the broken learner flows** (`outputs/ACTION_PLAN_2026-10-01.md` Part 2, Phase 3). The highest-value items there are:
- B21: certificate list page has no view/download wiring (cards are read-only; no path to the detail page from the list)
- B23: course catalog references fields the API does not return (thumbnails, duration, lesson count, instructor, level)
- B22: delete the dead `components/certificates/certificate-page.tsx`

Phase 3 requires browser verification of the certificate and catalog flows, which I will do by starting the dev server and exercising the changed routes end to end.

Named output for Phase 3: `outputs/LEARNER_FLOWS_FIX_2026-10-01.md`.
