'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import QuizBuilder from '@/components/quiz-builder'
import type { QuizDetail } from '@/types/api'

export default function QuizEditorPage() {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null)
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
    
    fetchQuiz()
  }, [session, status])

  const fetchQuiz = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/quizzes/${params.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setQuiz(data)
      } else {
        setError(data.error || 'Failed to fetch quiz')
      }
    } catch (err) {
      setError('Failed to fetch quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (updatedQuiz: QuizDetail) => {
    setQuiz(updatedQuiz)
    // Show success message or redirect as needed
  }

  const handleCancel = () => {
    router.push(`/courses/${quiz?.courseId}/edit`)
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
          <h1 className="text-3xl font-bold">Editing: {quiz.title}</h1>
          <p className="text-gray-600 mt-1">
            Course: {quiz.course?.title}
          </p>
        </div>
        <Button onClick={handleCancel}>Back to Course</Button>
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

      <div className="bg-white rounded-lg shadow p-6">
        <QuizBuilder 
          quiz={quiz} 
          onSave={handleSave} 
          onCancel={handleCancel} 
        />
      </div>
    </div>
  )
}