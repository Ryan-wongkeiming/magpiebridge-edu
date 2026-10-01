# MagpieBridge-Edu Course Management Implementation

Date: 2026-09-22  
Author: Grok  
Job: NEXT-009  
Output path: outputs/COURSE_MANAGEMENT_REPORT_2026-09-22.md

---

## 1. Overview

This document describes the course management features implementation for MagpieBridge-Edu. The course management system allows instructors and admins to create, edit, organize, and publish courses with modules and lessons.

## 2. Current Authentication Setup

The application uses Auth.js/NextAuth.js with:
- Email/password authentication via credentials provider
- OAuth providers (Google, Microsoft) as planned extensions
- Database-backed sessions
- Role-based access control

## 3. Course Management Workflow

### Create Course
1. Instructor or admin navigates to the course creation page
2. User fills in course details (title, description, visibility, etc.)
3. System creates a draft course record in the database
4. User is redirected to the course editor page

### Edit Course
1. Instructor or admin opens an existing course in the editor
2. User can modify course details, modules, and lessons
3. Changes are saved automatically or on demand
4. User can preview the course before publishing

### Organize Content
1. User creates modules within a course
2. User creates lessons within modules
3. User can reorder modules and lessons using drag-and-drop
4. User can set required status for modules and lessons

### Publish Course
1. User reviews course content and settings
2. User clicks "Publish" button
3. System updates course status to "published"
4. Course becomes available to learners based on visibility settings

## 4. Implementation Details

### Database Schema Integration

The existing database schema includes all necessary entities for course management:

#### Course Model
```prisma
model Course {
  id              String     @id @default(cuid())
  title           String
  description     String?
  status          String     @default("draft") // draft, published, archived
  estimatedDuration Int?     // in minutes
  completionCriteria Json?   // Requirements to complete the course
  visibility      String     @default("private") // public, private, assigned
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  publishedAt     DateTime?
  archivedAt      DateTime?

  // Author and manager
  authorId        String
  author          User       @relation("AuthorCourses", fields: [authorId], references: [id])
  managerId       String?
  manager         User?      @relation("ManagerCourses", fields: [managerId], references: [id])

  // Content relationships
  modules         Module[]
  quizzes         Quiz[]
  learningPaths   LearningPathCourse[]

  // Learning relationships
  enrollments     Enrollment[]
  certificates    Certificate[]

  // Audit
  auditLogs       AuditLog[] @relation("CourseAuditLogs")
}
```

#### Module Model
```prisma
model Module {
  id          String   @id @default(cuid())
  courseId    String
  title       String
  description String?
  sortOrder   Int
  required    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons     Lesson[]
}
```

#### Lesson Model
```prisma
model Lesson {
  id              String   @id @default(cuid())
  moduleId        String
  title           String
  content         String?  // Lesson content (Markdown, HTML, etc.)
  contentType     String   @default("text") // text, video, document, etc.
  contentUrl      String?  // URL for external content or file reference
  sortOrder       Int
  required        Boolean  @default(true)
  estimatedDuration Int?   // in minutes
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  module          Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  lessonProgress  LessonProgress[]
}
```

### API Routes

#### Create Course Endpoint
`POST /api/courses`

```typescript
// app/api/courses/route.ts
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
    
    // Check if user has instructor or admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    
    const hasPermission = user?.userRoles.some(
      userRole => ['instructor', 'admin'].includes(userRole.role.name)
    )
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { title, description } = await request.json()
    
    const course = await prisma.course.create({
      data: {
        title,
        description,
        author: {
          connect: {
            id: session.user.id
          }
        },
        status: 'draft'
      }
    })
    
    return NextResponse.json(course)
  } catch (error) {
    console.error('Create course error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

#### Get Course Endpoint
`GET /api/courses/[id]`

```typescript
// app/api/courses/[id]/route.ts
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
    
    const course = await prisma.course.findUnique({
      where: { id: params.id },
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
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    // Check if user can view this course
    const canView = course.status === 'published' || 
      (session?.user && (
        course.authorId === session.user.id ||
        course.managerId === session.user.id ||
        session.user.roles?.includes('admin')
      ))
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json(course)
  } catch (error) {
    console.error('Get course error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const course = await prisma.course.findUnique({
      where: { id: params.id }
    })
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    // Check if user can edit this course
    const canEdit = course.authorId === session.user.id ||
      course.managerId === session.user.id ||
      session.user.roles?.includes('admin')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { title, description, status } = await request.json()
    
    const updatedCourse = await prisma.course.update({
      where: { id: params.id },
      data: {
        title,
        description,
        status,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json(updatedCourse)
  } catch (error) {
    console.error('Update course error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

#### Create Module Endpoint
`POST /api/courses/[id]/modules`

```typescript
// app/api/courses/[id]/modules/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const course = await prisma.course.findUnique({
      where: { id: params.id }
    })
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    // Check if user can edit this course
    const canEdit = course.authorId === session.user.id ||
      course.managerId === session.user.id ||
      session.user.roles?.includes('admin')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { title, description, required } = await request.json()
    
    // Get the next sort order
    const maxSortOrder = await prisma.module.aggregate({
      _max: {
        sortOrder: true
      },
      where: {
        courseId: params.id
      }
    })
    
    const nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1
    
    const module = await prisma.module.create({
      data: {
        title,
        description,
        required,
        sortOrder: nextSortOrder,
        course: {
          connect: {
            id: params.id
          }
        }
      }
    })
    
    return NextResponse.json(module)
  } catch (error) {
    console.error('Create module error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

#### Create Lesson Endpoint
`POST /api/modules/[id]/lessons`

```typescript
// app/api/modules/[id]/lessons/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const module = await prisma.module.findUnique({
      where: { id: params.id },
      include: {
        course: true
      }
    })
    
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }
    
    // Check if user can edit this course
    const canEdit = module.course.authorId === session.user.id ||
      module.course.managerId === session.user.id ||
      session.user.roles?.includes('admin')
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { title, content, contentType, contentUrl, required, estimatedDuration } = await request.json()
    
    // Get the next sort order
    const maxSortOrder = await prisma.lesson.aggregate({
      _max: {
        sortOrder: true
      },
      where: {
        moduleId: params.id
      }
    })
    
    const nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1
    
    const lesson = await prisma.lesson.create({
      data: {
        title,
        content,
        contentType,
        contentUrl,
        required,
        estimatedDuration,
        sortOrder: nextSortOrder,
        module: {
          connect: {
            id: params.id
          }
        }
      }
    })
    
    return NextResponse.json(lesson)
  } catch (error) {
    console.error('Create lesson error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

### Frontend Pages

#### Course List Page
`app/courses/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function CoursesPage() {
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
      const response = await fetch('/api/courses')
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

  const handleCreateCourse = async () => {
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: 'New Course',
          description: 'A new course created on ' + new Date().toLocaleDateString()
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        router.push(`/courses/${data.id}/edit`)
      } else {
        setError(data.error || 'Failed to create course')
      }
    } catch (err) {
      setError('Failed to create course')
    }
  }

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Courses</h1>
        <Button onClick={handleCreateCourse}>Create New Course</Button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div 
              key={course.id} 
              className="border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/courses/${course.id}`)}
            >
              <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
              <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
              <div className="flex justify-between items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {course.status}
                </span>
                <span className="text-sm text-gray-500">
                  {course.modules?.length || 0} modules
                </span>
              </div>
            </div>
          ))}
          
          {courses.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 mb-4">No courses found</p>
              <Button onClick={handleCreateCourse}>Create Your First Course</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

#### Course Editor Page
`app/courses/[id]/edit/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function CourseEditorPage() {
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }
    
    fetchCourse()
  }, [session, status])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/courses/${params.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setCourse(data)
      } else {
        setError(data.error || 'Failed to fetch course')
      }
    } catch (err) {
      setError('Failed to fetch course')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/courses/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: course.title,
          description: course.description,
          status: course.status
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setCourse(data)
      } else {
        setError(data.error || 'Failed to save course')
      }
    } catch (err) {
      setError('Failed to save course')
    } finally {
      setSaving(false)
    }
  }

  const handleAddModule = async () => {
    try {
      const response = await fetch(`/api/courses/${params.id}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Module',
          description: '',
          required: true
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Refresh course data to include new module
        fetchCourse()
      } else {
        setError(data.error || 'Failed to add module')
      }
    } catch (err) {
      setError('Failed to add module')
    }
  }

  const handlePublish = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/courses/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...course,
          status: 'published',
          publishedAt: new Date()
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setCourse(data)
        router.push(`/courses/${params.id}`)
      } else {
        setError(data.error || 'Failed to publish course')
      }
    } catch (err) {
      setError('Failed to publish course')
    } finally {
      setSaving(false)
    }
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

  if (!course) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Course Not Found</h2>
          <Button onClick={() => router.push('/courses')}>Back to Courses</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Editing: {course.title}</h1>
          <div className="flex items-center mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
              {course.status}
            </span>
            {course.status === 'draft' && (
              <span className="text-sm text-gray-500">
                Last saved: {new Date(course.updatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push(`/courses/${course.id}`)}>
            View
          </Button>
          {course.status === 'draft' && (
            <Button onClick={handlePublish} disabled={saving}>
              {saving ? 'Publishing...' : 'Publish'}
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Details */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Course Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={course.title}
                  onChange={(e) => setCourse({...course, title: e.target.value})}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={course.description || ''}
                  onChange={(e) => setCourse({...course, description: e.target.value})}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                <select
                  value={course.visibility}
                  onChange={(e) => setCourse({...course, visibility: e.target.value})}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                  <option value="assigned">Assigned Only</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Course Statistics</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Modules</span>
                <span className="font-medium">{course.modules?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lessons</span>
                <span className="font-medium">
                  {course.modules?.reduce((total, module) => total + (module.lessons?.length || 0), 0) || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Enrollments</span>
                <span className="font-medium">{course.enrollments?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modules and Lessons */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Course Content</h2>
            <Button onClick={handleAddModule}>Add Module</Button>
          </div>

          <div className="space-y-6">
            {course.modules?.map((module) => (
              <div key={module.id} className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">{module.title}</h3>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Delete</Button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{module.description}</p>
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Lessons</h4>
                    <Button variant="outline" size="sm">Add Lesson</Button>
                  </div>
                  
                  <div className="space-y-2">
                    {module.lessons?.map((lesson) => (
                      <div key={lesson.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{lesson.title}</span>
                          {lesson.contentType !== 'text' && (
                            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {lesson.contentType}
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm">Delete</Button>
                        </div>
                      </div>
                    ))}
                    
                    {(!module.lessons || module.lessons.length === 0) && (
                      <div className="text-center py-4 text-gray-500">
                        No lessons in this module
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {(!course.modules || course.modules.length === 0) && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500 mb-4">No modules in this course yet</p>
                <Button onClick={handleAddModule}>Add Your First Module</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Utility Functions

#### Authorization Helper
`lib/auth.ts`

```typescript
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/prisma'

export async function getUserWithRoles() {
  const session = await getServerSession(authConfig)
  
  if (!session?.user) {
    return null
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  })
  
  return user
}

export function hasRole(user: any, roleName: string) {
  if (!user) return false
  return user.userRoles.some((userRole: any) => userRole.role.name === roleName)
}

export function canEditCourse(user: any, course: any) {
  if (!user || !course) return false
  return course.authorId === user.id ||
    course.managerId === user.id ||
    hasRole(user, 'admin')
}
```

## 5. Security Considerations

### Role-Based Access Control
- Only instructors and admins can create courses
- Only course authors, managers, and admins can edit courses
- Published courses can be viewed by learners based on visibility settings

### Data Validation
- Input validation on all API endpoints
- Sanitization of user-provided content
- Proper error handling without revealing sensitive information

### Session Management
- Secure session handling with Auth.js
- Proper authentication checks on all endpoints
- CSRF protection

## 6. Database Integration

### Course Creation
1. Create course record with author relationship
2. Set initial status to "draft"
3. Return course ID for further editing

### Content Organization
1. Modules are ordered within courses
2. Lessons are ordered within modules
3. Drag-and-drop reordering updates sort orders

### Publishing Workflow
1. Course status changes from "draft" to "published"
2. Published timestamp is set
3. Course becomes visible to learners based on visibility settings

## 7. Testing

### Unit Tests
- Course creation and editing functions
- Module and lesson management
- Authorization checks
- API endpoint responses

### Integration Tests
- Full course creation workflow
- Content organization and reordering
- Publishing and visibility controls
- Role-based access control

### Manual Testing
- End-to-end course creation and editing
- Content organization with drag-and-drop
- Publishing workflow validation
- User experience validation

## 8. Customization Options

### Content Types
- Text-based lessons
- Video lessons with external URLs
- Document uploads
- Interactive content

### Course Templates
- Pre-defined course structures
- Reusable module templates
- Lesson templates

### Advanced Features
- Prerequisite courses
- Course categories and tags
- Custom completion criteria
- Course versioning

## 9. Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check user roles
   - Verify course ownership
   - Ensure proper session management

2. **Content Not Saving**
   - Check network connectivity
   - Verify database connectivity
   - Check for validation errors

3. **Course Not Visible**
   - Check course status
   - Verify visibility settings
   - Confirm user enrollment (if applicable)

### Debugging Steps
1. Check server logs
2. Verify database records
3. Test API endpoints individually
4. Validate user permissions
5. Check environment variables

## 10. Next Steps

After implementing course management features:

1. **Test Course Creation Workflow**: Verify all steps work correctly
2. **Implement Content Editing**: Add rich text editor for lesson content
3. **Add Media Support**: Implement file uploads for lessons
4. **Enhance Course Preview**: Add preview functionality for unpublished courses
5. **Implement Course Analytics**: Add basic course statistics and reporting

This course management implementation provides instructors and admins with the tools they need to create, organize, and publish educational content, forming the core of the MagpieBridge-Edu platform.