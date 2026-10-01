import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autoIssueCertificate } from '@/lib/certificate-utils'
import { checkEmbeddingPermission } from '@/lib/video-embedding-check'
import { getSetting } from '@/lib/settings'

/** Fallback when the admin setting cannot be read. */
const DEFAULT_COMPLETION_THRESHOLD_PERCENT = 90

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { enrollmentId, lessonId, status, acknowledgeWatched } = await request.json()

    // Verify enrollment belongs to user
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId }
    })

    if (!enrollment || enrollment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, contentType: true, contentUrl: true },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Check if lesson progress already exists
    let lessonProgress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId_enrollmentId: {
          userId: session.user.id,
          lessonId: lessonId,
          enrollmentId: enrollmentId
        }
      }
    })

    const now = new Date()

    // Read the admin-configured completion threshold, falling back to 90 when
    // the setting is unset or unreadable.
    const thresholdSetting = await getSetting('learning.completionThresholdPercent')
    const threshold =
      typeof thresholdSetting === 'number' && thresholdSetting > 0
        ? thresholdSetting
        : DEFAULT_COMPLETION_THRESHOLD_PERCENT

    // A video lesson may only be completed once the learner has watched enough
    // of it. This is what makes a completion record mean something.
    if (status === 'completed' && lesson.contentType === 'video') {
      const permission = await checkEmbeddingPermission(lesson.contentUrl)

      // Videos that cannot play inside the platform cannot be measured at all,
      // so the learner confirms watching instead. The same applies to providers
      // the platform cannot instrument: demanding a threshold that could never
      // be recorded would make the lesson impossible to complete.
      if (!permission.canEmbed || !permission.canTrackProgress) {
        if (!acknowledgeWatched) {
          return NextResponse.json(
            {
              error: 'ACKNOWLEDGEMENT_REQUIRED',
              message: permission.canEmbed
                ? 'This video cannot be measured inside the platform. Confirm that you have watched it before marking the lesson complete.'
                : 'This video opens on YouTube. Confirm that you have watched it before marking the lesson complete.',
              threshold,
            },
            { status: 422 }
          )
        }
      } else {
        const watched = lessonProgress?.watchedSeconds ?? 0
        const duration = lessonProgress?.durationSeconds ?? 0
        const percentWatched =
          duration > 0 ? Math.min(100, Math.round((watched / duration) * 100)) : 0

        if (percentWatched < threshold) {
          return NextResponse.json(
            {
              error: 'WATCH_REQUIRED',
              message:
                duration > 0
                  ? `Watch at least ${threshold}% of this video first. You are at ${percentWatched}%.`
                  : 'Watch this video before marking it complete.',
              percentWatched,
              threshold,
            },
            { status: 422 }
          )
        }
      }
    }

    if (lessonProgress) {
      // Update existing progress
      lessonProgress = await prisma.lessonProgress.update({
        where: {
          userId_lessonId_enrollmentId: {
            userId: session.user.id,
            lessonId: lessonId,
            enrollmentId: enrollmentId
          }
        },
        data: {
          status,
          ...(status === 'in_progress' && !lessonProgress.startedAt && { startedAt: now }),
          ...(status === 'completed' && !lessonProgress.completedAt && { completedAt: now }),
          ...(status === 'completed' && acknowledgeWatched && !lessonProgress.acknowledgedAt && { acknowledgedAt: now }),
          lastViewedAt: now,
          updatedAt: now
        }
      })
    } else {
      // Create new progress record. The lesson page fires an in_progress call
      // on open and a completed call when the video auto-completes; if those
      // race, the second create would hit the unique constraint. Upsert makes
      // this safe.
      lessonProgress = await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId_enrollmentId: {
            userId: session.user.id,
            lessonId: lessonId,
            enrollmentId: enrollmentId
          }
        },
        create: {
          user: {
            connect: {
              id: session.user.id
            }
          },
          enrollment: {
            connect: {
              id: enrollmentId
            }
          },
          lesson: {
            connect: {
              id: lessonId
            }
          },
          status,
          ...(status === 'in_progress' && { startedAt: now }),
          ...(status === 'completed' && { completedAt: now }),
          ...(status === 'completed' && acknowledgeWatched && { acknowledgedAt: now }),
          lastViewedAt: now
        },
        update: {
          // Reached only when a concurrent request created the row first.
          status,
          ...(status === 'completed' && { completedAt: now }),
          ...(status === 'completed' && acknowledgeWatched && { acknowledgedAt: now }),
          lastViewedAt: now,
          updatedAt: now
        }
      })
    }

    // Update enrollment progress percentage
    const course = await prisma.course.findUnique({
      where: { id: enrollment.courseId },
      include: {
        modules: {
          include: {
            lessons: true
          }
        }
      }
    })

    if (course) {
      const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0)

      if (totalLessons > 0) {
        const completedLessons = await prisma.lessonProgress.count({
          where: {
            enrollmentId: enrollmentId,
            status: 'completed'
          }
        })

        const progressPercent = Math.round((completedLessons / totalLessons) * 100)

        // Update enrollment with new progress percentage
        const updatedEnrollment = await prisma.enrollment.update({
          where: { id: enrollmentId },
          data: {
            progressPercent,
            ...(progressPercent > 0 && !enrollment.startedAt && { startedAt: now }),
            ...(progressPercent === 100 && !enrollment.completedAt && { completedAt: now, status: 'completed' })
          }
        })

        // Check if course is now completed and auto-issue certificate
        if (progressPercent === 100) {
          try {
            await autoIssueCertificate(enrollmentId)
          } catch (error) {
            console.error('Error auto-issuing certificate:', error)
            // Don't fail the request if certificate issuance fails
          }
        }
      }
    }

    return NextResponse.json(lessonProgress)
  } catch (error) {
    console.error('Update lesson progress error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
