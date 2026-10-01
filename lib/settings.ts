import { prisma } from '@/lib/prisma'

export interface SettingDefinition {
  key: string
  category: 'general' | 'certificates' | 'learning' | 'notifications'
  label: string
  description: string
  type: 'string' | 'number' | 'boolean'
  default: string | number | boolean
}

/**
 * The settings the platform understands. Adding one here makes it appear on
 * the admin settings screen with its default; no migration is needed because
 * values are stored as key/value rows.
 */
export const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: 'platform.name',
    category: 'general',
    label: 'Platform name',
    description: 'Shown in the navigation bar and page titles.',
    type: 'string',
    default: 'MagpieBridge-Edu',
  },
  {
    key: 'platform.supportEmail',
    category: 'general',
    label: 'Support email',
    description: 'Where learners are told to write for help.',
    type: 'string',
    default: '',
  },
  {
    key: 'learning.completionThresholdPercent',
    category: 'learning',
    label: 'Video completion threshold (%)',
    description:
      'How much of a video must be watched before a lesson completes automatically.',
    type: 'number',
    default: 90,
  },
  {
    key: 'learning.allowSelfEnrollment',
    category: 'learning',
    label: 'Allow self-enrollment',
    description:
      'When off, learners cannot enroll themselves; an admin must assign courses.',
    type: 'boolean',
    default: true,
  },
  {
    key: 'certificates.autoIssue',
    category: 'certificates',
    label: 'Issue certificates automatically',
    description:
      'Issue a certificate when a learner completes all lessons and passes the required quizzes.',
    type: 'boolean',
    default: true,
  },
  {
    key: 'certificates.validityMonths',
    category: 'certificates',
    label: 'Certificate validity (months)',
    description: '0 means certificates do not expire.',
    type: 'number',
    default: 0,
  },
  {
    key: 'notifications.passwordResetEnabled',
    category: 'notifications',
    label: 'Password reset enabled',
    description:
      'Allows learners to request a reset link. Requires a working mail provider to actually deliver it.',
    type: 'boolean',
    default: true,
  },
]

export type SettingValue = string | number | boolean

/** Returns every known setting, falling back to its default when unset. */
export async function getAllSettings(): Promise<
  Array<SettingDefinition & { value: SettingValue }>
> {
  const rows = await prisma.setting.findMany()
  const stored = new Map(rows.map((r) => [r.key, r.value]))

  return SETTING_DEFINITIONS.map((def) => {
    const raw = stored.get(def.key)
    return {
      ...def,
      value: raw === undefined ? def.default : (raw as SettingValue),
    }
  })
}

/** Reads one setting, or its default when unset. */
export async function getSetting(key: string): Promise<SettingValue | undefined> {
  const def = SETTING_DEFINITIONS.find((d) => d.key === key)
  const row = await prisma.setting.findUnique({ where: { key } })

  if (row) return row.value as SettingValue
  return def?.default
}

/** Coerces a submitted value to the type its definition declares. */
export function coerceSetting(
  def: SettingDefinition,
  value: unknown
): SettingValue | null {
  if (def.type === 'boolean') {
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
    return null
  }
  if (def.type === 'number') {
    const n = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(n) ? n : null
  }
  if (typeof value === 'string') return value
  return null
}
