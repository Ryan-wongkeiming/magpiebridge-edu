import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const module = await prisma.module.findUnique({
      where: { id: params.id },
      include: {
        course: true
      }
    })
    
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }
    
    // Check if user can edit this course
    const canEdit = module.course.authorId === session.user.id ||
      module.course.managerId === session.user.id ||
      session.user.roles?.includes('admin')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { title, content, contentType, contentUrl, required, estimatedDuration } = await request.json()
    
    // Get the next sort order
    const maxSortOrder = await prisma.lesson.aggregate({
      _max: {
        sortOrder: true
      },
      where: {
        moduleId: params.id
      }
    })
    
    const nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1
    
    const lesson = await prisma.lesson.create({
      data: {
        title,
        content,
        contentType,
        contentUrl,
        required,
        estimatedDuration,
        sortOrder: nextSortOrder,
        module: {
          connect: {
            id: params.id
          }
        }
      }
    })
    
    return NextResponse.json(lesson)
  } catch (error) {
    console.error('Create lesson error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}