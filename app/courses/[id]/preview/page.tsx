'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CourseDetail } from '@/types/api'

export default function CoursePreviewPage() {
  const [course, setCourse] = useState<CourseDetail | null>(null)
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
        setError(data.error || 'Failed to load course')
      }
    } catch (err) {
      setError('Failed to load course')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading preview…</div>
  }

  if (error || !course) {
    return (
      <div className="container py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Cannot preview this course</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const lessonCount =
    course.modules?.reduce((total, m) => total + (m.lessons?.length ?? 0), 0) ?? 0

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Preview mode.</strong> This is how learners will see the course once
        published. Actions that change progress are disabled.
      </div>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground mt-2">
            {course.description || 'No description provided.'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {course.modules?.length ?? 0} modules · {lessonCount} lessons · status{' '}
            <span className="capitalize">{course.status}</span>
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/courses/${course.id}/edit`)}>
          Back to editor
        </Button>
      </div>

      <div className="space-y-6">
        {course.modules?.map((module, moduleIndex) => (
          <Card key={module.id}>
            <CardHeader>
              <CardTitle>
                {moduleIndex + 1}. {module.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {module.description && (
                <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
              )}

              {module.lessons && module.lessons.length > 0 ? (
                <ul className="divide-y">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <li
                      key={lesson.id}
                      className="flex items-center justify-between py-3"
                    >
                      <span>
                        {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {lesson.contentType ?? 'text'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No lessons in this module yet.
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {(!course.modules || course.modules.length === 0) && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              This course has no modules yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
