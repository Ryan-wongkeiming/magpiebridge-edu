'use client'

import { useState, useEffect } from 'react'
import { CertificateList } from '@/components/certificates/certificate-list'
import { CertificateDetails } from '@/components/certificates/certificate-details'
import EnrollmentDashboard from '@/components/enrollment-dashboard'
import ResumeCard from '@/components/resume-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CertificateLike } from '@/lib/certificate-data'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'enrollments' | 'certificates'>('enrollments')
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [certificates, setCertificates] = useState<CertificateLike[]>([])
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null)
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateLike | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [enrollmentsRes, certificatesRes] = await Promise.all([
          fetch('/api/enrollments'),
          fetch('/api/certificates')
        ])

        if (!enrollmentsRes.ok || !certificatesRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const enrollmentsData = await enrollmentsRes.json()
        const certificatesData = await certificatesRes.json()

        setEnrollments(enrollmentsData)
        setCertificates(certificatesData)

        if (enrollmentsData.length > 0 && !selectedEnrollmentId) {
          setSelectedEnrollmentId(enrollmentsData[0].id)
        }
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleViewCertificate = (certificate: CertificateLike) => {
    setSelectedCertificate(certificate)
    setActiveTab('certificates')
  }

  const handleCompleteLesson = async (lessonId: string) => {
    if (!selectedEnrollmentId) return

    await fetch('/api/lesson-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enrollmentId: selectedEnrollmentId,
        lessonId,
        status: 'completed',
      }),
    })

    const response = await fetch('/api/enrollments')
    if (response.ok) {
      setEnrollments(await response.json())
    }
  }

  const handleDownloadCertificate = async (certificate: CertificateLike) => {
    try {
      const res = await fetch(`/api/certificates/${certificate.id}/download`)
      if (!res.ok) throw new Error('Failed to download certificate')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${certificate.certificateNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download certificate:', err)
      alert('Failed to download certificate')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p>Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex space-x-4">
            <Button
              variant={activeTab === 'enrollments' ? 'default' : 'outline'}
              onClick={() => setActiveTab('enrollments')}
            >
              My Courses
            </Button>
            <Button
              variant={activeTab === 'certificates' ? 'default' : 'outline'}
              onClick={() => setActiveTab('certificates')}
            >
              My Certificates
            </Button>
          </div>
        </div>
      </header>
      
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {activeTab === 'enrollments' ? (
            <div className="space-y-6">
              <ResumeCard enrollments={enrollments} />
              <EnrollmentDashboard
                enrollments={enrollments}
                onSelectEnrollment={setSelectedEnrollmentId}
                selectedEnrollmentId={selectedEnrollmentId}
                onCompleteLesson={handleCompleteLesson}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {selectedCertificate ? (
                <div className="space-y-6">
                  <Button variant="outline" onClick={() => setSelectedCertificate(null)}>
                    ← Back to Certificates
                  </Button>
                  <CertificateDetails
                    certificate={selectedCertificate}
                    onDownload={handleDownloadCertificate}
                  />
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>My Certificates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CertificateList
                      certificates={certificates}
                      onView={handleViewCertificate}
                      onDownload={handleDownloadCertificate}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}