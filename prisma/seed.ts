// Seeding script for MagpieBridge-Edu
// This script populates the database with initial data for development and testing

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Development-only password shared by all seeded accounts.
  const devPassword = await bcrypt.hash('password123', 10)

  // Create default roles
  const roles = [
    {
      name: 'learner',
      description: 'Learner role for accessing courses and tracking progress'
    },
    {
      name: 'instructor',
      description: 'Instructor role for creating and managing courses'
    },
    {
      name: 'manager',
      description: 'Manager role for viewing team progress and reports'
    },
    {
      name: 'admin',
      description: 'Admin role for managing the platform and users'
    }
  ]

  for (const role of roles) {
    const newRole = await prisma.role.create({
      data: role
    })
    console.log(`Created role: ${newRole.name}`)
  }

  // Create an admin user
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@magpiebridge.edu',
      emailVerified: new Date(),
      password: devPassword,
      status: 'active',
      userRoles: {
        create: [
          {
            role: {
              connect: {
                name: 'admin'
              }
            }
          },
          {
            role: {
              connect: {
                name: 'instructor'
              }
            }
          }
        ]
      }
      // Note: In a real application, you would also create an Account and Session
      // for the user, but for seeding we'll just create the user and roles
    }
  })
  console.log(`Created admin user: ${adminUser.email}`)

  // Create a sample instructor user
  const instructorUser = await prisma.user.create({
    data: {
      name: 'Instructor User',
      email: 'instructor@magpiebridge.edu',
      emailVerified: new Date(),
      password: devPassword,
      status: 'active',
      userRoles: {
        create: [
          {
            role: {
              connect: {
                name: 'instructor'
              }
            }
          }
        ]
      }
    }
  })
  console.log(`Created instructor user: ${instructorUser.email}`)

  // Create a sample learner user
  const learnerUser = await prisma.user.create({
    data: {
      name: 'Learner User',
      email: 'learner@magpiebridge.edu',
      emailVerified: new Date(),
      password: devPassword,
      status: 'active',
      userRoles: {
        create: [
          {
            role: {
              connect: {
                name: 'learner'
              }
            }
          }
        ]
      }
    }
  })
  console.log(`Created learner user: ${learnerUser.email}`)

  // Create a sample manager user
  const managerUser = await prisma.user.create({
    data: {
      name: 'Manager User',
      email: 'manager@magpiebridge.edu',
      emailVerified: new Date(),
      password: devPassword,
      status: 'active',
      userRoles: {
        create: [
          {
            role: {
              connect: {
                name: 'manager'
              }
            }
          }
        ]
      },
      managerId: instructorUser.id
    }
  })
  console.log(`Created manager user: ${managerUser.email}`)

  // Create a sample course
  const sampleCourse = await prisma.course.create({
    data: {
      title: 'Introduction to MagpieBridge-Edu',
      description: 'A sample course to demonstrate the platform capabilities',
      status: 'published',
      visibility: 'public',
      estimatedDuration: 120, // 2 hours
      completionCriteria: {
        lessonsRequired: true,
        quizRequired: true,
        passingScore: 70
      },
      author: {
        connect: {
          id: instructorUser.id
        }
      },
      manager: {
        connect: {
          id: instructorUser.id
        }
      },
      publishedAt: new Date()
    }
  })
  console.log(`Created sample course: ${sampleCourse.title}`)

  // Create modules for the sample course
  const module1 = await prisma.module.create({
    data: {
      title: 'Getting Started',
      description: 'Introduction to the platform',
      sortOrder: 1,
      required: true,
      course: {
        connect: {
          id: sampleCourse.id
        }
      }
    }
  })
  console.log(`Created module: ${module1.title}`)

  const module2 = await prisma.module.create({
    data: {
      title: 'Core Features',
      description: 'Learn about the main features',
      sortOrder: 2,
      required: true,
      course: {
        connect: {
          id: sampleCourse.id
        }
      }
    }
  })
  console.log(`Created module: ${module2.title}`)

  // Create lessons for the modules
  const lesson1 = await prisma.lesson.create({
    data: {
      title: 'Platform Overview',
      content: 'This is the content for the platform overview lesson...',
      contentType: 'text',
      sortOrder: 1,
      required: true,
      module: {
        connect: {
          id: module1.id
        }
      }
    }
  })
  console.log(`Created lesson: ${lesson1.title}`)

  const lesson2 = await prisma.lesson.create({
    data: {
      title: 'Navigation Basics',
      content: 'This is the content for the navigation basics lesson...',
      contentType: 'text',
      sortOrder: 2,
      required: true,
      module: {
        connect: {
          id: module1.id
        }
      }
    }
  })
  console.log(`Created lesson: ${lesson2.title}`)

  const lesson3 = await prisma.lesson.create({
    data: {
      title: 'Course Management',
      content: 'This is the content for the course management lesson...',
      contentType: 'text',
      sortOrder: 1,
      required: true,
      module: {
        connect: {
          id: module2.id
        }
      }
    }
  })
  console.log(`Created lesson: ${lesson3.title}`)

  // Create a quiz for the course
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Introduction Quiz',
      description: 'Test your knowledge of the platform basics',
      passingScore: 70,
      requiredForCompletion: true,
      course: {
        connect: {
          id: sampleCourse.id
        }
      }
    }
  })
  console.log(`Created quiz: ${quiz.title}`)

  // Create questions for the quiz
  const question1 = await prisma.question.create({
    data: {
      questionText: 'What is the primary purpose of MagpieBridge-Edu?',
      questionType: 'multiple_choice',
      answerOptions: [
        'Social networking',
        'Internal learning and certification',
        'E-commerce platform',
        'Content management system'
      ],
      correctAnswer: ['Internal learning and certification'],
      points: 1,
      sortOrder: 1,
      quiz: {
        connect: {
          id: quiz.id
        }
      }
    }
  })
  console.log(`Created question: ${question1.questionText}`)

  const question2 = await prisma.question.create({
    data: {
      questionText: 'Which of the following roles can create courses?',
      questionType: 'multiple_choice',
      answerOptions: [
        'Learner',
        'Instructor',
        'Manager',
        'All of the above'
      ],
      correctAnswer: ['Instructor'],
      points: 1,
      sortOrder: 2,
      quiz: {
        connect: {
          id: quiz.id
        }
      }
    }
  })
  console.log(`Created question: ${question2.questionText}`)

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })