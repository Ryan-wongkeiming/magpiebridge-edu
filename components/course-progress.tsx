'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface LessonRow {
  id: string
  title: string
  contentType?: string
  estimatedDuration?: number | null
}

interface ModuleRow {
  id: string
  title: string
  description?: string | null
  lessons?: LessonRow[]
}

interface CourseProgressProps {
  enrollment: {
    id: string
    progressPercent: number
    lessonProgress?: { lessonId: string; status: string }[]
    course?: { id: string; title: string; modules?: ModuleRow[] }
  }
  /** Called when a lesson should be marked complete. */
  onCompleteLesson?: (lessonId: string) => Promise<void> | void
  /** Overrides the default navigation when opening a lesson. */
  onOpenLesson?: (lessonId: string) => void
}

function contentTypeLabel(type?: string) {
  if (type === 'video') return 'Video'
  if (type === 'document') return 'Document'
  if (type === 'external') return 'External link'
  return 'Reading'
}

export default function CourseProgress({
  enrollment,
  onCompleteLesson,
  onOpenLesson,
}: CourseProgressProps) {
  const [completingLesson, setCompletingLesson] = useState<string | null>(null)
  const router = useRouter()

  const openLesson = (lessonId: string) => {
    if (onOpenLesson) {
      onOpenLesson(lessonId)
      return
    }
    router.push(`/lessons/${lessonId}`)
  }

  const handleCompleteLesson = async (lessonId: string) => {
    try {
      setCompletingLesson(lessonId)
      if (onCompleteLesson) {
        await onCompleteLesson(lessonId)
      }
    } catch (err) {
      console.error('Failed to complete lesson:', err)
    } finally {
      setCompletingLesson(null)
    }
  }

  const getLessonProgress = (lessonId: string) => {
    return enrollment.lessonProgress?.find((lp) => lp.lessonId === lessonId)
  }

  const modules = enrollment.course?.modules ?? []
  const courseTitle = enrollment.course?.title ?? 'Course'

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{courseTitle}</h2>
          <span className="text-lg font-medium">
            {Math.round(enrollment.progressPercent)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full"
            style={{ width: `${enrollment.progressPercent}%` }}
          />
        </div>
      </div>

      {modules.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          This course has no content yet.
        </div>
      )}

      {modules.map((module) => (
        <div key={module.id} className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">{module.title}</h3>
            {module.description && (
              <p className="text-gray-600 text-sm mt-1">{module.description}</p>
            )}
          </div>

          <div className="p-4">
            <div className="space-y-3">
              {(module.lessons ?? []).map((lesson) => {
                const progress = getLessonProgress(lesson.id)
                const done = progress?.status === 'completed'

                return (
                  <div
                    key={lesson.id}
                    className="flex flex-wrap justify-between items-center gap-3 p-3 hover:bg-gray-50 rounded"
                  >
                    <div className="flex items-center min-w-0">
                      <div className="mr-3 shrink-0">
                        {done ? (
                          <span className="text-green-500">✓</span>
                        ) : progress?.status === 'in_progress' ? (
                          <span className="text-yellow-500">●</span>
                        ) : (
                          <span className="text-gray-300">○</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{lesson.title}</div>
                        <div className="text-sm text-gray-500">
                          {contentTypeLabel(lesson.contentType)}
                          {lesson.estimatedDuration
                            ? ` · ${lesson.estimatedDuration} min`
                            : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 shrink-0">
                      <Button
                        size="sm"
                        variant={done ? 'outline' : 'default'}
                        onClick={() => openLesson(lesson.id)}
                      >
                        {done ? 'Review' : 'Open lesson'}
                      </Button>
                      {/* Video lessons complete automatically once watched, so
                          a manual button here would be redundant and misleading.
                          Non-video lessons still use the button. */}
                      {!done && lesson.contentType !== 'video' && onCompleteLesson && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompleteLesson(lesson.id)}
                          disabled={completingLesson === lesson.id}
                        >
                          {completingLesson === lesson.id
                            ? 'Completing...'
                            : 'Mark Complete'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}

              {(module.lessons ?? []).length === 0 && (
                <p className="py-4 text-center text-gray-500">
                  No lessons in this module.
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
