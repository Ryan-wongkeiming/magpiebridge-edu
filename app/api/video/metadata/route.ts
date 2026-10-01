import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/api-auth'
import { toEmbed, supportsMetadataLookup, oEmbedEndpoint } from '@/lib/video-embed'

export interface VideoMetadata {
  title?: string
  authorName?: string
  provider?: string
  thumbnailUrl?: string
  durationSeconds?: number
}

/**
 * Whether a video allows embedding changes rarely, so results are cached in
 * memory to avoid re-querying the provider on every page view. The cache is
 * per server process and expires after an hour.
 */
const CACHE_TTL_MS = 60 * 60 * 1000
const cache = new Map<string, { at: number; payload: unknown }>()

function readCache(key: string) {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return hit.payload
}

function writeCache(key: string, payload: unknown) {
  // Keep the map from growing without bound in a long-running process.
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
  cache.set(key, { at: Date.now(), payload })
}

/**
 * Recovers a playlist's title and channel through oEmbed on the playlist URL.
 * Used when oEmbed declines to describe a single video because its embedding is
 * disabled. The playlist feed is not used: it rate-limits aggressively.
 */
async function lookupPlaylistAuthor(
  playlistId: string
): Promise<{ title?: string; authorName?: string } | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/playlist?list=${playlistId}`
      )}&format=json`,
      { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } }
    )

    if (!response.ok) return null

    const data = await response.json()
    return {
      title: typeof data.title === 'string' ? data.title : undefined,
      authorName: typeof data.author_name === 'string' ? data.author_name : undefined,
    }
  } catch {
    return null
  }
}

/**
 * GET /api/video/metadata?url=...
 *
 * Converts an instructor-supplied video URL into an embeddable form and, for
 * providers that support it, looks up the title, author, and thumbnail so the
 * lesson can be filled in automatically. Uses oEmbed, which needs no API key.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawUrl = searchParams.get('url')

    if (!rawUrl) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const embed = toEmbed(rawUrl)

    if (!embed) {
      return NextResponse.json({ error: 'Could not read that URL' }, { status: 400 })
    }

    const cached = readCache(embed.originalUrl)
    if (cached) {
      return NextResponse.json(cached)
    }

    let metadata: VideoMetadata = {}
    let embeddingDisabled = false

    if (supportsMetadataLookup(embed.provider) && embed.watchUrl) {
      const endpoint = oEmbedEndpoint(embed.provider, embed.watchUrl)

      if (endpoint) {
        try {
          const response = await fetch(endpoint, {
            signal: AbortSignal.timeout(8000),
            headers: { Accept: 'application/json' },
          })

          if (response.ok) {
            const data = await response.json()
            metadata = {
              title: typeof data.title === 'string' ? data.title : undefined,
              authorName:
                typeof data.author_name === 'string' ? data.author_name : undefined,
              provider: typeof data.provider_name === 'string' ? data.provider_name : undefined,
              thumbnailUrl:
                typeof data.thumbnail_url === 'string'
                  ? data.thumbnail_url
                  : embed.thumbnailUrl,
              durationSeconds:
                typeof data.duration === 'number' ? data.duration : undefined,
            }
          } else if (response.status === 401) {
            // YouTube and Vimeo both answer 401 when the owner has turned off
            // playback on other websites. The embed URL still loads, so the
            // player would show the owner's error message; detect it here so
            // the UI can offer a link instead.
            embeddingDisabled = true
            metadata = { thumbnailUrl: embed.thumbnailUrl }
          }
        } catch {
          // Metadata is a convenience. A lookup failure must not block saving,
          // so fall back to whatever the URL itself gave us.
          metadata = { thumbnailUrl: embed.thumbnailUrl }
        }
      }
    }

    // oEmbed refuses to describe a video whose embedding is disabled, so the
    // channel name is filled in from the playlist when we know which one it is.
    if (embeddingDisabled && !metadata.authorName && embed.playlistId) {
      const fromPlaylist = await lookupPlaylistAuthor(embed.playlistId)
      if (fromPlaylist?.authorName) {
        metadata = { ...metadata, authorName: fromPlaylist.authorName }
      }
    }

    const payload = {
      provider: embed.provider,
      embedUrl: embed.embedUrl,
      watchUrl: embed.watchUrl,
      originalUrl: embed.originalUrl,
      videoId: embed.videoId,
      playlistId: embed.playlistId,
      startSeconds: embed.startSeconds,
      canEmbed: Boolean(embed.embedUrl) && !embeddingDisabled,
      embeddingDisabled,
      reason: embeddingDisabled
        ? 'The video owner has disabled playback on other websites, so this video can only be watched on YouTube.'
        : embed.reason,
      metadata,
    }

    writeCache(embed.originalUrl, payload)

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Video metadata error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
