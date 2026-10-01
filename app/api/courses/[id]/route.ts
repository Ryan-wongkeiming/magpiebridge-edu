import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isAdmin, canEditCourse } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        modules: {
          orderBy: {
            sortOrder: 'asc'
          },
          include: {
            lessons: {
              orderBy: {
                sortOrder: 'asc'
              }
            }
          }
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    // Check if user can view this course
    const canView = course.status === 'published' || 
      (session?.user && (
        course.authorId === session.user.id ||
        course.managerId === session.user.id ||
        session.user.roles?.includes('admin')
      ))
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json(course)
  } catch (error) {
    console.error('Get course error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const course = await prisma.course.findUnique({
      where: { id: params.id }
    })
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    // Check if user can edit this course
    const canEdit = course.authorId === session.user.id ||
      course.managerId === session.user.id ||
      session.user.roles?.includes('admin')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { title, description, status } = await request.json()
    
    const updatedCourse = await prisma.course.update({
      where: { id: params.id },
      data: {
        title,
        description,
        status,
        publishedAt: status === 'published' && !course.publishedAt ? new Date() : undefined,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error('Update course error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PATCH /api/courses/[id] - Archive or restore a course without deleting history
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: { _count: { select: { enrollments: true, certificates: true } } }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (!(await canEditCourse(user, params.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action } = await request.json()

    if (action !== 'archive' && action !== 'restore') {
      return NextResponse.json(
        { error: "action must be 'archive' or 'restore'" },
        { status: 400 }
      )
    }

    const archiving = action === 'archive'

    // Only admins may archive a course that already has learners or issued
    // certificates; instructors can archive their own untouched drafts.
    if (archiving && !isAdmin(user)) {
      if (course._count.enrollments > 0 || course._count.certificates > 0) {
        return NextResponse.json(
          {
            error:
              'Only an admin can archive a course that has enrollments or certificates'
          },
          { status: 403 }
        )
      }
    }

    const updated = await prisma.course.update({
      where: { id: params.id },
      data: {
        // Restoring undoes the archive: a course that was published before
        // goes back to published, an untouched draft returns to draft.
        status: archiving ? 'archived' : course.publishedAt ? 'published' : 'draft',
        archivedAt: archiving ? new Date() : null,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      course: updated,
      message: archiving
        ? 'Course archived. Enrollment and completion records were preserved.'
        : `Course restored to ${updated.status}.`
    })
  } catch (error) {
    console.error('Archive course error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}