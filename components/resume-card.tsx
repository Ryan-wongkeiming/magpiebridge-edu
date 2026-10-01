'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ResumeEnrollment {
  id: string
  status: string
  progressPercent: number
  course: {
    id: string
    title: string
    modules?: {
      id: string
      title: string
      lessons?: { id: string; title: string; contentType?: string }[]
    }[]
  }
  lessonProgress?: { lessonId: string; status: string }[]
}

/**
 * A "Resume" card that surfaces the learner's most recent in-progress course
 * and the next lesson to open, mirroring Coursera's resume pattern.
 */
export default function ResumeCard({ enrollments }: { enrollments: ResumeEnrollment[] }) {
  const router = useRouter()

  const resume = useMemo(() => {
    const inProgress = enrollments.filter((e) => e.status === 'in_progress')
    if (inProgress.length === 0) return null

    // Pick the most recently started in-progress course.
    const target = inProgress[0]
    const done = new Set(
      (target.lessonProgress ?? [])
        .filter((lp) => lp.status === 'completed')
        .map((lp) => lp.lessonId)
    )

    let nextLesson: { id: string; title: string } | null = null
    for (const module of target.course.modules ?? []) {
      for (const lesson of module.lessons ?? []) {
        if (!done.has(lesson.id)) {
          nextLesson = { id: lesson.id, title: lesson.title }
          break
        }
      }
      if (nextLesson) break
    }

    return { enrollment: target, nextLesson }
  }, [enrollments])

  if (!resume) return null

  const { enrollment, nextLesson } = resume

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Continue learning</p>
          <h2 className="mt-1 truncate text-xl font-semibold">{enrollment.course.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {nextLesson ? (
              <>
                Next up: <span className="font-medium text-foreground">{nextLesson.title}</span>
              </>
            ) : (
              'All lessons complete'
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold">{Math.round(enrollment.progressPercent)}%</div>
            <div className="text-xs text-muted-foreground">complete</div>
          </div>
          <Button
            onClick={() =>
              nextLesson
                ? router.push(`/lessons/${nextLesson.id}`)
                : router.push(`/enrollments/${enrollment.id}`)
            }
          >
            {nextLesson ? 'Resume' : 'Review course'}
          </Button>
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${enrollment.progressPercent}%` }} />
      </div>
    </div>
  )
}
