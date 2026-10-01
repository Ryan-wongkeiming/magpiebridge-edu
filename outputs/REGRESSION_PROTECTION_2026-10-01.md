# Phase 4 — Regression Protection (2026-10-01)

> **Project**: MagpieBridge-Edu
> **Phase**: 4 of the 6-phase action plan (`outputs/ACTION_PLAN_2026-10-01.md`)
> **Scope**: Replace placeholder tests with real component and unit tests, tighten `any` types in `lib/quiz-utils.ts`, and harden the Vitest JSX transform so the test count reflects real coverage.
> **Author**: Grok (this session)
> **Status**: Complete and verified

---

## 1. Summary

Phase 3 left the platform with working learner flows but a test suite that was mostly placeholders — five of the seven test files asserted `expect(true).toBe(true)` or `2 + 2 === 4` and called it a day. A passing suite that does not exercise the code gives no signal when something breaks. Phase 4 fixes that:

- **Real component tests** for `CertificateList`, `CertificateDetails`, and `CourseCatalog` — render with realistic props, assert the text and buttons that should appear, assert callbacks fire with the right certificate/course, and assert the empty/nullsafe states.
- **Real completion-logic tests** for `checkCompletionRequirements` — a Prisma mock drives every branch: all-required satisfied, a required lesson incomplete, an optional lesson skipped, a required quiz failed, an optional quiz skipped, a quiz failed-then-passed on a later attempt, and the not-found throw.
- **Removed the dead `certificate-page.test.ts`** — the component it claimed to test was deleted in Phase 3.
- **Tightened `lib/quiz-utils.ts`** — replaced the `any`-typed `calculateQuizScore`/`validateQuizSubmission`/`canRetakeQuiz` signatures with `Quiz`, `QuizQuestion`, and `SubmittedAnswer` interfaces. `canRetakeQuiz` now takes `Pick<Quiz, 'attemptLimit'>`. The route handler in `app/api/quiz-attempts/route.ts` needed no changes — the new types are compatible with the Prisma query shape.
- **Vitest JSX transform** — added `esbuild.jsx: 'automatic'` to `vitest.config.ts` so components that rely on the Next.js 14 default (JSX without an explicit `import React`) render under Vitest. Without this, every catalog test crashed with `ReferenceError: React is not defined`.

The test count went from 31 (mostly placeholders) to 43 (all real). A deliberate regression in any touched component or in `checkCompletionRequirements` now fails a test.

---

## 2. Changes

### `test/certificate-list.test.tsx` (new; replaces `test/certificate-list.test.ts`)
Renders `CertificateList` with realistic `CertificateLike` props and asserts:
- The empty-state message appears when the list is empty or non-array (the component's `Array.isArray` guard).
- One card per certificate renders the course title and certificate number.
- `onView` and `onDownload` fire with the clicked certificate.
- No buttons render when callbacks are absent.

### `test/certificate-details.test.tsx` (new; replaces `test/certificate-details.test.ts`)
Renders `CertificateDetails` and asserts:
- The certificate number, course title, learner name, and formatted completion date render.
- Missing `certificateData` falls back to the placeholder course title.
- The Download button renders when `onDownload` is provided, fires with the certificate when clicked, and is absent otherwise.

### `test/certificate-page.test.ts` (deleted)
The `certificate-page.tsx` component was deleted in Phase 3 (B22). The placeholder test that claimed to test it had no real assertions and no component to import, so it was removed.

### `test/certificate-utils.test.ts` (rewritten)
Mocks `@/lib/prisma` so `checkCompletionRequirements` runs against an in-memory store. Seven cases cover the completion matrix:
1. All required lessons complete + required quiz passed → `true`.
2. A required lesson incomplete → `false`.
3. An optional lesson skipped → `true` (does not block).
4. A required quiz failed → `false`.
5. An optional quiz skipped → `true` (does not block).
6. A required quiz failed once then passed on a later attempt → `true`.
7. Enrollment not found → throws `Enrollment not found`.

This is the test coverage the action plan called for in item 23: "a course with an optional quiz issues a certificate; a course with an optional lesson issues a certificate."

### `test/course-catalog.test.tsx` (new; replaces `test/course-catalog.test.ts`)
Renders `CourseCatalog` with the post-Phase-3 `/api/courses` shape and asserts:
- The hero banner heading and empty-state message render.
- A course card renders the title, lesson count, level fallback ("Beginner"), and instructor name.
- `lessonCount: undefined` renders as "0 Lessons" (the Phase 3 nullsafe fix).
- `durationMinutes: null` hides the duration badge.
- `level: 'Advanced'` shows the level; `instructorName: null` falls back to "MagpieBridge Instructor".
- The Enroll button is disabled for `status: 'draft'` courses.
- `onEnroll` fires with the course id.
- The "Enrolling..." state renders while the enroll promise is pending.

### `lib/quiz-utils.ts` (rewritten)
Replaced `any`-typed signatures with explicit interfaces:
- `QuestionType` union (`'multiple_choice' | 'single_choice' | 'true_false' | 'short_answer'`).
- `QuizQuestion` (`id`, `questionType: string`, `correctAnswer: unknown`, `points: number`). `questionType` is `string` rather than the union because Prisma stores it as a plain string and the scoring switch handles unknown values by scoring 0 — keeping the union would have required a cast at every call site.
- `Quiz` (`id`, `questions: QuizQuestion[]`, `attemptLimit: number | null`).
- `SubmittedAnswer` (`questionId: string`, `answer: unknown`).
- `calculateQuizScore(quiz: Quiz, submittedAnswers: SubmittedAnswer[]): number`.
- `validateQuizSubmission(quiz: Quiz, submittedAnswers: SubmittedAnswer[]): boolean`.
- `canRetakeQuiz(quiz: Pick<Quiz, 'attemptLimit'>, attemptCount: number): boolean`.
- Helper `asArray`/`normalizeShortAnswer` replace the inline `Array.isArray(...) ? ... : [...]` casts.

The only consumer, `app/api/quiz-attempts/route.ts`, compiled unchanged against the new types — the Prisma query shape is structurally compatible.

### `vitest.config.ts` (updated)
Added `esbuild: { jsx: 'automatic', jsxImportSource: 'react' }`. The Next.js 14 default JSX runtime does not require `import React` in component files, but Vitest's esbuild transform defaults to the classic runtime, so components like `course-catalog.tsx` (which has no `import React`) crashed with `ReferenceError: React is not defined` in tests. The automatic runtime fixes this without changing any source file.

---

## 3. Verification

### Build gate (all green)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | exit 0, 0 errors |
| Tests | `npm run test` (Vitest) | exit 0, **43/43 passing across 7 files** |
| Lint | `npm run lint` (`next lint`) | exit 0, 0 errors (warnings only) |
| Build | `npm run build` (`next build`) | exit 0, "✓ Compiled successfully" |

### Test count breakdown

| File | Tests | What it covers |
|---|---|---|
| `test/certificate-card.test.tsx` | 7 | `CertificateCard` render, buttons, missing data (from Phase 1) |
| `test/certificate-list.test.tsx` | 6 | `CertificateList` empty state, cards, `onView`/`onDownload` firing |
| `test/certificate-details.test.tsx` | 7 | `CertificateDetails` fields, fallbacks, download button |
| `test/certificate-utils.test.ts` | 7 | `checkCompletionRequirements` required/optional matrix + not-found |
| `test/course-catalog.test.tsx` | 10 | `CourseCatalog` hero, empty state, cards, nullsafe fields, enroll |
| `test/utils.test.ts` | 4 | `cn` class merge (from Phase 1) |
| `test/example.test.ts` | 2 | Smoke test |
| **Total** | **43** | |

### Regression signal

Before Phase 4, 5 of the 7 test files were placeholders (`expect(true).toBe(true)`). A deliberate regression — say, removing the `onView` wiring on the certificate list, or breaking the optional-lesson branch in `checkCompletionRequirements` — would have passed the suite. After Phase 4, each of those regressions fails a specific test. This is the acceptance criterion from the action plan: "a deliberate regression in any touched component/route fails a test."

### What was not covered

- **Route-level tests for the API handlers** (action plan item 23's "a suspended user's token is rejected; an instructor outside the course cannot download") were not added. These would require either a test database or a heavier Prisma mock across multiple routes, and the `checkCompletionRequirements` matrix already exercises the completion branch the action plan emphasized. I recommend adding route-level tests in a later pass once a test-DB harness exists.
- **A real browser run-through** of the certificate verification checklist (`outputs/CERTIFICATE_VERIFICATION_CHECKLIST_2026-09-30.md`, action plan item 24) was not repeated in this phase; the flows were browser-verified in Phase 3. The component tests now cover the click wiring at the component level.

---

## 4. Assumptions

- Mocking `@/lib/prisma` at the module level is sufficient for `checkCompletionRequirements` tests because the function only calls `prisma.enrollment.findUnique` and `prisma.quiz.findMany`. The mock returns synthetic data from an in-memory store reset between tests.
- `QuizQuestion.questionType` is typed as `string` (not the `QuestionType` union) because the Prisma model stores it as a plain string and the scoring switch already handles unknown values by scoring 0. Tightening to the union would have required a cast at the route-handler call site for no behavioral gain.
- The `vitest.config.ts` JSX change is global and applies to all `.tsx` tests; it does not affect `.ts` tests.

---

## 5. Files Touched

| File | Change |
|---|---|
| `test/certificate-list.test.ts` | Deleted (replaced by `.tsx`). |
| `test/certificate-list.test.tsx` | New: real `CertificateList` render tests. |
| `test/certificate-details.test.ts` | Deleted (replaced by `.tsx`). |
| `test/certificate-details.test.tsx` | New: real `CertificateDetails` render tests. |
| `test/certificate-page.test.ts` | Deleted (dead component deleted in Phase 3). |
| `test/certificate-utils.test.ts` | Rewritten: Prisma-mocked completion-logic tests. |
| `test/course-catalog.test.ts` | Deleted (replaced by `.tsx`). |
| `test/course-catalog.test.tsx` | New: real `CourseCatalog` render tests. |
| `lib/quiz-utils.ts` | Rewritten: replaced `any` types with `Quiz`/`QuizQuestion`/`SubmittedAnswer` interfaces. |
| `vitest.config.ts` | Added `esbuild.jsx: 'automatic'` for the Next.js 14 JSX runtime. |

---

## 6. Recommended Next Job

**Phase 5 — Enhancements** (per the action plan): the biggest capability gap is **file upload and storage (BLK-003)** — add an S3-compatible presigned-URL upload endpoint, wire `Lesson.contentUrl` for uploaded media, and add an admin upload UI. Then transactional email (BLK-005), the manager team view (BLK-004), a reporting dashboard, audit-log coverage, learning paths, and an identity provider (BLK-002). Sequence within Phase 5 follows BLK priority: 003 → 005 → 004 → reporting → audit → learning paths → identity.
