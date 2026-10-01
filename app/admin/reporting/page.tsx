'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CourseRow {
  id: string
  title: string
  status: string
  enrolledCount: number
  completedCount: number
  completionRate: number
}

interface ReportingData {
  byCourse: CourseRow[]
  certsOverTime: Array<{ date: string; count: number }>
  summary: {
    totalLearners: number
    activeLearners: number
    totalCertificates: number
    totalEnrollments: number
    totalCompleted: number
    overallCompletionRate: number
  }
}

export default function AdminReportingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<ReportingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    fetchReporting()
  }, [session, status])

  const fetchReporting = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/reporting')
      if (res.status === 403) {
        setError('Admin access required.')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch reporting data')
      setData(await res.json())
    } catch (err) {
      console.error(err)
      setError('Failed to load reporting data')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="rounded-md bg-red-50 p-4 text-red-800">{error}</div>
      </div>
    )
  }

  if (!data) return null

  const { summary, byCourse, certsOverTime } = data

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Reporting Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Learners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary.totalLearners}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Learners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary.activeLearners}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary.totalEnrollments}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary.totalCompleted}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary.totalCertificates}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary.overallCompletionRate}%</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate by Course</CardTitle>
          </CardHeader>
          <CardContent>
            {byCourse.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses.</p>
            ) : (
              <div className="space-y-3">
                {byCourse.map((c) => (
                  <div key={c.id} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{c.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {c.completedCount}/{c.enrolledCount} ({c.completionRate}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${c.completionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certificates Issued (last 90 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {certsOverTime.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No certificates issued in the last 90 days.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {certsOverTime.reduce((n, d) => n + d.count, 0)} certificates
                  across {certsOverTime.length} days.
                </p>
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {[...certsOverTime].reverse().map((d) => (
                    <div
                      key={d.date}
                      className="flex justify-between text-sm border-b last:border-b-0 pb-1"
                    >
                      <span>{d.date}</span>
                      <span className="font-medium">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
