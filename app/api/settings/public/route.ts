import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/api-auth'
import { getSetting } from '@/lib/settings'

/**
 * GET /api/settings/public
 *
 * The small set of settings the client needs in order to display the same
 * rules the server enforces. Kept deliberately minimal: no admin-only values.
 */
export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const threshold = await getSetting('learning.completionThresholdPercent')
    const platformName = await getSetting('platform.name')
    const allowSelfEnrollment = await getSetting('learning.allowSelfEnrollment')

    return NextResponse.json({
      completionThresholdPercent:
        typeof threshold === 'number' && threshold > 0 ? threshold : 90,
      platformName: typeof platformName === 'string' ? platformName : 'MagpieBridge-Edu',
      allowSelfEnrollment: allowSelfEnrollment !== false,
    })
  } catch (error) {
    console.error('Public settings error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
