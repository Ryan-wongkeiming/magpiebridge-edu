import { toEmbed } from '@/lib/video-embed'

/**
 * Server-side check for whether a video may actually be played inside the
 * platform.
 *
 * Converting a watch URL into an embed URL is not enough: a video owner can
 * disable "playback on other websites", in which case the embed URL still loads
 * but the player shows the owner's error. Both YouTube and Vimeo report that
 * condition through oEmbed with HTTP 401.
 *
 * Results are cached per process, because embedding permission changes rarely
 * and this sits on the lesson-completion path.
 */

const CACHE_TTL_MS = 60 * 60 * 1000
const cache = new Map<string, { at: number; canEmbed: boolean }>()

export interface EmbeddingPermission {
  /** True when the video can be played inside the platform. */
  canEmbed: boolean
  /** True when the owner has specifically disabled playback elsewhere. */
  blockedByOwner: boolean
  /**
   * True when the platform can measure how much of the video was watched.
   * Only YouTube is instrumented, so other providers must fall back to an
   * acknowledgement rather than a threshold that could never be reached.
   */
  canTrackProgress: boolean
}

function readCache(key: string): boolean | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return hit.canEmbed
}

function writeCache(key: string, canEmbed: boolean) {
  if (cache.size > 500) {
    let oldestKey: string | null = null
    let oldestAt = Number.POSITIVE_INFINITY
    cache.forEach((entry, entryKey) => {
      if (entry.at < oldestAt) {
        oldestAt = entry.at
        oldestKey = entryKey
      }
    })
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(key, { at: Date.now(), canEmbed })
}

export async function checkEmbeddingPermission(
  contentUrl: string | null | undefined
): Promise<EmbeddingPermission> {
  const embed = toEmbed(contentUrl)

  // No embeddable form at all: the learner opens it elsewhere.
  if (!embed?.embedUrl) {
    return { canEmbed: false, blockedByOwner: false, canTrackProgress: false }
  }

  const key = embed.originalUrl
  const cached = readCache(key)
  if (cached !== null) {
    return {
      canEmbed: cached,
      blockedByOwner: !cached,
      canTrackProgress: cached && embed.provider === 'youtube',
    }
  }

  // Non-YouTube/Vimeo sources cannot be interrogated; trust the URL conversion.
  if (embed.provider !== 'youtube' && embed.provider !== 'vimeo') {
    writeCache(key, true)
    return { canEmbed: true, blockedByOwner: false, canTrackProgress: false }
  }

  const endpoint =
    embed.provider === 'youtube'
      ? `https://www.youtube.com/oembed?url=${encodeURIComponent(embed.watchUrl ?? embed.originalUrl)}&format=json`
      : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(embed.watchUrl ?? embed.originalUrl)}`

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    })

    if (response.status === 401) {
      writeCache(key, false)
      return { canEmbed: false, blockedByOwner: true, canTrackProgress: false }
    }

    if (response.status === 404) {
      // Private, deleted, or otherwise unavailable.
      writeCache(key, false)
      return { canEmbed: false, blockedByOwner: true, canTrackProgress: false }
    }

    if (response.ok) {
      writeCache(key, true)
      return {
        canEmbed: true,
        blockedByOwner: false,
        canTrackProgress: embed.provider === 'youtube',
      }
    }

    // An unexpected status: do not block the learner on an API hiccup.
    return {
      canEmbed: true,
      blockedByOwner: false,
      canTrackProgress: embed.provider === 'youtube',
    }
  } catch {
    // A network failure must not prevent completion.
    return {
      canEmbed: true,
      blockedByOwner: false,
      canTrackProgress: embed.provider === 'youtube',
    }
  }
}
