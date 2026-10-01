import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-auth'

// GET /api/me/progress - The signed-in learner's own progress summary
export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { sortOrder: 'asc' },
              include: {
                lessons: { orderBy: { sortOrder: 'asc' }, select: { id: true, title: true, required: true } },
              },
            },
          },
        },
        lessonProgress: true,
        quizAttempts: {
          select: { id: true, quizId: true, score: true, passed: true, submittedAt: true },
          orderBy: { submittedAt: 'desc' },
        },
        certificate: { select: { id: true, certificateNumber: true, status: true, completionDate: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    })

    const courses = enrollments.map((e) => {
      const allLessons = e.course.modules.flatMap((m) => m.lessons)
      const completedIds = new Set(
        e.lessonProgress.filter((lp) => lp.status === 'completed').map((lp) => lp.lessonId)
      )
      const requiredLessons = allLessons.filter((l) => l.required)
      const requiredCompleted = requiredLessons.filter((l) => completedIds.has(l.id)).length

      // Best attempt: a passing attempt always wins; otherwise the highest
      // score across all attempts. The previous logic returned the first
      // attempt's score when no attempt had passed, which under-reported.
      const bestAttempt = e.quizAttempts.reduce<
        null | { score: number | null; passed: boolean | null }
      >((best, a) => {
        if (a.passed) {
          // A pass is the best outcome; keep the first pass seen.
          if (!best || !best.passed) return { score: a.score, passed: true }
          return best
        }
        if (!best) return { score: a.score, passed: a.passed }
        if (best.passed) return best
        // Both best and a are failing: keep the higher score.
        return (a.score ?? 0) > (best.score ?? 0)
          ? { score: a.score, passed: a.passed }
          : best
      }, null)

      return {
        enrollmentId: e.id,
        courseId: e.course.id,
        title: e.course.title,
        status: e.status,
        progressPercent: e.progressPercent,
        totalLessons: allLessons.length,
        completedLessons: allLessons.filter((l) => completedIds.has(l.id)).length,
        requiredLessons: requiredLessons.length,
        requiredCompleted,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        bestQuizScore: bestAttempt?.score ?? null,
        quizPassed: bestAttempt?.passed ?? false,
        certificate: e.certificate
          ? {
              id: e.certificate.id,
              certificateNumber: e.certificate.certificateNumber,
              status: e.certificate.status,
              completionDate: e.certificate.completionDate,
            }
          : null,
      }
    })

    const summary = {
      totalCourses: courses.length,
      completed: courses.filter((c) => c.status === 'completed').length,
      inProgress: courses.filter((c) => c.status === 'in_progress').length,
      notStarted: courses.filter((c) => c.status === 'not_started').length,
      certificatesEarned: courses.filter((c) => c.certificate && c.certificate.status === 'active')
        .length,
      totalLessonsCompleted: courses.reduce((n, c) => n + c.completedLessons, 0),
      averageProgress:
        courses.length > 0
          ? Math.round(courses.reduce((n, c) => n + c.progressPercent, 0) / courses.length)
          : 0,
    }

    return NextResponse.json({ summary, courses })
  } catch (error) {
    console.error('Learner progress error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
