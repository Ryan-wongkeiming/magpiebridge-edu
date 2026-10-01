import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export interface SessionUser {
  id: string
  name: string | null
  email: string | null
  roles: string[]
}

/** Returns the signed-in user with roles, or null when unauthenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    roles: session.user.roles ?? [],
  }
}

export function isAdmin(user: SessionUser): boolean {
  return user.roles.includes('admin')
}

export function isInstructor(user: SessionUser): boolean {
  return user.roles.includes('instructor') || isAdmin(user)
}

export function isManager(user: SessionUser): boolean {
  return user.roles.includes('manager') || isAdmin(user)
}

/**
 * Whether the user may author or manage the given course: the author, the
 * course manager, or an admin.
 */
export async function canEditCourse(
  user: SessionUser,
  courseId: string
): Promise<boolean> {
  if (isAdmin(user)) return true

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { authorId: true, managerId: true },
  })

  if (!course) return false

  return course.authorId === user.id || course.managerId === user.id
}
