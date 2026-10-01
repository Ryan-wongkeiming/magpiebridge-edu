'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import LessonPreview from '@/components/lesson-preview'
import { toEmbed } from '@/lib/video-embed'
import { usePublicSettings } from '@/lib/use-public-settings'
import type { EnrollmentDetail, LessonDetail } from '@/types/api'

/** Fallback when the admin setting cannot be read. */
const DEFAULT_COMPLETION_THRESHOLD_PERCENT = 90

export default function LessonViewerPage() {
  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [enrollment, setEnrollment] = useState<EnrollmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingComplete, setMarkingComplete] = useState(false)
  const [gateMessage, setGateMessage] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [watchedPercent, setWatchedPercent] = useState<number | null>(null)
  const isCompletedRef = useRef(false)
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const { completionThresholdPercent } = usePublicSettings()
  const COMPLETION_THRESHOLD_PERCENT = completionThresholdPercent

  const lessonId = Array.isArray(params.id) ? params.id[0] : params.id

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    fetchLessonAndEnrollment()
  }, [session, status, lessonId])

  const fetchLessonAndEnrollment = async () => {
    try {
      setLoading(true)
      setError('')

      const lessonResponse = await fetch(`/api/lessons/${lessonId}`)
      const lessonData = await lessonResponse.json()

      if (!lessonResponse.ok) {
        setError(lessonData.error || 'Failed to fetch lesson')
        return
      }

      setLesson(lessonData)

      const enrollmentResponse = await fetch(
        `/api/enrollments?courseId=${lessonData.module.courseId}`
      )
      const enrollmentData = await enrollmentResponse.json()

      if (enrollmentResponse.ok && enrollmentData.length > 0) {
        const found = enrollmentData[0] as EnrollmentDetail
        setEnrollment(found)

        const existing = found.lessonProgress?.find((lp) => lp.lessonId === lessonId)

        // Restore any progress already recorded for this video.
        if (existing) {
          const withWatch = existing as {
            watchedSeconds?: number
            durationSeconds?: number | null
          }
          if (withWatch.durationSeconds && withWatch.durationSeconds > 0) {
            setWatchedPercent(
              Math.min(
                100,
                Math.round(
                  ((withWatch.watchedSeconds ?? 0) / withWatch.durationSeconds) * 100
                )
              )
            )
          }
        }

        // Mark as in progress only when not already completed.
        if (existing?.status !== 'completed') {
          await fetch('/api/lesson-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enrollmentId: found.id,
              lessonId,
              status: 'in_progress',
            }),
          })
        }
      }
    } catch (err) {
      setError('Failed to fetch lesson')
    } finally {
      setLoading(false)
    }
  }

  /** Sends watch position to the server, and auto-completes once enough is watched. */
  const handleProgress = useCallback(
    async (info: { watchedSeconds: number; durationSeconds: number; percent: number }) => {
      if (!enrollment) return

      setWatchedPercent(info.percent)

      try {
        await fetch('/api/video/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollmentId: enrollment.id,
            lessonId,
            watchedSeconds: info.watchedSeconds,
            durationSeconds: info.durationSeconds,
          }),
        })

        // Once the threshold is reached, complete the lesson automatically so
        // the learner does not have to click a separate button.
        if (info.percent >= COMPLETION_THRESHOLD_PERCENT && !isCompletedRef.current) {
          const response = await fetch('/api/lesson-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enrollmentId: enrollment.id,
              lessonId,
              status: 'completed',
            }),
          })

          if (response.ok) {
            isCompletedRef.current = true
            const refreshed = await fetch(`/api/enrollments/${enrollment.id}`)
            if (refreshed.ok) {
              setEnrollment(await refreshed.json())
            }
          }
        }
      } catch {
        // Tracking failures must not interrupt viewing.
      }
    },
    [enrollment, lessonId]
  )

  const markLessonComplete = async () => {
    if (!enrollment || !lesson) return

    try {
      setMarkingComplete(true)
      setGateMessage('')

      const response = await fetch('/api/lesson-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          status: 'completed',
          acknowledgeWatched: acknowledged,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // The server refuses completion until the video has been watched, or
        // confirmed for videos that cannot play in-app.
        setGateMessage(data.message || data.error || 'Could not mark this lesson complete.')
        return
      }

      const refreshed = await fetch(`/api/enrollments/${enrollment.id}`)
      if (refreshed.ok) {
        setEnrollment(await refreshed.json())
      }
    } catch (err) {
      setGateMessage('Could not mark this lesson complete.')
    } finally {
      setMarkingComplete(false)
    }
  }

  // Flatten the course into a single ordered list so previous/next work
  // across module boundaries.
  const flatLessons = useMemo(() => {
    const modules = enrollment?.course?.modules ?? []
    return modules.flatMap((m) =>
      (m.lessons ?? []).map((l) => ({ id: l.id, title: l.title }))
    )
  }, [enrollment])

  const currentIndex = flatLessons.findIndex((l) => l.id === lessonId)
  const previousLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex >= 0 && currentIndex < flatLessons.length - 1
      ? flatLessons[currentIndex + 1]
      : null

  const progressEntry = enrollment?.lessonProgress?.find((lp) => lp.lessonId === lessonId)
  const isCompleted = progressEntry?.status === 'completed'

  const embed = lesson ? toEmbed(lesson.contentUrl) : null
  const isVideo = lesson?.contentType === 'video'
  const isOffPlatformVideo = Boolean(isVideo && embed && !embed.embedUrl)
  const watchedEnough =
    watchedPercent !== null && watchedPercent >= COMPLETION_THRESHOLD_PERCENT

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading lesson…</div>
  }

  if (!lesson) {
    return (
      <div className="container py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Lesson Not Found</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push('/enrollments')}>Back to My Courses</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
          <p className="text-gray-600 mt-1">
            {lesson.module?.course?.title} • {lesson.module?.title}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isCompleted ? (
            <span className="inline-flex items-center rounded-md bg-green-100 px-3 py-2 text-sm font-medium text-green-800">
              ✓ Completed
            </span>
          ) : watchedEnough ? (
            <span className="inline-flex items-center rounded-md bg-green-100 px-3 py-2 text-sm font-medium text-green-800">
              ✓ Completed automatically
            </span>
          ) : (
            <Button onClick={markLessonComplete} disabled={markingComplete || !enrollment}>
              {markingComplete ? 'Marking Complete...' : 'Mark Complete'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() =>
              enrollment ? router.push(`/enrollments/${enrollment.id}`) : router.back()
            }
          >
            Back to Course
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {!enrollment && (
        <div className="mb-6 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
          You are not enrolled in this course, so progress will not be recorded.
        </div>
      )}

      {isVideo && !isCompleted && (
        <div className="mb-6 rounded-md bg-blue-50 p-4 text-sm text-blue-900">
          {isOffPlatformVideo ? (
            <>
              This video opens on YouTube. Watch it, then tick the box below to
              mark the lesson complete.
            </>
          ) : watchedEnough ? (
            <>
              You have watched {watchedPercent}% of this video. The lesson has
              been completed automatically.
            </>
          ) : (
            <>
              This lesson completes automatically once you have watched{' '}
              {COMPLETION_THRESHOLD_PERCENT}% of the video.
              {watchedPercent !== null && ` You are at ${watchedPercent}%.`}
            </>
          )}
        </div>
      )}

      {gateMessage && (
        <div className="mb-6 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
          {gateMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <LessonPreview
          lesson={lesson}
          onProgress={isVideo ? handleProgress : undefined}
          initialWatchedSeconds={
            (progressEntry as { watchedSeconds?: number } | undefined)?.watchedSeconds ?? 0
          }
        />
      </div>

      {isOffPlatformVideo && !isCompleted && (
        <label className="mt-4 flex items-start gap-3 rounded-md border bg-gray-50 p-4 text-sm">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            I have watched this video on YouTube.
            <span className="block text-xs text-muted-foreground">
              Recorded as your confirmation. The platform cannot verify videos
              played outside it.
            </span>
          </span>
        </label>
      )}

      <div className="mt-6 flex justify-between gap-4">
        <Button
          variant="outline"
          disabled={!previousLesson}
          onClick={() => previousLesson && router.push(`/lessons/${previousLesson.id}`)}
        >
          ← {previousLesson ? previousLesson.title : 'Previous Lesson'}
        </Button>
        <Button
          variant="outline"
          disabled={!nextLesson}
          onClick={() => nextLesson && router.push(`/lessons/${nextLesson.id}`)}
        >
          {nextLesson ? nextLesson.title : 'Next Lesson'} →
        </Button>
      </div>
    </div>
  )
}
