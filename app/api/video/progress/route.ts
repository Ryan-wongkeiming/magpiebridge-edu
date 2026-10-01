import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Records how far a learner has watched a video lesson.
 *
 * The client reports the furthest point reached and the total duration. Only
 * the furthest point is stored, so seeking backwards never reduces progress.
 * Completion is not granted here: the lesson-progress endpoint decides that,
 * using the percentage this route maintains.
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { enrollmentId, lessonId, watchedSeconds, durationSeconds } =
      await request.json()

    if (!enrollmentId || !lessonId) {
      return NextResponse.json(
        { error: 'enrollmentId and lessonId are required' },
        { status: 400 }
      )
    }

    const watched = Number(watchedSeconds)
    const duration = Number(durationSeconds)

    if (!Number.isFinite(watched) || watched < 0) {
      return NextResponse.json({ error: 'watchedSeconds must be a number' }, { status: 400 })
    }

    // Verify the enrollment belongs to this learner.
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { id: true, userId: true },
    })

    if (!enrollment || enrollment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()

    const existing = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId_enrollmentId: {
          userId: session.user.id,
          lessonId,
          enrollmentId,
        },
      },
    })

    // Keep the furthest point reached; a duration is only stored once known.
    const bestWatched = Math.max(
      Math.round(watched),
      existing?.watchedSeconds ?? 0
    )
    const bestDuration =
      Number.isFinite(duration) && duration > 0
        ? Math.round(duration)
        : existing?.durationSeconds ?? null

    const progress = existing
      ? await prisma.lessonProgress.update({
          where: { id: existing.id },
          data: {
            watchedSeconds: bestWatched,
            durationSeconds: bestDuration,
            lastViewedAt: now,
            // Viewing a video starts the lesson.
            ...(existing.status === 'not_started' && {
              status: 'in_progress',
              startedAt: existing.startedAt ?? now,
            }),
          },
        })
      : await prisma.lessonProgress.create({
          data: {
            userId: session.user.id,
            enrollmentId,
            lessonId,
            status: 'in_progress',
            startedAt: now,
            lastViewedAt: now,
            watchedSeconds: bestWatched,
            durationSeconds: bestDuration,
          },
        })

    const percentWatched =
      progress.durationSeconds && progress.durationSeconds > 0
        ? Math.min(100, Math.round((progress.watchedSeconds / progress.durationSeconds) * 100))
        : null

    return NextResponse.json({
      watchedSeconds: progress.watchedSeconds,
      durationSeconds: progress.durationSeconds,
      percentWatched,
    })
  } catch (error) {
    console.error('Video progress error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
