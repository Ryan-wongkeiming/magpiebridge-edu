'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface CourseCatalogProps {
  courses: any[]
  onEnroll: (courseId: string) => void
}

export default function CourseCatalog({ courses, onEnroll }: CourseCatalogProps) {
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleEnroll = async (courseId: string) => {
    setError('')
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
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-teal-50 to-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-teal-800 mb-4">
            Explore Our Course Catalog
          </h1>
          <p className="text-lg text-teal-600 mb-6 max-w-2xl mx-auto">
            Discover courses designed to build your skills and advance your career.
            Learn at your own pace with expert-led content.
          </p>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div key={course.id} className="group">
                {/* Course Card */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow hover:border-teal-200">
                  {/* Thumbnail */}
                  <div className="relative h-48 w-full overflow-hidden rounded-t-xl">
                    {course.thumbnailUrl ? (
                      <Image
                        src={course.thumbnailUrl}
                        alt={course.title}
                        fill
                        objectFit="cover"
                        className="transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-teal-50">
                        <div className="text-center">
                          <svg className="w-12 h-12 text-teal-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m2 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 className="font-semibold text-teal-600">{course.title}</h3>
                        </div>
                      </div>
                    )}
                    {/* Duration Badge */}
                    {course.durationMinutes && (
                      <div className="absolute top-3 left-3 bg-teal-600 text-white text-xs font-medium px-2 py-1 rounded-full shadow">
                        {course.durationMinutes} min
                      </div>
                    )}
                  </div>

                  {/* Course Content */}
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2 hover:underline group-hover:text-teal-600 transition-colors">
                      {course.title}
                    </h2>
                    <p className="text-gray-500 text-sm mb-3 line-clamp-3">
                      {course.description}
                    </p>
                    
                    {/* Course Metadata */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-4">
                      <span>
                        <svg className="w-3 h-3 mr-1 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3" />
                        </svg>
                        {course.lessonCount ?? 0} Lessons
                      </span>
                      <span>
                        <svg className="w-3 h-3 mr-1 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.5 0-3 .5-4 1.5-2.5.5-5 1.5-5 3v4a2 2 0 002 2h4" />
                        </svg>
                        {course.level || 'Beginner'}
                      </span>
                    </div>

                    {/* Instructor Info */}
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <svg className="w-3 h-3 mr-1 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {course.instructorName || 'MagpieBridge Instructor'}
                    </div>

                    {/* Status and Enroll Button */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {course.status === 'published' ? (
                          <span className="bg-green-100 text-green-800">Available</span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800">Coming Soon</span>
                        )}
                      </span>
                      <Button 
                        onClick={() => handleEnroll(course.id)} 
                        disabled={enrolling === course.id || course.status !== 'published'}
                        className="w-full md:w-auto"
                      >
                        {enrolling === course.id ? 'Enrolling...' : 'Enroll Now'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Empty State */}
            {courses.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 mb-4">No courses available for enrollment</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}