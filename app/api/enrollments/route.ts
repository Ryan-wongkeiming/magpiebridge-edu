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
    const courseId = searchParams.get('courseId')

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: session.user.id,
        ...(courseId ? { courseId } : {})
      },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { sortOrder: 'asc' },
              include: {
                lessons: {
                  orderBy: { sortOrder: 'asc' }
                }
              }
            }
          }
        },
        lessonProgress: true
      },
      orderBy: { enrolledAt: 'desc' }
    })

    return NextResponse.json(enrollments)
  } catch (error) {
    console.error('Get enrollments error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { courseId } = await request.json()
    
    // Check if course exists and is available for enrollment
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    })
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    // Check if course is published
    if (course.status !== 'published') {
      return NextResponse.json({ error: 'Course is not available for enrollment' }, { status: 400 })
    }
    
    // Check if user is already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId
        }
      }
    })
    
    if (existingEnrollment) {
      return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 400 })
    }
    
    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        user: {
          connect: {
            id: session.user.id
          }
        },
        course: {
          connect: {
            id: courseId
          }
        },
        enrollmentSource: 'self'
      }
    })
    
    return NextResponse.json(enrollment)
  } catch (error) {
    console.error('Enroll in course error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}