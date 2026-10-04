import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler, HttpError } from '../../lib/http-error';
import { verifyWebhookSignature } from '../withdrawals/razorpay';
import { applyWebhookEvent } from '../withdrawals/withdrawalService';

export function razorpayWebhookRoutes(prisma: PrismaClient) {
  const router = Router();

  router.post('/razorpay', asyncHandler(async (req, res) => {
    const sig = req.get('X-Razorpay-Signature');
    const raw = req.rawBody;
    if (!raw) throw new HttpError(400, 'Missing raw body');
    if (!verifyWebhookSignature(raw, sig)) throw new HttpError(401, 'Invalid signature');

    const event = req.body?.event as string | undefined;
    const payout = req.body?.payload?.payout?.entity;
    if (!event || !payout?.id || !payout?.status) {
      return res.status(200).json({ ok: true, skipped: 'not a payout event' });
    }

    const result = await applyWebhookEvent(prisma, payout.id, payout.status, payout);
    res.json({ ok: true, result });
  }));

  return router;
}
