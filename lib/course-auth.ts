import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function getUserWithRoles() {
  const session = await auth()
  
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