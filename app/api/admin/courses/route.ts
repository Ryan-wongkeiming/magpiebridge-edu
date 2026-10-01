import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isAdmin } from '@/lib/api-auth'
import { recordAudit } from '@/lib/audit'

/**
 * GET /api/admin/courses
 *
 * Administrative course list. Unlike /api/courses this returns every course
 * regardless of status, with the counts an admin needs to decide what to do
 * with each one.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'all'
    const search = searchParams.get('search')?.trim() ?? ''

    const courses = await prisma.course.findMany({
      where: {
        ...(status !== 'all' ? { status } : {}),
        ...(search
          ? { title: { contains: search, mode: 'insensitive' as const } }
          : {}),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
        modules: { select: { id: true, _count: { select: { lessons: true } } } },
        _count: {
          select: { enrollments: true, certificates: true, quizzes: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      courses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        status: c.status,
        visibility: c.visibility,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        publishedAt: c.publishedAt,
        archivedAt: c.archivedAt,
        author: c.author,
        manager: c.manager,
        moduleCount: c.modules.length,
        lessonCount: c.modules.reduce((n, m) => n + m._count.lessons, 0),
        enrollmentCount: c._count.enrollments,
        certificateCount: c._count.certificates,
        quizCount: c._count.quizzes,
      })),
      total: courses.length,
    })
  } catch (error) {
    console.error('Admin courses error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/courses?id=...
 *
 * Deletes a course outright. Refused when learners or certificates are
 * attached, because deleting would destroy completion history. Archiving is
 * the correct action in that case.
 */
export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        _count: { select: { enrollments: true, certificates: true } },
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (course._count.enrollments > 0 || course._count.certificates > 0) {
      return NextResponse.json(
        {
          error:
            'This course has enrollments or certificates. Archive it instead — deleting would destroy learner history.',
          enrollmentCount: course._count.enrollments,
          certificateCount: course._count.certificates,
        },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Remove dependent rows that would otherwise block the delete.
      const modules = await tx.module.findMany({
        where: { courseId: id },
        select: { id: true },
      })
      const moduleIds = modules.map((m) => m.id)

      if (moduleIds.length > 0) {
        const lessons = await tx.lesson.findMany({
          where: { moduleId: { in: moduleIds } },
          select: { id: true },
        })
        const lessonIds = lessons.map((l) => l.id)

        if (lessonIds.length > 0) {
          await tx.lessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } })
          await tx.lesson.deleteMany({ where: { id: { in: lessonIds } } })
        }
        await tx.module.deleteMany({ where: { id: { in: moduleIds } } })
      }

      const quizzes = await tx.quiz.findMany({
        where: { courseId: id },
        select: { id: true },
      })
      const quizIds = quizzes.map((q) => q.id)

      if (quizIds.length > 0) {
        await tx.quizAttempt.deleteMany({ where: { quizId: { in: quizIds } } })
        await tx.question.deleteMany({ where: { quizId: { in: quizIds } } })
        await tx.quiz.deleteMany({ where: { id: { in: quizIds } } })
      }

      await tx.course.delete({ where: { id } })
    })

    await recordAudit({
      action: 'Deleted',
      entityType: 'Course',
      entityId: id,
      userId: user.id,
      details: { title: course.title },
    })

    return NextResponse.json({ message: `Course "${course.title}" deleted.` })
  } catch (error) {
    console.error('Delete course error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
