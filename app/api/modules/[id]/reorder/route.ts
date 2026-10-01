import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canEditCourse } from '@/lib/api-auth'

// PATCH /api/modules/[id]/reorder - Reorder the lessons within a module
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const module = await prisma.module.findUnique({
      where: { id: params.id },
      select: { id: true, courseId: true },
    })

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    if (!(await canEditCourse(user, module.courseId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orderedIds } = await request.json()

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: 'orderedIds must be a non-empty array' },
        { status: 400 }
      )
    }

    const lessons = await prisma.lesson.findMany({
      where: { moduleId: params.id },
      select: { id: true },
    })

    const existingIds = new Set(lessons.map((l) => l.id))

    if (
      orderedIds.length !== lessons.length ||
      orderedIds.some((id: string) => !existingIds.has(id))
    ) {
      return NextResponse.json(
        { error: 'orderedIds must contain exactly the lesson IDs of this module' },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.lesson.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    )

    return NextResponse.json({ message: 'Lessons reordered', order: orderedIds })
  } catch (error) {
    console.error('Reorder lessons error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
