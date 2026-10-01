import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserCertificates } from '@/lib/certificate-utils'

export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    const certificates = await getUserCertificates(session.user.id)
    
    // Apply pagination
    const paginatedCertificates = certificates.slice(skip, skip + limit)
    
    return NextResponse.json({
      certificates: paginatedCertificates,
      totalCount: certificates.length,
      currentPage: page,
      totalPages: Math.ceil(certificates.length / limit)
    })
  } catch (error) {
    console.error('Get user certificates error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}