import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isAdmin } from '@/lib/api-auth'

// PATCH /api/admin/certificates/[id] - Revoke a certificate
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get the action from the request body
    const { action } = await request.json()

    if (action !== 'revoke') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Find the certificate
    const certificate = await prisma.certificate.findUnique({
      where: { id: params.id }
    })

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    // Update the certificate status to 'revoked'
    const updatedCertificate = await prisma.certificate.update({
      where: { id: params.id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedByUserId: session.id
      }
    })

    return NextResponse.json({
      message: 'Certificate revoked successfully',
      certificate: updatedCertificate
    })
  } catch (error) {
    console.error('Revoke certificate error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
