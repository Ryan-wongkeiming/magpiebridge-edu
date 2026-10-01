import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isAdmin } from '@/lib/api-auth'

// GET /api/admin/users - List users with their roles
export async function GET(request: Request) {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() ?? ''
    const roleFilter = searchParams.get('role') ?? 'all'

    const users = await prisma.user.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
        ...(roleFilter !== 'all'
          ? { userRoles: { some: { role: { name: roleFilter } } } }
          : {}),
      },
      include: {
        userRoles: { include: { role: true } },
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true, certificates: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } })

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        roles: u.userRoles.map((ur) => ur.role.name),
        manager: u.manager,
        enrollmentCount: u._count.enrollments,
        certificateCount: u._count.certificates,
      })),
      availableRoles: roles.map((r) => r.name),
    })
  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
