import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CertificateLike } from '@/lib/certificate-data'
import { format } from 'date-fns'
import { getCertificateData } from '@/lib/certificate-data'

interface CertificateCardProps {
  certificate: CertificateLike
  onView?: (certificate: CertificateLike) => void
  onDownload?: (certificate: CertificateLike) => void
}

export function CertificateCard({ certificate, onView, onDownload }: CertificateCardProps) {
  const data = getCertificateData(certificate)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Certificate</span>
          <span className="text-sm font-normal text-muted-foreground">
            {certificate.certificateNumber}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">{data.courseTitle || 'Course Title'}</h3>
          <p className="text-sm text-muted-foreground">
            Completed on {format(new Date(certificate.completionDate), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(certificate)}>
              View
            </Button>
          )}
          {onDownload && (
            <Button size="sm" onClick={() => onDownload(certificate)}>
              Download
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}