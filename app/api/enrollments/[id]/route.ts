import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: params.id },
      include: {
        course: {
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
            }
          }
        },
        lessonProgress: true
      }
    })
    
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }
    
    // Check if user owns this enrollment
    if (enrollment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json(enrollment)
  } catch (error) {
    console.error('Get enrollment error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}