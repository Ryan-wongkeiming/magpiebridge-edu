'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import LessonEditor from '@/components/lesson-editor'
import LessonPreview from '@/components/lesson-preview'
import type { LessonDetail } from '@/types/api'

export default function LessonEditorPage() {
  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('edit') // 'edit' or 'preview'
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }
    
    fetchLesson()
  }, [session, status])

  const fetchLesson = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/lessons/${params.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setLesson(data)
      } else {
        setError(data.error || 'Failed to fetch lesson')
      }
    } catch (err) {
      setError('Failed to fetch lesson')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (updatedLesson: LessonDetail) => {
    setLesson(updatedLesson)
    // Show success message or redirect as needed
  }

  const handleCancel = () => {
    router.push(`/courses/${lesson?.module?.courseId}/edit`)
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

  if (!lesson) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Lesson Not Found</h2>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Editing: {lesson.title}</h1>
          <p className="text-gray-600 mt-1">
            Course: {lesson.module?.course?.title} • Module: {lesson.module?.title}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setActiveTab(activeTab === 'edit' ? 'preview' : 'edit')}>
            {activeTab === 'edit' ? 'Preview' : 'Edit'}
          </Button>
          <Button onClick={handleCancel}>Back to Course</Button>
        </div>
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

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            <button
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'edit'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('edit')}
            >
              Edit Content
            </button>
            <button
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'preview'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'edit' ? (
            <LessonEditor 
              lesson={lesson} 
              onSave={handleSave} 
              onCancel={handleCancel} 
            />
          ) : (
            <LessonPreview lesson={lesson} />
          )}
        </div>
      </div>
    </div>
  )
}