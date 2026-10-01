# MagpieBridge-Edu — Phase 1 Completion Report

Date: 2026-09-23
Author: Grok
Job: Phase 1 — finish the MVP the requirements document already promises
Output path: `outputs/PHASE1_REPORT_2026-09-23.md`

---

## 1. Summary

Phase 1 is complete. Seven work items covering 15 functional requirements were
implemented and verified end to end against a live PostgreSQL database.

- `npx tsc --noEmit` → 0 errors
- `npx next build` → exit code 0, 33 routes
- Every Phase 1 feature exercised through the running application

The MVP learning loop (enroll → learn → quiz → certificate) still works and was
re-verified after these changes.

## 2. What was built

### 1.1 Course archiving — FR-025, FR-061

`PATCH /api/courses/[id]` with `{"action":"archive"}` or `{"action":"restore"}`.

Archiving sets status to `archived` and records `archivedAt`. It never deletes
anything: enrollments, lesson progress, quiz attempts, and certificates all
survive, which is what FR-061 requires. Archived courses drop out of the
published list.

Restoring returns the course to the status it held before: a course that was
published goes back to published, an untouched draft goes back to draft.

Only admins may archive a course that already has enrollments or certificates.
Instructors can archive their own unused drafts. Verified: an instructor
attempting to archive an enrolled course receives 403.

### 1.2 Reordering — FR-018, FR-020

- `PATCH /api/courses/[id]/reorder` with `{"orderedIds":[...]}`
- `PATCH /api/modules/[id]/reorder` with `{"orderedIds":[...]}`

Both validate that the supplied IDs are exactly the children of that parent, and
reject anything else with 400. Sort order is rewritten in a transaction. The
course editor exposes up/down buttons for each module and lesson.

### 1.3 Course assignment — FR-033

`POST /api/admin/enrollments` with `{"courseId":"...","userIds":[...]}`.

Creates enrollment records with `enrollmentSource: "assigned"`, which is the
value the schema already reserved for this. Users already enrolled are skipped
rather than duplicated. The page at `/admin/assign` lets an admin pick a course
and tick learners.

### 1.4 User management — FR-005, FR-006

- `GET /api/admin/users` — list users with roles, manager, enrollment and
  certificate counts; supports search and role filtering
- `PUT /api/admin/users/[id]/roles` — replace a user's roles

The page at `/admin/users` renders role names as toggle buttons. A guard refuses
to remove the last admin, returning `{"error":"Cannot remove the last admin"}`,
so the platform cannot be locked out of administration.

### 1.5 Instructor progress — FR-040, FR-068

`GET /api/instructor/progress` returns every course the instructor authors or
manages (all courses for an admin), with per-learner status, progress
percentage, lesson counts, latest quiz score and pass state, and certificate
status. Page at `/instructor/progress`.

### 1.6 Learner progress — FR-066

`GET /api/me/progress` returns a personal summary (courses, completed, in
progress, lessons done, certificates, average progress) plus a per-course
breakdown. Page at `/my-progress`.

### 1.7 Course preview — FR-023

`/courses/[id]/preview` renders the course as a learner would see it, with a
banner marking it as preview mode and links back to the editor.

### Supporting work

- `components/nav-bar.tsx` — role-aware navigation in the root layout. Before
  this, no page was reachable except by typing its URL.
- `lib/api-auth.ts` — shared session/role helpers (`getSessionUser`, `isAdmin`,
  `isInstructor`, `canEditCourse`).
- `/courses` list gained status filters and now links to the editor rather than
  a route that did not exist.
- Dead controls in the course editor (Edit, Delete, Add Lesson) were either
  wired up or removed.

## 3. Defects found and fixed during verification

1. **`/courses/[id]` did not exist.** The course list linked to it, producing a
   404. The list now links to `/courses/[id]/edit`.
2. **`PUT /api/courses/[id]` never set `publishedAt`.** Publishing a course left
   the timestamp null, which the archive/restore logic depends on. Now set on
   first publish.
3. **`/api/admin/certificates` returned 401 where 403 was correct.** An
   authenticated non-admin was reported as unauthenticated. Both admin
   certificate routes now use the shared helpers and return 403.
4. **Archiving silently unpublished a course.** Restore originally always
   returned the course to `draft`. It now restores the prior status.

## 4. Verification evidence

Run against `http://localhost:3000` with PostgreSQL 18.

### Archiving

```
before  learners/completed => 3/1
archive status => 200 -> archived
archive message => Course archived. Enrollment and completion records were preserved.
after   learners/completed => 3/1        <-- history preserved
visible in published list => 0
restore => published (message: Course restored to published.)
instructor archive of enrolled course => 403 (expected 403)
```

### Reordering

```
modules => 1:Getting Started | 2:Core Features
after reorder => 1:Core Features | 2:Getting Started
restored order => 1:Getting Started | 2:Core Features
invalid reorder rejected => 400 (expected 400)
lesson reorder: 1:Platform Overview | 2:Navigation Basics
           ->  1:Navigation Basics | 2:Platform Overview
```

### Assignment

```
manager enrollments before: 0
ASSIGN FRESH => Assigned to 1 learner(s) (assigned=1)
manager enrollments after: 1
ASSIGN AGAIN => assigned=0 skipped=1        <-- no duplicates
manager sees: courses=1 first=Introduction to MagpieBridge-Edu status=not_started
```

### User management

```
users => 4
   admin@magpiebridge.edu [instructor,admin]
   instructor@magpiebridge.edu [instructor]
   learner@magpiebridge.edu [learner]
   manager@magpiebridge.edu [manager]
add learner role => learner,manager
revert => manager
last-admin guard => 400 {"error":"Cannot remove the last admin"}
```

### Progress views

```
instructor: Introduction to MagpieBridge-Edu learners=3 completed=1 inprog=0 notstarted=2 rate=33%
learner:    courses=1 completed=1 avg=100%
            Introduction to MagpieBridge-Edu: completed 100% lessons=3/3
```

### Access control

```
learner -> /api/admin/users           => 403
learner -> /api/admin/certificates    => 403
learner -> /api/instructor/progress   => 403
```

### Routes

All 13 pages returned 200. All 7 core API endpoints returned 200.

## 5. Environment issue encountered

The dev server crashed with `EINVAL: readlink` on a path inside `.next`. Cause:
the project lives in a OneDrive-synced folder, and OneDrive had turned parts of
the build cache into cloud placeholder files (reparse points). `Remove-Item
-Recurse -Force` silently skipped them because of `-ErrorAction SilentlyContinue`,
leaving a corrupt cache.

Resolution: delete `.next` with `cmd /c rmdir /s /q .next`, which removes
junctions properly. Recorded in the project notes because it will recur.

**Recommendation:** move the project outside OneDrive, or exclude `.next` from
sync. A build directory under a file-sync service will keep causing this.

## 6. Requirement coverage after Phase 1

Implemented and verified: FR-001 to FR-006, FR-008 to FR-013, FR-015 to FR-023,
FR-025 to FR-033, FR-035 to FR-037, FR-040, FR-043 to FR-057, FR-060, FR-061,
FR-066, FR-068, FR-075.

Still outstanding, deferred to later phases by design:

| Area | Requirements | Phase |
|---|---|---|
| Manager scope and team views | FR-007, FR-041, FR-058, FR-067 | 3 |
| Group assignment | FR-034 | 3 |
| Admin platform-wide progress | FR-042, FR-069 | 3 |
| Instructor completion records view | FR-059 | 3 |
| Learning paths | FR-062 to FR-065 | 6 |
| Reporting, filtering, export | FR-070, FR-071 | 4 |
| Audit logging and review | FR-072, FR-073, FR-074 | 4 |
| Media upload and playback | FR-031 (partial) | 2 |

FR-031 is partly met: text, links, and external media references work, but
uploading a file and playing video inline do not.

## 7. Assumptions recorded

- Restore returns a course to its pre-archive status, inferred from
  `publishedAt`. The requirements document does not specify this behaviour.
- Only admins may archive a course with enrollment or certificate history.
- Role changes replace the full role set rather than adding or removing
  individually. The UI presents it as toggles.
- The last-admin guard is a safety measure, not a stated requirement.
- The navigation bar is a new addition; the requirements document specifies an
  information architecture but no specific navigation design.
