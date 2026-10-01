# MagpieBridge-Edu — Certificate Generation Report

Date: 2026-09-22
Author: Grok
Job: NEXT-013 (close-out) + build repair
Output path: `outputs/CERTIFICATE_GENERATION_REPORT_2026-09-22.md`

---

## 1. Summary

NEXT-013 certificate generation is complete and verified end to end. The job could not be
closed earlier because the application did not compile: `npx tsc --noEmit` reported 159
errors and `next build` failed. Both are now resolved.

- `npx tsc --noEmit` → 0 errors
- `npx next build` → exit code 0, 25 pages generated
- Full learning loop verified against a live server and a live PostgreSQL 18 database

## 2. Certificate features implemented

### API routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/certificates` | GET | Paginated list of the signed-in user's certificates |
| `/api/certificates/[id]` | GET | Single certificate, ownership/admin checked |
| `/api/certificates/[id]/pdf` | GET | Renders the certificate to PDF via `@react-pdf/renderer` |
| `/api/certificates/[id]/download` | GET | Same PDF served as a download attachment |
| `/api/validate-certificate` | GET | Public verification by certificate number |
| `/api/admin/certificates` | GET | Admin list with search, status, and date filters |
| `/api/admin/certificates/[id]` | PATCH | Admin revoke |

### Pages and components

- `app/dashboard/certificates/page.tsx` and `app/dashboard/certificates/[id]/page.tsx`
- `app/admin/certificates/page.tsx` with `components/certificates/admin-certificate-management.tsx`
- `app/validate-certificate/page.tsx` — public verification form
- `components/certificate-card.tsx`, `certificate-detail.tsx`, `certificate-list.tsx`, `certificate-page.tsx`
- `lib/certificate-utils.ts` — completion checks, issuance, auto-issue, lookup
- `lib/pdf-generator.tsx` — A4 certificate document
- `lib/certificate-data.ts` — typed accessor for the `certificateData` JSON column

### Issuance rules

`autoIssueCertificate` is called from `app/api/quiz-attempts/route.ts` after a passing
attempt. A certificate is issued when every lesson in the course is marked `completed` and
all required quizzes are passed. Certificate numbers use the form
`CERT-<timestamp>-<random>`, and `(userId, courseId)` is unique, so re-completion returns
the existing record.

## 3. Defects found and fixed during verification

These were found by exercising the running application, not by reading code.

1. **Revoked certificates still validated as valid.** `GET /api/validate-certificate`
   returned `valid: true` for a certificate whose status was `revoked`. It now returns
   `valid: false` with `error: "Certificate has been revoked"` and the revocation date.
2. **`/enrollments/[id]` did not exist.** The catalog, the lesson viewer, and the quiz taker
   all navigate there; every one produced a 404. The page now exists and is backed by
   `CourseProgress`, whose "Mark Complete" handler was a stub and is now wired to
   `/api/lesson-progress`.
3. **Quiz scoring always returned 0.** `prisma/seed.ts` stored `answerOptions` and
   `correctAnswer` through `JSON.stringify`, so the column held a JSON *string* rather than
   a JSON array. The scorer's `Array.isArray` check failed and every answer was marked
   wrong. The seed now writes real arrays.
4. **`GET /api/courses` and `GET /api/enrollments` were missing.** Both routes exported only
   `POST`, so the courses, catalog, and enrollments pages received 405.
5. **Admin revoke returned 404.** The client PATCHes `/api/admin/certificates/<id>`, which
   did not exist; the handler was attached to the collection route.
6. **The login form did not authenticate.** It called `router.push('/dashboard')` after a
   `console.log`, with no call to `signIn`. It now performs a real credentials sign-in.
7. **Middleware crashed at runtime.** `middleware.ts` re-exported `auth` from `auth.ts`,
   which loads Prisma; Prisma cannot run in the Edge runtime, so every request 500'd with
   "Cannot find the middleware module". The Edge-safe configuration now lives in
   `auth.config.ts` (no Prisma), and `middleware.ts` builds its own instance from it.
8. **No `SessionProvider`.** `useSession()` returned undefined everywhere, which also broke
   static generation of five pages. Added `app/providers.tsx` and wrapped the root layout.
9. **`/reset-password` needed a Suspense boundary** around its `useSearchParams` usage.
10. **JSX inside `.ts` route files.** `app/api/certificates/[id]/download/route.ts` and
    `.../pdf/route.ts` contained JSX, which TypeScript cannot parse in a `.ts` file. Renamed
    to `.tsx`. The download route also called `pdf([])` then `updateContainer`, which is not
    a valid `@react-pdf/renderer` API; it now calls `pdf(<Document/>)`.
11. **Seeded users had no password**, so credentials login could never succeed. The seed now
    hashes a shared development password.

## 4. Verification evidence

Verified against `http://localhost:3002` with a live PostgreSQL 18 instance
(`magpiebridge_edu`, migrated and seeded).

### Authentication

- Credentials sign-in returns a session with `id` and `roles`
  (`["instructor","admin"]` for the admin account)
- Wrong password → no session issued
- Unauthenticated `/api/courses` → 401
- Unauthenticated `/dashboard` → 307 redirect to `/login`
- Password reset: token issued, password changed, login with the new password succeeds

### Learning loop (learner account)

1. Enrolled in the published course → 200
2. Completed all 3 lessons → enrollment became `completed`, `progressPercent` 100
3. Submitted the quiz with correct answers → `score: 100`, `passed: true`
4. Certificate auto-issued with `certificateData` populated (learner name, email, course
   title, instructor, institution)
5. `GET /api/certificates/<id>/pdf` → 200, `application/pdf`, 2274 bytes
6. `GET /api/certificates/<id>/download` → 200, `application/pdf`, 2274 bytes
7. Public validation → `valid: true`

### Admin

- `GET /api/admin/certificates` → 200
- `PATCH /api/admin/certificates/<id>` with `{"action":"revoke"}` → 200, status `revoked`
- Re-validation → `valid: false`, "Certificate has been revoked"

### Authorization boundaries

- Learner creating a quiz → 403
- Learner reading an instructor's quiz → 403 (correct answers withheld)

### Authoring (instructor account)

Course → module → lesson → quiz → question created; course published; lesson fetched with
nested module and course titles intact.

### Routes

All 11 pages and 6 API endpoints returned their expected status.

## 5. Build repair summary

| Area | Fix |
|---|---|
| Prisma schema | Added missing opposite relation fields (`User.certificates`, `User.revokedCertificates`, `User.reports`), plus `User.password` |
| Prisma migrations | The two existing migrations were Prisma 8 contract-format files that cannot run on the pinned Prisma 5.19.1. Moved to `prisma/legacy_migrations_prisma8/` (excluded from tsconfig) and regenerated `prisma/migrations/20260922083130_init` |
| Prisma client | The generated client was a stub (`PrismaClient: any`); regenerated |
| Auth.js | Migrated 10 files from the next-auth v4 `getServerSession(authConfig)` call to the v5 `auth()` helper; added `types/next-auth.d.ts` for `session.user.id` and `roles` |
| Missing UI | Created `card`, `input`, `label`, `skeleton`, `table`, `select`, `alert-dialog`, `toast`, `toaster`, `use-toast` |
| Missing deps | Added `date-fns`, `lucide-react`, `@radix-ui/react-{label,select,alert-dialog,toast}`, `ts-node` |
| Seed | Fixed `managedUsers` → `managerId`; added password hashing; corrected JSON column types |
| Config | `package.json` seed script now runs `prisma db seed` via ts-node |

## 6. Local environment notes

- PostgreSQL 18 is installed and running; database `magpiebridge_edu` was created and migrated
- `.env` now points at `postgresql://postgres:postgres@localhost:5432/magpiebridge_edu`
- Seeded development password for all accounts: `password123`
- Start the app from cmd.exe: `cd /d D:\OneDrive\MagpieBridge-Edu && npm run dev`
- Dev server was verified on port 3002 because stale processes held 3000 and 3001

## 7. Remaining open items

| Item | Notes |
|---|---|
| BLK-002 identity provider | Auth.js is wired with a credentials provider plus a Prisma adapter; Entra/Google/email-first is still undecided |
| OAuth providers | The login page no longer shows the Google/Microsoft buttons; they logged to console and had no backing provider |
| Password reset email | `lib/email.ts` does not send real mail; the token is written to the database only |
| Tenancy | Single-organization assumption still in place |
| Reporting | Admin certificate filtering exists; broader management reporting is not built |

## 8. Assumptions recorded

- Prisma 5.19.1 (as pinned in `package.json`) is the intended version. The Prisma 8 migrations
  were treated as unusable artifacts rather than a signal to upgrade.
- A shared development password in the seed is acceptable for local work.
- The two duplicate certificate component sets (`components/certificate-*.tsx` and
  `components/certificates/*.tsx`) were both kept and both compile; consolidating them is a
  separate cleanup job.
