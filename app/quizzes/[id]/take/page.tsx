'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import QuizTaker from '@/components/quiz-taker'
import QuizResults from '@/components/quiz-results'
import type { EnrollmentDetail, QuizDetail } from '@/types/api'

interface QuizAttemptResult {
  id: string
  score: number | null
  passed: boolean | null
  submittedAnswers: unknown
}

export default function QuizTakerPage() {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null)
  const [enrollment, setEnrollment] = useState<EnrollmentDetail | null>(null)
  const [quizAttempt, setQuizAttempt] = useState<QuizAttemptResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }
    
    fetchQuizAndEnrollment()
  }, [session, status])

  const fetchQuizAndEnrollment = async () => {
    try {
      setLoading(true)
      
      // Fetch quiz
      const quizResponse = await fetch(`/api/quizzes/${params.id}`)
      const quizData = await quizResponse.json()
      
      if (!quizResponse.ok) {
        setError(quizData.error || 'Failed to fetch quiz')
        return
      }
      
      setQuiz(quizData)
      
      // Fetch enrollment for this quiz's course
      const enrollmentResponse = await fetch(`/api/enrollments?courseId=${quizData.courseId}`)
      const enrollmentData = await enrollmentResponse.json()
      
      if (enrollmentResponse.ok && enrollmentData.length > 0) {
        setEnrollment(enrollmentData[0])
      }
    } catch (err) {
      setError('Failed to fetch quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (answers: any[]) => {
    if (!quiz || !enrollment) return

    try {
      // Submit quiz attempt
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          enrollmentId: enrollment.id,
          submittedAnswers: answers
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setQuizAttempt(data)
      } else {
        setError(data.error || 'Failed to submit quiz')
      }
    } catch (err) {
      setError('Failed to submit quiz')
    }
  }

  const handleRetake = () => {
    setQuizAttempt(null)
  }

  const handleClose = () => {
    if (!enrollment) return
    router.push(`/enrollments/${enrollment.id}`)
  }

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Quiz Not Found</h2>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          <p className="text-gray-600 mt-1">
            Course: {quiz.course?.title}
          </p>
        </div>
        <Button onClick={() => router.push(`/enrollments/${enrollment?.id}`)}>
          Back to Course
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {quizAttempt ? (
        <QuizResults 
          quizAttempt={quizAttempt} 
          quiz={quiz} 
          onRetake={handleRetake}
          onClose={handleClose}
        />
      ) : (
        <QuizTaker 
          quiz={quiz} 
          enrollmentId={enrollment?.id ?? ''} 
          onSubmit={handleSubmit} 
        />
      )}
    </div>
  )
}