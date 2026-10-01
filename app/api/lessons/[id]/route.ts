import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: true
          }
        }
      }
    })
    
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }
    
    // Check if user can view this lesson
    const canView = lesson.module.course.status === 'published' || 
      (session?.user && (
        lesson.module.course.authorId === session.user.id ||
        lesson.module.course.managerId === session.user.id ||
        session.user.roles?.includes('admin')
      ))
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json(lesson)
  } catch (error) {
    console.error('Get lesson error:', error)
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
    
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: true
          }
        }
      }
    })
    
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }
    
    // Check if user can edit this lesson
    const canEdit = lesson.module.course.authorId === session.user.id ||
      lesson.module.course.managerId === session.user.id ||
      session.user.roles?.includes('admin')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { title, content, contentType, contentUrl, required, estimatedDuration } = await request.json()
    
    const updatedLesson = await prisma.lesson.update({
      where: { id: params.id },
      data: {
        title,
        content,
        contentType,
        contentUrl,
        required,
        estimatedDuration,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json(updatedLesson)
  } catch (error) {
    console.error('Update lesson error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: {
            course: true
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const canEdit =
      lesson.module.course.authorId === session.user.id ||
      lesson.module.course.managerId === session.user.id ||
      session.user.roles?.includes('admin')

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove dependent progress rows first; lesson completion history cannot
    // outlive the lesson itself.
    await prisma.$transaction([
      prisma.lessonProgress.deleteMany({ where: { lessonId: params.id } }),
      prisma.lesson.delete({ where: { id: params.id } })
    ])

    return NextResponse.json({ message: 'Lesson deleted' })
  } catch (error) {
    console.error('Delete lesson error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}