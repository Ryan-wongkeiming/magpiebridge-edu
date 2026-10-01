import { prisma } from '@/lib/prisma'
import { Certificate } from '@prisma/client'

/**
 * Checks if a learner has met all completion requirements for a course
 * @param enrollmentId - The ID of the enrollment to check
 * @returns Boolean indicating if all requirements are met
 */
export async function checkCompletionRequirements(enrollmentId: string): Promise<boolean> {
  try {
    // Get the enrollment with related data
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true
              }
            }
          }
        },
        lessonProgress: true,
        quizAttempts: {
          where: {
            submittedAt: { not: null }
          },
          include: {
            quiz: true
          }
        }
      }
    })

    if (!enrollment) {
      throw new Error('Enrollment not found')
    }

    // Check if all lessons are completed
    const totalLessons = enrollment.course.modules.reduce(
      (count, module) => count + module.lessons.length,
      0
    )

    const completedLessons = enrollment.lessonProgress.filter(
      (lp) => lp.status === 'completed'
    ).length

    if (completedLessons < totalLessons) {
      return false
    }

    // Check if all required quizzes are passed
    // For simplicity, we're assuming all quizzes associated with the course need to be passed
    // This could be enhanced to check specific quiz requirements
    const courseQuizzes = await prisma.quiz.findMany({
      where: {
        courseId: enrollment.courseId
      }
    })

    const passedQuizzes = enrollment.quizAttempts.filter(
      (qa) => qa.passed === true
    ).length

    if (passedQuizzes < courseQuizzes.length) {
      return false
    }

    return true
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

    // Generate certificate number
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Get institution name from environment or use default
    const institutionName = process.env.INSTITUTION_NAME || 'MagpieBridge Education Platform'

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