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