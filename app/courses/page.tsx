'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import type { CourseListItem } from '@/types/api'

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
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

  const visibleCourses =
    statusFilter === 'all'
      ? courses
      : courses.filter((c) => c.status === statusFilter)

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
        <>
          <div className="flex gap-2 mb-6">
            {['all', 'draft', 'published', 'archived'].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                className="capitalize"
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCourses.map((course) => (
              <div
                key={course.id}
                className="border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/courses/${course.id}/edit`)}
              >
                <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
                <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                <div className="flex justify-between items-center">
                  <span
                    className={
                      course.status === 'published'
                        ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize'
                        : course.status === 'archived'
                          ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 capitalize'
                          : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize'
                    }
                  >
                    {course.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {course.modules?.length || 0} modules
                  </span>
                </div>
              </div>
            ))}

            {visibleCourses.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 mb-4">
                  {courses.length === 0
                    ? 'No courses found'
                    : `No ${statusFilter} courses`}
                </p>
                <Button onClick={handleCreateCourse}>Create a Course</Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}