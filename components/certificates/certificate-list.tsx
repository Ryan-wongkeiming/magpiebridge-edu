import React from 'react'
import { CertificateCard } from '@/components/certificates/certificate-card'
import type { CertificateLike } from '@/lib/certificate-data'

interface CertificateListProps {
  certificates: CertificateLike[]
  onView?: (certificate: CertificateLike) => void
  onDownload?: (certificate: CertificateLike) => void
}

export function CertificateList({ certificates, onView, onDownload }: CertificateListProps) {
  // Ensure certificates is always an array to prevent runtime errors
  const safeCertificates = Array.isArray(certificates) ? certificates : []

  if (safeCertificates.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No certificates found.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {safeCertificates.map((certificate) => (
        <CertificateCard
          key={certificate.id}
          certificate={certificate}
          onView={onView}
          onDownload={onDownload}
        />
      ))}
    </div>
  )
}