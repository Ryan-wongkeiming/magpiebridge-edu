/** Shape of the JSON stored in Certificate.certificateData. */
export interface CertificateData {
  courseTitle?: string
  courseDescription?: string
  userName?: string
  userEmail?: string
  instructorName?: string
  institutionName?: string
  issueDate?: string | Date
  completionDate?: string | Date
}

/**
 * Certificate as returned by the API routes (JSON), where dates arrive as
 * strings and relation fields may be absent.
 */
export interface CertificateLike {
  id: string
  certificateNumber: string
  completionDate: string | Date
  issuedDate?: string | Date
  status: string
  revokedAt?: string | Date | null
  certificateData?: unknown
}

/** Reads Certificate.certificateData as a typed object. */
export function getCertificateData(
  certificate: Pick<CertificateLike, 'certificateData'>
): CertificateData {
  if (
    certificate.certificateData &&
    typeof certificate.certificateData === 'object' &&
    !Array.isArray(certificate.certificateData)
  ) {
    return certificate.certificateData as CertificateData
  }
  return {}
}
