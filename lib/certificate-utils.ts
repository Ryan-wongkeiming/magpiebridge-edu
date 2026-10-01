import { prisma } from '@/lib/prisma'
import { generateSecureToken } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { Certificate } from '@prisma/client'

/**
 * Checks if a learner has met all completion requirements for a course
 * @param enrollmentId - The ID of the enrollment to check
 * @returns Boolean indicating if all requirements are met
 */
export async function checkCompletionRequirements(enrollmentId: string): Promise<boolean> {
  try {
    // Get the enrollment with related data. `required` and
    // `requiredForCompletion` are both default-true, so loading them here
    // lets the checks below distinguish required from optional content
    // without a second query.
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  select: { id: true, required: true }
                }
              }
            }
          }
        },
        lessonProgress: true,
        quizAttempts: {
          where: {
            submittedAt: { not: null }
          },
          select: { quizId: true, passed: true }
        }
      }
    })

    if (!enrollment) {
      throw new Error('Enrollment not found')
    }

    // Count only required lessons. A non-required lesson the learner skipped
    // must not block completion; `Lesson.required` defaults to true, so this
    // only changes behavior for lessons an author explicitly marked optional.
    const requiredLessons = enrollment.course.modules.flatMap((m) => m.lessons).filter((l) => l.required)

    const completedRequiredLessonIds = new Set(
      enrollment.lessonProgress
        .filter((lp) => lp.status === 'completed')
        .map((lp) => lp.lessonId)
    )

    const requiredLessonsCompleted = requiredLessons.filter((l) =>
      completedRequiredLessonIds.has(l.id)
    ).length

    if (requiredLessonsCompleted < requiredLessons.length) {
      return false
    }

    // Check that every quiz marked requiredForCompletion has been passed at
    // least once. Quizzes the author marked optional are not a blocker.
    const courseQuizzes = await prisma.quiz.findMany({
      where: {
        courseId: enrollment.courseId,
        requiredForCompletion: true,
      },
      select: { id: true }
    })

    const requiredQuizIds = new Set(courseQuizzes.map((q) => q.id))
    const passedRequiredQuizIds = new Set(
      enrollment.quizAttempts
        .filter((qa) => qa.passed === true)
        .map((qa) => qa.quizId)
    )

    const allRequiredQuizzesPassed = Array.from(requiredQuizIds).every((qid) =>
      passedRequiredQuizIds.has(qid)
    )

    return allRequiredQuizzesPassed
  } catch (error) {
    console.error('Error checking completion requirements:', error)
    throw error
  }
}

/**
 * Issues a certificate to a learner who has completed a course
 * @param enrollmentId - The ID of the enrollment to issue a certificate for
 * @returns The created certificate or null if requirements aren't met
 */
export async function issueCertificate(enrollmentId: string): Promise<Certificate | null> {
  try {
    // Check if learner has met all completion requirements
    const requirementsMet = await checkCompletionRequirements(enrollmentId)
    
    if (!requirementsMet) {
      return null
    }

    // Get enrollment with related data
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            author: true
          }
        },
        user: true
      }
    })

    if (!enrollment) {
      throw new Error('Enrollment not found')
    }

    // Check if certificate already exists
    const existingCertificate = await prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId: enrollment.userId,
          courseId: enrollment.courseId
        }
      }
    })

    if (existingCertificate) {
      return existingCertificate
    }

    // Generate a certificate number using a cryptographically random suffix.
    // Math.random() can collide and is not a secure source; generateSecureToken
    // uses crypto.randomBytes, the same source as password reset tokens.
    const certificateNumber = `CERT-${Date.now()}-${generateSecureToken(4).toUpperCase()}`

    // Institution name comes from the admin-configurable platform.name
    // setting, falling back to the INSTITUTION_NAME env var for legacy
    // deployments, then to a sensible default. This keeps a single source of
    // truth for the platform name across the UI and certificates.
    const platformSetting = await getSetting('platform.name')
    const institutionName =
      (typeof platformSetting === 'string' && platformSetting.trim()) ||
      process.env.INSTITUTION_NAME ||
      'MagpieBridge Education Platform'

    // Create certificate record with enhanced data
    const certificate = await prisma.certificate.create({
      data: {
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        enrollmentId: enrollment.id,
        certificateNumber: certificateNumber,
        completionDate: new Date(),
        certificateData: {
          courseTitle: enrollment.course.title,
          courseDescription: enrollment.course.description || '',
          userName: enrollment.user.name || '',
          userEmail: enrollment.user.email || '',
          instructorName: enrollment.course.author?.name || '',
          institutionName: institutionName,
          issueDate: new Date(),
          completionDate: new Date()
        }
      }
    })

    return certificate
  } catch (error) {
    console.error('Error issuing certificate:', error)
    throw error
  }
}

/**
 * Automatically issues a certificate when a learner completes a course
 * This function should be called when lesson progress or quiz attempts are updated
 * @param enrollmentId - The ID of the enrollment to check for completion
 */
export async function autoIssueCertificate(enrollmentId: string): Promise<Certificate | null> {
  try {
    // Check if the enrollment is complete
    const isComplete = await checkCompletionRequirements(enrollmentId)
    
    if (!isComplete) {
      return null
    }
    
    // Issue the certificate
    const certificate = await issueCertificate(enrollmentId)
    
    return certificate
  } catch (error) {
    console.error('Error in auto-issue certificate:', error)
    throw error
  }
}

/**
 * Retrieves all certificates for a specific user
 * @param userId - The ID of the user
 * @returns Array of certificates
 */
export async function getUserCertificates(userId: string): Promise<Certificate[]> {
  try {
    const certificates = await prisma.certificate.findMany({
      where: {
        userId: userId
      },
      include: {
        course: true
      },
      orderBy: {
        completionDate: 'desc'
      }
    })
    
    return certificates
  } catch (error) {
    console.error('Error retrieving user certificates:', error)
    throw error
  }
}

/**
 * Retrieves a specific certificate by ID
 * @param certificateId - The ID of the certificate
 * @param userId - The ID of the user requesting the certificate (for authorization)
 * @returns The certificate or null if not found/authorized
 */
export async function getCertificateById(certificateId: string, userId?: string): Promise<Certificate | null> {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: {
        id: certificateId
      },
      include: {
        course: true,
        user: true
      }
    })
    
    // If userId is provided, verify ownership or admin role
    if (userId && certificate) {
      const user = await prisma.user.findUnique({
        where: {
          id: userId
        },
        include: {
          userRoles: {
            include: {
              role: true
            }
          }
        }
      })
      
      const isAdmin = user?.userRoles.some(userRole => userRole.role.name === 'admin')
      
      if (certificate.userId !== userId && !isAdmin) {
        return null
      }
    }
    
    return certificate
  } catch (error) {
    console.error('Error retrieving certificate:', error)
    throw error
  }
}

/**
 * Validates a certificate by its number
 * @param certificateNumber - The certificate number to validate
 * @returns The certificate if valid, null otherwise
 */
export async function validateCertificateByNumber(certificateNumber: string): Promise<Certificate | null> {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: {
        certificateNumber: certificateNumber
      },
      include: {
        course: true,
        user: true
      }
    })
    
    return certificate
  } catch (error) {
    console.error('Error validating certificate:', error)
    throw error
  }
}