// Utility functions for quiz scoring and validation.
//
// Types here mirror the Prisma models (Quiz, Question) but are kept loose
// enough to accept the `Prisma.Json`-typed `answerOptions` / `correctAnswer`
// fields without forcing every caller to narrow them. The `any` types that
// used to live here were replaced with explicit interfaces so the scoring
// rules are type-checked.

export type QuestionType =
  | 'multiple_choice'
  | 'single_choice'
  | 'true_false'
  | 'short_answer'

export interface QuizQuestion {
  id: string
  // Stored as a plain string in the DB; the scoring switch below handles the
  // known QuestionType values and ignores anything else (scores 0).
  questionType: string
  // Correct answer(s). For multiple_choice this is an array of option ids;
  // for single_choice/true_false a single value; for short_answer a string.
  correctAnswer: unknown
  points: number
}

export interface Quiz {
  id: string
  questions: QuizQuestion[]
  attemptLimit: number | null
}

export interface SubmittedAnswer {
  questionId: string
  answer: unknown
}

// --- Helpers ---------------------------------------------------------------

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]
}

function normalizeShortAnswer(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

// --- Scoring ---------------------------------------------------------------

/**
 * Returns the percentage of points earned for the submitted answers.
 * Each question is scored independently; a missing or wrong answer earns 0.
 */
export function calculateQuizScore(quiz: Quiz, submittedAnswers: SubmittedAnswer[]): number {
  let totalPoints = 0
  let earnedPoints = 0

  for (const question of quiz.questions) {
    totalPoints += question.points

    const submittedAnswer = submittedAnswers.find((a) => a.questionId === question.id)
    if (!submittedAnswer) continue

    let isCorrect = false

    switch (question.questionType) {
      case 'multiple_choice': {
        const correctAnswers = asArray(question.correctAnswer)
        const submittedAnswersArray = asArray(submittedAnswer.answer)
        isCorrect =
          correctAnswers.every((answer) => submittedAnswersArray.includes(answer)) &&
          submittedAnswersArray.every((answer) => correctAnswers.includes(answer))
        break
      }
      case 'single_choice':
      case 'true_false':
        isCorrect = submittedAnswer.answer === question.correctAnswer
        break
      case 'short_answer':
        isCorrect =
          normalizeShortAnswer(submittedAnswer.answer) ===
          normalizeShortAnswer(question.correctAnswer)
        break
    }

    if (isCorrect) {
      earnedPoints += question.points
    }
  }

  return totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
}

/**
 * Returns true when every question has a non-empty answer of the right shape.
 * Used to reject incomplete submissions before they count as an attempt.
 */
export function validateQuizSubmission(quiz: Quiz, submittedAnswers: SubmittedAnswer[]): boolean {
  for (const question of quiz.questions) {
    const submittedAnswer = submittedAnswers.find((a) => a.questionId === question.id)
    if (!submittedAnswer) return false

    switch (question.questionType) {
      case 'multiple_choice':
        if (!Array.isArray(submittedAnswer.answer) || submittedAnswer.answer.length === 0) {
          return false
        }
        break
      case 'single_choice':
      case 'true_false':
      case 'short_answer':
        if (!submittedAnswer.answer) {
          return false
        }
        break
    }
  }

  return true
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

/** Returns true when the learner may take another attempt at the quiz. */
export function canRetakeQuiz(quiz: Pick<Quiz, 'attemptLimit'>, attemptCount: number): boolean {
  if (quiz.attemptLimit === null) return true
  return attemptCount < quiz.attemptLimit
}
