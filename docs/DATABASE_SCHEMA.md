# MagpieBridge-Edu — Database Schema Design

Date: 2026-09-22  
Author: Grok  
Job: NEXT-004  
Output path: docs/DATABASE_SCHEMA.md

---

## 1. Overview

This document defines the database schema for MagpieBridge-Edu, an internal learning platform. The schema is designed for PostgreSQL and will be implemented using Prisma ORM as per the accepted tech stack.

The schema supports the core MVP workflows:
- User authentication and role-based access
- Course creation and management
- Lesson delivery and progress tracking
- Quiz and assessment system
- Enrollment and completion tracking
- Certificate generation
- Administrative reporting

## 2. Tech Stack Context

As defined in `outputs/TECH_STACK_DECISION_2026-09-22.md`:
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Auth.js / NextAuth.js with database-backed sessions
- **Deployment**: Vercel + managed PostgreSQL

## 3. Core Entities

### User

Represents a person who can access the platform with one or more roles.

```prisma
model User {
  id              String    @id @default(cuid())
  name            String?
  email           String    @unique
  emailVerified   DateTime?
  image           String?
  status          String    @default("active")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Role relationships
  userRoles       UserRole[]
  
  // Content relationships
  authoredCourses Course[]    @relation("AuthorCourses")
  managedCourses  Course[]    @relation("ManagerCourses")
  
  // Learning relationships
  enrollments     Enrollment[]
  lessonProgress  LessonProgress[]
  quizAttempts    QuizAttempt[]
  certificates    Certificate[]
  
  // Management relationships
  managedUsers    User[]      @relation("UserManager")
  managerId       String?
  manager         User?       @relation("UserManager", fields: [managerId], references: [id])
  directReports   User[]
  
  // Audit
  auditLogs       AuditLog[]  @relation("UserAuditLogs")
  
  // Auth.js/NextAuth.js integration
  accounts        Account[]
  sessions        Session[]
}
```

### Role

Represents a permission category in the system.

```prisma
model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Role assignments
  userRoles   UserRole[]
}
```

### UserRole

Junction table for many-to-many relationship between Users and Roles.

```prisma
model UserRole {
  id        String   @id @default(cuid())
  userId    String
  roleId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id])
  role      Role     @relation(fields: [roleId], references: [id])

  @@unique([userId, roleId])
}
```

### Account

Auth.js/NextAuth.js account model for third-party authentication providers.

```prisma
model Account {
  id                String   @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}
```

### Session

Auth.js/NextAuth.js session model for database-backed sessions.

```prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### VerificationToken

Auth.js/NextAuth.js verification token model for email verification and password reset.

```prisma
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@id([identifier, token])
}
```

### Course

Represents a structured learning unit.

```prisma
model Course {
  id              String     @id @default(cuid())
  title           String
  description     String?
  status          String     @default("draft") // draft, published, archived
  estimatedDuration Int?     // in minutes
  completionCriteria Json?   // Requirements to complete the course
  visibility      String     @default("private") // public, private, assigned
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  publishedAt     DateTime?
  archivedAt      DateTime?

  // Author and manager
  authorId        String
  author          User       @relation("AuthorCourses", fields: [authorId], references: [id])
  managerId       String?
  manager         User?      @relation("ManagerCourses", fields: [managerId], references: [id])

  // Content relationships
  modules         Module[]
  quizzes         Quiz[]
  learningPaths   LearningPathCourse[]

  // Learning relationships
  enrollments     Enrollment[]
  certificates    Certificate[]

  // Audit
  auditLogs       AuditLog[] @relation("CourseAuditLogs")
}
```

### Module

Represents a section within a course.

```prisma
model Module {
  id          String   @id @default(cuid())
  courseId    String
  title       String
  description String?
  sortOrder   Int
  required    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons     Lesson[]
}
```

### Lesson

Represents an individual learning item inside a module.

```prisma
model Lesson {
  id              String   @id @default(cuid())
  moduleId        String
  title           String
  content         String?  // Lesson content (Markdown, HTML, etc.)
  contentType     String   @default("text") // text, video, document, etc.
  contentUrl      String?  // URL for external content or file reference
  sortOrder       Int
  required        Boolean  @default(true)
  estimatedDuration Int?   // in minutes
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  module          Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  lessonProgress  LessonProgress[]
}
```

### Enrollment

Represents a learner's relationship to a course.

```prisma
model Enrollment {
  id              String   @id @default(cuid())
  userId          String
  courseId        String
  enrollmentSource String  @default("assigned") // self, assigned, learning_path
  status          String   @default("not_started") // not_started, in_progress, completed, withdrawn, archived
  progressPercent Float   @default(0)
  enrolledAt      DateTime @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  dueDate         DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id])
  course          Course   @relation(fields: [courseId], references: [id])
  lessonProgress  LessonProgress[]
  quizAttempts    QuizAttempt[]
  certificate     Certificate?
  
  @@unique([userId, courseId])
}
```

### LessonProgress

Represents a learner's progress on a lesson.

```prisma
model LessonProgress {
  id            String   @id @default(cuid())
  userId        String
  enrollmentId  String
  lessonId      String
  status        String   @default("not_started") // not_started, in_progress, completed
  startedAt     DateTime?
  completedAt   DateTime?
  lastViewedAt  DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id])
  enrollment    Enrollment @relation(fields: [enrollmentId], references: [id])
  lesson        Lesson   @relation(fields: [lessonId], references: [id])

  @@unique([userId, lessonId, enrollmentId])
}
```

### Quiz

Represents a quiz or assessment associated with a course.

```prisma
model Quiz {
  id              String   @id @default(cuid())
  courseId        String
  title           String
  description     String?
  passingScore    Float    @default(70) // Percentage required to pass
  attemptLimit    Int?     // Null = unlimited
  timeLimit       Int?     // In minutes, null = no time limit
  requiredForCompletion Boolean @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  questions       Question[]
  quizAttempts    QuizAttempt[]
}
```

### Question

Represents an individual quiz question.

```prisma
model Question {
  id              String   @id @default(cuid())
  quizId          String
  questionText    String
  questionType    String   @default("multiple_choice") // multiple_choice, single_choice, true_false, short_answer
  answerOptions   Json?    // Array of possible answers
  correctAnswer   Json?    // Correct answer(s)
  points          Float    @default(1)
  sortOrder       Int
  explanation     String?  // Explanation shown after answering
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  quiz            Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
}
```

### QuizAttempt

Represents a learner's submitted quiz attempt.

```prisma
model QuizAttempt {
  id              String   @id @default(cuid())
  quizId          String
  userId          String
  enrollmentId    String
  submittedAnswers Json     // Answers submitted by the user
  score           Float?   // Score as percentage
  passed          Boolean? // Whether the attempt passed
  startedAt       DateTime @default(now())
  submittedAt     DateTime?
  timeSpent       Int?     // Time spent in seconds
  attemptNumber   Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  quiz            Quiz     @relation(fields: [quizId], references: [id])
  user            User     @relation(fields: [userId], references: [id])
  enrollment      Enrollment @relation(fields: [enrollmentId], references: [id])
}
```

### Certificate

Represents proof of course completion or a completion record.

```prisma
model Certificate {
  id                  String   @id @default(cuid())
  userId              String
  courseId            String
  enrollmentId        String
  certificateNumber   String   @unique
  completionDate      DateTime
  issuedDate          DateTime @default(now())
  status              String   @default("active") // active, revoked
  certificateData     Json?    // Template data, completion evidence, etc.
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user                User     @relation(fields: [userId], references: [id])
  course              Course   @relation(fields: [courseId], references: [id])
  enrollment          Enrollment @relation(fields: [enrollmentId], references: [id])

  @@unique([userId, courseId])
}
```

### LearningPath

Represents a grouped or ordered set of courses.

```prisma
model LearningPath {
  id              String   @id @default(cuid())
  title           String
  description     String?
  status          String   @default("draft") // draft, published, archived
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  publishedAt     DateTime?
  archivedAt      DateTime?

  // Courses in this path
  learningPathCourses LearningPathCourse[]
  
  // Audit
  auditLogs       AuditLog[] @relation("LearningPathAuditLogs")
}
```

### LearningPathCourse

Junction table for many-to-many relationship between LearningPaths and Courses with ordering.

```prisma
model LearningPathCourse {
  id            String   @id @default(cuid())
  learningPathId String
  courseId      String
  sortOrder     Int
  required      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  learningPath  LearningPath @relation(fields: [learningPathId], references: [id], onDelete: Cascade)
  course        Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([learningPathId, courseId])
}
```

### AuditLog

Represents administrative and content-management activity for audit purposes.

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  action      String   // Created, Updated, Deleted, Published, etc.
  entityType  String   // User, Course, Module, etc.
  entityId    String?  // ID of the entity that was affected
  userId      String?
  details     Json?    // Additional details about the action
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  user        User?    @relation("UserAuditLogs", fields: [userId], references: [id])
  course      Course?  @relation("CourseAuditLogs", fields: [entityId], references: [id])
  learningPath LearningPath? @relation("LearningPathAuditLogs", fields: [entityId], references: [id])
}
```

## 4. Enum Definitions

```prisma
enum UserStatus {
  active
  inactive
  suspended
}

enum CourseStatus {
  draft
  published
  archived
}

enum CourseVisibility {
  public
  private
  assigned
}

enum EnrollmentStatus {
  not_started
  in_progress
  completed
  withdrawn
  archived
}

enum LessonProgressStatus {
  not_started
  in_progress
  completed
}

enum EnrollmentSource {
  self
  assigned
  learning_path
}

enum CertificateStatus {
  active
  revoked
}

enum AuditAction {
  created
  updated
  deleted
  published
  archived
  assigned
  enrolled
  completed
}
```

## 5. Indexes and Constraints

```prisma
// User indexes
@@index([email])
@@index([status])

// Course indexes
@@index([status])
@@index([authorId])
@@index([managerId])

// Enrollment indexes
@@index([userId])
@@index([courseId])
@@index([status])
@@index([enrolledAt])

// LessonProgress indexes
@@index([userId])
@@index([lessonId])
@@index([status])

// QuizAttempt indexes
@@index([userId])
@@index([quizId])
@@index([submittedAt])

// Certificate indexes
@@index([userId])
@@index([courseId])
@@index([completionDate])

// AuditLog indexes
@@index([entityType])
@@index([createdAt])
@@index([userId])
```

## 6. Schema Relationships Summary

1. **User Management**
   - Users can have multiple roles through UserRole junction table
   - Users can manage other users (manager/direct reports)
   - Users can author and manage courses

2. **Course Structure**
   - Courses contain modules
   - Modules contain lessons
   - Courses can have quizzes

3. **Learning Progress**
   - Users enroll in courses
   - Enrollments track progress through lessons
   - Lesson progress is tracked per enrollment
   - Quiz attempts are linked to enrollments

4. **Assessment**
   - Courses can have quizzes
   - Quizzes contain questions
   - Users submit quiz attempts

5. **Completion**
   - Successful course completion results in a certificate
   - Certificates are linked to enrollments

6. **Organization**
   - Learning paths group courses
   - Courses can belong to multiple learning paths

7. **Audit**
   - Administrative actions are logged
   - Logs are associated with users and entities

## 7. Implementation Notes

1. **Prisma Schema**: This design translates directly to a Prisma schema file with appropriate relations and constraints.

2. **Database-Backed Sessions**: Auth.js/NextAuth.js sessions are stored in the database for better administrative visibility.

3. **Extensibility**: The schema is designed to accommodate future features like learning paths, advanced reporting, and more complex assessment types.

4. **Performance**: Indexes are defined on frequently queried fields to ensure good performance as the user base grows.

5. **Data Integrity**: Foreign key constraints ensure referential integrity. Cascade deletes are used where appropriate to maintain consistency.

6. **Audit Trail**: Comprehensive audit logging supports compliance and administrative oversight.

## 8. Next Steps

1. Create the Prisma schema file based on this design
2. Generate the database client
3. Run initial migrations
4. Implement the application scaffold (NEXT-003)