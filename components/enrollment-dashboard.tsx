'use client'

import CourseProgress from '@/components/course-progress'

interface EnrollmentDashboardProps {
  enrollments: any[]
  onSelectEnrollment: (enrollmentId: string) => void
  selectedEnrollmentId: string | null
  onCompleteLesson?: (lessonId: string) => Promise<void> | void
}

export default function EnrollmentDashboard({
  enrollments,
  onSelectEnrollment,
  selectedEnrollmentId,
  onCompleteLesson,
}: EnrollmentDashboardProps) {
  const selectedEnrollment = enrollments.find((e) => e.id === selectedEnrollmentId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">My Enrollments</h2>
          </div>
          <div className="divide-y">
            {enrollments.map((enrollment) => (
              <button
                key={enrollment.id}
                type="button"
                className={`w-full p-4 text-left cursor-pointer hover:bg-gray-50 ${
                  enrollment.id === selectedEnrollmentId
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : ''
                }`}
                onClick={() => onSelectEnrollment(enrollment.id)}
              >
                <div className="font-medium">{enrollment.course.title}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {Math.round(enrollment.progressPercent)}% Complete
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      enrollment.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : enrollment.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {enrollment.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-3">
        {selectedEnrollment ? (
          <CourseProgress
            enrollment={selectedEnrollment}
            onCompleteLesson={onCompleteLesson}
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
