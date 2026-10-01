import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CertificateLike } from '@/lib/certificate-data'
import { format } from 'date-fns'
import { getCertificateData } from '@/lib/certificate-data'

interface CertificateDetailsProps {
  certificate: CertificateLike
  onDownload?: (certificate: CertificateLike) => void
}

export function CertificateDetails({ certificate, onDownload }: CertificateDetailsProps) {
  const data = getCertificateData(certificate)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Certificate Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold">Course Information</h3>
            <p className="text-muted-foreground">{data.courseTitle || 'Course Title'}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Certificate Number</h3>
            <p className="text-muted-foreground">{certificate.certificateNumber}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Issued To</h3>
            <p className="text-muted-foreground">{data.userName || 'User Name'}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Completion Date</h3>
            <p className="text-muted-foreground">
              {format(new Date(certificate.completionDate), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          {onDownload && (
            <Button onClick={() => onDownload(certificate)}>
              Download Certificate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}