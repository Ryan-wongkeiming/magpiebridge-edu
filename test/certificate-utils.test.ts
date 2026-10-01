import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkCompletionRequirements } from '@/lib/certificate-utils'

// --- Prisma mock -----------------------------------------------------------
//
// checkCompletionRequirements reads from prisma.enrollment.findUnique and
// prisma.quiz.findMany. We mock the whole @/lib/prisma module so the test
// can drive each branch (required vs. optional lesson/quiz, not-found) with
// synthetic data. No real DB connection is made.

type LessonRow = { id: string; required: boolean }
type QuizAttemptRow = { quizId: string; passed: boolean }

interface MockEnrollment {
  id: string
  courseId: string
  course: {
    modules: Array<{ lessons: LessonRow[] }>
  }
  lessonProgress: Array<{ lessonId: string; status: string }>
  quizAttempts: QuizAttemptRow[]
}

const enrollmentStore: Record<string, MockEnrollment> = {}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    enrollment: {
      findUnique: vi.fn(({ where }: { where: { id: string } }) =>
        enrollmentStore[where.id] ?? null
      ),
    },
    quiz: {
      findMany: vi.fn(({ where }: { where: { courseId: string; requiredForCompletion: boolean } }) => {
        // Return the quizzes registered for the course when asked for required ones.
        return (quizStore[where.courseId] ?? [])
          .filter((q) => q.requiredForCompletion === where.requiredForCompletion)
          .map((q) => ({ id: q.id }))
      }),
    },
  },
  generateSecureToken: vi.fn(() => 'mocktoken'),
}))

type QuizRow = { id: string; courseId: string; requiredForCompletion: boolean }
const quizStore: Record<string, QuizRow[]> = {}

function setEnrollment(id: string, e: MockEnrollment) {
  enrollmentStore[id] = e
}

function setQuizzes(courseId: string, quizzes: QuizRow[]) {
  quizStore[courseId] = quizzes
}

// --- Tests -----------------------------------------------------------------

beforeEach(() => {
  for (const k of Object.keys(enrollmentStore)) delete enrollmentStore[k]
  for (const k of Object.keys(quizStore)) delete quizStore[k]
})

describe('checkCompletionRequirements', () => {
  it('returns true when all required lessons are completed and all required quizzes passed', async () => {
    setEnrollment('e1', {
      id: 'e1',
      courseId: 'c1',
      course: {
        modules: [
          { lessons: [{ id: 'l1', required: true }, { id: 'l2', required: true }] },
        ],
      },
      lessonProgress: [
        { lessonId: 'l1', status: 'completed' },
        { lessonId: 'l2', status: 'completed' },
      ],
      quizAttempts: [{ quizId: 'q1', passed: true }],
    })
    setQuizzes('c1', [{ id: 'q1', courseId: 'c1', requiredForCompletion: true }])

    const result = await checkCompletionRequirements('e1')
    expect(result).toBe(true)
  })

  it('returns false when a required lesson is not completed', async () => {
    setEnrollment('e1', {
      id: 'e1',
      courseId: 'c1',
      course: { modules: [{ lessons: [{ id: 'l1', required: true }] }] },
      lessonProgress: [{ lessonId: 'l1', status: 'in_progress' }],
      quizAttempts: [],
    })
    setQuizzes('c1', [])

    const result = await checkCompletionRequirements('e1')
    expect(result).toBe(false)
  })

  it('returns true when an optional lesson is skipped (does not block completion)', async () => {
    setEnrollment('e1', {
      id: 'e1',
      courseId: 'c1',
      course: {
        modules: [
          { lessons: [{ id: 'l1', required: true }, { id: 'l2', required: false }] },
        ],
      },
      // l1 is done; l2 (optional) has no progress row at all
      lessonProgress: [{ lessonId: 'l1', status: 'completed' }],
      quizAttempts: [],
    })
    setQuizzes('c1', [])

    const result = await checkCompletionRequirements('e1')
    expect(result).toBe(true)
  })

  it('returns false when a required quiz has not been passed', async () => {
    setEnrollment('e1', {
      id: 'e1',
      courseId: 'c1',
      course: { modules: [{ lessons: [{ id: 'l1', required: true }] }] },
      lessonProgress: [{ lessonId: 'l1', status: 'completed' }],
      quizAttempts: [{ quizId: 'q1', passed: false }],
    })
    setQuizzes('c1', [{ id: 'q1', courseId: 'c1', requiredForCompletion: true }])

    const result = await checkCompletionRequirements('e1')
    expect(result).toBe(false)
  })

  it('returns true when an optional quiz has not been passed (does not block completion)', async () => {
    setEnrollment('e1', {
      id: 'e1',
      courseId: 'c1',
      course: { modules: [{ lessons: [{ id: 'l1', required: true }] }] },
      lessonProgress: [{ lessonId: 'l1', status: 'completed' }],
      quizAttempts: [], // no attempts at all, including for the optional quiz
    })
    setQuizzes('c1', [
      { id: 'q-opt', courseId: 'c1', requiredForCompletion: false },
    ])

    const result = await checkCompletionRequirements('e1')
    expect(result).toBe(true)
  })

  it('returns true when a required quiz was failed once then passed on a later attempt', async () => {
    setEnrollment('e1', {
      id: 'e1',
      courseId: 'c1',
      course: { modules: [{ lessons: [{ id: 'l1', required: true }] }] },
      lessonProgress: [{ lessonId: 'l1', status: 'completed' }],
      quizAttempts: [
        { quizId: 'q1', passed: false },
        { quizId: 'q1', passed: true },
      ],
    })
    setQuizzes('c1', [{ id: 'q1', courseId: 'c1', requiredForCompletion: true }])

    const result = await checkCompletionRequirements('e1')
    expect(result).toBe(true)
  })

  it('throws when the enrollment does not exist', async () => {
    // No enrollment set for 'missing'
    await expect(checkCompletionRequirements('missing')).rejects.toThrow('Enrollment not found')
  })
})
