'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import CourseProgress from '@/components/course-progress'

interface LessonRow {
  id: string
  title: string
  contentType?: string
  estimatedDuration?: number | null
}

interface EnrollmentRow {
  id: string
  status: string
  progressPercent: number
  course: {
    id: string
    title: string
    description?: string | null
    modules?: { id: string; title: string; description?: string | null; lessons?: LessonRow[] }[]
  }
  lessonProgress?: { lessonId: string; status: string }[]
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    fetchEnrollments()
  }, [session, status])

  const fetchEnrollments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/enrollments')
      const data = await response.json()

      if (response.ok) {
        setEnrollments(data)
        setSelectedId((prev) => prev ?? data[0]?.id ?? null)
      } else {
        setError(data.error || 'Failed to fetch enrollments')
      }
    } catch (err) {
      setError('Failed to fetch enrollments')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteLesson = async (lessonId: string) => {
    if (!selectedId) return

    await fetch('/api/lesson-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enrollmentId: selectedId,
        lessonId,
        status: 'completed',
      }),
    })

    await fetchEnrollments()
  }

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading your courses…</div>
  }

  const selected = enrollments.find((e) => e.id === selectedId) ?? null

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground mt-1">
            {enrollments.length} course{enrollments.length === 1 ? '' : 's'} enrolled
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/catalog')}>
          Browse catalog
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You are not enrolled in any courses yet.
            </p>
            <Button onClick={() => router.push('/catalog')}>Browse the catalog</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enrolled courses</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {enrollments.map((enrollment) => (
                    <button
                      key={enrollment.id}
                      type="button"
                      onClick={() => setSelectedId(enrollment.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 ${
                        enrollment.id === selectedId
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : ''
                      }`}
                    >
                      <div className="font-medium">{enrollment.course.title}</div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {Math.round(enrollment.progressPercent)}% complete
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            enrollment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : enrollment.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {statusLabel(enrollment.status)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {selected ? (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/enrollments/${selected.id}`)}
                  >
                    Open full page
                  </Button>
                </div>
                <CourseProgress
                  enrollment={selected}
                  onCompleteLesson={handleCompleteLesson}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select a course to see its lessons.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
