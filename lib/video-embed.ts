/**
 * Normalises video URLs into forms that can be embedded in an iframe.
 *
 * YouTube and Vimeo both refuse to render their normal "watch" URLs inside a
 * frame; only their dedicated embed endpoints work. Instructors paste the URL
 * from the browser address bar, so this module converts it for them.
 */

export type VideoProvider = 'youtube' | 'vimeo' | 'external'

export interface EmbedResult {
  provider: VideoProvider
  /** URL safe to put in an iframe src. Null when the source cannot be embedded. */
  embedUrl: string | null
  /** The URL as supplied by the instructor. */
  originalUrl: string
  /** Canonical page a human can open in a browser. */
  watchUrl: string | null
  videoId?: string
  playlistId?: string
  /** Start offset in seconds, when the URL specified one. */
  startSeconds?: number
  thumbnailUrl?: string
  /** Human-readable reason when embedUrl is null. */
  reason?: string
}

/** Parses `90`, `1m30s`, `2h5m`, or `1h2m3s` into seconds. */
export function parseTimeToSeconds(value: string | null | undefined): number | undefined {
  if (!value) return undefined

  if (/^\d+$/.test(value)) return parseInt(value, 10)

  const h = /(\d+)h/.exec(value)
  const m = /(\d+)m(?!s)/.exec(value)
  const s = /(\d+)s/.exec(value)

  if (!h && !m && !s) return undefined

  return (
    (h ? parseInt(h[1], 10) * 3600 : 0) +
    (m ? parseInt(m[1], 10) * 60 : 0) +
    (s ? parseInt(s[1], 10) : 0)
  )
}

function safeUrl(raw: string): URL | null {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    return new URL(withScheme)
  } catch {
    return null
  }
}

function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

function parseYouTube(url: URL): EmbedResult | null {
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  const isYouTube =
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host === 'youtu.be'

  if (!isYouTube) return null

  let videoId: string | undefined
  const path = url.pathname

  if (host === 'youtu.be') {
    videoId = path.split('/').filter(Boolean)[0]
  } else if (path.startsWith('/watch')) {
    videoId = url.searchParams.get('v') ?? undefined
  } else if (path.startsWith('/embed/') || path.startsWith('/shorts/') || path.startsWith('/live/') || path.startsWith('/v/')) {
    videoId = path.split('/').filter(Boolean)[1]
  }

  const playlistId = url.searchParams.get('list') ?? undefined

  // Timestamps appear as t=, start=, or inside the hash for some clients.
  const hashTime = /(?:^|[#&])t=([^&]+)/.exec(url.hash)?.[1]
  const startSeconds =
    parseTimeToSeconds(url.searchParams.get('t')) ??
    parseTimeToSeconds(url.searchParams.get('start')) ??
    parseTimeToSeconds(hashTime)

  if (!videoId && !playlistId) return null

  const embedParams = new URLSearchParams()
  if (playlistId) embedParams.set('list', playlistId)
  if (startSeconds !== undefined) embedParams.set('start', String(startSeconds))
  const query = embedParams.toString()

  // A bare playlist (no single video) uses the videoseries endpoint.
  const embedBase = videoId
    ? `https://www.youtube.com/embed/${videoId}`
    : `https://www.youtube.com/embed/videoseries`
  const embedUrl = query ? `${embedBase}?${query}` : embedBase

  const watchUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}${playlistId ? `&list=${playlistId}` : ''}`
    : `https://www.youtube.com/playlist?list=${playlistId}`

  return {
    provider: 'youtube',
    embedUrl,
    originalUrl: url.toString(),
    watchUrl,
    videoId,
    playlistId,
    startSeconds,
    thumbnailUrl: videoId ? youtubeThumbnail(videoId) : undefined,
  }
}

function parseVimeo(url: URL): EmbedResult | null {
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  const isVimeo = host === 'vimeo.com' || host === 'player.vimeo.com'
  if (!isVimeo) return null

  // vimeo.com/123456, vimeo.com/channels/staffpicks/123456,
  // player.vimeo.com/video/123456
  const segments = url.pathname.split('/').filter(Boolean)
  const numeric = [...segments].reverse().find((s) => /^\d+$/.test(s))
  if (!numeric) return null

  const hashTime = /t=([^&]+)/.exec(url.hash)?.[1]
  const startSeconds = parseTimeToSeconds(hashTime)

  const embedUrl = startSeconds
    ? `https://player.vimeo.com/video/${numeric}#t=${startSeconds}s`
    : `https://player.vimeo.com/video/${numeric}`

  return {
    provider: 'vimeo',
    embedUrl,
    originalUrl: url.toString(),
    watchUrl: `https://vimeo.com/${numeric}`,
    videoId: numeric,
    startSeconds,
  }
}

/**
 * Turns any instructor-supplied URL into an embeddable one where possible.
 * Unknown sources are returned with `embedUrl: null` so the UI can fall back
 * to a plain link instead of rendering a broken player.
 */
export function toEmbed(rawUrl: string | null | undefined): EmbedResult | null {
  if (!rawUrl || !rawUrl.trim()) return null

  const url = safeUrl(rawUrl.trim())
  if (!url) {
    return {
      provider: 'external',
      embedUrl: null,
      originalUrl: rawUrl,
      watchUrl: null,
      reason: 'That does not look like a valid web address.',
    }
  }

  const youtube = parseYouTube(url)
  if (youtube) return youtube

  const vimeo = parseVimeo(url)
  if (vimeo) return vimeo

  return {
    provider: 'external',
    embedUrl: null,
    originalUrl: url.toString(),
    watchUrl: url.toString(),
    reason:
      'This source does not allow embedding. Learners will see a link that opens in a new tab.',
  }
}

/** Providers whose metadata can be looked up through oEmbed. */
export function supportsMetadataLookup(provider: VideoProvider): boolean {
  return provider === 'youtube' || provider === 'vimeo'
}

/** Builds the oEmbed endpoint for a provider. Used server-side only. */
export function oEmbedEndpoint(provider: VideoProvider, watchUrl: string): string | null {
  if (provider === 'youtube') {
    return `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
  }
  if (provider === 'vimeo') {
    return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(watchUrl)}`
  }
  return null
}
