'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
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

interface AdminCourse {
  id: string
  title: string
  description: string | null
  status: string
  visibility: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  archivedAt: string | null
  author: { id: string; name: string | null; email: string | null } | null
  manager: { id: string; name: string | null; email: string | null } | null
  moduleCount: number
  lessonCount: number
  enrollmentCount: number
  certificateCount: number
  quizCount: number
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    published: 'bg-green-100 text-green-800',
    draft: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-200 text-gray-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-800'
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.roles?.includes('admin')) {
      router.push('/dashboard')
      return
    }

    fetchCourses()
  }, [session, status, statusFilter])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)

      const response = await fetch(`/api/admin/courses?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setCourses(data.courses)
        setError('')
      } else {
        setError(data.error || 'Failed to load courses')
      }
    } catch (err) {
      setError('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async (course: AdminCourse) => {
    try {
      setBusyId(course.id)
      setError('')
      setMessage('')

      const response = await fetch(`/api/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        await fetchCourses()
      } else {
        setError(data.error || 'Failed to archive course')
      }
    } catch (err) {
      setError('Failed to archive course')
    } finally {
      setBusyId(null)
    }
  }

  const handleRestore = async (course: AdminCourse) => {
    try {
      setBusyId(course.id)
      setError('')
      setMessage('')

      const response = await fetch(`/api/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        await fetchCourses()
      } else {
        setError(data.error || 'Failed to restore course')
      }
    } catch (err) {
      setError('Failed to restore course')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (course: AdminCourse) => {
    if (!window.confirm(`Delete "${course.title}" permanently? This cannot be undone.`)) {
      return
    }

    try {
      setBusyId(course.id)
      setError('')
      setMessage('')

      const response = await fetch(`/api/admin/courses?id=${course.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        await fetchCourses()
      } else {
        setError(data.error || 'Failed to delete course')
      }
    } catch (err) {
      setError('Failed to delete course')
    } finally {
      setBusyId(null)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading courses…</div>
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage Courses</h1>
        <p className="text-muted-foreground mt-1">
          View, archive, restore, and delete courses across the platform.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}
      {message && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">{message}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>
            {courses.length} course{courses.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Course title"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <Button variant="outline" onClick={fetchCourses}>
              Apply
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Lessons</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
                <TableHead className="text-right">Certificates</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div className="font-medium">{course.title}</div>
                    <div className="text-sm text-muted-foreground">
                      Updated {new Date(course.updatedAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(course.status)}`}
                    >
                      {course.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{course.lessonCount}</TableCell>
                  <TableCell className="text-right">{course.enrollmentCount}</TableCell>
                  <TableCell className="text-right">{course.certificateCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {course.author?.name ?? course.author?.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/courses/${course.id}/edit`)}
                      >
                        Edit
                      </Button>
                      {course.status === 'published' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === course.id}
                          onClick={() => handleArchive(course)}
                        >
                          Archive
                        </Button>
                      )}
                      {course.status === 'archived' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === course.id}
                          onClick={() => handleRestore(course)}
                        >
                          Restore
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={busyId === course.id}
                        onClick={() => handleDelete(course)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {courses.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No courses found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
