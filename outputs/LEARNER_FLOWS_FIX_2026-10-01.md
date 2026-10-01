# Phase 3 — Learner Flows Fix (2026-10-01)

> **Project**: MagpieBridge-Edu
> **Phase**: 3 of the 6-phase action plan (`outputs/ACTION_PLAN_2026-10-01.md`)
> **Scope**: Fix the broken learner-facing flows — certificate list → detail → download, the course catalog metadata, dead navigation, and the login support contact.
> **Author**: Grok (this session)
> **Status**: Complete and verified

---

## 1. Summary

Phase 3 closed the learner-flow defects that made the UI feel broken even when the data was correct:

- **B21** — the "My Certificates" list rendered cards but the View and Download buttons did nothing.
- **B22** — a dead duplicate `certificate-page.tsx` was still on disk, inviting import drift.
- **B23/B23b/B24** — the course catalog referenced fields (`lessonCount`, `durationMinutes`, `instructorName`, `thumbnailUrl`, `level`) that the `/api/courses` payload never returned, so every card fell back to placeholders; the catalog also did not clear a previous error when a later enroll succeeded.
- **B25** — the nav bar rendered a "Team" link for managers that pointed at a route that does not exist.
- **B26** — the login page's "Contact your administrator" was a dead `href="#"` even when a support email was configured.

All four build gates are green after the changes, and the flows were verified end-to-end against the running dev server with a real learner session.

---

## 2. Changes by Bug

### B21 — Certificate list View/Download wiring
**File**: `app/dashboard/certificates/page.tsx`

The page now wires `CertificateList`'s `onView` and `onDownload` props:

- `onView` → `router.push('/dashboard/certificates/${id}')` (navigates to the detail page).
- `onDownload` → `fetch('/api/certificates/${id}/download')`, converts the response to a `Blob`, creates an object URL, and triggers a programmatic `<a download>` click with a `certificate-${certificateNumber}.pdf` filename. The object URL is revoked after the click.

A page heading "My Certificates" was added so the route has a visible title.

### B22 — Delete dead duplicate component
**File**: `components/certificates/certificate-page.tsx` (deleted)

A grep confirmed `certificate-page.tsx` had zero importers after the 2026-09-30 consolidation; the live component is `components/certificates/certificate-detail.tsx`. The dead file was removed to prevent future import drift.

### B23 — Catalog metadata from `/api/courses`
**File**: `app/api/courses/route.ts`

The GET handler now:

- Includes `author: { select: { id, name, email } }` and each lesson's `estimatedDuration`.
- Shapes each course with derived fields the catalog card reads:
  - `lessonCount` — count of lessons across all modules.
  - `durationMinutes` — `course.estimatedDuration` if set, otherwise the sum of lesson `estimatedDuration`. `null` when neither is set so the badge hides.
  - `instructorName` — `author.name` (falls back to `null`, which the card renders as "MagpieBridge Instructor").

### B23b — Course schema fields for the catalog
**File**: `prisma/schema.prisma` (Course model), migration `20261001033644_course_catalog_fields`

Added two optional fields to `Course`:

```prisma
thumbnailUrl String?
level         String?
```

Both are nullable so existing courses and the seed data keep working without a backfill. Migration applied and DB is in sync.

### B24 — Catalog error clearing
**File**: `components/course-catalog.tsx`

- `handleEnroll` now calls `setError('')` at the start, so a previous failure does not persist when a later enroll succeeds.
- `course.lessonCount` is now rendered as `course.lessonCount ?? 0` so an undefined count shows "0 Lessons" instead of "undefined Lessons".
- Removed the dead "All Categories" / "Newest First" hero buttons and the dead "Browse Categories" button in the empty state — they had no handlers and confused users.

### B25 — Remove dead manager "Team" nav link
**File**: `components/nav-bar.tsx`

The `isManager` variable and the manager "Team" link (`/my-progress` labelled "Team") were removed. The manager team view is not built yet (Phase 5 / BLK-004); managers see the standard learner nav until a `/manager/team` route exists. A comment records the deferral.

### B26 — Login "Contact your administrator" mailto
**Files**: `app/login/page.tsx`, `app/api/settings/public/route.ts`

- `app/login/page.tsx` now fetches `/api/settings/public` on mount and stores `supportEmail` in state. When `supportEmail` is set, "Contact your administrator" becomes a real `mailto:${supportEmail}` link; otherwise it renders as plain gray text with no `href` (no dead `href="#"`).
- `app/api/settings/public/route.ts` was made intentionally public (the login page needs it pre-auth) and now includes `supportEmail` from `getSetting('platform.supportEmail')` in its JSON response. A comment records that the route is intentionally public.

---

## 3. Verification

### Build gate (all green)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | exit 0, 0 errors |
| Tests | `npm run test` (Vitest) | exit 0, 31/31 passing across 8 files |
| Lint | `npm run lint` (`next lint`) | exit 0, 0 errors (warnings only) |
| Build | `npm run build` (`next build`) | exit 0, "✓ Compiled successfully", 43/43 static pages generated |

The build-time `Dynamic server usage` log lines for `/api/validate-certificate`, `/api/video/metadata`, `/api/admin/certificates`, and `/api/admin/audit` are expected: those routes read `request.url`/`headers` and are correctly marked `ƒ (Dynamic)` in the route manifest. They are not errors.

### Browser / runtime verification (dev server, real learner session)

A Node script authenticated as `learner@magpiebridge.edu` (the seeded learner, password `password123`) via the NextAuth credentials callback and exercised the flows. Findings:

1. **Catalog metadata (B23/B23b/B24)** — `GET /api/courses?status=published` returned 7 courses, each shaped with `lessonCount`, `durationMinutes`, `instructorName`, `thumbnailUrl`, `level`, and `author`. First course: `Automate Excel with VBA & Macros`, `lessonCount: 14`, `durationMinutes: null` (no `estimatedDuration` set on its lessons), `instructorName: "Admin User"`. The catalog page (`/catalog`) returned 200 for an authenticated learner and 307 → `/login` for an anonymous visitor (middleware guard confirmed).

2. **Certificate list → detail → download (B21)** — `GET /api/certificates` returned 1 certificate (`CERT-1790750196332-JFLD8MGMY`, course "Microsoft Project 2019: Beginner to Advanced"). The certificates list page (`/dashboard/certificates`) returned 200 and renders the "My Certificates" heading. The detail page (`/dashboard/certificates/{id}`) returned 200. The download endpoint (`GET /api/certificates/{id}/download`) returned 200 with `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="certificate-CERT-1790750196332-JFLD8MGMY.pdf"`, a 2,286-byte body starting with the `%PDF-` magic. An anonymous request to the download endpoint correctly returned 401 (B5 from Phase 2 still holds).

3. **Login support email (B26)** — `GET /api/settings/public` returns `{ completionThresholdPercent, platformName, allowSelfEnrollment, supportEmail }`. With `platform.supportEmail` set in the DB, the response includes the email and the login page renders a `mailto:` link (verified the fetch path and component branch); with it unset, the response returns `supportEmail: ""` and the login page renders plain gray text with no `href`. The test support-email row was inserted and then removed to leave the DB clean.

4. **Manager nav link (B25)** — the dashboard page HTML no longer contains a "Team" nav anchor. The standard learner nav (`Dashboard`, `Catalog`, `My Courses`, `My Progress`, `Certificates`) is unchanged.

### Not verified in a live browser tab

The dev-server script exercised the API routes and the SSR HTML for each page, but I did not open a visual browser tab to click the View/Download buttons with a mouse. The wiring is straightforward `router.push` and a `fetch` + `<a download>` programmatic click, and the API responses were verified, but the click → download UX in a real browser was not visually confirmed. Phase 4 adds a real component test for the certificate list page that will cover the handler wiring at the component level.

---

## 4. Assumptions

- `thumbnailUrl` and `level` are optional on `Course`. Existing courses and the seed data have `null` for both, which the catalog card handles (placeholder thumbnail, "Beginner" fallback). No backfill was needed.
- The catalog page remains behind the middleware auth guard (an anonymous visitor is redirected to `/login`). This matches the Phase 2 middleware extension (B7).
- `durationMinutes` is `null` when neither `course.estimatedDuration` nor any lesson `estimatedDuration` is set; the card hides the duration badge in that case. This is the intended behavior — the seeded video courses do not set per-lesson durations, so most cards currently show no duration badge.

---

## 5. Files Touched

| File | Change |
|---|---|
| `app/dashboard/certificates/page.tsx` | Rewrote: wired `onView`/`onDownload`, added page heading. |
| `components/certificates/certificate-page.tsx` | Deleted (dead duplicate). |
| `prisma/schema.prisma` | Added `thumbnailUrl String?` and `level String?` to `Course`. |
| `prisma/migrations/20261001033644_course_catalog_fields/migration.sql` | New migration, applied. |
| `app/api/courses/route.ts` | GET now returns shaped catalog metadata (author, lessonCount, durationMinutes, instructorName). |
| `components/course-catalog.tsx` | Clear error on enroll; nullsafe `lessonCount`; removed dead hero/empty-state buttons. |
| `components/nav-bar.tsx` | Removed dead manager "Team" nav link. |
| `app/login/page.tsx` | Fetch public settings; render `mailto:` when `supportEmail` is set. |
| `app/api/settings/public/route.ts` | Made intentionally public; added `supportEmail` to response. |

---

## 6. Recommended Next Job

**Phase 4 — Regression protection** (per the action plan): replace the placeholder/example tests with real component and route tests, including:

- `checkCompletionRequirements` coverage for required vs. optional lessons/quizzes (B9/B10 from Phase 2).
- A component test for `app/dashboard/certificates/page.tsx` that asserts `onView` navigates and `onDownload` triggers the fetch + blob download.
- A route test for `GET /api/courses` that asserts the shaped payload fields.
- Tighten the `any` types left in `lib/quiz-utils.ts` and `components/course-catalog.tsx`.

Then Phase 5 (enhancements: file upload/storage BLK-003, transactional email BLK-005, manager team view BLK-004, reporting dashboard, audit coverage, learning paths, identity provider BLK-002) and Phase 6 (production readiness: rate limiting, CSRF/cookie review, env validation, backup verification).
