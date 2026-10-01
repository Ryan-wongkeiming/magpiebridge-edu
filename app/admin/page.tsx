'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { RequireAdmin } from '@/components/require-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Stats {
  courses: number
  published: number
  draft: number
  archived: number
  users: number
  activeUsers: number
  suspendedUsers: number
  enrollments: number
  certificates: number
  recentActivity: number
}

const SECTIONS = [
  {
    href: '/admin/courses',
    title: 'Courses',
    description: 'View, archive, restore, and delete courses across the platform.',
  },
  {
    href: '/admin/users',
    title: 'Users',
    description: 'Manage people, their roles, and their account status.',
  },
  {
    href: '/admin/assign',
    title: 'Assign Courses',
    description: 'Give a course to one or more learners directly.',
  },
  {
    href: '/admin/certificates',
    title: 'Certificates',
    description: 'Review issued certificates and revoke them when needed.',
  },
  {
    href: '/admin/settings',
    title: 'Settings',
    description: 'Configure how the platform behaves for everyone.',
  },
  {
    href: '/admin/audit',
    title: 'Activity',
    description: 'See a record of administrative actions.',
  },
]

export default function AdminHomePage() {
  return (
    <RequireAdmin>
      <AdminHome />
    </RequireAdmin>
  )
}

function AdminHome() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.roles?.includes('admin')) {
      router.push('/dashboard')
      return
    }

    loadStats()
  }, [session, status])

  const loadStats = async () => {
    try {
      setLoading(true)
      const [coursesRes, usersRes, auditRes] = await Promise.all([
        fetch('/api/admin/courses'),
        fetch('/api/admin/users'),
        fetch('/api/admin/audit?limit=200'),
      ])

      if (!coursesRes.ok || !usersRes.ok) {
        setError('Failed to load platform statistics')
        return
      }

      const coursesData = await coursesRes.json()
      const usersData = await usersRes.json()
      const auditData = auditRes.ok ? await auditRes.json() : { entries: [] }

      const courses = coursesData.courses as Array<{ status: string; enrollmentCount: number; certificateCount: number }>
      const users = usersData.users as Array<{ status: string }>

      setStats({
        courses: courses.length,
        published: courses.filter((c) => c.status === 'published').length,
        draft: courses.filter((c) => c.status === 'draft').length,
        archived: courses.filter((c) => c.status === 'archived').length,
        users: users.length,
        activeUsers: users.filter((u) => u.status === 'active').length,
        suspendedUsers: users.filter((u) => u.status !== 'active').length,
        enrollments: courses.reduce((n, c) => n + c.enrollmentCount, 0),
        certificates: courses.reduce((n, c) => n + c.certificateCount, 0),
        recentActivity: (auditData.entries ?? []).length,
      })
    } catch (err) {
      setError('Failed to load platform statistics')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading administration…</div>
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground mt-1">
          Manage courses, people, and platform behaviour.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Courses</CardDescription>
              <CardTitle className="text-3xl">{stats.courses}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {stats.published} published · {stats.draft} draft
              {stats.archived > 0 ? ` · ${stats.archived} archived` : ''}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Users</CardDescription>
              <CardTitle className="text-3xl">{stats.users}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {stats.activeUsers} active
              {stats.suspendedUsers > 0 ? ` · ${stats.suspendedUsers} suspended` : ''}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Enrollments</CardDescription>
              <CardTitle className="text-3xl">{stats.enrollments}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Across all courses
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Certificates</CardDescription>
              <CardTitle className="text-3xl">{stats.certificates}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Issued to learners
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-xl font-semibold">Manage</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
