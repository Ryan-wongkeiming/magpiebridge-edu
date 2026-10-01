import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const courses = await prisma.course.findMany({
      where: status ? { status } : undefined,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        modules: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, title: true, contentType: true, estimatedDuration: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Shape the catalog payload so cards can render real metadata instead of
    // falling back to placeholders. lessonCount and durationMinutes are
    // derived from the modules/lessons relation; thumbnailUrl and level come
    // from the new Course fields; instructorName is the author's name.
    const shaped = courses.map((course) => {
      const allLessons = course.modules.flatMap((m) => m.lessons)
      const lessonCount = allLessons.length
      const durationMinutes =
        course.estimatedDuration ??
        allLessons.reduce((sum, l) => sum + (l.estimatedDuration ?? 0), 0)

      return {
        ...course,
        lessonCount,
        durationMinutes: durationMinutes > 0 ? durationMinutes : null,
        instructorName: course.author?.name ?? null,
      }
    })

    return NextResponse.json(shaped)
  } catch (error) {
    console.error('Get courses error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user has instructor or admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    
    const hasPermission = user?.userRoles.some(
      userRole => ['instructor', 'admin'].includes(userRole.role.name)
    )
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { title, description } = await request.json()
    
    const course = await prisma.course.create({
      data: {
        title,
        description,
        author: {
          connect: {
            id: session.user.id
          }
        },
        status: 'draft'
      }
    })
    
    return NextResponse.json(course)
  } catch (error) {
    console.error('Create course error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}