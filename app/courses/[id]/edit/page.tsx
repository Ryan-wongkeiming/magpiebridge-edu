'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import type { CourseDetail } from '@/types/api'

export default function CourseEditorPage() {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    fetchCourse()
  }, [session, status])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      const courseId = Array.isArray(params.id) ? params.id[0] : params.id
      const response = await fetch(`/api/courses/${courseId}`)
      const data = await response.json()

      if (response.ok) {
        setCourse(data)
      } else {
        setError(data.error || 'Failed to fetch course')
      }
    } catch (err) {
      setError('Failed to fetch course')
    } finally {
      setLoading(false)
    }
  }

  const courseId = () => (Array.isArray(params.id) ? params.id[0] : params.id)

  const handleSave = async () => {
    if (!course) return

    try {
      setSaving(true)
      setError('')
      setNotice('')

      const response = await fetch(`/api/courses/${courseId()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: course.title,
          description: course.description,
          status: course.status,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCourse((prev) => (prev ? { ...prev, ...data } : prev))
        setNotice('Course saved.')
      } else {
        setError(data.error || 'Failed to save course')
      }
    } catch (err) {
      setError('Failed to save course')
    } finally {
      setSaving(false)
    }
  }

  const handleAddModule = async () => {
    try {
      setError('')
      const response = await fetch(`/api/courses/${courseId()}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Module', description: '', required: true }),
      })

      const data = await response.json()

      if (response.ok) {
        await fetchCourse()
        setNotice(`Module "${data.title}" added.`)
      } else {
        setError(data.error || 'Failed to add module')
      }
    } catch (err) {
      setError('Failed to add module')
    }
  }

  const handleAddLesson = async (moduleId: string, moduleTitle: string) => {
    try {
      setError('')
      const response = await fetch(`/api/modules/${moduleId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `New lesson in ${moduleTitle}`,
          content: '',
          contentType: 'text',
          required: true,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        await fetchCourse()
        setNotice('Lesson added. Open it to edit its content.')
        router.push(`/lessons/${data.id}/edit`)
      } else {
        setError(data.error || 'Failed to add lesson')
      }
    } catch (err) {
      setError('Failed to add lesson')
    }
  }

  const moveModule = async (index: number, direction: -1 | 1) => {
    if (!course?.modules) return

    const next = [...course.modules]
    const target = index + direction
    if (target < 0 || target >= next.length) return

    ;[next[index], next[target]] = [next[target], next[index]]

    try {
      setError('')
      const response = await fetch(`/api/courses/${courseId()}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: next.map((m) => m.id) }),
      })

      const data = await response.json()

      if (response.ok) {
        setCourse((prev) => (prev ? { ...prev, modules: next } : prev))
        setNotice('Module order updated.')
      } else {
        setError(data.error || 'Failed to reorder modules')
      }
    } catch (err) {
      setError('Failed to reorder modules')
    }
  }

  const moveLesson = async (
    moduleId: string,
    lessonIndex: number,
    direction: -1 | 1
  ) => {
    if (!course?.modules) return

    const moduleIndex = course.modules.findIndex((m) => m.id === moduleId)
    if (moduleIndex < 0) return

    const lessons = course.modules[moduleIndex].lessons ?? []
    const target = lessonIndex + direction
    if (target < 0 || target >= lessons.length) return

    const nextLessons = [...lessons]
    ;[nextLessons[lessonIndex], nextLessons[target]] = [
      nextLessons[target],
      nextLessons[lessonIndex],
    ]

    try {
      setError('')
      const response = await fetch(`/api/modules/${moduleId}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: nextLessons.map((l) => l.id) }),
      })

      const data = await response.json()

      if (response.ok) {
        setCourse((prev) => {
          if (!prev?.modules) return prev
          const modules = [...prev.modules]
          modules[moduleIndex] = { ...modules[moduleIndex], lessons: nextLessons }
          return { ...prev, modules }
        })
        setNotice('Lesson order updated.')
      } else {
        setError(data.error || 'Failed to reorder lessons')
      }
    } catch (err) {
      setError('Failed to reorder lessons')
    }
  }

  const handlePublish = async () => {
    if (!course) return

    try {
      setSaving(true)
      setError('')
      const response = await fetch(`/api/courses/${courseId()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: course.title,
          description: course.description,
          status: 'published',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCourse((prev) => (prev ? { ...prev, ...data } : prev))
        setNotice('Course published.')
      } else {
        setError(data.error || 'Failed to publish course')
      }
    } catch (err) {
      setError('Failed to publish course')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (action: 'archive' | 'restore') => {
    try {
      setSaving(true)
      setError('')
      setNotice('')

      const response = await fetch(`/api/courses/${courseId()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (response.ok) {
        setCourse((prev) => (prev ? { ...prev, ...data.course } : prev))
        setNotice(data.message)
      } else {
        setError(data.error || `Failed to ${action} course`)
      }
    } catch (err) {
      setError(`Failed to ${action} course`)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading course…</div>
  }

  if (!course) {
    return (
      <div className="container py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Course Not Found</h2>
        <Button onClick={() => router.push('/courses')}>Back to Courses</Button>
      </div>
    )
  }

  const lessonCount =
    course.modules?.reduce((total, m) => total + (m.lessons?.length ?? 0), 0) ?? 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Editing: {course.title}</h1>
          <div className="flex items-center mt-2 gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
              {course.status}
            </span>
            <span className="text-sm text-muted-foreground">
              Last saved: {new Date(course.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/courses/${course.id}/preview`)}
          >
            Preview
          </Button>
          {course.status === 'draft' && (
            <Button onClick={handlePublish} disabled={saving}>
              Publish
            </Button>
          )}
          {course.status === 'published' && (
            <Button variant="outline" onClick={() => handleArchive('archive')} disabled={saving}>
              Archive
            </Button>
          )}
          {course.status === 'archived' && (
            <Button variant="outline" onClick={() => handleArchive('restore')} disabled={saving}>
              Restore to draft
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}
      {notice && (
        <div className="mb-6 rounded-md bg-green-50 p-4 text-sm text-green-800">{notice}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Course Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={course.title}
                  onChange={(e) => setCourse({ ...course, title: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={course.description || ''}
                  onChange={(e) => setCourse({ ...course, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Course Statistics</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Modules</span>
                <span className="font-medium">{course.modules?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lessons</span>
                <span className="font-medium">{lessonCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Enrollments</span>
                <span className="font-medium">{course.enrollments?.length ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Course Content</h2>
            <Button onClick={handleAddModule}>Add Module</Button>
          </div>

          <div className="space-y-6">
            {course.modules?.map((module, moduleIndex) => (
              <div key={module.id} className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                      {moduleIndex + 1}. {module.title}
                    </h3>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveModule(moduleIndex, -1)}
                        disabled={moduleIndex === 0}
                        title="Move up"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveModule(moduleIndex, 1)}
                        disabled={moduleIndex === (course.modules?.length ?? 1) - 1}
                        title="Move down"
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{module.description}</p>
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Lessons</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddLesson(module.id, module.title)}
                    >
                      Add Lesson
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {module.lessons?.map((lesson, lessonIndex) => (
                      <div
                        key={lesson.id}
                        className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                      >
                        <div>
                          <span className="font-medium">
                            {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                          </span>
                          {lesson.contentType && lesson.contentType !== 'text' && (
                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {lesson.contentType}
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveLesson(module.id, lessonIndex, -1)}
                            disabled={lessonIndex === 0}
                            title="Move up"
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveLesson(module.id, lessonIndex, 1)}
                            disabled={lessonIndex === (module.lessons?.length ?? 1) - 1}
                            title="Move down"
                          >
                            ↓
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/lessons/${lesson.id}/edit`)}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}

                    {(!module.lessons || module.lessons.length === 0) && (
                      <div className="text-center py-4 text-gray-500">
                        No lessons in this module
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(!course.modules || course.modules.length === 0) && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500 mb-4">No modules in this course yet</p>
                <Button onClick={handleAddModule}>Add Your First Module</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
