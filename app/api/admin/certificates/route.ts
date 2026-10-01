import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isAdmin } from '@/lib/api-auth'

// GET /api/admin/certificates - Get all certificates with filtering
export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    
    // Build where clause for filtering
    const where: any = {}
    
    // Filter by status if not 'all'
    if (status !== 'all') {
      where.status = status
    }
    
    // Add search filter
    if (search) {
      where.OR = [
        {
          certificateData: {
            path: ['userName'],
            string_contains: search
          }
        },
        {
          certificateData: {
            path: ['courseTitle'],
            string_contains: search
          }
        },
        {
          certificateNumber: {
            contains: search
          }
        }
      ]
    }
    
    // Add date range filters
    if (dateFrom || dateTo) {
      where.completionDate = {}
      
      if (dateFrom) {
        where.completionDate.gte = new Date(dateFrom)
      }
      
      if (dateTo) {
        where.completionDate.lte = new Date(dateTo)
      }
    }
    
    // Fetch certificates with user and course data
    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        course: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        completionDate: 'desc'
      }
    })
    
    return NextResponse.json(certificates)
  } catch (error) {
    console.error('Get certificates error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
