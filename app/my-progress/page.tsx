'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CourseProgressRow {
  enrollmentId: string
  courseId: string
  title: string
  status: string
  progressPercent: number
  totalLessons: number
  completedLessons: number
  requiredLessons: number
  requiredCompleted: number
  bestQuizScore: number | null
  quizPassed: boolean
  enrolledAt: string
  completedAt: string | null
  certificate: {
    id: string
    certificateNumber: string
    status: string
    completionDate: string
  } | null
}

interface Summary {
  totalCourses: number
  completed: number
  inProgress: number
  notStarted: number
  certificatesEarned: number
  totalLessonsCompleted: number
  averageProgress: number
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

export default function MyProgressPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [courses, setCourses] = useState<CourseProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    fetchProgress()
  }, [session, status])

  const fetchProgress = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/me/progress')
      const data = await response.json()

      if (response.ok) {
        setSummary(data.summary)
        setCourses(data.courses)
      } else {
        setError(data.error || 'Failed to load progress')
      }
    } catch (err) {
      setError('Failed to load progress')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading your progress…</div>
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Progress</h1>
        <p className="text-muted-foreground mt-1">
          A summary of everything you are enrolled in.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {summary && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Courses', value: summary.totalCourses },
            { label: 'Completed', value: summary.completed },
            { label: 'In progress', value: summary.inProgress },
            { label: 'Lessons done', value: summary.totalLessonsCompleted },
            { label: 'Certificates', value: summary.certificatesEarned },
            { label: 'Avg progress', value: `${summary.averageProgress}%` },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Course progress</CardTitle>
          <CardDescription>
            {courses.length} course{courses.length === 1 ? '' : 's'} enrolled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground mb-4">
                You are not enrolled in any courses yet.
              </p>
              <Button onClick={() => router.push('/catalog')}>Browse the catalog</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                  <TableHead className="text-right">Lessons</TableHead>
                  <TableHead className="text-right">Quiz</TableHead>
                  <TableHead>Certificate</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.enrollmentId}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell className="capitalize">{statusLabel(course.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${course.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-sm">{Math.round(course.progressPercent)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {course.completedLessons}/{course.totalLessons}
                    </TableCell>
                    <TableCell className="text-right">
                      {course.bestQuizScore === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span>
                          {Math.round(course.bestQuizScore)}%{' '}
                          {course.quizPassed ? '✓' : '✗'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {course.certificate ? (
                        <Link
                          href={`/dashboard/certificates/${course.certificate.id}`}
                          className="underline"
                        >
                          {course.certificate.status === 'active' ? 'View' : 'Revoked'}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/enrollments/${course.enrollmentId}`)}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
