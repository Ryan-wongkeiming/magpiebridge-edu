# MagpieBridge-Edu — Foundation Context

> **Last updated**: 2026-09-23
> **Status**: Phase 1 complete — MVP learning loop plus course management, progress views, and user administration

---

## 1. Project Intent

Build **MagpieBridge-Edu**, an in-house learning platform similar in spirit to Coursera, but focused on internal organizational learning.

The system should help the organization create, distribute, track, and measure learning through structured courses, assessments, learning paths, and completion records/certificates.

---

## 2. Product Vision

MagpieBridge-Edu should become the central internal education bridge between organizational knowledge, employee skills, and measurable training outcomes.

A concise positioning statement:

> MagpieBridge-Edu is an internal learning and certification platform that helps organizations create, deliver, track, and measure employee learning through structured courses, assessments, and role-based learning paths.

---

## 3. Initial Assumptions

- The platform is for internal/in-house use, not a public Coursera competitor at launch.
- The first version should be a web application.
- The first MVP should prioritize the core learning loop over advanced marketplace/social features.
- Learners, instructors/content creators, managers, and admins are all likely roles.
- Existing company identity/SSO integration may be needed later, but is not yet specified.
- Video/file storage, certificates, and reporting will be important but can be staged.

---

## 4. Initial MVP Scope

The MVP should demonstrate:

1. User login and role-based access.
2. Course catalog and course detail pages.
3. Enrollment into a course.
4. Course structure: modules and lessons.
5. Lesson completion/progress tracking.
6. Basic quiz or assessment.
7. Course completion status.
8. Basic certificate or completion record.
9. Admin/instructor course creation.
10. Basic reporting for admins/managers.

---

## 5. Out of Scope for First MVP

These are useful later but should not block the initial version:

- Mobile apps
- Public payment/subscription system
- Marketplace instructor economics
- Full SCORM/xAPI compliance
- AI tutor/recommendation engine
- Complex discussion forums
- Live classroom/webinar engine
- Advanced gamification
- Multi-tenant commercial SaaS architecture

---

## 6. Open Questions

| Question | Why it matters | Status |
|---|---|---|
| What tech stack should be used? | Determines scaffold, dependencies, deployment path | Locked 2026-09-22 — see Decisions Locked |
| Will authentication use Microsoft Entra ID/Azure AD, Google, LDAP, or local login first? | Affects auth design | Open (BLK-002) — Auth.js is wired with a credentials provider; the identity provider is undecided |
| Where should uploaded videos/files live? | Affects storage architecture | Open — S3-compatible storage is chosen; no upload path built yet |
| Is this for one organization only or multiple departments/business units? | Affects tenancy and permissions | Open — currently single-organization |
| Should certificates be PDFs, database records, or both? | Affects certificate service design | Resolved 2026-09-22 — both: a database record plus a generated PDF |
| What reporting does management need first? | Affects schema and dashboard priorities | Open — admin certificate filtering exists; broader reporting not built |

---

## 7. Locked Technical Stack

Human-accepted 2026-09-22. Canonical write-up: `outputs/TECH_STACK_DECISION_2026-09-22.md`.

- Web: Next.js + TypeScript + React
- UI: Tailwind CSS + shadcn/ui
- Auth: Auth.js / NextAuth.js (email + OAuth support; specific identity provider still open)
- Database: PostgreSQL
- ORM: Prisma
- Files: S3-compatible object storage
- Deploy: Vercel + managed PostgreSQL + managed object storage
- Jobs: defer; use server actions / API routes first

---

## 8. Decisions Locked

| Date | Decision | Reason |
|---|---|---|
| 2026-09-22 | Use four-file AI-agent harness | User supplied project operating policy/handoff; establishes traceability from the start. |
| 2026-09-22 | Start with project foundation before code scaffold | Avoid premature implementation before MVP requirements and stack are confirmed. |
| 2026-09-22 | Lock MVP stack: Next.js, TypeScript, React, Tailwind, shadcn/ui, Auth.js, PostgreSQL, Prisma, S3-compatible storage, Vercel | User accepted `outputs/TECH_STACK_DECISION_2026-09-22.md`. |

---

## 9. Change Log

| Date | Change |
|---|---|
| 2026-09-22 | Created initial foundation context for MagpieBridge-Edu. |
| 2026-09-22 | Human accepted tech stack; section 7 changed from candidate to locked. |
| 2026-09-22 | MVP learning loop implemented and verified against a live PostgreSQL 18 database: authentication, course authoring, enrollment, lesson progress, quizzes, certificate issuance, PDF download, public validation, admin revocation. Build repaired to `tsc --noEmit` 0 errors and `next build` exit 0. See `outputs/CERTIFICATE_GENERATION_REPORT_2026-09-22.md`. |
| 2026-09-22 | Fixed unstyled UI: Tailwind was never installed as a dependency and no PostCSS config existed, so no utility CSS was generated. Installed Tailwind v3 with PostCSS and autoprefixer. |
| 2026-09-23 | Phase 1 complete: course archiving with history preserved, module and lesson reordering, admin course assignment, admin user and role management, instructor progress view, learner progress view, course preview, and role-aware navigation. See `outputs/PHASE1_REPORT_2026-09-23.md`. |
| 2026-09-23 | Adopted a phased roadmap: Phase 0 decisions (storage, identity, tenancy, email), Phase 1 MVP completion (done), Phase 2 media pipeline, Phase 3 manager and admin views, Phase 4 reporting and audit, Phase 5 production readiness, Phase 6 post-MVP. |
| 2026-09-23 | External video embedding added: YouTube and Vimeo links now play inline. Content strategy is two-tier — link to existing hosted video first, own-storage uploads (Phase 2) for confidential or self-produced material. External video is not private and is not suitable for confidential content. See `outputs/VIDEO_EMBED_REPORT_2026-09-23.md`. |
