import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isAdmin } from '@/lib/api-auth'

// PUT /api/admin/users/[id]/roles - Replace a user's roles
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await getSessionUser()

    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { roles } = await request.json()

    if (!Array.isArray(roles) || roles.some((r) => typeof r !== 'string')) {
      return NextResponse.json({ error: 'roles must be an array of strings' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      include: { userRoles: { include: { role: true } } },
    })

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Guard against locking everyone out of administration.
    const currentlyAdmin = target.userRoles.some((ur) => ur.role.name === 'admin')
    const willBeAdmin = roles.includes('admin')

    if (currentlyAdmin && !willBeAdmin) {
      const adminCount = await prisma.userRole.count({
        where: { role: { name: 'admin' } },
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin' },
          { status: 400 }
        )
      }
    }

    const knownRoles = await prisma.role.findMany({
      where: { name: { in: roles } },
      select: { id: true, name: true },
    })

    const unknown = roles.filter((r) => !knownRoles.some((kr) => kr.name === r))
    if (unknown.length > 0) {
      return NextResponse.json(
        { error: `Unknown role(s): ${unknown.join(', ')}` },
        { status: 400 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: params.id } })

      if (knownRoles.length > 0) {
        await tx.userRole.createMany({
          data: knownRoles.map((role) => ({
            userId: params.id,
            roleId: role.id,
          })),
        })
      }

      return tx.user.findUnique({
        where: { id: params.id },
        include: { userRoles: { include: { role: true } } },
      })
    })

    return NextResponse.json({
      id: updated?.id,
      name: updated?.name,
      email: updated?.email,
      roles: updated?.userRoles.map((ur) => ur.role.name) ?? [],
    })
  } catch (error) {
    console.error('Update user roles error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
