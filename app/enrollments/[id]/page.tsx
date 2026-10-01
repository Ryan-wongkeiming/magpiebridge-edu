'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import LessonPreview from '@/components/lesson-preview'
import { toEmbed } from '@/lib/video-embed'
import type { EnrollmentDetail, LessonDetail } from '@/types/api'

const COMPLETION_THRESHOLD_PERCENT = 90

interface LessonItem {
  id: string
  title: string
  contentType?: string
  estimatedDuration?: number | null
}

interface ModuleItem {
  id: string
  title: string
  description?: string | null
  lessons?: LessonItem[]
}

export default function EnrollmentDetailPage() {
  const [enrollment, setEnrollment] = useState<EnrollmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    fetchEnrollment()
  }, [session, status])

  const fetchEnrollment = async () => {
    try {
      setLoading(true)
      const enrollmentId = Array.isArray(params.id) ? params.id[0] : params.id
      const response = await fetch(`/api/enrollments/${enrollmentId}`)
      const data = await response.json()

      if (response.ok) {
        setEnrollment(data)
        // Default to the first incomplete lesson, or the first lesson.
        const firstIncomplete = findFirstIncomplete(data)
        setActiveLessonId(firstIncomplete ?? data.course?.modules?.[0]?.lessons?.[0]?.id ?? null)
      } else {
        setError(data.error || 'Failed to fetch enrollment')
      }
    } catch (err) {
      setError('Failed to fetch enrollment')
    } finally {
      setLoading(false)
    }
  }

  const findFirstIncomplete = (enr: EnrollmentDetail): string | null => {
    const done = new Set(
      (enr.lessonProgress ?? []).filter((lp) => lp.status === 'completed').map((lp) => lp.lessonId)
    )
    for (const module of enr.course?.modules ?? []) {
      for (const lesson of module.lessons ?? []) {
        if (!done.has(lesson.id)) return lesson.id
      }
    }
    return null
  }

  const handleCompleteLesson = async (lessonId: string) => {
    if (!enrollment) return

    await fetch('/api/lesson-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enrollmentId: enrollment.id,
        lessonId,
        status: 'completed',
      }),
    })

    await fetchEnrollment()
  }

  /** Records watch position for the inline lesson, and auto-completes at the threshold. */
  const handleProgress = async (info: {
    watchedSeconds: number
    durationSeconds: number
    percent: number
  }) => {
    if (!enrollment || !activeLessonId) return

    try {
      await fetch('/api/video/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          lessonId: activeLessonId,
          watchedSeconds: info.watchedSeconds,
          durationSeconds: info.durationSeconds,
        }),
      })

      if (info.percent >= COMPLETION_THRESHOLD_PERCENT) {
        await fetch('/api/lesson-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollmentId: enrollment.id,
            lessonId: activeLessonId,
            status: 'completed',
          }),
        })
        await fetchEnrollment()
      }
    } catch {
      // Tracking failures must not interrupt viewing.
    }
  }

  const activeLesson = useMemo(() => {
    if (!enrollment) return null
    for (const module of enrollment.course?.modules ?? []) {
      const found = (module.lessons ?? []).find((l) => l.id === activeLessonId)
      if (found) return found
    }
    return null
  }, [enrollment, activeLessonId])

  const flatLessons = useMemo(() => {
    const modules = enrollment?.course?.modules ?? []
    return modules.flatMap((m) =>
      (m.lessons ?? []).map((l) => ({ id: l.id, title: l.title }))
    )
  }, [enrollment])

  const currentIndex = flatLessons.findIndex((l) => l.id === activeLessonId)
  const previousLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex >= 0 && currentIndex < flatLessons.length - 1
      ? flatLessons[currentIndex + 1]
      : null

  const progressEntry = enrollment?.lessonProgress?.find((lp) => lp.lessonId === activeLessonId)
  const isCompleted = progressEntry?.status === 'completed'

  const totalLessons = flatLessons.length
  const completedCount = (enrollment?.lessonProgress ?? []).filter(
    (lp) => lp.status === 'completed'
  ).length
  const progressPercent = enrollment?.progressPercent ?? 0

  if (status === 'loading' || loading) {
    return <div className="container py-8">Loading course…</div>
  }

  if (error || !enrollment) {
    return (
      <div className="container py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Course Not Found</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push('/enrollments')}>Back to My Courses</Button>
      </div>
    )
  }

  const modules = enrollment.course?.modules ?? []

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{enrollment.course?.title}</h1>
        <p className="text-muted-foreground mt-1 capitalize">
          {enrollment.status.replace(/_/g, ' ')} · {completedCount} of {totalLessons} lessons
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: course outline */}
        <aside className="lg:col-span-3">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-semibold">Course outline</h2>
            <div className="space-y-4">
              {modules.map((module, mi) => {
                const moduleLessons = module.lessons ?? []
                const videoCount = moduleLessons.filter((l) => l.contentType === 'video').length
                const otherCount = moduleLessons.length - videoCount
                const moduleMinutes = moduleLessons.reduce(
                  (sum, l) => sum + (l.estimatedDuration ?? 0),
                  0
                )
                return (
                  <div key={module.id}>
                    <div className="mb-1 text-sm font-medium">
                      {mi + 1}. {module.title}
                    </div>
                    <div className="mb-1 text-xs text-muted-foreground">
                      {moduleLessons.length} item{moduleLessons.length === 1 ? '' : 's'}
                      {videoCount > 0 && ` · ${videoCount} video${videoCount === 1 ? '' : 's'}`}
                      {otherCount > 0 && ` · ${otherCount} other`}
                      {moduleMinutes > 0 && ` · ${moduleMinutes} min`}
                    </div>
                    <div className="space-y-1">
                      {moduleLessons.map((lesson, li) => {
                        const lp = enrollment.lessonProgress?.find((x) => x.lessonId === lesson.id)
                        const done = lp?.status === 'completed'
                        const active = lesson.id === activeLessonId
                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => setActiveLessonId(lesson.id)}
                            className={`flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm ${
                              active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                            }`}
                          >
                            <span className={`mt-0.5 shrink-0 ${done ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {done ? '✓' : `${mi + 1}.${li + 1}`}
                            </span>
                            <span className="line-clamp-2">{lesson.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Centre: current lesson */}
        <main className="lg:col-span-6">
          {activeLesson ? (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">{activeLesson.title}</h2>
              <LessonPreview
                lesson={activeLesson}
                onProgress={handleProgress}
                initialWatchedSeconds={
                  (progressEntry as { watchedSeconds?: number } | undefined)?.watchedSeconds ?? 0
                }
              />
              <div className="mt-6 flex justify-between gap-4">
                <Button
                  variant="outline"
                  disabled={!previousLesson}
                  onClick={() => previousLesson && setActiveLessonId(previousLesson.id)}
                >
                  ← Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && setActiveLessonId(nextLesson.id)}
                >
                  Next →
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
              Select a lesson from the outline.
            </div>
          )}
        </main>

        {/* Right: progress panel */}
        <aside className="lg:col-span-3">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-semibold">Your progress</h2>
            <div className="mb-2 flex items-end justify-between">
              <span className="text-3xl font-bold">{Math.round(progressPercent)}%</span>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{totalLessons} lessons
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">{completedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-medium">{totalLessons - completedCount}</span>
              </div>
            </div>

            <div className="mt-4">
              <Button
                className="w-full"
                onClick={() => router.push(`/lessons/${activeLessonId}`)}
                disabled={!activeLessonId}
              >
                Open lesson
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
