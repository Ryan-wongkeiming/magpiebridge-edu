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
    
    const quiz = await prisma.quiz.findUnique({
      where: { id: params.id },
      include: {
        course: true,
        questions: {
          orderBy: {
            sortOrder: 'asc'
          }
        }
      }
    })
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }
    
    // Check if user can view this quiz (course instructor, admin, or enrolled learner)
    const canView = session.user.roles?.includes('admin') ||
      quiz.course.authorId === session.user.id ||
      quiz.course.managerId === session.user.id ||
      (await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: quiz.courseId
          }
        }
      }))
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // For learners, don't return correct answers
    const isLearner = !(session.user.roles?.includes('admin') ||
      quiz.course.authorId === session.user.id ||
      quiz.course.managerId === session.user.id)
    
    if (isLearner) {
      // Remove correct answers for learners
      const questionsWithoutAnswers = quiz.questions.map(question => ({
        ...question,
        correctAnswer: undefined
      }))
      
      return NextResponse.json({
        ...quiz,
        questions: questionsWithoutAnswers
      })
    }
    
    return NextResponse.json(quiz)
  } catch (error) {
    console.error('Get quiz error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}