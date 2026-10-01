# MagpieBridge-Edu — MVP Product Requirements

Date: 2026-09-22  
Author: Poe Squad Assistant (poe-assistant)  
Job: NEXT-001  
Output path: outputs/MVP_REQUIREMENTS_2026-09-22.md

---

## 1. Purpose and MVP goal

MagpieBridge-Edu is an in-house Coursera-style learning platform for organizational training, certification, and skills development. It is intended for internal employees, instructors, managers, and administrators, not for a public course marketplace at launch.

The MVP goal is to prove the complete learning loop:

1. An instructor or admin creates a course.
2. The course is organized into modules and lessons.
3. A learner enrolls in the course.
4. The learner completes lessons.
5. The learner takes a quiz or final assessment.
6. The system records progress and completion.
7. The system generates a certificate or completion record.

The MVP should prioritize clarity, reliability, and traceable completion records over advanced learning features. It should provide enough structure to support real internal training programs while remaining small enough to implement, test, and operate as a first version.

---

## 2. User roles and permissions

### Learner

Learners consume assigned or available training content.

High-level permissions:

- View the course catalog or assigned courses.
- Enroll in available courses, if self-enrollment is enabled.
- Open enrolled courses.
- View modules and lessons.
- Mark eligible lessons as complete.
- Take quizzes and assessments.
- View their own progress.
- View their own completion records or certificates.

### Instructor / content creator

Instructors create and maintain learning content.

High-level permissions:

- Create draft courses.
- Edit courses they own or are assigned to manage.
- Add, edit, reorder, and remove modules.
- Add, edit, reorder, and remove lessons.
- Create and edit quizzes and questions.
- Preview courses before publishing.
- Publish or request publishing, depending on admin policy.
- View learner progress for courses they manage.

### Manager

Managers monitor learning progress for their team or assigned group.

High-level permissions:

- View assigned team members.
- View course enrollment and completion status for team members.
- View progress summaries.
- Identify overdue, incomplete, or completed learning.
- View completion records for team members where permitted.
- Export or request basic reporting, if enabled in MVP.

Managers should not be able to edit course content unless they also have an instructor or admin role.

### Admin

Admins manage the platform, users, roles, and global content settings.

High-level permissions:

- Manage users and role assignments.
- Create, edit, publish, archive, and delete courses where appropriate.
- Assign courses or learning paths to users or groups.
- Manage course catalog visibility.
- View platform-wide progress and completion records.
- Manage certificates or completion settings.
- Access audit logs.
- Configure high-level platform settings.

### Permission principles

- A user may have more than one role.
- Permissions should be role-based and explicit.
- Learners should only see content they are allowed to access.
- Instructors should only manage content within their ownership or assigned scope unless they are also admins.
- Managers should only see progress for users within their management scope.
- Admin actions should be auditable.

---

## 3. Core workflows

### 3.1 Learner happy path

1. Learner signs in.
2. Learner lands on a dashboard showing assigned, in-progress, and completed courses.
3. Learner opens an assigned or available course.
4. Learner enrolls in the course, or sees that enrollment already exists.
5. Learner opens the first module.
6. Learner views lesson content.
7. Learner completes the lesson.
8. System records lesson progress.
9. Learner continues through remaining lessons.
10. Learner takes the course quiz or final assessment.
11. System records quiz attempt and score.
12. If completion criteria are met, system marks the course complete.
13. System generates a certificate or completion record.
14. Learner can view completion status and certificate or record from their dashboard.

### 3.2 Instructor / content creator happy path

1. Instructor signs in.
2. Instructor opens the instructor workspace.
3. Instructor creates a new course draft.
4. Instructor enters course title, description, estimated duration, and basic metadata.
5. Instructor creates modules inside the course.
6. Instructor creates lessons inside each module.
7. Instructor adds lesson content.
8. Instructor creates a quiz or final assessment.
9. Instructor adds questions, answer options, correct answers, and passing criteria.
10. Instructor previews the course.
11. Instructor publishes the course or submits it for admin publishing.
12. Learners can discover or be assigned the published course.
13. Instructor monitors learner progress for the course.

### 3.3 Manager happy path

1. Manager signs in.
2. Manager opens the manager dashboard.
3. Manager views a list of team members or assigned reporting group.
4. Manager views course assignment, progress, and completion summaries.
5. Manager filters by course, learner, status, or due date if supported.
6. Manager identifies learners who have not started, are in progress, or have completed training.
7. Manager opens a learner progress detail view.
8. Manager uses the information for follow-up outside the platform.

### 3.4 Admin happy path

1. Admin signs in.
2. Admin opens the admin area.
3. Admin manages users and assigns roles.
4. Admin creates or reviews courses.
5. Admin publishes approved courses.
6. Admin assigns courses or learning paths to learners or groups.
7. Admin monitors enrollment, progress, and completion across the organization.
8. Admin reviews audit activity when needed.
9. Admin archives outdated courses while preserving historical completion records.

### 3.5 Course completion happy path

1. Learner is enrolled in a course.
2. Learner completes all required lessons.
3. Learner completes the required quiz or assessment.
4. System evaluates quiz score against passing criteria.
5. System confirms that all completion requirements are satisfied.
6. System records course completion.
7. System creates a certificate or completion record.
8. Completion is visible to the learner, relevant manager, instructor, and admin according to permissions.

---

## 4. Functional requirements

### User and access management

**FR-001** The system shall allow users to sign in before accessing protected learning content.

**FR-002** The system shall support the roles Learner, Instructor/content creator, Manager, and Admin.

**FR-003** The system shall allow a user to hold multiple roles.

**FR-004** The system shall enforce role-based access to learner, instructor, manager, and admin areas.

**FR-005** The system shall allow admins to view users.

**FR-006** The system shall allow admins to assign and remove user roles.

**FR-007** The system shall restrict manager visibility to learners within the manager’s assigned scope.

**FR-008** The system shall prevent learners from editing course content, quiz questions, or platform settings.

### Course catalog and discovery

**FR-009** The system shall provide a course catalog or course list for available and assigned courses.

**FR-010** The system shall display course title, description, status, estimated duration, and completion requirements.

**FR-011** The system shall distinguish between draft, published, archived, and unavailable courses.

**FR-012** The system shall prevent learners from accessing draft or archived courses unless explicitly permitted by an admin or instructor preview mode.

**FR-013** The system shall allow learners to view courses assigned to them.

**FR-014** The system should allow learners to discover published courses available for self-enrollment if self-enrollment is enabled.

### Course authoring

**FR-015** The system shall allow instructors and admins to create courses.

**FR-016** The system shall allow instructors and admins to edit course metadata.

**FR-017** The system shall allow instructors and admins to create modules within a course.

**FR-018** The system shall allow instructors and admins to reorder modules within a course.

**FR-019** The system shall allow instructors and admins to create lessons within modules.

**FR-020** The system shall allow instructors and admins to reorder lessons within a module.

**FR-021** The system shall allow instructors and admins to edit lesson content.

**FR-022** The system shall allow instructors and admins to mark lessons as required or optional.

**FR-023** The system shall allow instructors and admins to preview a course before publication.

**FR-024** The system shall allow admins, and optionally authorized instructors, to publish courses.

**FR-025** The system shall allow admins to archive courses without deleting historical completion records.

### Lesson experience

**FR-026** The system shall allow enrolled learners to open course modules and lessons.

**FR-027** The system shall display lesson content in a readable format.

**FR-028** The system shall allow learners to mark eligible lessons as complete.

**FR-029** The system shall record lesson completion status per learner.

**FR-030** The system shall show learners which lessons are not started, in progress, or complete.

**FR-031** The system should support basic lesson content types such as text, links, embedded media references, and downloadable resources.

### Enrollment and assignment

**FR-032** The system shall create an enrollment record when a learner is assigned to or enrolls in a course.

**FR-033** The system shall allow admins to assign courses to learners.

**FR-034** The system should allow admins to assign courses to groups if group data is available.

**FR-035** The system shall allow learners to self-enroll in published courses when self-enrollment is enabled.

**FR-036** The system shall track enrollment status, including not started, in progress, completed, and withdrawn or archived where applicable.

**FR-037** The system shall preserve enrollment history after course completion.

### Progress tracking

**FR-038** The system shall calculate course progress based on required lesson completion and assessment completion.

**FR-039** The system shall display progress percentage or equivalent progress status to learners.

**FR-040** The system shall display progress status to instructors for courses they manage.

**FR-041** The system shall display progress status to managers for learners in their scope.

**FR-042** The system shall display progress status to admins across the platform.

**FR-043** The system shall record timestamps for key progress events, including enrollment, lesson completion, quiz attempt, and course completion.

### Quiz and assessment

**FR-044** The system shall allow instructors and admins to create quizzes for a course.

**FR-045** The system shall allow quizzes to contain questions.

**FR-046** The system shall support at least one objective question type, such as multiple choice or single choice.

**FR-047** The system shall allow instructors and admins to identify correct answers for objective questions.

**FR-048** The system shall allow instructors and admins to define a passing score.

**FR-049** The system shall allow learners to submit quiz attempts.

**FR-050** The system shall calculate quiz score for objective questions.

**FR-051** The system shall record quiz attempts, scores, pass/fail status, and submission timestamps.

**FR-052** The system shall support at least one final assessment per course.

**FR-053** The system shall use quiz or assessment results as part of course completion criteria when required.

### Completion and certificates

**FR-054** The system shall determine course completion based on configured completion criteria.

**FR-055** The system shall mark an enrollment complete when all required criteria are met.

**FR-056** The system shall generate a certificate or completion record when a learner completes a course.

**FR-057** The system shall allow learners to view their own certificates or completion records.

**FR-058** The system shall allow managers to view completion records for learners in their scope.

**FR-059** The system shall allow instructors to view completion records for courses they manage.

**FR-060** The system shall allow admins to view all completion records.

**FR-061** The system shall preserve completion records even if a course is later archived.

### Learning paths

**FR-062** The system shall define a conceptual learning path as an ordered or grouped set of courses.

**FR-063** The MVP should support a basic learning path model if implementation capacity allows.

**FR-064** If learning paths are included in MVP implementation, the system shall allow admins to assign a learning path to learners or groups.

**FR-065** If learning paths are included in MVP implementation, the system shall show learner progress across the courses in the path.

### Reporting

**FR-066** The system shall provide learners with a personal progress view.

**FR-067** The system shall provide managers with a team progress view.

**FR-068** The system shall provide instructors with a course progress view.

**FR-069** The system shall provide admins with a platform progress view.

**FR-070** The system should support basic filtering by course, learner, status, and completion date.

**FR-071** The system should support simple export of progress or completion data if feasible for v1.

### Audit and administration

**FR-072** The system shall record administrative actions that affect users, roles, courses, enrollments, quizzes, or certificates.

**FR-073** The system shall record who performed each auditable action and when it occurred.

**FR-074** The system shall allow admins to review audit records.

**FR-075** The system shall prevent hard deletion of records required for completion history unless explicitly authorized by retention policy.

---

## 5. Non-functional requirements

### Security

**NFR-001** The system shall require authenticated access for all non-public pages.

**NFR-002** The system shall enforce server-side authorization checks for protected actions.

**NFR-003** The system shall protect learner progress, quiz results, and certificate data from unauthorized access.

**NFR-004** The system shall avoid exposing sensitive user data in client-side payloads unless needed for the current user’s authorized view.

**NFR-005** The system shall store secrets and credentials outside source code.

**NFR-006** The system shall use secure password or identity-provider practices appropriate to the selected authentication approach.

**NFR-007** The system shall support least-privilege access for operational administration.

### Auditability

**NFR-008** The system shall keep audit records for important administrative and content-management actions.

**NFR-009** The system shall keep durable timestamps for enrollment, lesson completion, quiz submission, course completion, and certificate generation.

**NFR-010** The system shall make completion records traceable to the learner, course, completion criteria, and completion date.

**NFR-011** The system shall preserve historical completion evidence after a course is archived.

### Performance

**NFR-012** The system shall load common learner pages quickly for typical internal use.

**NFR-013** The system should support expected v1 internal usage without special infrastructure complexity.

**NFR-014** Course dashboards and progress views should remain usable with hundreds to low thousands of users, assuming reasonable pagination and filtering.

**NFR-015** The system shall avoid unnecessary full-table loading for user, course, enrollment, and reporting screens.

### Reliability and data integrity

**NFR-016** The system shall avoid duplicate completion records for the same learner and course unless retake policy explicitly requires versions.

**NFR-017** The system shall prevent inconsistent progress states where a learner is marked complete without satisfying completion criteria.

**NFR-018** The system shall handle interrupted quiz submission or lesson completion attempts without corrupting progress data.

**NFR-019** The system shall support backup and restore appropriate to the selected hosting and storage model.

### Accessibility

**NFR-020** The system shall use accessible page structure, labels, and navigation for core learner workflows.

**NFR-021** The system shall support keyboard navigation for primary workflows.

**NFR-022** The system shall maintain readable color contrast for text and status indicators.

**NFR-023** The system shall avoid relying on color alone to communicate status.

**NFR-024** The system should target practical WCAG 2.1 AA alignment for core pages.

### Maintainability

**NFR-025** The system shall use clear separation between domain logic, access control, and presentation.

**NFR-026** The system shall include automated tests for critical learning-loop behavior where feasible.

**NFR-027** The system shall keep product concepts and naming consistent across UI, data model, and documentation.

**NFR-028** The system shall document setup, local development, and deployment steps.

### Privacy and compliance readiness

**NFR-029** The system shall collect only user and learning data needed for internal training operations.

**NFR-030** The system shall provide clear access boundaries for learner records.

**NFR-031** The system shall support future retention and deletion policies without requiring major redesign.

---

## 6. Information architecture / main pages

### Public or unauthenticated area

- Sign-in page
- Access denied page
- Password reset or identity-provider redirect page, depending on authentication approach

### Learner area

- Learner dashboard
  - Assigned courses
  - In-progress courses
  - Completed courses
  - Certificates or completion records
- Course catalog
  - Available courses
  - Search or basic filtering, if included
- Course detail page
  - Description
  - Modules and lessons
  - Completion criteria
  - Enrollment action or enrollment status
- Lesson page
  - Lesson content
  - Module navigation
  - Completion action
- Quiz page
  - Questions
  - Submit attempt
  - Score/result view
- My progress page
  - Course progress
  - Completion status
  - Certificates or completion records

### Instructor area

- Instructor dashboard
  - Courses owned or assigned
  - Draft and published course status
  - Learner progress summary
- Course editor
  - Course metadata
  - Module list
  - Lesson list
  - Publish status
- Module editor
  - Module title and order
  - Lesson organization
- Lesson editor
  - Lesson title
  - Lesson body/content
  - Required/optional setting
- Quiz editor
  - Quiz settings
  - Questions
  - Correct answers
  - Passing score
- Course preview
  - Learner-like view before publishing
- Course progress page
  - Enrolled learners
  - Progress status
  - Quiz results summary

### Manager area

- Manager dashboard
  - Team progress summary
  - Course completion status
  - Learners needing attention
- Team member progress page
  - Assigned courses
  - In-progress courses
  - Completed courses
  - Completion records
- Team course report page
  - Course-level progress for manager’s scope

### Admin area

- Admin dashboard
  - Platform overview
  - User count
  - Course count
  - Enrollment and completion summary
- User management
  - User list
  - Role assignment
  - Status
- Course administration
  - All courses
  - Draft, published, and archived courses
  - Publish/archive controls
- Assignment management
  - Assign course to learner or group
  - Assign learning path if included
- Reporting
  - Progress by course
  - Progress by learner
  - Completion records
- Audit log
  - Administrative and content-management activity
- Settings
  - Certificate settings
  - Enrollment settings
  - Authentication-related settings if applicable

---

## 7. Conceptual data objects

No SQL schema is defined in this MVP requirements document. The following are conceptual objects and relationships.

### User

Represents a person who can access the platform.

Key attributes:

- Unique identifier
- Name
- Email or login identifier
- Status
- Assigned roles
- Manager or organizational relationship, if available
- Created timestamp
- Updated timestamp

Key relationships:

- Has one or more Roles
- May have many Enrollments
- May have many LessonProgress records
- May have many QuizAttempts
- May have many Certificates
- May manage other Users if assigned as Manager
- May author Courses if assigned as Instructor/content creator

### Role

Represents a permission category.

Required role concepts:

- Learner
- Instructor/content creator
- Manager
- Admin

Key attributes:

- Unique identifier
- Role name
- Description
- Permission set or permission mapping

Key relationships:

- Assigned to Users

### Course

Represents a structured learning unit.

Key attributes:

- Unique identifier
- Title
- Description
- Status: draft, published, archived
- Estimated duration
- Owner or author
- Visibility
- Completion criteria
- Created timestamp
- Updated timestamp
- Published timestamp
- Archived timestamp, if applicable

Key relationships:

- Has many Modules
- Has many Enrollments
- May have one or more Quizzes
- May belong to one or more LearningPaths
- May generate Certificates or completion records

### Module

Represents a section within a course.

Key attributes:

- Unique identifier
- Course identifier
- Title
- Description
- Sort order
- Required status
- Created timestamp
- Updated timestamp

Key relationships:

- Belongs to one Course
- Has many Lessons

### Lesson

Represents an individual learning item inside a module.

Key attributes:

- Unique identifier
- Module identifier
- Title
- Content body or content reference
- Content type
- Sort order
- Required status
- Estimated duration
- Created timestamp
- Updated timestamp

Key relationships:

- Belongs to one Module
- Has many LessonProgress records

### Enrollment

Represents a learner’s relationship to a course.

Key attributes:

- Unique identifier
- User identifier
- Course identifier
- Enrollment source: self-enrolled, assigned by admin, assigned by learning path
- Status: not started, in progress, completed, withdrawn, archived
- Progress percentage or progress summary
- Enrolled timestamp
- Started timestamp
- Completed timestamp
- Due date, if used

Key relationships:

- Belongs to one User
- Belongs to one Course
- Has many LessonProgress records
- Has many QuizAttempts
- May produce one Certificate or completion record

### LessonProgress

Represents a learner’s progress on a lesson.

Key attributes:

- Unique identifier
- User identifier
- Enrollment identifier
- Lesson identifier
- Status: not started, in progress, completed
- Started timestamp
- Completed timestamp
- Last viewed timestamp

Key relationships:

- Belongs to one User
- Belongs to one Enrollment
- Belongs to one Lesson

### Quiz

Represents a quiz or assessment associated with a course.

Key attributes:

- Unique identifier
- Course identifier
- Title
- Description
- Passing score
- Attempt policy
- Required for completion flag
- Created timestamp
- Updated timestamp

Key relationships:

- Belongs to one Course
- Has many Questions
- Has many QuizAttempts

### Question

Represents an individual quiz question.

Key attributes:

- Unique identifier
- Quiz identifier
- Question text
- Question type
- Answer options
- Correct answer or scoring rule
- Sort order
- Points
- Explanation, if included

Key relationships:

- Belongs to one Quiz
- Evaluated as part of QuizAttempts

### QuizAttempt

Represents a learner’s submitted quiz attempt.

Key attributes:

- Unique identifier
- Quiz identifier
- User identifier
- Enrollment identifier
- Submitted answers
- Score
- Pass/fail status
- Started timestamp
- Submitted timestamp
- Attempt number

Key relationships:

- Belongs to one Quiz
- Belongs to one User
- Belongs to one Enrollment

### Certificate

Represents proof of course completion or a completion record.

Key attributes:

- Unique identifier
- User identifier
- Course identifier
- Enrollment identifier
- Certificate number or verification identifier
- Completion date
- Issued date
- Certificate status
- Certificate format or template reference
- Completion evidence summary

Key relationships:

- Belongs to one User
- Belongs to one Course
- Belongs to one Enrollment

### LearningPath

Represents a grouped or ordered set of courses.

Key attributes:

- Unique identifier
- Title
- Description
- Status
- Course list or course sequence
- Assignment rules, if included
- Created timestamp
- Updated timestamp

Key relationships:

- Has many Courses
- May be assigned to many Users or groups
- May create or influence Enrollments

---

## 8. Explicit out of scope for MVP

The following are explicitly out of scope for the MVP:

- Native mobile applications.
- Payments, subscriptions, billing, or commerce.
- Public course marketplace functionality.
- SCORM support.
- xAPI support.
- AI tutor or AI coaching features.
- Forums or community discussion boards.
- Live classroom, webinar, or cohort session delivery.
- Gamification, points, badges, streaks, or leaderboards.
- Multi-tenant commercial SaaS functionality.
- External customer training portal.
- Advanced content versioning and branching.
- Advanced proctoring.
- Complex adaptive testing.
- Advanced analytics or business intelligence dashboards.
- Full learning experience platform functionality.
- Rich media hosting pipeline beyond basic content references or uploads, depending on storage decision.
- Offline learning.
- Localization beyond the initial operating language.
- Complex HRIS or identity integrations beyond the selected MVP authentication approach.

---

## 9. Open questions carried forward

These questions remain OPEN and should be resolved before or during early implementation planning.

### Stack

OPEN: What application stack should be used for the MVP?

Considerations:

- Team familiarity.
- Speed of implementation.
- Maintainability.
- Authentication support.
- Hosting environment.
- Reporting needs.
- Long-term extensibility.

A candidate stack may be recommended later, but this requirements document does not lock the technology stack.

### Authentication

OPEN: What authentication method should the MVP use?

Options may include:

- Company single sign-on.
- Email/password authentication.
- Microsoft Entra ID or another identity provider.
- Lightweight internal account management for early prototype use.

Key decision factors:

- Security expectations.
- Internal IT standards.
- User provisioning process.
- Manager/team hierarchy availability.

### Storage

OPEN: What storage approach should be used for user data, course content, progress records, quiz attempts, and certificates?

Questions to resolve:

- Where should lesson content be stored?
- Should file uploads be supported in MVP?
- Where should certificate files or generated records live?
- What backup and restore approach is required?

### Tenancy

OPEN: Does the MVP need any tenant or business-unit separation?

Current assumption:

- The MVP is for a single internal organization, not a multi-tenant SaaS product.

Questions to resolve:

- Are departments or business units isolated?
- Do admins have global access?
- Do managers only see direct reports, assigned groups, or both?

### Certificate format

OPEN: What form should certificates or completion records take in MVP?

Options may include:

- Simple completion record page.
- Downloadable PDF certificate.
- Certificate number with verification record.
- Admin-only completion record without learner-facing certificate.

Questions to resolve:

- Is a visual certificate required for v1?
- Is PDF generation required?
- Should certificates be externally verifiable?
- What fields must appear on the certificate?

### First reports

OPEN: What are the first reports required for MVP launch?

Candidate reports:

- Learner progress by course.
- Course completion by learner.
- Team completion summary for managers.
- Course completion summary for instructors.
- Organization-wide completion export for admins.
- Overdue assigned training report, if due dates are included.

Questions to resolve:

- Which reports are required on-screen?
- Which reports require export?
- What filters are mandatory?
- Who is allowed to see each report?

---

## 10. Recommended implementation roadmap in phases

This roadmap does not lock a technology stack. A candidate stack may be proposed separately after the stack question is resolved.

### Phase 0 — Foundation and decisions

Goals:

- Confirm MVP scope.
- Resolve initial stack, authentication, hosting, storage, and certificate decisions.
- Define design conventions.
- Establish development workflow.
- Define initial test strategy.

Deliverables:

- Approved MVP requirements.
- Basic architecture decision record.
- Initial data model design.
- Initial UI map.
- Local development setup.
- Deployment approach.

### Phase 1 — User, roles, and shell

Goals:

- Build the authenticated application shell.
- Implement user and role concepts.
- Establish role-based navigation.
- Create baseline admin user management.

Core capabilities:

- Sign-in.
- Role-aware dashboards.
- User list.
- Role assignment.
- Access denied handling.
- Basic audit logging for admin actions.

### Phase 2 — Course authoring

Goals:

- Allow instructors and admins to create structured course content.

Core capabilities:

- Create course draft.
- Edit course metadata.
- Create modules.
- Create lessons.
- Reorder modules and lessons.
- Preview course.
- Publish and archive courses.

### Phase 3 — Learner course experience

Goals:

- Allow learners to enroll in and complete course lessons.

Core capabilities:

- Course catalog or assigned course list.
- Course detail page.
- Enrollment creation.
- Lesson viewer.
- Lesson completion tracking.
- Learner progress dashboard.

### Phase 4 — Quiz and completion engine

Goals:

- Add assessment and reliable course completion logic.

Core capabilities:

- Quiz creation.
- Question creation.
- Learner quiz attempts.
- Score calculation.
- Passing criteria.
- Completion criteria evaluation.
- Completion record generation.

### Phase 5 — Certificates and reporting

Goals:

- Make completion visible and useful to learners, managers, instructors, and admins.

Core capabilities:

- Certificate or completion record view.
- Learner completion history.
- Manager team progress view.
- Instructor course progress view.
- Admin platform progress view.
- Basic filtering.
- Optional export if feasible.

### Phase 6 — Hardening and launch readiness

Goals:

- Prepare MVP for real internal use.

Core capabilities:

- Security review.
- Accessibility review.
- Data integrity checks.
- Audit log review.
- Performance checks for expected v1 scale.
- Backup and restore validation.
- Documentation.
- User acceptance testing.
- Launch checklist.

### Optional candidate stack recommendation

The technology stack remains OPEN. If the team wants a practical default later, a candidate stack could include:

- A modern web application framework.
- A relational database.
- Role-based authorization.
- Server-rendered or hybrid pages for maintainability.
- Object storage if lesson attachments or certificate files are required.
- Company identity provider integration if available.

This is not a stack decision. It is only a direction to evaluate.

---

## 11. Definition of done for MVP

The MVP is done when the platform can support the full internal learning loop in a secure, traceable, and usable way.

### Product completion criteria

- Admin or instructor can create a course.
- Course can contain modules.
- Modules can contain lessons.
- Learner can enroll in or be assigned to a course.
- Learner can view lessons.
- Learner can complete required lessons.
- Learner can take a quiz or assessment.
- System records quiz attempt and result.
- System calculates whether completion criteria are met.
- System records course completion.
- System generates a certificate or completion record.
- Learner can view their progress and completion.
- Manager can view progress for their assigned learners.
- Instructor can view progress for courses they manage.
- Admin can view users, courses, enrollments, progress, and completion records.

### Access and security criteria

- Authentication is required for protected areas.
- Role-based access is enforced server-side.
- Learners cannot access administrative or authoring functions.
- Managers cannot see learners outside their authorized scope.
- Instructors cannot manage courses outside their authorized scope unless granted admin rights.
- Admin actions are auditable.
- Sensitive data is not exposed to unauthorized users.

### Data integrity criteria

- Enrollment records are created and preserved correctly.
- Lesson completion records are tied to the correct learner, lesson, and enrollment.
- Quiz attempts are tied to the correct learner, quiz, and enrollment.
- Completion records are generated only when completion criteria are satisfied.
- Completion records remain available after a course is archived.
- Duplicate or contradictory completion records are prevented.

### Usability criteria

- Learners can understand what courses they need to take.
- Learners can understand their progress.
- Instructors can create a basic course without developer support.
- Managers can identify who has completed or not completed assigned learning.
- Admins can perform core operational tasks without direct database access.

### Reporting criteria

- Learners can view their own course status.
- Managers can view team learning status.
- Instructors can view course-level learner progress.
- Admins can view platform-level progress and completion records.
- First required reports, once selected from the open question list, are implemented.

### Quality criteria

- Critical workflows have been tested.
- Permission boundaries have been tested.
- Completion logic has been tested.
- Basic accessibility checks have been completed.
- Expected v1 performance has been checked.
- Setup and operating documentation exist.
- Known limitations are documented.
- Open post-MVP items are captured for future planning.
