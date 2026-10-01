import { prisma } from '@/lib/prisma'

export interface AuditEntry {
  action: string
  entityType: string
  entityId?: string | null
  userId?: string | null
  details?: Record<string, unknown> | null
}

/**
 * Records an administrative action.
 *
 * Auditing must never break the action it is describing, so failures are
 * logged and swallowed rather than thrown. The AuditLog table previously had
 * no writer at all; this is the single entry point.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        userId: entry.userId ?? null,
        details: (entry.details ?? undefined) as never,
      },
    })
  } catch (error) {
    console.error('Audit write failed:', error)
  }
}

/** Reads recent audit entries for the admin review screen. */
export async function listAudit(limit = 100) {
  return prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })
}
