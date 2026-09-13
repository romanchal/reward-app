import type { AuditAction, Prisma, PrismaClient } from '@prisma/client';

export interface AuditEntry {
  actorUserId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Prisma.InputJsonValue;
}

export async function writeAudit(prisma: PrismaClient | Prisma.TransactionClient, entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details ?? null,
      },
    });
  } catch (err) {
    if (typeof console !== 'undefined') console.error('[audit] write failed', err);
  }
}
