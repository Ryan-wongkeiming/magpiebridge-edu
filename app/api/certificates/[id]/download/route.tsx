import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isAdmin, canEditCourse } from '@/lib/api-auth'
import { pdf } from '@react-pdf/renderer'
import CertificateDocument from '@/lib/pdf-generator'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await getSessionUser()

    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get certificate with the owning course so canEditCourse can decide.
    const certificate = await prisma.certificate.findUnique({
      where: { id: params.id },
      include: {
        course: true,
        user: true
      }
    })

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    // The learner themselves, an admin, or the author/manager of the course
    // the certificate was earned for. A blanket instructor check would let
    // any instructor download any learner's certificate, even for courses
    // they do not teach.
    const canView =
      certificate.userId === actor.id || isAdmin(actor) || await canEditCourse(actor, certificate.courseId)

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Generate PDF
    const asPdf = pdf(<CertificateDocument certificate={certificate} />)
    const blob = await asPdf.toBlob()
    
    // Convert Blob to Buffer
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Return PDF as response
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${certificate.certificateNumber}.pdf"`,
        'Content-Length': buffer.length.toString(),
      },
    })
    
    return response
  } catch (error) {
    console.error('Download certificate error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}