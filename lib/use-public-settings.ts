'use client'

import { useEffect, useState } from 'react'

export interface PublicSettings {
  completionThresholdPercent: number
  platformName: string
  allowSelfEnrollment: boolean
}

const FALLBACK: PublicSettings = {
  completionThresholdPercent: 90,
  platformName: 'MagpieBridge-Edu',
  allowSelfEnrollment: true,
}

/**
 * Reads the settings the client needs to display the same rules the server
 * enforces. Falls back to defaults so a failed fetch never blocks rendering.
 */
export function usePublicSettings(): PublicSettings {
  const [settings, setSettings] = useState<PublicSettings>(FALLBACK)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch('/api/settings/public')
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) {
          setSettings({
            completionThresholdPercent:
              typeof data.completionThresholdPercent === 'number'
                ? data.completionThresholdPercent
                : FALLBACK.completionThresholdPercent,
            platformName: data.platformName ?? FALLBACK.platformName,
            allowSelfEnrollment: data.allowSelfEnrollment !== false,
          })
        }
      } catch {
        // Keep the defaults.
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return settings
}
