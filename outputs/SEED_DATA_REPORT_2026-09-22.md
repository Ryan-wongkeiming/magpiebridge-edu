# MagpieBridge-Edu Seed Data Implementation

Date: 2026-09-22  
Author: Grok  
Job: NEXT-006  
Output path: outputs/SEED_DATA_REPORT_2026-09-22.md

---

## 1. Overview

This document describes the seed data implementation for MagpieBridge-Edu. The seed data provides initial baseline data for development, testing, and demonstration purposes. It includes default roles, sample users, and a sample course structure.

## 2. Seed Data Components

### Default Roles
The following default roles are created:
- **Learner**: For users who consume courses and track their progress
- **Instructor**: For users who create and manage courses
- **Manager**: For users who view team progress and reports
- **Admin**: For users who manage the platform and users

### Sample Users
The following sample users are created:
- **Admin User** (admin@magpiebridge.edu): Has both admin and instructor roles
- **Instructor User** (instructor@magpiebridge.edu): Has instructor role
- **Learner User** (learner@magpiebridge.edu): Has learner role
- **Manager User** (manager@magpiebridge.edu): Has manager role and manages the learner user

### Sample Course Structure
A sample course is created to demonstrate the platform capabilities:
- **Course**: "Introduction to MagpieBridge-Edu"
- **Modules**: 
  1. "Getting Started"
  2. "Core Features"
- **Lessons**: 
  1. "Platform Overview"
  2. "Navigation Basics"
  3. "Course Management"
- **Quiz**: "Introduction Quiz" with sample questions

## 3. Implementation Details

### Seed Script
The seed data is implemented in `prisma/seed.ts`, which:
1. Creates default roles
2. Creates sample users with appropriate roles
3. Establishes management relationships between users
4. Creates a sample course with modules and lessons
5. Creates a quiz with sample questions

### Data Relationships
The seed data establishes the following relationships:
- Users to roles via the UserRole junction table
- Manager to learner relationships
- Course to author and manager relationships
- Modules to courses
- Lessons to modules
- Quiz to course relationships
- Questions to quiz relationships

## 4. How to Run the Seed Script

### Prerequisites
1. Database must be set up and migrations applied
2. Environment variables must be configured in `.env`
3. Prisma client must be generated

### Running the Seed Script
```bash
# Compile TypeScript to JavaScript
npx tsc prisma/seed.ts --outDir dist

# Run the seed script
npm run seed
```

Alternatively, you can run it directly with ts-node if installed:
```bash
npx ts-node prisma/seed.ts
```

### Expected Output
When the seed script runs successfully, you should see output similar to:
```
Start seeding...
Created role: learner
Created role: instructor
Created role: manager
Created role: admin
Created admin user: admin@magpiebridge.edu
Created instructor user: instructor@magpiebridge.edu
Created learner user: learner@magpiebridge.edu
Created manager user: manager@magpiebridge.edu
Created sample course: Introduction to MagpieBridge-Edu
Created module: Getting Started
Created module: Core Features
Created lesson: Platform Overview
Created lesson: Navigation Basics
Created lesson: Course Management
Created quiz: Introduction Quiz
Created question: What is the primary purpose of MagpieBridge-Edu?
Created question: Which of the following roles can create courses?
Seeding finished.
```

## 5. Seed Data Structure

### Roles
```prisma
model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  userRoles   UserRole[]
}
```

### Users
```prisma
model User {
  id              String    @id @default(cuid())
  name            String?
  email           String    @unique
  emailVerified   DateTime?
  status          String    @default("active")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  userRoles       UserRole[]
  authoredCourses Course[]    @relation("AuthorCourses")
  managedCourses  Course[]    @relation("ManagerCourses")
  enrollments     Enrollment[]
  lessonProgress  LessonProgress[]
  quizAttempts    QuizAttempt[]
  certificates    Certificate[]
  managedUsers    User[]      @relation("UserManager")
  managerId       String?
  manager         User?       @relation("UserManager", fields: [managerId], references: [id])
  directReports   User[]
  auditLogs       AuditLog[]  @relation("UserAuditLogs")
  accounts        Account[]
  sessions        Session[]
}
```

### Course Structure
```prisma
model Course {
  id              String     @id @default(cuid())
  title           String
  description     String?
  status          String     @default("draft")
  estimatedDuration Int?
  completionCriteria Json?
  visibility      String     @default("private")
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  publishedAt     DateTime?
  archivedAt      DateTime?
  authorId        String
  author          User       @relation("AuthorCourses", fields: [authorId], references: [id])
  managerId       String?
  manager         User?      @relation("ManagerCourses", fields: [managerId], references: [id])
  modules         Module[]
  quizzes         Quiz[]
  learningPaths   LearningPathCourse[]
  enrollments     Enrollment[]
  certificates    Certificate[]
  auditLogs       AuditLog[] @relation("CourseAuditLogs")
}

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

model Lesson {
  id              String   @id @default(cuid())
  moduleId        String
  title           String
  content         String?
  contentType     String   @default("text")
  contentUrl      String?
  sortOrder       Int
  required        Boolean  @default(true)
  estimatedDuration Int?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  module          Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  lessonProgress  LessonProgress[]
}
```

### Assessment System
```prisma
model Quiz {
  id              String   @id @default(cuid())
  courseId        String
  title           String
  description     String?
  passingScore    Float    @default(70)
  attemptLimit    Int?
  timeLimit       Int?
  requiredForCompletion Boolean @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  questions       Question[]
  quizAttempts    QuizAttempt[]
}

model Question {
  id              String   @id @default(cuid())
  quizId          String
  questionText    String
  questionType    String   @default("multiple_choice")
  answerOptions   Json?
  correctAnswer   Json?
  points          Float    @default(1)
  sortOrder       Int
  explanation     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  quiz            Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
}
```

## 6. Customization

### Modifying Seed Data
To customize the seed data:

1. Edit `prisma/seed.ts` to modify:
   - Role names and descriptions
   - Sample user details
   - Course content
   - Quiz questions

2. Run the seed script again (note: this will create duplicate data unless you clear the database first)

### Clearing and Re-seeding
For development purposes, you can reset the database and re-seed:

```bash
# Reset the database (development only!)
npx prisma migrate reset

# Re-seed the database
npx tsc prisma/seed.ts --outDir dist
npm run seed
```

## 7. Security Considerations

### Development Only
The seed data is intended for development and testing purposes only. It should not be used in production environments without:
1. Changing default passwords/credentials
2. Removing sample/test data
3. Implementing proper authentication

### Sample Credentials
The sample users have predictable email addresses and no passwords set. In a real application:
1. Users would register or be invited
2. Passwords would be set securely
3. Email verification would be required

## 8. Extending Seed Data

### Additional Entities
Future seed data could include:
- Learning paths
- Sample enrollments
- Lesson progress records
- Quiz attempts
- Certificates
- Audit logs

### Environment-Specific Seeding
Different seed data could be created for:
- Development environments
- Testing environments
- Demo/staging environments
- Production (minimal baseline only)

## 9. Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify `.env` file contains correct DATABASE_URL
   - Ensure PostgreSQL is running
   - Check database credentials

2. **Prisma Client Not Generated**
   - Run `npx prisma generate`
   - Check for schema errors

3. **Duplicate Data Error**
   - Clear database with `npx prisma migrate reset`
   - Or modify seed script to check for existing data

4. **TypeScript Compilation Error**
   - Ensure TypeScript is installed
   - Check for syntax errors in seed.ts

### Resetting Seed Data
If you need to reset the seed data:

```bash
# Reset database (development only!)
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev

# Re-generate client
npx prisma generate

# Re-seed data
npx tsc prisma/seed.ts --outDir dist
npm run seed
```

## 10. Next Steps

After seeding the database:

1. **Configure Authentication Providers**: Set up actual authentication providers (email, SSO)
2. **Implement Business Logic**: Develop the application features that interact with the database
3. **Create Additional Sample Data**: Add more courses, users, and content for testing
4. **Set Up Testing Environment**: Create a separate seeding process for automated tests
5. **Implement Data Validation**: Add validation to ensure data integrity

This seed data implementation provides a solid foundation for developing and testing the MagpieBridge-Edu application, with realistic sample data that demonstrates the core functionality of the platform.