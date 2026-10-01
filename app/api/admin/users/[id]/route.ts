import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, isAdmin } from '@/lib/api-auth'
import { recordAudit } from '@/lib/audit'

/**
 * PATCH /api/admin/users/[id]
 *
 * Updates a user's status (active / suspended). Suspension is used instead of
 * deletion wherever history exists, because deleting a learner would destroy
 * their enrollments, progress, and certificates.
 */
export async function PATCH(
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

    const body = await request.json()
    const { status, name } = body

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      include: { userRoles: { include: { role: true } } },
    })

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (status !== undefined && !['active', 'suspended'].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'active' or 'suspended'" },
        { status: 400 }
      )
    }

    // Refuse to suspend the last active admin, which would lock the platform.
    if (status === 'suspended') {
      const isAdminUser = target.userRoles.some((ur) => ur.role.name === 'admin')

      if (isAdminUser) {
        const otherActiveAdmins = await prisma.user.count({
          where: {
            status: 'active',
            id: { not: params.id },
            userRoles: { some: { role: { name: 'admin' } } },
          },
        })

        if (otherActiveAdmins === 0) {
          return NextResponse.json(
            { error: 'Cannot suspend the last active admin' },
            { status: 400 }
          )
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(typeof name === 'string' && { name }),
      },
    })

    await recordAudit({
      action: 'Updated',
      entityType: 'User',
      entityId: params.id,
      userId: actor.id,
      details: { status: updated.status, name: updated.name },
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      status: updated.status,
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/users/[id]
 *
 * Deletes a user only when they have no learning history. Anything with
 * enrollments, progress, or certificates must be suspended instead.
 */
export async function DELETE(
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

    if (actor.id === params.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        userRoles: { include: { role: true } },
        _count: {
          select: {
            enrollments: true,
            certificates: true,
            lessonProgress: true,
            quizAttempts: true,
          },
        },
      },
    })

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const history =
      target._count.enrollments +
      target._count.certificates +
      target._count.lessonProgress +
      target._count.quizAttempts

    if (history > 0) {
      return NextResponse.json(
        {
          error:
            'This user has learning history. Suspend the account instead — deleting would destroy their records.',
          enrollments: target._count.enrollments,
          certificates: target._count.certificates,
        },
        { status: 409 }
      )
    }

    const isAdminUser = target.userRoles.some((ur) => ur.role.name === 'admin')
    if (isAdminUser) {
      const otherAdmins = await prisma.userRole.count({
        where: { role: { name: 'admin' }, userId: { not: params.id } },
      })
      if (otherAdmins === 0) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin' },
          { status: 400 }
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: params.id } })
      // Clear manager links so reports are not orphaned.
      await tx.user.updateMany({
        where: { managerId: params.id },
        data: { managerId: null },
      })
      await tx.account.deleteMany({ where: { userId: params.id } })
      await tx.session.deleteMany({ where: { userId: params.id } })
      await tx.user.delete({ where: { id: params.id } })
    })

    await recordAudit({
      action: 'Deleted',
      entityType: 'User',
      entityId: params.id,
      userId: actor.id,
      details: { email: target.email },
    })

    return NextResponse.json({ message: `User ${target.email} deleted.` })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
