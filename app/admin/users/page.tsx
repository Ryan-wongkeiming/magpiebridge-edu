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

interface AdminUser {
  id: string
  name: string | null
  email: string | null
  status: string
  roles: string[]
  manager: { id: string; name: string | null; email: string | null } | null
  enrollmentCount: number
  certificateCount: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.roles?.includes('admin')) {
      router.push('/dashboard')
      return
    }

    fetchUsers()
  }, [session, status, roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (roleFilter !== 'all') params.set('role', roleFilter)

      const response = await fetch(`/api/admin/users?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setUsers(data.users)
        setAvailableRoles(data.availableRoles)
        setError('')
      } else {
        setError(data.error || 'Failed to load users')
      }
    } catch (err) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const toggleRole = async (user: AdminUser, role: string) => {
    const next = user.roles.includes(role)
      ? user.roles.filter((r) => r !== role)
      : [...user.roles, role]

    if (next.length === 0) {
      setError('A user must keep at least one role')
      return
    }

    try {
      setSavingId(user.id)
      setError('')
      setMessage('')

      const response = await fetch(`/api/admin/users/${user.id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: next }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update roles')
        return
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, roles: data.roles } : u))
      )
      setMessage(`Updated roles for ${user.name ?? user.email}`)
    } catch (err) {
      setError('Failed to update roles')
    } finally {
      setSavingId(null)
    }
  }

  const toggleStatus = async (user: AdminUser) => {
    const next = user.status === 'active' ? 'suspended' : 'active'

    try {
      setSavingId(user.id)
      setError('')
      setMessage('')

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update status')
        return
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: data.status } : u))
      )
      setMessage(`${data.name ?? data.email} is now ${data.status}.`)
    } catch (err) {
      setError('Failed to update status')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`Delete ${user.email} permanently? This cannot be undone.`)) {
      return
    }

    try {
      setSavingId(user.id)
      setError('')
      setMessage('')

      const response = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        await fetchUsers()
      } else {
        setError(data.error || 'Failed to delete user')
      }
    } catch (err) {
      setError('Failed to delete user')
    } finally {
      setSavingId(null)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading users…</div>
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-1">
          View platform users and manage their roles.
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
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {users.length} user{users.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-filter">Role</Label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All roles</option>
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline" onClick={fetchUsers}>
              Apply
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="text-right">Enrollments</TableHead>
                <TableHead className="text-right">Certificates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name ?? '—'}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        user.status === 'active'
                          ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
                          : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'
                      }
                    >
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {availableRoles.map((role) => {
                        const on = user.roles.includes(role)
                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={savingId === user.id}
                            onClick={() => toggleRole(user, role)}
                            className={
                              on
                                ? 'rounded-full border border-transparent bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground disabled:opacity-50'
                                : 'rounded-full border border-input px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50'
                            }
                            title={on ? `Remove ${role}` : `Add ${role}`}
                          >
                            {role}
                          </button>
                        )
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.manager?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">{user.enrollmentCount}</TableCell>
                  <TableCell className="text-right">{user.certificateCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingId === user.id}
                        onClick={() => toggleStatus(user)}
                      >
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={savingId === user.id}
                        onClick={() => handleDelete(user)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No users found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
