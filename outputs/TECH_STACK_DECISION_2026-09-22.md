# TECH_STACK_DECISION_2026-09-22

## Project

**MagpieBridge-Edu**

## Decision Date

**2026-09-22**

## Status

**Recommended for NEXT-002**

## Context

MagpieBridge-Edu is an education web MVP. The project foundation exists, and **NEXT-001 is complete** with the requirements captured in:

`outputs/MVP_REQUIREMENTS_2026-09-22.md`

There is currently **no application code yet**, so this is the correct point to lock a practical MVP technology stack before scaffolding begins.

The MVP should prioritize:

- Fast delivery
- Low operational complexity
- Good authentication support
- Simple course/content management
- Reliable relational data modeling
- File/media upload support
- Maintainability for a small product team
- A clear path from MVP to production

---

# Recommended Stack Summary

| Area | Recommendation |
|---|---|
| Web framework | **Next.js with TypeScript** |
| UI | **React + Tailwind CSS + shadcn/ui** |
| Authentication | **Auth.js / NextAuth.js with email + OAuth support** |
| Database | **PostgreSQL** |
| ORM | **Prisma** |
| File storage | **S3-compatible object storage** |
| Deployment | **Vercel for web app + managed PostgreSQL + managed object storage** |
| Background jobs | **Defer unless required; use simple server actions/API routes first** |
| Email | **Transactional email provider, integrated through Auth.js and app notifications** |
| Observability | **Basic logging, error tracking, and uptime checks after first deploy** |

---

# Recommended Web Stack

## Decision

Use:

- **Next.js**
- **TypeScript**
- **React**
- **Tailwind CSS**
- **shadcn/ui**
- **Server Components and Server Actions where practical**
- **API routes only where they are the clearer fit**

## Why This Stack

Next.js is a strong fit for an education MVP because it supports both:

1. **Marketing/public pages**
   - Landing page
   - Course catalog
   - Course detail pages
   - Public informational pages

2. **Authenticated product areas**
   - Learner dashboard
   - Course progress
   - Instructor/admin views
   - Content management flows

Using TypeScript from the start reduces the risk of data-shape errors across users, courses, enrollments, lessons, progress records, and role-based behavior.

Tailwind CSS and shadcn/ui provide a fast way to build a clean, consistent interface without overinvesting in a custom design system during MVP.

## Recommended App Shape

Use a single Next.js app with clear role-based sections:

```text
/
  public marketing and catalog pages

/courses
  course listing and public course detail pages

/dashboard
  learner dashboard

/learn/[courseId]
  enrolled learner experience

/admin
  admin and content management

/instructor
  optional instructor workspace, if required by MVP scope
```

The exact route structure can be refined during application design, but the stack should support public content, authenticated learning flows, and admin workflows in one codebase.

---

# Authentication Approach

## Decision

Use **Auth.js / NextAuth.js** for authentication.

Recommended MVP authentication methods:

1. **Email-based login**
   - Magic link or email OTP
   - Best for education users who may not want another password

2. **OAuth login**
   - Google login should be strongly considered
   - Microsoft login may be useful if the target audience includes schools or organizations using Microsoft accounts

3. **Credentials/password login**
   - Keep this optional
   - Avoid adding password management unless the MVP specifically requires it

## User Roles

Support role-based access from the start.

Recommended roles:

| Role | Purpose |
|---|---|
| `learner` | Takes courses, views lessons, tracks progress |
| `admin` | Manages platform configuration, users, courses, and content |
| `instructor` | Creates or manages assigned courses, if needed |
| `org_admin` | Optional future role for schools, cohorts, or partner organizations |

For the MVP, the minimum likely roles are:

- `learner`
- `admin`

Add `instructor` only if the MVP requires non-admin course authors.

## Why This Auth Approach

Auth.js / NextAuth.js fits well with Next.js and avoids building authentication from scratch. It supports email login, OAuth providers, sessions, and database-backed users.

This is appropriate for an education MVP because users may include students, instructors, administrators, and possibly organization managers later. The system needs a reliable identity foundation without becoming an identity product.

## Session Strategy

Recommended:

- Use database-backed sessions if the app needs strong administrative visibility and revocation.
- Use JWT sessions if the product favors simplicity and statelessness.

For this MVP, prefer **database-backed sessions** unless there is a strong deployment reason not to.

## Authorization Strategy

Authentication confirms identity.

Authorization should be implemented separately through:

- Role checks
- Ownership checks
- Enrollment checks
- Course publication status checks
- Admin-only route protection

Examples:

- A learner can view a course only if enrolled or if the course is public/free.
- A learner can update only their own lesson progress.
- An instructor can edit only assigned courses.
- An admin can manage all courses and users.

---

# Database

## Decision

Use **PostgreSQL**.

## Why PostgreSQL

PostgreSQL is the recommended relational database for MagpieBridge-Edu because the product is naturally relational.

Core education data will likely include:

- Users
- Roles
- Courses
- Modules
- Lessons
- Enrollments
- Progress records
- Assessments or quizzes
- Submissions
- Organizations or cohorts, if added later
- Certificates or completion records, if added later

These relationships are better handled by a relational database than by a document database.

PostgreSQL also provides:

- Strong data integrity
- Mature indexing
- Transactions
- Foreign keys
- Good support across hosting providers
- Long-term scalability for common SaaS patterns

## Recommended Data Model Direction

The first schema should likely include entities similar to:

```text
User
Role or user role field
Course
Module
Lesson
Enrollment
LessonProgress
CourseProgress or computed progress
MediaAsset
```

If quizzes or assignments are part of the MVP, add:

```text
Quiz
Question
AnswerOption
Submission
SubmissionAnswer
```

If organizations are part of the MVP, add:

```text
Organization
OrganizationMembership
Cohort
```

Do not overbuild these models before the exact MVP flows are implemented.

---

# ORM

## Decision

Use **Prisma**.

## Why Prisma

Prisma is a good fit for this project because it provides:

- Type-safe database access
- Clear schema definition
- Migrations
- Good developer experience
- Strong compatibility with PostgreSQL
- Easy onboarding for future contributors

For an MVP with no application code yet, Prisma helps establish a clear database contract early while allowing the schema to evolve as product flows become clearer.

## Prisma Usage Guidelines

Use Prisma for:

- User records
- Auth adapter tables
- Course content metadata
- Enrollment data
- Progress tracking
- Admin and instructor workflows

Avoid putting large content blobs directly in PostgreSQL unless they are small and structured. Store large files in object storage and keep metadata in PostgreSQL.

## Migration Strategy

Use normal Prisma migrations.

Recommended practice:

- Keep migrations committed
- Avoid editing old migrations after they are shared
- Use seed data for local development
- Use separate development, preview, and production databases
- Require migration review before production deployment

---

# Storage

## Decision

Use **S3-compatible object storage** for uploaded files and media.

Recommended object types:

- Course images
- Lesson attachments
- PDFs
- Video thumbnails
- Downloadable resources
- User-uploaded submissions, if needed

## Why Object Storage

Education products often need media and file assets. These should not be stored inside the application repository or directly in the relational database.

S3-compatible storage gives the project:

- Scalable file storage
- CDN compatibility
- Provider portability
- Signed upload/download URL support
- Cleaner database design

## Video Storage Note

For the MVP, avoid building a full video platform.

If video lessons are required, prefer one of these approaches:

1. **Embed hosted videos**
   - YouTube unlisted
   - Vimeo
   - Mux
   - Cloudflare Stream

2. **Use a managed video platform**
   - Best if video delivery, transcoding, and privacy controls matter

3. **Store only supporting files in S3**
   - PDFs, images, worksheets, attachments

Do not attempt to self-host and transcode video for the MVP unless video infrastructure is a core product requirement.

## File Access Strategy

Recommended:

- Public assets can use public URLs or CDN-backed URLs.
- Private course files should use signed URLs.
- User uploads should be validated by file type and size.
- Store file metadata in PostgreSQL.

Possible `MediaAsset` fields:

```text
id
ownerId
courseId
lessonId
storageKey
bucket
filename
mimeType
sizeBytes
visibility
createdAt
updatedAt
```

---

# Deployment

## Decision

Use:

- **Vercel** for the Next.js web application
- **Managed PostgreSQL** for database
- **Managed S3-compatible storage** for files
- **Managed transactional email provider** for auth and notifications

## Recommended MVP Deployment Shape

```text
Next.js app
  deployed to Vercel

PostgreSQL
  managed provider

Object storage
  S3-compatible provider

Email
  transactional email provider

Monitoring
  basic error tracking and uptime checks
```

## Why This Deployment Approach

Vercel is well suited for a Next.js MVP. It reduces deployment friction and supports preview deployments, which are useful for reviewing product changes before merging.

Managed PostgreSQL avoids the operational cost of running a database server.

Managed object storage avoids file persistence issues and scales better than storing files on the app server.

A transactional email provider is necessary for reliable auth emails, invitations, notifications, and passwordless login.

## Environment Strategy

Use separate environments:

| Environment | Purpose |
|---|---|
| Local | Developer machine |
| Preview/Staging | Test deploys and stakeholder review |
| Production | Real users |

Each environment should have separate:

- Database
- Auth secrets
- OAuth credentials
- Storage bucket or storage prefix
- Email sender configuration

## Required Environment Variables

The eventual app will likely need environment variables for:

```text
DATABASE_URL
AUTH_SECRET
AUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
EMAIL_SERVER_HOST
EMAIL_SERVER_PORT
EMAIL_SERVER_USER
EMAIL_SERVER_PASSWORD
EMAIL_FROM
S3_ENDPOINT
S3_REGION
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
```

Exact names may vary depending on the selected providers.

---

# Recommended Supporting Libraries

## Forms

Use:

- React Hook Form
- Zod

Why:

- Good validation flow
- Type-safe schemas
- Works well with admin forms, course creation, and profile forms

## Validation

Use:

- Zod

Validation should be shared between server-side actions and client-side forms where practical.

## Tables and Admin Views

Use:

- TanStack Table if complex tables are needed
- Simpler custom table components if admin views are basic

## State Management

Start with:

- React state
- URL state
- Server Components
- Server Actions
- Query invalidation patterns built into the framework

Avoid adding a global state library during the MVP unless there is a clear need.

## Testing

Recommended minimum:

- Unit tests for core business rules
- Integration tests for important server actions/API routes
- End-to-end smoke tests for login, enrollment, course viewing, and admin course creation

Possible tools:

- Vitest
- Playwright

Do not overbuild testing before core flows exist, but include enough coverage to protect enrollment, permissions, and progress tracking.

---

# Why These Choices Fit an Education MVP

## 1. The Domain Is Relational

Education platforms have structured relationships:

- A user enrolls in a course.
- A course contains modules.
- A module contains lessons.
- A learner completes lessons.
- An admin publishes content.
- An instructor may own or manage courses.

PostgreSQL and Prisma are a strong fit for this structure.

## 2. The Product Needs Both Public and Private Experiences

Next.js supports:

- Public course catalog pages
- SEO-friendly marketing pages
- Authenticated learner dashboards
- Admin tools
- Server-side data access

This avoids splitting the MVP across multiple applications too early.

## 3. Auth Should Be Reliable but Not Custom-Built

Auth is important but should not consume the MVP timeline. Auth.js / NextAuth.js provides enough flexibility for learners, admins, and possible instructors without building identity infrastructure from scratch.

## 4. File Storage Should Be External from Day One

Course files, images, and attachments should not live in the repository or database. Object storage gives the MVP a clean path for file handling without locking the product into a heavy content platform.

## 5. Deployment Should Minimize Operations

The MVP should validate product value, not test infrastructure endurance. Vercel plus managed services keeps the team focused on product flows.

---

# Risks and Mitigations

## Risk 1: Auth Complexity Increases with Organizations

If MagpieBridge-Edu later needs schools, cohorts, classrooms, or enterprise accounts, simple role-based auth may not be enough.

### Mitigation

Design the user model so organizations can be added later.

Avoid hardcoding assumptions like:

- One user belongs to only one organization
- Every learner is independent
- Every instructor can edit every course

Use explicit membership and permission checks when organization support becomes real.

---

## Risk 2: Course Content Modeling Can Become Too Rigid

If the MVP assumes every course has the same structure, future content types may be hard to add.

### Mitigation

Start with a simple model:

```text
Course
Module
Lesson
```

Allow lessons to have a type, such as:

```text
video
text
file
quiz
external_link
```

Do not build a complex CMS abstraction until real content needs justify it.

---

## Risk 3: Video Can Become Operationally Expensive

Video hosting, transcoding, streaming, access control, and bandwidth can quickly become expensive.

### Mitigation

Do not self-host video for MVP.

Use embedded video or a managed video service if private video is required.

Store only metadata and access rules in the app database.

---

## Risk 4: Serverless Limits May Affect Long-Running Work

Some education features may require longer-running jobs, such as:

- Certificate generation
- Bulk imports
- Video processing
- Email campaigns
- Report generation

### Mitigation

Do not introduce a queue system until needed.

When needed, add a managed background job or queue service. Keep long-running work out of request/response paths.

---

## Risk 5: Admin Features Can Become a Hidden CMS

Course creation, lesson editing, publishing, asset management, and learner management can turn into a full CMS project.

### Mitigation

For MVP, keep admin functionality narrow:

- Create and edit course metadata
- Create and edit modules
- Create and edit lessons
- Publish/unpublish courses
- View enrollments
- View basic learner progress

Avoid advanced workflows like versioned content, approval chains, granular permissions, and visual page builders unless they are core requirements.

---

## Risk 6: Authorization Bugs Could Expose Private Course Content

Education platforms often have paid, private, or restricted course material.

### Mitigation

Implement authorization checks server-side.

Never rely only on hiding UI elements.

Every protected read/write should check:

- Is the user authenticated?
- Does the user have the required role?
- Is the user enrolled?
- Is the course published?
- Does the user own or manage the resource?

---

## Risk 7: Prisma Migrations Require Discipline

Prisma is productive, but schema changes must be managed carefully after production data exists.

### Mitigation

Use migration review before production deploys.

Avoid destructive migrations without a data migration plan.

Back up production data before major schema changes.

---

## Risk 8: Vendor Lock-In

Vercel, managed database providers, and storage vendors can create operational dependency.

### Mitigation

Use portable foundations:

- Next.js
- PostgreSQL
- Prisma
- S3-compatible storage

These choices keep future migration possible if needed.

---

# What Stays OPEN

The following decisions should remain open until product requirements or implementation constraints are clearer.

## OPEN 1: Exact Hosting Providers

Recommended category is clear, but exact providers remain open.

Need to choose:

- PostgreSQL provider
- Object storage provider
- Email provider
- Error tracking provider
- Optional video provider

Possible choices include:

- Vercel Postgres or another managed PostgreSQL provider
- Supabase Postgres
- Neon
- Railway
- Render
- AWS RDS
- Cloudflare R2
- AWS S3
- Resend
- Postmark
- SendGrid
- Sentry

Final provider selection should consider budget, expected region, data handling needs, and operational preference.

---

## OPEN 2: Passwordless-Only vs OAuth + Passwordless

The recommended direction is email login plus OAuth, but the exact login options should be confirmed.

Decision needed:

- Email magic link only?
- Google login?
- Microsoft login?
- Username/password support?

For an education MVP, avoid passwords unless required.

---

## OPEN 3: Organization and Cohort Model

It is not yet confirmed whether MagpieBridge-Edu needs:

- Schools
- Companies
- Cohorts
- Classrooms
- Teams
- Group enrollment
- Organization admins

If yes, the data model should include organizations earlier.

If no, defer to reduce complexity.

---

## OPEN 4: Instructor Role

The MVP may or may not need instructors separate from admins.

Decision needed:

- Are courses managed only by platform admins?
- Can instructors create and edit courses?
- Can instructors view learner progress?
- Can instructors manage only their own courses?

If instructor workflows are not essential for MVP, defer them.

---

## OPEN 5: Video Delivery Strategy

If courses include video, the project must choose:

- Embed external video
- Use a managed video provider
- Use private video links
- Store video files directly in object storage

Recommended MVP default:

- Use hosted video embeds or a managed video platform.
- Do not build custom video processing.

---

## OPEN 6: Payment or Monetization

It is not yet specified whether courses are:

- Free
- Paid individually
- Subscription-based
- Organization-funded
- Invitation-only

Payment architecture should not be added unless required by MVP.

If payments are required later, Stripe would likely be the first provider to evaluate.

---

## OPEN 7: Assessment Complexity

The MVP may need simple quizzes, assignments, or completion checks.

Decision needed:

- Are quizzes required?
- Are assignments required?
- Are submissions graded manually?
- Are certificates required?
- Are completion rules based on lesson views, quiz scores, or admin approval?

Keep assessment modeling simple until the required learning flows are confirmed.

---

## OPEN 8: Analytics and Reporting

Basic progress tracking should be included, but advanced reporting remains open.

Potential future needs:

- Course completion reports
- Cohort progress
- Admin dashboards
- Instructor dashboards
- Export to CSV
- Learner engagement analytics

For MVP, track enough structured data to answer:

- Who enrolled?
- What course are they taking?
- Which lessons are complete?
- When did they last progress?
- Did they complete the course?

---

## OPEN 9: Internationalization

The project name and likely audience may imply multilingual needs, but this should be confirmed.

Decision needed:

- English only?
- Chinese only?
- Bilingual?
- More languages later?

If multilingual content is needed, plan the course/content schema accordingly before too much content is entered.

---

## OPEN 10: Accessibility Standard

The MVP should use accessible UI practices from the start.

Still open:

- Required compliance level
- Formal accessibility testing requirement
- Target learner device/browser profile

Recommended default:

- Build with semantic HTML
- Use accessible shadcn/ui components
- Maintain keyboard navigation
- Preserve color contrast
- Test core flows with screen-reader-friendly markup

---

# MVP Implementation Guidance

When scaffolding begins, build in this order:

1. Create the Next.js TypeScript app.
2. Add Tailwind CSS and shadcn/ui.
3. Add Prisma and PostgreSQL connection.
4. Add Auth.js / NextAuth.js.
5. Create base user/session/role model.
6. Create course/module/lesson schema.
7. Add enrollment and progress schema.
8. Build public course listing and detail pages.
9. Build learner dashboard.
10. Build lesson viewing flow.
11. Build admin course management.
12. Add object storage only when uploads are needed.
13. Add email provider when auth and notifications require it.
14. Add tests for auth, authorization, enrollment, and progress.

Do not start with advanced features such as:

- Complex CMS
- Full organization hierarchy
- Payment system
- Video transcoding
- Certificate generation
- Recommendation engine
- Gamification
- Mobile app
- Multi-tenant enterprise controls

Those can be added after the core learning loop works.

---

# Final Recommendation

MagpieBridge-Edu should use a **Next.js + TypeScript + PostgreSQL + Prisma + Auth.js** stack, with **S3-compatible object storage** and deployment through **Vercel plus managed services**.

This stack is appropriate for an education web MVP because it is fast to build, easy to maintain, strong for relational learning data, and flexible enough to support future growth into instructors, organizations, cohorts, assessments, and richer media delivery.

The next step after this decision is to scaffold the application only after confirming the remaining open choices that directly affect the initial schema: authentication options, user roles, course structure, organization/cohort needs, and video strategy.
