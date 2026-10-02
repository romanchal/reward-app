import { prisma } from '../db';
import { getRedisClient } from '../lib/redis';

export type PayoutDecision = 'APPROVED' | 'REJECTED';

// The schema in this project does not contain a dedicated WithdrawalRequest model.
// Store and surface withdrawal requests from `AuditLog` entries created when users
// submit requests. This keeps behavior predictable across Prisma schema changes.
export async function listWithdrawalRequests() {
  const rows = await prisma.auditLog.findMany({
    where: { action: 'WITHDRAWAL_REQUEST' },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((r: any) => ({
    id: r.entityId,
    createdAt: r.createdAt,
    actorUserId: r.actorUserId,
    details: r.details ?? {},
  }));
}

export async function updatePayoutStatus(requestId: string, decision: PayoutDecision, adminUserId: string, note?: string) {
  // Create an audit entry for approval/rejection and clear any cached entries.
  const action = decision === 'APPROVED' ? 'WITHDRAWAL_APPROVE' : 'WITHDRAWAL_REJECT';

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUserId,
      action,
      entityType: 'WithdrawalRequest',
      entityId: requestId,
      details: { note },
    },
  });

  const redis = await getRedisClient();
  await redis.del(`withdrawals:${requestId}`);

  return { id: requestId, status: action, processedBy: adminUserId, note };
}
