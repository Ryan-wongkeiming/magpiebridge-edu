import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isAdmin } from '@/lib/api-auth'

// GET /api/admin/reporting - Platform-wide rollup for the admin reporting
// dashboard. Computes completion rate by course, certificates issued over
// time (grouped by day for the last 90 days), and active learner counts.
// All data is read-only; the admin role is enforced.
export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Completion rate by course. A "completed" enrollment has status
    // 'completed'; the rate is completed / total enrollments for that
    // course. Courses with zero enrollments are included with a 0 rate
    // so the dashboard can surface them.
    const courses = await prisma.course.findMany({
      where: { status: { in: ['published', 'archived'] } },
      select: {
        id: true,
        title: true,
        status: true,
        _count: { select: { enrollments: true } },
      },
    })

    const completedByCourse = await prisma.enrollment.groupBy({
      by: ['courseId'],
      where: { status: 'completed' },
      _count: { _all: true },
    })

    const completedMap = new Map(
      completedByCourse.map((c) => [c.courseId, c._count._all])
    )

    const byCourse = courses.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      enrolledCount: c._count.enrollments,
      completedCount: completedMap.get(c.id) ?? 0,
      completionRate:
        c._count.enrollments > 0
          ? Math.round(((completedMap.get(c.id) ?? 0) / c._count.enrollments) * 100)
          : 0,
    }))

    // Certificates issued over time (last 90 days, grouped by day).
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const certificates = await prisma.certificate.findMany({
      where: { issuedDate: { gte: ninetyDaysAgo } },
      select: { issuedDate: true },
    })

    const byDay = new Map<string, number>()
    for (const cert of certificates) {
      const day = cert.issuedDate.toISOString().slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + 1)
    }

    const certsOverTime = Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Active learners: users with at least one in-progress or not-started
    // enrollment (i.e. they have not withdrawn from everything). We also
    // report total learners and total certificates.
    const totalLearners = await prisma.user.count({
      where: {
        userRoles: { some: { role: { name: 'learner' } } },
      },
    })

    const activeLearners = await prisma.user.count({
      where: {
        userRoles: { some: { role: { name: 'learner' } } },
        enrollments: {
          some: { status: { in: ['in_progress', 'not_started'] } },
        },
      },
    })

    const totalCertificates = await prisma.certificate.count({
      where: { status: 'active' },
    })

    const totalEnrollments = await prisma.enrollment.count()
    const totalCompleted = await prisma.enrollment.count({
      where: { status: 'completed' },
    })

    return NextResponse.json({
      byCourse,
      certsOverTime,
      summary: {
        totalLearners,
        activeLearners,
        totalCertificates,
        totalEnrollments,
        totalCompleted,
        overallCompletionRate:
          totalEnrollments > 0
            ? Math.round((totalCompleted / totalEnrollments) * 100)
            : 0,
      },
    })
  } catch (error) {
    console.error('Admin reporting error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
