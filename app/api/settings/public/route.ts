import { NextResponse } from 'next/server'
import { getSetting } from '@/lib/settings'

/**
 * GET /api/settings/public
 *
 * The small set of settings the client needs in order to display the same
 * rules the server enforces, plus the support email shown on the login page.
 * This route is intentionally public (no auth) because these values are
 * display/config only — not secrets — and the login page needs them before
 * the user has signed in.
 */
export async function GET() {
  try {
    const threshold = await getSetting('learning.completionThresholdPercent')
    const platformName = await getSetting('platform.name')
    const allowSelfEnrollment = await getSetting('learning.allowSelfEnrollment')
    const supportEmail = await getSetting('platform.supportEmail')

    return NextResponse.json({
      completionThresholdPercent:
        typeof threshold === 'number' && threshold > 0 ? threshold : 90,
      platformName: typeof platformName === 'string' ? platformName : 'MagpieBridge-Edu',
      allowSelfEnrollment: allowSelfEnrollment !== false,
      supportEmail: typeof supportEmail === 'string' ? supportEmail : '',
    })
  } catch (error) {
    console.error('Public settings error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
