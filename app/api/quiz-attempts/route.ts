import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autoIssueCertificate } from '@/lib/certificate-utils'

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { quizId, enrollmentId, submittedAnswers, timeSpent } = await request.json()
    
    // Verify enrollment belongs to user
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId }
    })
    
    if (!enrollment || enrollment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Verify quiz exists and user is enrolled in the course
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
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
    
    // Check if enrollment is for the correct course
    if (enrollment.courseId !== quiz.courseId) {
      return NextResponse.json({ error: 'Invalid enrollment for this quiz' }, { status: 400 })
    }
    
    // Check attempt limit
    if (quiz.attemptLimit) {
      const attemptCount = await prisma.quizAttempt.count({
        where: {
          quizId: quizId,
          enrollmentId: enrollmentId
        }
      })
      
      if (attemptCount >= quiz.attemptLimit) {
        return NextResponse.json({ error: 'Attempt limit reached' }, { status: 400 })
      }
    }
    
    // Calculate score by comparing submitted answers with correct answers
    let totalPoints = 0
    let earnedPoints = 0
    
    for (const question of quiz.questions) {
      totalPoints += question.points
      
      const submittedAnswer = submittedAnswers.find((a: any) => a.questionId === question.id)
      
      if (submittedAnswer) {
        // Compare answers based on question type
        let isCorrect = false
        
        switch (question.questionType) {
          case 'multiple_choice':
            // For multiple choice, check if all correct answers are selected
            const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]
            const submittedAnswersArray = Array.isArray(submittedAnswer.answer) ? submittedAnswer.answer : [submittedAnswer.answer]
            isCorrect = correctAnswers.every((answer: any) => submittedAnswersArray.includes(answer)) &&
                         submittedAnswersArray.every((answer: any) => correctAnswers.includes(answer))
            break
            
          case 'single_choice':
          case 'true_false':
            // For single choice and true/false, check if answer matches
            isCorrect = submittedAnswer.answer === question.correctAnswer
            break
            
          case 'short_answer':
            // For short answer, check if answer matches (case insensitive)
            isCorrect = submittedAnswer.answer.toLowerCase() === (question.correctAnswer as string).toLowerCase()
            break
        }
        
        if (isCorrect) {
          earnedPoints += question.points
        }
      }
    }
    
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
    const passed = score >= quiz.passingScore
    
    // Get attempt number
    const attemptCount = await prisma.quizAttempt.count({
      where: {
        quizId: quizId,
        enrollmentId: enrollmentId
      }
    })
    
    // Create quiz attempt
    const quizAttempt = await prisma.quizAttempt.create({
      data: {
        quiz: {
          connect: {
            id: quizId
          }
        },
        user: {
          connect: {
            id: session.user.id
          }
        },
        enrollment: {
          connect: {
            id: enrollmentId
          }
        },
        submittedAnswers: submittedAnswers,
        score: score,
        passed: passed,
        timeSpent: timeSpent,
        attemptNumber: attemptCount + 1,
        submittedAt: new Date()
      }
    })
    
    // If the quiz was passed, check if the course is now completed and auto-issue certificate
    if (passed) {
      try {
        // Check if all lessons are completed
        const course = await prisma.course.findUnique({
          where: { id: quiz.courseId },
          include: {
            modules: {
              include: {
                lessons: true
              }
            }
          }
        })
        
        if (course) {
          const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0)
          
          if (totalLessons > 0) {
            const completedLessons = await prisma.lessonProgress.count({
              where: {
                enrollmentId: enrollmentId,
                status: 'completed'
              }
            })
            
            // If all lessons are completed, auto-issue certificate
            if (completedLessons === totalLessons) {
              await autoIssueCertificate(enrollmentId)
            }
          }
        }
      } catch (error) {
        console.error('Error checking course completion for certificate:', error)
        // Don't fail the request if certificate issuance fails
      }
    }
    
    return NextResponse.json({
      ...quizAttempt,
      score: score,
      passed: passed
    })
  } catch (error) {
    console.error('Submit quiz attempt error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}