// Migrate local courses to production (Neon) database.
// Reads from LOCAL_DATABASE_URL, writes to PROD_DATABASE_URL.
// Maps local user IDs to production user IDs by email.
// Skips courses whose title already exists in production.
const { PrismaClient } = require('@prisma/client');

const local = new PrismaClient({
  datasources: { db: { url: process.env.LOCAL_DATABASE_URL } },
});
const prod = new PrismaClient({
  datasources: { db: { url: process.env.PROD_DATABASE_URL } },
});

async function main() {
  // 1. Load production users by email so we can map local author/manager IDs.
  const prodUsers = await prod.user.findMany({ select: { id: true, email: true } });
  const prodUserByEmail = new Map(prodUsers.map((u) => [u.email, u.id]));

  // 2. Load existing production course titles to avoid duplicates.
  const prodCourses = await prod.course.findMany({ select: { title: true } });
  const prodTitles = new Set(prodCourses.map((c) => c.title));

  // 3. Load all local courses with full content.
  const localCourses = await local.course.findMany({
    include: {
      modules: {
        orderBy: { sortOrder: 'asc' },
        include: { lessons: { orderBy: { sortOrder: 'asc' } } },
      },
      quizzes: {
        include: { questions: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const course of localCourses) {
    if (prodTitles.has(course.title)) {
      console.log(`SKIP (already exists): ${course.title}`);
      skipped++;
      continue;
    }

    // Map author/manager to production user IDs.
    const authorId = prodUserByEmail.get(
      (await local.user.findUnique({ where: { id: course.authorId }, select: { email: true } }))?.email
    );
    const managerEmail = course.managerId
      ? (await local.user.findUnique({ where: { id: course.managerId }, select: { email: true } }))?.email
      : null;
    const managerId = managerEmail ? prodUserByEmail.get(managerEmail) : null;

    if (!authorId) {
      console.log(`SKIP (author not found in prod): ${course.title}`);
      skipped++;
      continue;
    }

    // Create the course with nested modules/lessons/quizzes.
    const createdCourse = await prod.course.create({
      data: {
        title: course.title,
        description: course.description,
        status: course.status,
        estimatedDuration: course.estimatedDuration,
        completionCriteria: course.completionCriteria,
        visibility: course.visibility,
        thumbnailUrl: course.thumbnailUrl,
        level: course.level,
        publishedAt: course.publishedAt,
        archivedAt: course.archivedAt,
        authorId,
        managerId,
        modules: {
          create: course.modules.map((m) => ({
            title: m.title,
            description: m.description,
            sortOrder: m.sortOrder,
            required: m.required,
            lessons: {
              create: m.lessons.map((l) => ({
                title: l.title,
                content: l.content,
                contentType: l.contentType,
                contentUrl: l.contentUrl,
                sortOrder: l.sortOrder,
                required: l.required,
                estimatedDuration: l.estimatedDuration,
              })),
            },
          })),
        },
        quizzes: {
          create: course.quizzes.map((q) => ({
            title: q.title,
            description: q.description,
            passingScore: q.passingScore,
            attemptLimit: q.attemptLimit,
            timeLimit: q.timeLimit,
            requiredForCompletion: q.requiredForCompletion,
            questions: {
              create: q.questions.map((question) => ({
                questionText: question.questionText,
                questionType: question.questionType,
                answerOptions: question.answerOptions,
                correctAnswer: question.correctAnswer,
                points: question.points,
                sortOrder: question.sortOrder,
                explanation: question.explanation,
              })),
            },
          })),
        },
      },
    });

    console.log(`CREATED: ${createdCourse.title} (${createdCourse.id})`);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await local.$disconnect();
    await prod.$disconnect();
  });
