import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/api-auth'
import { calculateQuizScore, validateQuizSubmission } from '@/lib/quiz-utils'
import { autoIssueCertificate } from '@/lib/certificate-utils'

export async function POST(request: Request) {
  try {
    const actor = await getSessionUser()

    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { quizId, enrollmentId, submittedAnswers, timeSpent } = await request.json()

    // Verify enrollment belongs to user
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId }
    })

    if (!enrollment || enrollment.userId !== actor.id) {
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

    // Reject submissions that are not valid before scoring. An empty or
    // incomplete submission otherwise counts as a failed attempt against the
    // learner's attempt limit. validateQuizSubmission is the single source
    // of truth for what a complete submission looks like.
    if (!Array.isArray(submittedAnswers) || !validateQuizSubmission(quiz, submittedAnswers)) {
      return NextResponse.json(
        { error: 'All questions must be answered before submitting' },
        { status: 400 }
      )
    }

    // Create the attempt and enforce the limit in a single transaction so
    // two concurrent submissions cannot both pass the limit check and both
    // create an over-limit attempt. The attempt number is derived from the
    // count inside the same transaction, which is the value that will be
    // committed.
    const quizAttempt = await prisma.$transaction(async (tx) => {
      if (quiz.attemptLimit) {
        const attemptCount = await tx.quizAttempt.count({
          where: { quizId, enrollmentId }
        })

        if (attemptCount >= quiz.attemptLimit) {
          throw new ResponseLimitError('Attempt limit reached')
        }
      }

      const nextAttemptCount = await tx.quizAttempt.count({
        where: { quizId, enrollmentId }
      })

      // Scoring lives in lib/quiz-utils.ts so there is one implementation of
      // what "correct" means for each question type.
      const score = calculateQuizScore(quiz, submittedAnswers)
      const passed = score >= quiz.passingScore

      return tx.quizAttempt.create({
        data: {
          quiz: { connect: { id: quizId } },
          user: { connect: { id: actor.id } },
          enrollment: { connect: { id: enrollmentId } },
          submittedAnswers,
          score,
          passed,
          timeSpent,
          attemptNumber: nextAttemptCount + 1,
          submittedAt: new Date()
        }
      })
    })

    // If the quiz was passed, check if the course is now completed and
    // auto-issue a certificate. Reuses the shared completion check, which
    // respects Lesson.required and Quiz.requiredForCompletion.
    if (quizAttempt.passed) {
      try {
        await autoIssueCertificate(enrollmentId)
      } catch (error) {
        console.error('Error auto-issuing certificate after quiz:', error)
        // Don't fail the request if certificate issuance fails; the attempt
        // itself succeeded. The enrollment will be re-checked next time.
      }
    }

    return NextResponse.json({
      ...quizAttempt,
      score: quizAttempt.score,
      passed: quizAttempt.passed
    })
  } catch (error) {
    if (error instanceof ResponseLimitError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Submit quiz attempt error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// Small sentinel used to bubble the attempt-limit condition out of the
// transaction without conflating it with a Prisma error.
class ResponseLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResponseLimitError'
  }
}
