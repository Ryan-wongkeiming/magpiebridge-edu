import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isInstructor } from '@/lib/api-auth'

// GET /api/instructor/progress - Roster and progress for the instructor's courses
export async function GET(request: Request) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isInstructor(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    const isAdminUser = user.roles.includes('admin')

    const courses = await prisma.course.findMany({
      where: {
        ...(isAdminUser ? {} : { OR: [{ authorId: user.id }, { managerId: user.id }] }),
        ...(courseId ? { id: courseId } : {}),
      },
      include: {
        modules: { include: { lessons: { select: { id: true, required: true } } } },
        enrollments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            lessonProgress: { select: { lessonId: true, status: true } },
            quizAttempts: {
              select: { id: true, score: true, passed: true, submittedAt: true },
              orderBy: { submittedAt: 'desc' },
            },
            certificate: { select: { id: true, certificateNumber: true, status: true } },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const result = courses.map((course) => {
      const totalLessons = course.modules.reduce((n, m) => n + m.lessons.length, 0)
      const requiredLessons = course.modules.reduce(
        (n, m) => n + m.lessons.filter((l) => l.required).length,
        0
      )

      const learners = course.enrollments.map((e) => {
        const completedLessons = e.lessonProgress.filter(
          (lp) => lp.status === 'completed'
        ).length
        const latestAttempt = e.quizAttempts[0] ?? null

        return {
          enrollmentId: e.id,
          userId: e.user.id,
          name: e.user.name,
          email: e.user.email,
          status: e.status,
          progressPercent: e.progressPercent,
          completedLessons,
          totalLessons,
          enrolledAt: e.enrolledAt,
          completedAt: e.completedAt,
          latestQuizScore: latestAttempt?.score ?? null,
          latestQuizPassed: latestAttempt?.passed ?? null,
          certificateStatus: e.certificate?.status ?? null,
        }
      })

      const completed = learners.filter((l) => l.status === 'completed').length
      const inProgress = learners.filter((l) => l.status === 'in_progress').length

      return {
        courseId: course.id,
        title: course.title,
        status: course.status,
        totalLessons,
        requiredLessons,
        learnerCount: learners.length,
        completedCount: completed,
        inProgressCount: inProgress,
        notStartedCount: learners.length - completed - inProgress,
        completionRate:
          learners.length > 0 ? Math.round((completed / learners.length) * 100) : 0,
        learners,
      }
    })

    return NextResponse.json({ courses: result })
  } catch (error) {
    console.error('Instructor progress error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
