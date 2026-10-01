import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canEditCourse } from '@/lib/api-auth'

// PATCH /api/courses/[id]/reorder - Reorder the modules within a course
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const course = await prisma.course.findUnique({ where: { id: params.id } })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (!(await canEditCourse(user, params.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orderedIds } = await request.json()

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: 'orderedIds must be a non-empty array' },
        { status: 400 }
      )
    }

    const modules = await prisma.module.findMany({
      where: { courseId: params.id },
      select: { id: true },
    })

    const existingIds = new Set(modules.map((m) => m.id))

    if (
      orderedIds.length !== modules.length ||
      orderedIds.some((id: string) => !existingIds.has(id))
    ) {
      return NextResponse.json(
        { error: 'orderedIds must contain exactly the module IDs of this course' },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.module.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    )

    return NextResponse.json({ message: 'Modules reordered', order: orderedIds })
  } catch (error) {
    console.error('Reorder modules error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
