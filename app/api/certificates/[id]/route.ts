import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCertificateById } from '@/lib/certificate-utils'

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
    
    return NextResponse.json(certificate)
  } catch (error) {
    console.error('Get certificate error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}