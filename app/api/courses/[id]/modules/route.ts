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
    
    const { title, description, required } = await request.json()
    
    // Get the next sort order
    const maxSortOrder = await prisma.module.aggregate({
      _max: {
        sortOrder: true
      },
      where: {
        courseId: params.id
      }
    })
    
    const nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1
    
    const module = await prisma.module.create({
      data: {
        title,
        description,
        required,
        sortOrder: nextSortOrder,
        course: {
          connect: {
            id: params.id
          }
        }
      }
    })
    
    return NextResponse.json(module)
  } catch (error) {
    console.error('Create module error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}