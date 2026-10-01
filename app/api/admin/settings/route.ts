import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isAdmin } from '@/lib/api-auth'
import { recordAudit } from '@/lib/audit'
import { SETTING_DEFINITIONS, getAllSettings, coerceSetting } from '@/lib/settings'

// GET /api/admin/settings - Every known setting with its current value
export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settings = await getAllSettings()

    const categories = Array.from(new Set(settings.map((s) => s.category)))

    return NextResponse.json({
      settings,
      categories,
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// PUT /api/admin/settings - Update one or more settings
export async function PUT(request: Request) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Expected an object of key/value pairs' },
        { status: 400 }
      )
    }

    const updates: Array<{ key: string; value: unknown }> = []
    const errors: string[] = []

    for (const [key, value] of Object.entries(body)) {
      const def = SETTING_DEFINITIONS.find((d) => d.key === key)

      if (!def) {
        errors.push(`Unknown setting: ${key}`)
        continue
      }

      const coerced = coerceSetting(def, value)

      if (coerced === null) {
        errors.push(`${def.label} expects a ${def.type} value`)
        continue
      }

      updates.push({ key, value: coerced })
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
    }

    await prisma.$transaction(
      updates.map(({ key, value }) => {
        const def = SETTING_DEFINITIONS.find((d) => d.key === key)!
        return prisma.setting.upsert({
          where: { key },
          create: {
            key,
            value: value as never,
            category: def.category,
            label: def.label,
            description: def.description,
            updatedById: user.id,
          },
          update: {
            value: value as never,
            updatedById: user.id,
          },
        })
      })
    )

    await recordAudit({
      action: 'Updated',
      entityType: 'Setting',
      userId: user.id,
      details: { keys: updates.map((u) => u.key) },
    })

    const settings = await getAllSettings()
    return NextResponse.json({ settings, updated: updates.length })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
