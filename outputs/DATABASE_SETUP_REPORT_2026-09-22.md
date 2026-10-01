# MagpieBridge-Edu Database Setup and Migrations

Date: 2026-09-22  
Author: Grok  
Job: NEXT-005  
Output path: outputs/DATABASE_SETUP_REPORT_2026-09-22.md

---

## 1. Overview

This document describes the database setup and migration process for MagpieBridge-Edu. The application uses PostgreSQL as its database and Prisma as the ORM, as specified in the accepted tech stack.

## 2. Prerequisites

Before setting up the database, ensure you have:

1. **PostgreSQL** installed and running (version 13 or higher recommended)
2. **Node.js** installed (version 18 or higher)
3. **npm** or **yarn** package manager
4. The MagpieBridge-Edu application scaffold (completed in NEXT-003)

## 3. Database Setup Process

### Step 1: Configure Environment Variables

Create a `.env` file in the project root based on the `.env.example` template:

```bash
cp .env.example .env
```

Edit the `.env` file to match your PostgreSQL configuration:

```
# Database connection
DATABASE_URL="postgresql://username:password@localhost:5432/magpiebridge_edu?schema=public"

# NextAuth.js
NEXTAUTH_SECRET="your-super-secret-key-for-nextauth"
NEXTAUTH_URL="http://localhost:3000"
```

### Step 2: Create Database

Create the database in PostgreSQL:

```sql
CREATE DATABASE magpiebridge_edu;
```

### Step 3: Install Dependencies

Install all project dependencies:

```bash
npm install
```

### Step 4: Generate Prisma Client

Generate the Prisma client based on the schema:

```bash
npx prisma generate
```

### Step 5: Run Initial Migration

Create and apply the initial database migration:

```bash
npx prisma migrate dev --name init
```

This command will:
1. Create a migration file in `prisma/migrations`
2. Apply the migration to your database
3. Generate the Prisma client

## 4. Database Schema

The database schema includes the following core entities:

### Authentication and User Management
- **User**: Platform users with authentication details
- **Role**: Permission categories (Learner, Instructor, Manager, Admin)
- **UserRole**: Junction table for many-to-many User-Role relationship
- **Account**: Auth.js/NextAuth.js account model for third-party providers
- **Session**: Auth.js/NextAuth.js session model for database-backed sessions
- **VerificationToken**: Auth.js/NextAuth.js verification tokens

### Course Structure
- **Course**: Structured learning units with metadata
- **Module**: Sections within courses
- **Lesson**: Individual learning items within modules

### Learning Progress
- **Enrollment**: Learner-course relationships
- **LessonProgress**: Tracking of learner progress on individual lessons

### Assessment System
- **Quiz**: Course assessments
- **Question**: Individual quiz questions

### Completion and Certification
- **QuizAttempt**: Learner quiz submissions
- **Certificate**: Proof of course completion

### Organization and Learning Paths
- **LearningPath**: Grouped or ordered sets of courses
- **LearningPathCourse**: Junction table for many-to-many LearningPath-Course relationship

### Audit and Compliance
- **AuditLog**: Administrative and content-management activity tracking

## 5. Migration Files Structure

After running the initial migration, the `prisma/migrations` directory will contain:

```
prisma/migrations/
├── 20260922104900_init/
│   ├── migration.sql
│   └── migration.json
└── migration_lock.toml
```

Each migration directory contains:
- `migration.sql`: The SQL statements to apply the migration
- `migration.json`: Metadata about the migration

## 6. Database Connection

The application uses the Prisma client for database connections. The client is configured in `lib/prisma.ts` with a singleton pattern to ensure efficient connection management:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## 7. Environment-Specific Configuration

### Development
Use a local PostgreSQL instance with development credentials.

### Production
Use a managed PostgreSQL service (e.g., Vercel Postgres, AWS RDS, Google Cloud SQL) with production credentials.

## 8. Backup and Recovery

### Regular Backups
- Schedule regular database backups
- Store backups in secure, redundant locations
- Test backup restoration procedures

### Point-in-Time Recovery
- Enable WAL (Write-Ahead Logging) for PostgreSQL
- Configure appropriate retention policies

## 9. Performance Considerations

### Indexing
The schema includes indexes on frequently queried fields:
- User email
- Course status
- Enrollment user and course IDs
- Lesson progress status

### Connection Pooling
For production deployments, consider using connection pooling to manage database connections efficiently.

## 10. Security Considerations

### Data Encryption
- Use SSL/TLS for database connections
- Consider column-level encryption for sensitive data

### Access Control
- Use separate database users with minimal required permissions
- Implement proper role-based access control in the application

### SQL Injection Prevention
- Prisma's query builder prevents SQL injection by default
- Avoid raw SQL queries when possible

## 11. Monitoring and Maintenance

### Health Checks
- Implement database connectivity health checks
- Monitor query performance and slow queries

### Maintenance Windows
- Schedule regular maintenance windows for updates
- Plan for schema changes during low-usage periods

## 12. Troubleshooting

### Common Issues

1. **Connection Refused**
   - Verify PostgreSQL is running
   - Check database URL in `.env` file
   - Ensure PostgreSQL accepts connections on the specified port

2. **Authentication Failed**
   - Verify database username and password
   - Check PostgreSQL user permissions

3. **Migration Conflicts**
   - Ensure migrations are applied in order
   - Resolve conflicts by resetting the database (development only)

### Resetting the Database (Development Only)

To reset the database during development:

```bash
npx prisma migrate reset
```

This command will:
- Drop the database
- Recreate the database
- Apply all migrations
- Run seed scripts (if configured)

## 13. Next Steps

After completing the database setup:

1. **Seed Initial Data** (NEXT-006): Populate the database with initial roles, admin user, and sample data
2. **Configure Authentication Providers**: Set up actual authentication providers (email, SSO)
3. **Implement Business Logic**: Develop the application features that interact with the database
4. **Set Up Monitoring**: Implement database monitoring and alerting
5. **Configure Backups**: Set up regular backup procedures

## 14. Commands Reference

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name migration_name

# Reset database (development only)
npx prisma migrate reset

# View database schema
npx prisma studio

# Check migration status
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy
```

This database setup provides a solid foundation for the MagpieBridge-Edu application, implementing all the core entities required for the MVP while maintaining extensibility for future features.