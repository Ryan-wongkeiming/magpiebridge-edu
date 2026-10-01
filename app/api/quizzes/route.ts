import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { courseId, title, description, passingScore, attemptLimit, timeLimit, requiredForCompletion } = await request.json()
    
    // Verify user has permission to create quiz (instructor or admin)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        author: true,
        manager: true
      }
    })
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    const canEdit = course.authorId === session.user.id ||
      course.managerId === session.user.id ||
      session.user.roles?.includes('admin')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Create quiz
    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        passingScore,
        attemptLimit,
        timeLimit,
        requiredForCompletion,
        course: {
          connect: {
            id: courseId
          }
        }
      }
    })
    
    return NextResponse.json(quiz)
  } catch (error) {
    console.error('Create quiz error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}