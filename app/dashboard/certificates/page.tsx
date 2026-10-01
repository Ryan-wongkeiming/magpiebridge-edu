'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CertificateList } from '@/components/certificates/certificate-list'
import type { CertificateLike } from '@/lib/certificate-data'

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateLike[]>([])
  const router = useRouter()

  useEffect(() => {
    fetchCertificates()
  }, [])

  const fetchCertificates = async () => {
    try {
      const res = await fetch('/api/certificates')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setCertificates(Array.isArray(data) ? data : data.certificates || [])
    } catch (err) {
      console.error(err)
      setCertificates([])
    }
  }

  // Navigate to the certificate detail page, which has the download button
  // and the full certificate rendering.
  const handleView = (certificate: CertificateLike) => {
    router.push(`/dashboard/certificates/${certificate.id}`)
  }

  // Trigger a PDF download directly via the download endpoint. Opening the
  // URL in the same tab would navigate away; using a programmatic fetch +
  // object URL keeps the learner on the list page.
  const handleDownload = async (certificate: CertificateLike) => {
    try {
      const res = await fetch(`/api/certificates/${certificate.id}/download`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${certificate.certificateNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">My Certificates</h1>
      <CertificateList
        certificates={certificates}
        onView={handleView}
        onDownload={handleDownload}
      />
    </div>
  )
}
