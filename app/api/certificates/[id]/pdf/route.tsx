import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCertificateById } from '@/lib/certificate-utils'
import { renderToBuffer } from '@react-pdf/renderer'
import CertificateDocument from '@/lib/pdf-generator'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const certificate = await getCertificateById(params.id, session.user.id)
    
    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found or access denied' }, { status: 404 })
    }
    
    // Generate PDF
    const buffer = await renderToBuffer(<CertificateDocument certificate={certificate} />)
    
    // Return PDF as response
    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=certificate-${certificate.certificateNumber}.pdf`
      }
    })
    
    return response
  } catch (error) {
    console.error('Generate certificate PDF error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}