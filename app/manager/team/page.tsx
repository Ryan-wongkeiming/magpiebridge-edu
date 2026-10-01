'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface TeamMember {
  id: string
  name: string
  email: string
  status: string
  enrolledCourseCount: number
  completedCourseCount: number
  inProgressCourseCount: number
  certificates: Array<{
    id: string
    certificateNumber: string
    courseTitle: string
    completionDate: string
  }>
  courses: Array<{
    enrollmentId: string
    courseId: string
    title: string
    status: string
    progressPercent: number
    completedAt: string | null
    certificate: { id: string; certificateNumber: string; status: string } | null
  }>
}

interface TeamResponse {
  summary: {
    reportsCount: number
    totalEnrollments: number
    totalCompleted: number
    totalCertificates: number
  }
  team: TeamMember[]
}

export default function ManagerTeamPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<TeamResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    fetchTeam()
  }, [session, status])

  const fetchTeam = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/manager/team')
      if (res.status === 403) {
        setError('You do not have manager access.')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch team')
      setData(await res.json())
    } catch (err) {
      console.error(err)
      setError('Failed to load team data')
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

  const { summary, team } = data

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">My Team</h1>
      <p className="text-muted-foreground mb-6">
        Direct reports and their learning progress.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary.reportsCount}</span>
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
      </div>

      {team.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          You have no direct reports.
        </div>
      ) : (
        <div className="space-y-4">
          {team.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {member.completedCourseCount} completed
                    </span>
                    <span className="text-muted-foreground">
                      {member.inProgressCourseCount} in progress
                    </span>
                    <span className="text-muted-foreground">
                      {member.certificates.length} certs
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedId(expandedId === member.id ? null : member.id)
                      }
                    >
                      {expandedId === member.id ? 'Hide' : 'View'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {expandedId === member.id && (
                <CardContent>
                  {member.courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Not enrolled in any courses.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {member.courses.map((c) => (
                        <div
                          key={c.enrollmentId}
                          className="flex items-center justify-between border-b pb-2 last:border-b-0"
                        >
                          <div>
                            <p className="font-medium">{c.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.status} · {c.progressPercent}% complete
                              {c.completedAt &&
                                ` · completed ${new Date(c.completedAt).toLocaleDateString()}`}
                              {c.certificate &&
                                ` · cert ${c.certificate.certificateNumber} (${c.certificate.status})`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
