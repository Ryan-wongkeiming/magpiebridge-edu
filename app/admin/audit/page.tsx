'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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

interface AuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  details: unknown
  createdAt: string
  user: { id: string; name: string | null; email: string | null } | null
}

function actionBadge(action: string) {
  const map: Record<string, string> = {
    Created: 'bg-green-100 text-green-800',
    Updated: 'bg-blue-100 text-blue-800',
    Deleted: 'bg-red-100 text-red-800',
    Published: 'bg-emerald-100 text-emerald-800',
    Revoked: 'bg-amber-100 text-amber-800',
  }
  return map[action] ?? 'bg-gray-100 text-gray-800'
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
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

    fetchAudit()
  }, [session, status])

  const fetchAudit = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/audit?limit=200')
      const data = await response.json()

      if (response.ok) {
        setEntries(data.entries)
      } else {
        setError(data.error || 'Failed to load audit log')
      }
    } catch (err) {
      setError('Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading activity…</div>
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Activity Log</h1>
          <p className="text-muted-foreground mt-1">
            Administrative actions recorded on the platform.
          </p>
        </div>
        <Button variant="outline" onClick={fetchAudit}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              No activity recorded yet. Actions such as role changes, course
              archiving, and settings updates will appear here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionBadge(entry.action)}`}
                      >
                        {entry.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{entry.entityType}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.user?.name ?? entry.user?.email ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                      {entry.details ? JSON.stringify(entry.details) : '—'}
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
