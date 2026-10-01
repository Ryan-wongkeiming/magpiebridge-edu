import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { quizId, questionText, questionType, answerOptions, correctAnswer, points, sortOrder, explanation } = await request.json()
    
    // Verify user has permission to create question (quiz owner or admin)
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: {
          include: {
            author: true,
            manager: true
          }
        }
      }
    })
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }
    
    const canEdit = quiz.course.authorId === session.user.id ||
      quiz.course.managerId === session.user.id ||
      session.user.roles?.includes('admin')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get the next sort order if not provided
    let nextSortOrder = sortOrder
    if (nextSortOrder === undefined) {
      const maxSortOrder = await prisma.question.aggregate({
        _max: {
          sortOrder: true
        },
        where: {
          quizId: quizId
        }
      })
      
      nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1
    }
    
    // Create question
    const question = await prisma.question.create({
      data: {
        questionText,
        questionType,
        answerOptions,
        correctAnswer,
        points,
        sortOrder: nextSortOrder,
        explanation,
        quiz: {
          connect: {
            id: quizId
          }
        }
      }
    })
    
    return NextResponse.json(question)
  } catch (error) {
    console.error('Create question error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}