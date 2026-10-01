'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toEmbed } from '@/lib/video-embed'

/** Percentage of a video that must be watched before completion is allowed. */
export const COMPLETION_THRESHOLD_PERCENT = 90

/** How often the player reports its position, in milliseconds. */
const REPORT_INTERVAL_MS = 5000

interface VideoPlayerProps {
  url: string | null | undefined
  title?: string
  className?: string
  /** Called as the learner watches, with the furthest point reached. */
  onProgress?: (info: { watchedSeconds: number; durationSeconds: number; percent: number }) => void
  /** The furthest point already recorded, used to resume and to show progress. */
  initialWatchedSeconds?: number
}

interface EmbedCheck {
  canEmbed: boolean
  reason?: string
  watchUrl: string | null
  thumbnailUrl?: string
  authorName?: string
}

interface YouTubePlayer {
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: Record<string, unknown>
      ) => YouTubePlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

/** Loads the YouTube IFrame API once, resolving when it is ready. */
function loadYouTubeApi(): Promise<NonNullable<Window['YT']>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('no window'))
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT as NonNullable<Window['YT']>)
    }

    if (!document.getElementById('youtube-iframe-api')) {
      const script = document.createElement('script')
      script.id = 'youtube-iframe-api'
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }
  })
}

export default function VideoPlayer({
  url,
  title,
  className,
  onProgress,
  initialWatchedSeconds = 0,
}: VideoPlayerProps) {
  const embed = useMemo(() => toEmbed(url), [url])
  const [check, setCheck] = useState<EmbedCheck | null>(null)
  const [checking, setChecking] = useState(false)

  const [percentWatched, setPercentWatched] = useState<number | null>(null)
  const [duration, setDuration] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const furthestRef = useRef(initialWatchedSeconds)
  const reportedRef = useRef(initialWatchedSeconds)
  const onProgressRef = useRef(onProgress)

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  useEffect(() => {
    furthestRef.current = initialWatchedSeconds
    reportedRef.current = initialWatchedSeconds
  }, [initialWatchedSeconds])

  // Determine whether this video may be embedded at all.
  useEffect(() => {
    if (!embed?.embedUrl || !url) {
      setCheck(null)
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        setChecking(true)
        const response = await fetch(`/api/video/metadata?url=${encodeURIComponent(url)}`)
        if (!response.ok) {
          if (!cancelled) setCheck({ canEmbed: true, watchUrl: embed.watchUrl })
          return
        }
        const data = await response.json()
        if (!cancelled) {
          setCheck({
            canEmbed: Boolean(data.canEmbed),
            reason: data.reason,
            watchUrl: data.watchUrl ?? embed.watchUrl,
            thumbnailUrl: data.metadata?.thumbnailUrl ?? embed.thumbnailUrl,
            authorName: data.metadata?.authorName,
          })
        }
      } catch {
        if (!cancelled) setCheck({ canEmbed: true, watchUrl: embed.watchUrl })
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [url, embed?.embedUrl, embed?.watchUrl, embed?.thumbnailUrl])

  const report = useCallback((seconds: number, total: number, force = false) => {
    if (!Number.isFinite(seconds) || !Number.isFinite(total) || total <= 0) return
    if (seconds > furthestRef.current) furthestRef.current = seconds

    const percent = Math.min(100, Math.round((furthestRef.current / total) * 100))
    setPercentWatched(percent)
    setDuration(total)

    // Report on a time interval, or immediately when told to.
    const due = force || seconds - reportedRef.current >= REPORT_INTERVAL_MS / 1000
    if (!due) return

    reportedRef.current = seconds
    onProgressRef.current?.({
      watchedSeconds: Math.round(furthestRef.current),
      durationSeconds: Math.round(total),
      percent,
    })
  }, [])

  // Create the player and poll its position.
  useEffect(() => {
    if (!check?.canEmbed || !embed?.videoId) return
    if (embed.provider !== 'youtube') return

    let disposed = false
    let interval: ReturnType<typeof setInterval> | null = null

    const setup = async () => {
      const YT = await loadYouTubeApi()
      if (disposed || !containerRef.current) return

      playerRef.current = new YT.Player(containerRef.current, {
        videoId: embed.videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          ...(embed.startSeconds ? { start: embed.startSeconds } : {}),
        },
        events: {
          onReady: () => {
            const player = playerRef.current
            if (!player) return
            const total = player.getDuration()
            if (total > 0 && initialWatchedSeconds > 0 && initialWatchedSeconds < total - 5) {
              player.seekTo(initialWatchedSeconds, true)
            }
            report(player.getCurrentTime(), total, true)
          },
          onStateChange: (event: { data: number }) => {
            const player = playerRef.current
            if (!player) return
            const total = player.getDuration()
            const playing = event.data === YT.PlayerState.PLAYING
            if (playing) report(player.getCurrentTime(), total, true)

            // Report promptly when the video pauses, so progress is not lost.
            if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
              report(player.getCurrentTime(), total, true)
            }
          },
        },
      })

      interval = setInterval(() => {
        const player = playerRef.current
        if (!player || typeof player.getCurrentTime !== 'function') return
        report(player.getCurrentTime(), player.getDuration())
      }, REPORT_INTERVAL_MS)
    }

    setup().catch(() => {
      // If the API cannot load, the video still plays without tracking.
    })

    return () => {
      disposed = true
      if (interval) clearInterval(interval)
      const player = playerRef.current
      if (player && typeof player.getCurrentTime === 'function') {
        report(player.getCurrentTime(), player.getDuration(), true)
      }
      try {
        playerRef.current?.destroy()
      } catch {
        // The iframe may already be gone.
      }
      playerRef.current = null
    }
  }, [check?.canEmbed, embed?.videoId, embed?.provider, embed?.startSeconds, initialWatchedSeconds, report])

  if (!embed) {
    return (
      <div className={`rounded-lg bg-gray-100 p-8 text-center ${className ?? ''}`}>
        <p className="text-gray-500">No video has been attached to this lesson yet.</p>
      </div>
    )
  }

  if (!embed.embedUrl) {
    return (
      <ExternalVideoCard
        className={className}
        title={title}
        message={embed.reason ?? 'This video is hosted elsewhere and opens in a new tab.'}
        watchUrl={embed.watchUrl}
      />
    )
  }

  if (checking && !check) {
    return (
      <div
        className={`aspect-video rounded-lg bg-gray-100 flex items-center justify-center ${className ?? ''}`}
      >
        <p className="text-gray-500">Checking this video…</p>
      </div>
    )
  }

  if (check && !check.canEmbed) {
    return (
      <ExternalVideoCard
        className={className}
        title={title}
        authorName={check.authorName}
        thumbnailUrl={check.thumbnailUrl}
        message="The video owner has chosen not to allow playback inside other websites, so this one opens on YouTube."
        watchUrl={check.watchUrl ?? embed.watchUrl}
      />
    )
  }

  const isYouTube = embed.provider === 'youtube'

  return (
    <div className={className}>
      {isYouTube && embed.videoId ? (
        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          {/* The YouTube API replaces this element with its own iframe. */}
          <div ref={containerRef} className="h-full w-full" />
        </div>
      ) : (
        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          <iframe
            src={embed.embedUrl}
            className="h-full w-full"
            title={title || 'Lesson video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}

      {isYouTube && (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full ${percentWatched !== null && percentWatched >= COMPLETION_THRESHOLD_PERCENT ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${percentWatched ?? 0}%` }}
            />
          </div>
          <span className="shrink-0 text-sm text-gray-600">
            {percentWatched === null
              ? 'Watch to track progress'
              : `${percentWatched}% watched`}
          </span>
        </div>
      )}

      {embed.playlistId && (
        <p className="mt-2 text-sm text-muted-foreground">
          This lesson plays a YouTube playlist. Use the player controls to move
          between the videos in the series.
        </p>
      )}
    </div>
  )
}

/**
 * Shown when a video cannot be played in place. Presented as a video card with
 * its thumbnail, so it reads as a deliberate part of the course rather than a
 * broken player. The link opens in a new tab, which leaves the lesson open.
 */
function ExternalVideoCard({
  className,
  title,
  authorName,
  thumbnailUrl,
  message,
  watchUrl,
}: {
  className?: string
  title?: string
  authorName?: string
  thumbnailUrl?: string
  message: string
  watchUrl: string | null
}) {
  return (
    <div className={`overflow-hidden rounded-lg border bg-white ${className ?? ''}`}>
      <a
        href={watchUrl ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block aspect-video bg-gray-900"
        aria-label={`Watch ${title ?? 'this video'} on YouTube in a new tab`}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900" />
        )}

        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-white" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>

        <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <span className="block text-sm font-medium text-white">
            {title ?? 'Watch this video'}
          </span>
          {authorName && (
            <span className="block text-xs text-white/80">{authorName}</span>
          )}
        </span>
      </a>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Watch on YouTube
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </div>
  )
}
