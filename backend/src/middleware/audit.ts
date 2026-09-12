import type { NextFunction, Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';

export function auditMiddleware(prisma: PrismaClient) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const action = req.body?.auditAction as string | undefined;
    if (!action) return next();

    const entityId = typeof req.params?.id === 'string' ? req.params.id : 'request';
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.id ?? null,
        action: action as any,
        entityType: req.route?.path?.split('/').filter(Boolean).pop() ?? 'request',
        entityId,
        details: req.body,
      },
    }).catch(() => undefined);

    next();
  };
}
