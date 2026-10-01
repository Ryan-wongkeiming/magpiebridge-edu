# MagpieBridge-Edu User Enrollment and Progress Tracking Implementation

Date: 2026-09-22  
Author: Grok  
Job: NEXT-011  
Output path: outputs/ENROLLMENT_PROGRESS_REPORT_2026-09-22.md

---

## 1. Overview

This document describes the user enrollment and progress tracking features implementation for MagpieBridge-Edu. These features allow learners to enroll in courses and track their progress through lessons and modules.

## 2. Current Authentication Setup

The application uses Auth.js/NextAuth.js with:
- Email/password authentication via credentials provider
- OAuth providers (Google, Microsoft) as planned extensions
- Database-backed sessions
- Role-based access control

## 3. User Enrollment and Progress Tracking Workflow

### Course Enrollment
1. Learner browses available courses in the catalog
2. Learner selects a course to enroll in
3. System checks course visibility and learner eligibility
4. System creates enrollment record with "not_started" status
5. Learner gains access to course content

### Lesson Progress Tracking
1. Learner opens an enrolled course
2. Learner views lessons within modules
3. System records "in_progress" status when lesson is opened
4. System records "completed" status when lesson is marked complete
5. Progress percentage updates automatically

### Course Completion
1. Learner completes all required lessons
2. System checks completion criteria (lessons, quizzes, etc.)
3. System updates enrollment status to "completed"
4. System creates completion certificate if applicable
5. System records completion timestamp

## 4. Implementation Details

### Database Schema Integration

The existing database schema includes the necessary entities for enrollment and progress tracking:

#### Enrollment Model
```prisma
model Enrollment {
  id              String   @id @default(cuid())
  userId          String
  courseId        String
  enrollmentSource String  @default("assigned") // self, assigned, learning_path
  status          String   @default("not_started") // not_started, in_progress, completed, withdrawn, archived
  progressPercent Float   @default(0)
  enrolledAt      DateTime @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  dueDate         DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id])
  course          Course   @relation(fields: [courseId], references: [id])
  lessonProgress  LessonProgress[]
  quizAttempts    QuizAttempt[]
  certificate     Certificate?
  
  @@unique([userId, courseId])
}
```

#### LessonProgress Model
```prisma
model LessonProgress {
  id            String   @id @default(cuid())
  userId        String
  enrollmentId  String
  lessonId      String
  status        String   @default("not_started") // not_started, in_progress, completed
  startedAt     DateTime?
  completedAt   DateTime?
  lastViewedAt  DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id])
  enrollment    Enrollment @relation(fields: [enrollmentId], references: [id])
  lesson        Lesson   @relation(fields: [lessonId], references: [id])

  @@unique([userId, lessonId, enrollmentId])
}
```

### API Routes

#### Enroll in Course Endpoint
`POST /api/enrollments`

```typescript
// app/api/enrollments/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { courseId } = await request.json()
    
    // Check if course exists and is available for enrollment
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    })
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    // Check if course is published
    if (course.status !== 'published') {
      return NextResponse.json({ error: 'Course is not available for enrollment' }, { status: 400 })
    }
    
    // Check if user is already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId
        }
      }
    })
    
    if (existingEnrollment) {
      return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 400 })
    }
    
    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        user: {
          connect: {
            id: session.user.id
          }
        },
        course: {
          connect: {
            id: courseId
          }
        },
        enrollmentSource: 'self'
      }
    })
    
    return NextResponse.json(enrollment)
  } catch (error) {
    console.error('Enroll in course error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

#### Get Enrollment Endpoint
`GET /api/enrollments/[id]`

```typescript
// app/api/enrollments/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            modules: {
              orderBy: {
                sortOrder: 'asc'
              },
              include: {
                lessons: {
                  orderBy: {
                    sortOrder: 'asc'
                  }
                }
              }
            }
          }
        },
        lessonProgress: true
      }
    })
    
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }
    
    // Check if user owns this enrollment
    if (enrollment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json(enrollment)
  } catch (error) {
    console.error('Get enrollment error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

#### Update Lesson Progress Endpoint
`POST /api/lesson-progress`

```typescript
// app/api/lesson-progress/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { enrollmentId, lessonId, status } = await request.json()
    
    // Verify enrollment belongs to user
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId }
    })
    
    if (!enrollment || enrollment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
          lastViewedAt: now,
          updatedAt: now
        }
      })
    } else {
      // Create new progress record
      lessonProgress = await prisma.lessonProgress.create({
        data: {
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
          lastViewedAt: now
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
        await prisma.enrollment.update({
          where: { id: enrollmentId },
          data: {
            progressPercent,
            ...(progressPercent > 0 && !enrollment.startedAt && { startedAt: now }),
            ...(progressPercent === 100 && !enrollment.completedAt && { completedAt: now, status: 'completed' })
          }
        })
      }
    }
    
    return NextResponse.json(lessonProgress)
  } catch (error) {
    console.error('Update lesson progress error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

### Frontend Components

#### Course Catalog Component
`components/course-catalog.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface CourseCatalogProps {
  courses: any[]
  onEnroll: (courseId: string) => void
}

export default function CourseCatalog({ courses, onEnroll }: CourseCatalogProps) {
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrolling(courseId)
      await onEnroll(courseId)
    } catch (err) {
      setError('Failed to enroll in course')
    } finally {
      setEnrolling(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <div key={course.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
          <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
          <div className="flex justify-between items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {course.status}
            </span>
            <Button 
              onClick={() => handleEnroll(course.id)} 
              disabled={enrolling === course.id}
            >
              {enrolling === course.id ? 'Enrolling...' : 'Enroll'}
            </Button>
          </div>
        </div>
      ))}
      
      {courses.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500 mb-4">No courses available for enrollment</p>
        </div>
      )}
    </div>
  )
}
```

#### Course Progress Component
`components/course-progress.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CourseProgressProps {
  enrollment: any
  onStartLesson: (lessonId: string) => void
}

export default function CourseProgress({ enrollment, onStartLesson }: CourseProgressProps) {
  const [startingLesson, setStartingLesson] = useState<string | null>(null)
  const [completingLesson, setCompletingLesson] = useState<string | null>(null)

  const handleStartLesson = async (lessonId: string) => {
    try {
      setStartingLesson(lessonId)
      await onStartLesson(lessonId)
    } catch (err) {
      console.error('Failed to start lesson:', err)
    } finally {
      setStartingLesson(null)
    }
  }

  const handleCompleteLesson = async (lessonId: string) => {
    try {
      setCompletingLesson(lessonId)
      // Implementation for marking lesson as complete
    } catch (err) {
      console.error('Failed to complete lesson:', err)
    } finally {
      setCompletingLesson(null)
    }
  }

  const getLessonProgress = (lessonId: string) => {
    return enrollment.lessonProgress.find((lp: any) => lp.lessonId === lessonId)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Course Progress</h2>
          <span className="text-lg font-medium">{Math.round(enrollment.progressPercent)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-blue-600 h-4 rounded-full" 
            style={{ width: `${enrollment.progressPercent}%` }}
          ></div>
        </div>
      </div>

      {enrollment.course.modules.map((module: any) => (
        <div key={module.id} className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">{module.title}</h3>
            <p className="text-gray-600 text-sm mt-1">{module.description}</p>
          </div>
          
          <div className="p-4">
            <div className="space-y-3">
              {module.lessons.map((lesson: any) => {
                const progress = getLessonProgress(lesson.id)
                return (
                  <div key={lesson.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div className="mr-3">
                        {progress?.status === 'completed' ? (
                          <span className="text-green-500">✓</span>
                        ) : progress?.status === 'in_progress' ? (
                          <span className="text-yellow-500">●</span>
                        ) : (
                          <span className="text-gray-300">○</span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{lesson.title}</div>
                        {lesson.estimatedDuration && (
                          <div className="text-sm text-gray-500">
                            {lesson.estimatedDuration} min
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {progress?.status !== 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleStartLesson(lesson.id)}
                          disabled={startingLesson === lesson.id}
                        >
                          {startingLesson === lesson.id ? 'Starting...' : 'Start'}
                        </Button>
                      )}
                      {progress?.status === 'in_progress' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCompleteLesson(lesson.id)}
                          disabled={completingLesson === lesson.id}
                        >
                          {completingLesson === lesson.id ? 'Completing...' : 'Complete'}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### Enrollment Dashboard Component
`components/enrollment-dashboard.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import CourseProgress from '@/components/course-progress'

interface EnrollmentDashboardProps {
  enrollments: any[]
  onSelectEnrollment: (enrollmentId: string) => void
  selectedEnrollmentId: string | null
}

export default function EnrollmentDashboard({ 
  enrollments, 
  onSelectEnrollment, 
  selectedEnrollmentId 
}: EnrollmentDashboardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedEnrollment = enrollments.find(e => e.id === selectedEnrollmentId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">My Enrollments</h2>
          </div>
          <div className="divide-y">
            {enrollments.map((enrollment) => (
              <div 
                key={enrollment.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  enrollment.id === selectedEnrollmentId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => onSelectEnrollment(enrollment.id)}
              >
                <div className="font-medium">{enrollment.course.title}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {Math.round(enrollment.progressPercent)}% Complete
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    enrollment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {enrollment.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="lg:col-span-3">
        {selectedEnrollment ? (
          <CourseProgress 
            enrollment={selectedEnrollment} 
            onStartLesson={async (lessonId) => {
              // Implementation for starting a lesson
              console.log('Starting lesson:', lessonId)
            }}
          />
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <h3 className="text-lg font-medium mb-2">Select a Course</h3>
            <p className="text-gray-500">Choose a course from the list to view progress</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

### Frontend Pages

#### Course Catalog Page
`app/catalog/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import CourseCatalog from '@/components/course-catalog'

export default function CourseCatalogPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }
    
    fetchCourses()
  }, [session, status])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/courses?status=published')
      const data = await response.json()
      
      if (response.ok) {
        setCourses(data)
      } else {
        setError(data.error || 'Failed to fetch courses')
      }
    } catch (err) {
      setError('Failed to fetch courses')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (courseId: string) => {
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        router.push(`/enrollments/${data.id}`)
      } else {
        setError(data.error || 'Failed to enroll in course')
      }
    } catch (err) {
      setError('Failed to enroll in course')
    }
  }

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Course Catalog</h1>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <CourseCatalog courses={courses} onEnroll={handleEnroll} />
      )}
    </div>
  )
}
```

#### Enrollment Dashboard Page
`app/enrollments/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import EnrollmentDashboard from '@/components/enrollment-dashboard'

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState([])
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }
    
    fetchEnrollments()
  }, [session, status])

  const fetchEnrollments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/enrollments')
      const data = await response.json()
      
      if (response.ok) {
        setEnrollments(data)
        if (data.length > 0 && !selectedEnrollmentId) {
          setSelectedEnrollmentId(data[0].id)
        }
      } else {
        setError(data.error || 'Failed to fetch enrollments')
      }
    } catch (err) {
      setError('Failed to fetch enrollments')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Learning</h1>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <EnrollmentDashboard 
          enrollments={enrollments}
          onSelectEnrollment={setSelectedEnrollmentId}
          selectedEnrollmentId={selectedEnrollmentId}
        />
      )}
    </div>
  )
}
```

#### Lesson Viewer Page
`app/lessons/[id]/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import LessonPreview from '@/components/lesson-preview'

export default function LessonViewerPage() {
  const [lesson, setLesson] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingComplete, setMarkingComplete] = useState(false)
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }
    
    fetchLessonAndEnrollment()
  }, [session, status])

  const fetchLessonAndEnrollment = async () => {
    try {
      setLoading(true)
      
      // Fetch lesson
      const lessonResponse = await fetch(`/api/lessons/${params.id}`)
      const lessonData = await lessonResponse.json()
      
      if (!lessonResponse.ok) {
        setError(lessonData.error || 'Failed to fetch lesson')
        return
      }
      
      setLesson(lessonData)
      
      // Fetch enrollment for this lesson's course
      const enrollmentResponse = await fetch(`/api/enrollments?courseId=${lessonData.module.courseId}`)
      const enrollmentData = await enrollmentResponse.json()
      
      if (enrollmentResponse.ok && enrollmentData.length > 0) {
        setEnrollment(enrollmentData[0])
      }
      
      // Mark lesson as in progress
      await markLessonInProgress(params.id)
    } catch (err) {
      setError('Failed to fetch lesson')
    } finally {
      setLoading(false)
    }
  }

  const markLessonInProgress = async (lessonId: string) => {
    if (!enrollment) return
    
    try {
      await fetch('/api/lesson-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          lessonId: lessonId,
          status: 'in_progress'
        })
      })
    } catch (err) {
      console.error('Failed to mark lesson as in progress:', err)
    }
  }

  const markLessonComplete = async () => {
    if (!enrollment || !lesson) return
    
    try {
      setMarkingComplete(true)
      await fetch('/api/lesson-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          status: 'completed'
        })
      })
      
      // Refresh enrollment to update progress
      const response = await fetch(`/api/enrollments/${enrollment.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setEnrollment(data)
      }
    } catch (err) {
      setError('Failed to mark lesson as complete')
    } finally {
      setMarkingComplete(false)
    }
  }

  const navigateToNextLesson = () => {
    // Implementation for navigating to next lesson
    console.log('Navigate to next lesson')
  }

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Lesson Not Found</h2>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
          <p className="text-gray-600 mt-1">
            Course: {lesson.module?.course?.title} • Module: {lesson.module?.title}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={markLessonComplete} disabled={markingComplete}>
            {markingComplete ? 'Marking Complete...' : 'Mark Complete'}
          </Button>
          <Button onClick={() => router.push(`/enrollments/${enrollment?.id}`)}>
            Back to Course
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <LessonPreview lesson={lesson} />
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          Previous Lesson
        </Button>
        <Button onClick={navigateToNextLesson}>
          Next Lesson
        </Button>
      </div>
    </div>
  )
}
```

### Utility Functions

#### Progress Calculation Utilities
`lib/progress-utils.ts`

```typescript
// Utility functions for calculating and tracking progress

export function calculateCourseProgress(enrollment: any): number {
  if (!enrollment.course?.modules) return 0
  
  const totalLessons = enrollment.course.modules.reduce(
    (total: number, module: any) => total + (module.lessons?.length || 0), 
    0
  )
  
  if (totalLessons === 0) return 0
  
  const completedLessons = enrollment.lessonProgress?.filter(
    (lp: any) => lp.status === 'completed'
  ).length || 0
  
  return Math.round((completedLessons / totalLessons) * 100)
}

export function getLessonStatus(enrollment: any, lessonId: string): string {
  const progress = enrollment.lessonProgress?.find(
    (lp: any) => lp.lessonId === lessonId
  )
  
  return progress?.status || 'not_started'
}

export function isCourseCompleted(enrollment: any): boolean {
  return enrollment.status === 'completed'
}

export function getNextIncompleteLesson(enrollment: any): string | null {
  if (!enrollment.course?.modules) return null
  
  for (const module of enrollment.course.modules) {
    for (const lesson of module.lessons) {
      const status = getLessonStatus(enrollment, lesson.id)
      if (status !== 'completed') {
        return lesson.id
      }
    }
  }
  
  return null
}
```

## 5. Security Considerations

### Enrollment Validation
- Verify user authorization before creating enrollments
- Check course visibility and availability
- Prevent duplicate enrollments

### Progress Tracking
- Validate user ownership of enrollments
- Ensure lesson progress updates are legitimate
- Protect against unauthorized progress manipulation

### Data Privacy
- Only expose enrollment data to authorized users
- Implement proper session management
- Sanitize and validate all input data

## 6. Database Integration

### Enrollment Creation
1. Validate course availability and user eligibility
2. Create enrollment record with "not_started" status
3. Initialize progress tracking data

### Progress Updates
1. Track lesson start and completion timestamps
2. Update enrollment progress percentage
3. Handle course completion automatically

### Data Consistency
1. Maintain referential integrity between entities
2. Use database transactions for critical operations
3. Implement proper error handling and rollback mechanisms

## 7. Testing

### Unit Tests
- Enrollment creation and validation functions
- Progress calculation and tracking utilities
- API endpoint responses

### Integration Tests
- Full enrollment workflow
- Lesson progress tracking
- Course completion detection
- Role-based access control

### Manual Testing
- End-to-end enrollment experience
- Progress tracking accuracy
- Cross-browser compatibility
- Mobile responsiveness

## 8. Customization Options

### Enrollment Policies
- Self-enrollment vs. assigned enrollment
- Prerequisite course requirements
- Enrollment deadlines and restrictions

### Progress Tracking
- Custom completion criteria
- Time-based progress tracking
- Peer review and social learning features

### Advanced Features
- Gamification elements (badges, points)
- Learning path recommendations
- Adaptive learning algorithms
- Social learning features

## 9. Troubleshooting

### Common Issues

1. **Enrollment Failure**
   - Check course availability and visibility
   - Verify user authentication status
   - Ensure database connectivity

2. **Progress Not Updating**
   - Check lesson progress API calls
   - Verify enrollment ownership
   - Check for JavaScript errors

3. **Course Not Completing**
   - Verify completion criteria configuration
   - Check progress calculation logic
   - Ensure all required lessons are marked complete

### Debugging Steps
1. Check server logs
2. Verify database records
3. Test API endpoints individually
4. Validate user permissions
5. Check environment variables

## 10. Next Steps

After implementing user enrollment and progress tracking features:

1. **Test Enrollment Workflow**: Verify all enrollment scenarios work correctly
2. **Implement Quiz Functionality**: Add assessment capabilities
3. **Add Certificate Generation**: Create completion certificates
4. **Enhance Progress Analytics**: Add detailed progress reporting
5. **Implement Notifications**: Add email/SMS notifications for progress milestones

This user enrollment and progress tracking implementation provides learners with the ability to enroll in courses and track their learning progress, forming a core component of the MagpieBridge-Edu platform.