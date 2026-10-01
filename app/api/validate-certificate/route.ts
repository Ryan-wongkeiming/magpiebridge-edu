import { NextResponse } from 'next/server'
import { validateCertificateByNumber } from '@/lib/certificate-utils'

type CertificateData = {
  courseTitle?: string
  userName?: string
  institutionName?: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const certificateNumber = searchParams.get('certificateNumber')

    if (!certificateNumber) {
      return NextResponse.json({ error: 'Certificate number is required' }, { status: 400 })
    }

    const certificate = await validateCertificateByNumber(certificateNumber)

    if (!certificate) {
      return NextResponse.json({ valid: false, error: 'Certificate not found' }, { status: 404 })
    }

    const certificateData = (certificate.certificateData ?? {}) as CertificateData

    if (certificate.status !== 'active') {
      return NextResponse.json({
        valid: false,
        error: 'Certificate has been revoked',
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          courseTitle: certificateData.courseTitle,
          userName: certificateData.userName,
          completionDate: certificate.completionDate,
          institutionName: certificateData.institutionName,
          status: certificate.status,
          revokedAt: certificate.revokedAt
        }
      })
    }

    return NextResponse.json({
      valid: true,
      certificate: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        courseTitle: certificateData.courseTitle,
        userName: certificateData.userName,
        completionDate: certificate.completionDate,
        institutionName: certificateData.institutionName
      }
    })
  } catch (error) {
    console.error('Validate certificate error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}