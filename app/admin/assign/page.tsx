'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CourseOption {
  id: string
  title: string
  status: string
}

interface LearnerOption {
  id: string
  name: string | null
  email: string | null
  roles: string[]
  enrollmentCount: number
}

export default function AdminAssignPage() {
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [learners, setLearners] = useState<LearnerOption[]>([])
  const [courseId, setCourseId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.roles?.includes('admin')) {
      router.push('/dashboard')
      return
    }

    loadData()
  }, [session, status])

  const loadData = async () => {
    try {
      setLoading(true)
      const [coursesRes, usersRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/admin/users'),
      ])

      const coursesData = await coursesRes.json()
      const usersData = await usersRes.json()

      if (!coursesRes.ok || !usersRes.ok) {
        setError('Failed to load courses or users')
        return
      }

      setCourses(coursesData)
      setLearners(
        (usersData.users as LearnerOption[]).filter((u) => u.roles.includes('learner'))
      )
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAssign = async () => {
    if (!courseId || selected.size === 0) {
      setError('Choose a course and at least one learner')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')

      const response = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, userIds: Array.from(selected) }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to assign course')
        return
      }

      setMessage(
        `${data.message}. Assigned: ${data.assigned}, already enrolled: ${data.skipped}.`
      )
      setSelected(new Set())
    } catch (err) {
      setError('Failed to assign course')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading…</div>
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Assign Courses</h1>
        <p className="text-muted-foreground mt-1">
          Assign a course to one or more learners. Assignments are recorded as
          instructor-assigned enrollments.
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
          <CardTitle>Assignment</CardTitle>
          <CardDescription>
            Pick a course, then select the learners who should receive it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="course">Course</Label>
            <select
              id="course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.status})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Learners</Label>
              <span className="text-sm text-muted-foreground">
                {selected.size} selected
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Learner</TableHead>
                  <TableHead className="text-right">Current enrollments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learners.map((learner) => (
                  <TableRow
                    key={learner.id}
                    className="cursor-pointer"
                    onClick={() => toggle(learner.id)}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(learner.id)}
                        onChange={() => toggle(learner.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{learner.name ?? '—'}</div>
                      <div className="text-sm text-muted-foreground">{learner.email}</div>
                    </TableCell>
                    <TableCell className="text-right">{learner.enrollmentCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {learners.length === 0 && (
              <p className="py-6 text-center text-muted-foreground">
                No learners found.
              </p>
            )}
          </div>

          <Button onClick={handleAssign} disabled={saving || !courseId || selected.size === 0}>
            {saving ? 'Assigning…' : `Assign to ${selected.size} learner(s)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
