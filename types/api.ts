/** Client-side shapes for JSON returned by the MagpieBridge-Edu API routes. */

export interface CourseListItem {
  id: string
  title: string
  description: string | null
  status: string
  visibility: string
  modules?: { id: string; lessons?: { id: string }[] }[]
}

export interface LessonDetail {
  id: string
  title: string
  content: string | null
  contentType: string
  contentUrl: string | null
  moduleId: string
  module: {
    id: string
    title: string
    courseId: string
    course?: { id: string; title: string }
  }
}

export interface CourseDetail {
  id: string
  title: string
  description: string | null
  status: string
  visibility: string
  updatedAt: string
  modules?: {
    id: string
    title: string
    description: string | null
    lessons?: { id: string; title: string; contentType: string }[]
  }[]
  enrollments?: { id: string }[]
}

export interface EnrollmentDetail {
  id: string
  userId: string
  courseId: string
  status: string
  progressPercent: number
  course?: {
    id: string
    title: string
    description?: string | null
    modules?: {
      id: string
      title: string
      description: string | null
      lessons?: {
        id: string
        title: string
        contentType?: string
        estimatedDuration?: number | null
      }[]
    }[]
  }
  lessonProgress?: {
    lessonId: string
    status: string
    watchedSeconds?: number
    durationSeconds?: number | null
    acknowledgedAt?: string | null
  }[]
}

export interface QuizDetail {
  id: string
  courseId: string
  title: string
  description: string | null
  passingScore: number
  timeLimit: number | null
  attemptLimit: number | null
  requiredForCompletion: boolean
  course?: { id: string; title: string }
  questions?: QuizQuestion[]
}

export interface QuizQuestion {
  id: string
  quizId?: string
  questionText: string
  questionType: string
  answerOptions: string[]
  correctAnswer: string[] | string
  points: number
  sortOrder: number
  explanation: string | null
}
