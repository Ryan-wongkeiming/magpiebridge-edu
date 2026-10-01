import { NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/api-auth'
import { listAudit } from '@/lib/audit'

// GET /api/admin/audit - Recent administrative activity
export async function GET(request: Request) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? 100) || 100, 500)

    const entries = await listAudit(limit)

    return NextResponse.json({ entries, total: entries.length })
  } catch (error) {
    console.error('Audit list error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
