# AGENTS.md — MagpieBridge-Edu Project Constitution

> **Project**: MagpieBridge-Edu  
> **Purpose**: In-house learning platform inspired by Coursera-style course delivery, adapted for organizational training, certification, and skills development.  
> **Status**: Initial project foundation created 2026-09-22  
> **Canonical tracker**: `agents/plans/PICKUP.md`

---

## 1. Project Mission

MagpieBridge-Edu is an internal learning and certification platform for creating, delivering, tracking, and improving employee learning.

The platform should eventually support learners, instructors/content creators, managers, and administrators through structured courses, lessons, assessments, learning paths, progress reporting, and certificates.

---

## 2. Five Universal Agent Rules

1. **Read before acting**: At the start of each session or job, read `AGENTS.md`, `agents/plans/PICKUP.md`, `README.md`, and `context/foundation.md`.
2. **One job at a time**: Work on one named unit of work unless the user explicitly authorizes a broader batch.
3. **Produce a named output**: Every completed job must create or update a physical file, usually under `outputs/` unless the deliverable is an application/source file.
4. **Protect source-of-truth files**: Do not overwrite foundational, raw, or canonical project files without clear reason and traceability.
5. **Update the tracker**: After every job, update `agents/plans/PICKUP.md` with NOW/DONE/NEXT/BLOCKED changes and a LOG row.

---

## 3. Source-of-Truth Map

| Area | Canonical File/Folder | Notes |
|---|---|---|
| Agent constitution | `AGENTS.md` | Rules, conventions, deliverable registry |
| Human entry point | `README.md` | Short overview and bootstrap instructions |
| Product/project context | `context/foundation.md` | Strategy, decisions, assumptions, open questions |
| Living work tracker | `agents/plans/PICKUP.md` | Must be updated after every agent job |
| Job outputs | `outputs/` | Named deliverables and audit trail |
| Future application code | `apps/`, `packages/`, or equivalent | To be created after stack decision |
| Documentation | `docs/` | Architecture, product specs, operating docs |

---

## 4. Five-Step Protocol + Working Conventions

### Required protocol

1. Read `AGENTS.md` → `agents/plans/PICKUP.md` → `README.md` → `context/foundation.md`.
2. Confirm the current one-job objective.
3. Name the output path before or during work.
4. Make the smallest coherent change that completes the job.
5. Update `agents/plans/PICKUP.md`; update §8 here if a durable deliverable was created.

### Working conventions

- Prefer clear, boring, maintainable structure over cleverness.
- Avoid root litter; create purpose-specific folders.
- Use dated filenames for major outputs: `outputs/TOPIC_YYYY-MM-DD.md`.
- Preserve historical context; append logs rather than erasing useful history.
- If requirements are unclear, make a reasonable assumption and record it, unless the ambiguity would cause wasted implementation work.
- Use exact dates in project logs.

---

## 5. Verification Protocol + Output Format

Before declaring work complete, verify:

- The named deliverable exists.
- The deliverable content matches the requested job.
- `agents/plans/PICKUP.md` has a LOG entry for the job.
- `AGENTS.md` §8 includes any durable deliverable that should be discoverable later.

When summarizing completion to the user, include:

1. What was created or changed.
2. Where the main files are located.
3. Any assumptions made.
4. Recommended next job.

---

## 6. Product Baseline

### Initial MVP direction

The first practical MVP should prove the learning loop:

1. Admin/instructor creates a course.
2. Course contains modules and lessons.
3. Learner enrolls in the course.
4. Learner completes lessons.
5. Learner takes a quiz or final assessment.
6. System records progress and completion.
7. Certificate or completion record is generated.

### Candidate user roles

- Learner
- Instructor / content creator
- Manager
- Admin

### Candidate major modules

- Authentication and role-based access
- Course catalog
- Course authoring
- Lesson player/content viewer
- Enrollment and progress tracking
- Quiz/assessment engine
- Certificates
- Reporting/dashboard

---

## 7. Protected Files and Folders

Treat these as source-of-truth assets:

- `AGENTS.md`
- `README.md`
- `context/foundation.md`
- `agents/plans/PICKUP.md`
- `HANDOFF_AI_AGENT_HARNESS_2026-09-04.md`

Do not delete or rewrite these wholesale unless the job specifically requires it.

---

## 8. Durable Deliverable Registry

| Date | Deliverable | Path | Notes |
|---|---|---|---|
| 2026-09-22 | Initial project foundation | `outputs/INITIAL_PROJECT_SETUP_2026-09-22.md` | Created four-file harness and initial project operating baseline. |
| 2026-09-22 | Checkpoint close audit | `outputs/CHECKPOINT_CLOSE_2026-09-22.md` | Confirmed files on disk, pickup state, and next job before session close. |
| 2026-09-22 | MVP product requirements | `outputs/MVP_REQUIREMENTS_2026-09-22.md` | Authored by Poe Squad Assistant (`poe-assistant` subagent `01a0c6ea-3624-78f2-adb1-95ab37f8f832`, 0 tool calls). Saved to disk by parent session. |
| 2026-09-22 | Tech stack decision (draft) | `outputs/TECH_STACK_DECISION_2026-09-22.md` | File landed from a new chat that 400'd after write. Tracker recovered here. Awaiting human accept. |
| 2026-09-22 | Tech stack human accept | `outputs/STACK_ACCEPT_2026-09-22.md` | User accepted Next.js / Auth.js / PostgreSQL / Prisma / S3 / Vercel. |
| 2026-09-22 | Database schema design | `docs/DATABASE_SCHEMA.md` | Designed comprehensive schema for PostgreSQL + Prisma supporting all MVP workflows. |
| 2026-09-22 | Application scaffold | `outputs/SCAFFOLD_REPORT_2026-09-22.md` | Implemented Next.js application foundation with Auth.js, Prisma, Tailwind CSS, and shadcn/ui. |
| 2026-09-22 | Database setup and migrations | `outputs/DATABASE_SETUP_REPORT_2026-09-22.md` | Documented PostgreSQL database setup with Prisma migrations for all core entities. |
| 2026-09-22 | Seed initial data | `outputs/SEED_DATA_REPORT_2026-09-22.md` | Implemented seed data with default roles, sample users, and sample course structure for development/testing. |
| 2026-09-22 | Configure authentication providers | `outputs/AUTH_CONFIG_REPORT_2026-09-22.md` | Implemented Auth.js/NextAuth.js with credentials provider, OAuth placeholders, and role-based access control. |
| 2026-09-22 | Implement password reset functionality | `outputs/PASSWORD_RESET_REPORT_2026-09-22.md` | Implemented secure password reset with token-based email verification and API routes. |
| 2026-09-22 | Implement course management features | `outputs/COURSE_MANAGEMENT_REPORT_2026-09-22.md` | Implemented course creation, editing, and publishing with modules and lessons. |
| 2026-09-22 | Implement lesson content editing | `outputs/LESSON_CONTENT_REPORT_2026-09-22.md` | Implemented rich text editing and multimedia content support for lessons. |
| 2026-09-22 | Implement user enrollment and progress tracking | `outputs/ENROLLMENT_PROGRESS_REPORT_2026-09-22.md` | Implemented course enrollment and lesson progress tracking for learners. |
| 2026-09-22 | Implement quiz and assessment features | `outputs/QUIZ_ASSESSMENT_REPORT_2026-09-22.md` | Implemented quiz creation, taking, and results functionality for assessments. |
| 2026-09-22 | Implement certificate generation features | `outputs/CERTIFICATE_GENERATION_REPORT_2026-09-22.md` | Certificate issuance, PDF rendering, public validation, and admin revocation. Closed out together with a full build repair; see §3 and §5 of the report. |
| 2026-09-23 | Phase 1 — MVP completion | `outputs/PHASE1_REPORT_2026-09-23.md` | Course archiving, module/lesson reordering, course assignment, user and role management, instructor and learner progress views, course preview, role-aware navigation. 15 requirements closed. |
| 2026-09-23 | External video embedding | `outputs/VIDEO_EMBED_REPORT_2026-09-23.md` | YouTube and Vimeo links play inline. Fixed the defect where pasted watch URLs were placed in an iframe and could never load. Playlists and timestamps supported; metadata via oEmbed with no API key. |
| 2026-09-30 | Automated testing infrastructure | `vitest.config.ts`, `test/setup.ts`, `package.json`, `example.test.ts`, `lib/utils.test.ts`utils.test.ts` | Established foundation for automated testing to reduce risk before real users. Includes test configuration, setup file, dependencies, and sample tests. |
| 2026-09-30 | Course catalog enhancement | `components/course-catalog.tsx` | Enhanced course catalog with hero banner and rich course cards. Added thumbnail support, duration badges, metadata display, improved hover states, and responsive grid layout. Finished the design pass started on 2026-09-23. |
| 2026-09-30 | Certificate component consolidation | `components/certificate-card.tsx`, `components/certificate-detail.tsx`, `components/certificate-list.tsx`, `components/certificate-page.tsx`, `components/certificates/certificate-card.tsx`, `components/certificates/certificate-details.tsx`, `components/certificates/certificate-list.tsx`, `components/certificates/certificate-page.tsx` | Consolidated duplicate certificate components, removing redundant versions and keeping only the ones in `components/certificates/`. Updated all imports to use the consolidated components. |
| 2026-09-30 | Systematic build plan | `outputs/BUILD_PLAN_2026-09-30.md` | Documented diagnosis-driven, phased build plan covering stabilization, regression protection, and enhancement sequencing with clear acceptance criteria. |
