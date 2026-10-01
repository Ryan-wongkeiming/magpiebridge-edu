import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isAdmin } from '@/lib/api-auth'
import { recordAudit } from '@/lib/audit'

// POST /api/admin/enrollments - Assign a course to one or more learners
export async function POST(request: Request) {
  try {
    const actor = await getSessionUser()

    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { courseId, userIds } = await request.json()

    if (!courseId || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'courseId and a non-empty userIds array are required' },
        { status: 400 }
      )
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const existing = await prisma.enrollment.findMany({
      where: { courseId, userId: { in: userIds } },
      select: { userId: true },
    })

    const alreadyEnrolled = new Set(existing.map((e) => e.userId))
    const toCreate = userIds.filter((id) => !alreadyEnrolled.has(id))

    if (toCreate.length > 0) {
      await prisma.enrollment.createMany({
        data: toCreate.map((userId) => ({
          userId,
          courseId,
          enrollmentSource: 'assigned',
          status: 'not_started',
        })),
      })
    }

    // Record the assignment in the audit trail. The details capture which
    // learners were assigned and which were skipped so the action is
    // reconstructable from the Activity screen alone.
    await recordAudit({
      action: 'Assigned course',
      entityType: 'Enrollment',
      entityId: courseId,
      userId: actor.id,
      details: {
        courseId,
        courseTitle: course.title,
        assignedUserIds: toCreate,
        skippedUserIds: userIds.filter((id) => alreadyEnrolled.has(id)),
      },
    })

    return NextResponse.json({
      assigned: toCreate.length,
      skipped: userIds.length - toCreate.length,
      message:
        toCreate.length === 0
          ? 'All selected learners were already enrolled'
          : `Assigned to ${toCreate.length} learner(s)`,
    })
  } catch (error) {
    console.error('Assign course error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
