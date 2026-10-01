'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface LearnerRow {
  enrollmentId: string
  userId: string
  name: string | null
  email: string | null
  status: string
  progressPercent: number
  completedLessons: number
  totalLessons: number
  latestQuizScore: number | null
  latestQuizPassed: boolean | null
  certificateStatus: string | null
  enrolledAt: string
  completedAt: string | null
}

interface CourseProgress {
  courseId: string
  title: string
  status: string
  totalLessons: number
  learnerCount: number
  completedCount: number
  inProgressCount: number
  notStartedCount: number
  completionRate: number
  learners: LearnerRow[]
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

export default function InstructorProgressPage() {
  const [courses, setCourses] = useState<CourseProgress[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    const roles = session?.user?.roles ?? []
    if (!roles.includes('instructor') && !roles.includes('admin')) {
      router.push('/dashboard')
      return
    }

    fetchProgress()
  }, [session, status])

  const fetchProgress = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/instructor/progress')
      const data = await response.json()

      if (response.ok) {
        setCourses(data.courses)
        setSelectedCourseId(data.courses[0]?.courseId ?? null)
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
    return <div className="container py-8">Loading progress…</div>
  }

  const selected = courses.find((c) => c.courseId === selectedCourseId)

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Learner Progress</h1>
        <p className="text-muted-foreground mt-1">
          Enrolment and completion status for the courses you manage.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You do not manage any courses yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Courses you manage</CardDescription>
                <CardTitle className="text-3xl">{courses.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total learners</CardDescription>
                <CardTitle className="text-3xl">
                  {courses.reduce((n, c) => n + c.learnerCount, 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl">
                  {courses.reduce((n, c) => n + c.completedCount, 0)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>By course</CardTitle>
              <CardDescription>Select a course to see its learner roster.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Learners</TableHead>
                    <TableHead className="text-right">In progress</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Completion rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow
                      key={course.courseId}
                      onClick={() => setSelectedCourseId(course.courseId)}
                      className={
                        course.courseId === selectedCourseId
                          ? 'cursor-pointer bg-muted/60'
                          : 'cursor-pointer'
                      }
                    >
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell className="capitalize">{course.status}</TableCell>
                      <TableCell className="text-right">{course.learnerCount}</TableCell>
                      <TableCell className="text-right">{course.inProgressCount}</TableCell>
                      <TableCell className="text-right">{course.completedCount}</TableCell>
                      <TableCell className="text-right">{course.completionRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardHeader>
                <CardTitle>{selected.title} — learners</CardTitle>
                <CardDescription>
                  {selected.learnerCount} enrolled · {selected.completedCount} completed ·{' '}
                  {selected.inProgressCount} in progress · {selected.notStartedCount} not started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 max-w-xs space-y-2">
                  <Label htmlFor="course-picker">Course</Label>
                  <select
                    id="course-picker"
                    value={selectedCourseId ?? ''}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {courses.map((c) => (
                      <option key={c.courseId} value={c.courseId}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Learner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Progress</TableHead>
                      <TableHead className="text-right">Lessons</TableHead>
                      <TableHead className="text-right">Quiz</TableHead>
                      <TableHead>Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.learners.map((learner) => (
                      <TableRow key={learner.enrollmentId}>
                        <TableCell>
                          <div className="font-medium">{learner.name ?? '—'}</div>
                          <div className="text-sm text-muted-foreground">{learner.email}</div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {statusLabel(learner.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${learner.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-sm">{Math.round(learner.progressPercent)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {learner.completedLessons}/{learner.totalLessons}
                        </TableCell>
                        <TableCell className="text-right">
                          {learner.latestQuizScore === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span>
                              {Math.round(learner.latestQuizScore)}%{' '}
                              {learner.latestQuizPassed ? '✓' : '✗'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {learner.certificateStatus ? (
                            <span className="capitalize">{learner.certificateStatus}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {selected.learners.length === 0 && (
                  <p className="py-8 text-center text-muted-foreground">
                    No learners enrolled in this course yet.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
