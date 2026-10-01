import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isManager, isAdmin } from '@/lib/api-auth'

// GET /api/manager/team - The signed-in manager's direct reports with their
// enrollment progress and certificates. Admins see every learner (they are
// considered everyone's manager for this view).
export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isManager(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Admins see all learners; managers see only their direct reports.
    const where = isAdmin(user) ? {} : { managerId: user.id }

    const reports = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        enrollments: {
          include: {
            course: { select: { id: true, title: true } },
            certificate: {
              select: {
                id: true,
                certificateNumber: true,
                status: true,
                completionDate: true,
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    const team = reports.map((r) => {
      const enrollments = r.enrollments
      const completed = enrollments.filter((e) => e.status === 'completed').length
      const inProgress = enrollments.filter((e) => e.status === 'in_progress').length
      const certificates = enrollments
        .filter((e) => e.certificate && e.certificate.status === 'active')
        .map((e) => ({
          id: e.certificate!.id,
          certificateNumber: e.certificate!.certificateNumber,
          courseTitle: e.course.title,
          completionDate: e.certificate!.completionDate,
        }))

      return {
        id: r.id,
        name: r.name ?? r.email,
        email: r.email,
        status: r.status,
        enrolledCourseCount: enrollments.length,
        completedCourseCount: completed,
        inProgressCourseCount: inProgress,
        certificates,
        courses: enrollments.map((e) => ({
          enrollmentId: e.id,
          courseId: e.course.id,
          title: e.course.title,
          status: e.status,
          progressPercent: e.progressPercent,
          completedAt: e.completedAt,
          certificate: e.certificate
            ? {
                id: e.certificate.id,
                certificateNumber: e.certificate.certificateNumber,
                status: e.certificate.status,
              }
            : null,
        })),
      }
    })

    const summary = {
      reportsCount: team.length,
      totalEnrollments: team.reduce((n, r) => n + r.enrolledCourseCount, 0),
      totalCompleted: team.reduce((n, r) => n + r.completedCourseCount, 0),
      totalCertificates: team.reduce((n, r) => n + r.certificates.length, 0),
    }

    return NextResponse.json({ summary, team })
  } catch (error) {
    console.error('Manager team error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
