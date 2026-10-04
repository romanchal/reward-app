import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { asyncHandler, HttpError } from '../../lib/http-error';
import { writeAudit } from '../../lib/audit';
import { approveManualPayment, createManualPayment, getManualPayment, listManualPayments, rejectManualPayment } from './manualPaymentService';
import { receiptHtml } from './receipt';
import { csvRowsToObjects, parseCsv } from '../../lib/csv';

const createSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().length(3).optional(),
  method: z.enum(['CASH', 'BANK', 'CHEQUE', 'UPI', 'OTHER']),
  referenceId: z.string().min(1).max(128),
  proofUrl: z.string().url().max(2000).optional(),
  notes: z.string().max(1000).optional(),
});

const rejectSchema = z.object({ reason: z.string().min(2).max(500) });

export function manualPaymentRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const result = await listManualPayments(prisma, {
      status: req.query.status as string | undefined,
      userId: req.query.userId as string | undefined,
    });
    res.json(result);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const created = await createManualPayment(prisma, req.user!.id, input);
    await writeAudit(prisma, { actorUserId: req.user!.id, action: 'MANUAL_PAYMENT_CREATE', entityType: 'ManualPayment', entityId: created.id, details: { amount: input.amount, method: input.method } });
    res.status(201).json(created);
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await getManualPayment(prisma, String(req.params.id)));
  }));

  router.get('/:id/receipt', asyncHandler(async (req, res) => {
    const payment = await getManualPayment(prisma, String(req.params.id));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(receiptHtml(payment));
  }));

  router.post('/:id/approve', asyncHandler(async (req, res) => {
    const updated = await approveManualPayment(prisma, String(req.params.id), req.user!.id);
    await writeAudit(prisma, { actorUserId: req.user!.id, action: 'MANUAL_PAYMENT_APPROVE', entityType: 'ManualPayment', entityId: updated.id });
    res.json(updated);
  }));

  router.post('/:id/reject', asyncHandler(async (req, res) => {
    const input = rejectSchema.parse(req.body);
    const updated = await rejectManualPayment(prisma, String(req.params.id), req.user!.id, input.reason);
    await writeAudit(prisma, { actorUserId: req.user!.id, action: 'MANUAL_PAYMENT_REJECT', entityType: 'ManualPayment', entityId: updated.id, details: { reason: input.reason } });
    res.json(updated);
  }));

  router.post('/csv-import', asyncHandler(async (req, res) => {
    const csv = typeof req.body === 'string' ? req.body : req.body?.csv;
    if (typeof csv !== 'string' || !csv.trim()) throw new HttpError(400, 'CSV body required');
    const rows = csvRowsToObjects(parseCsv(csv));
    const results: Array<{ row: number; ok: boolean; id?: string; error?: string }> = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const parsed = createSchema.parse({
          userId: r.userId,
          amount: Number(r.amount),
          currency: r.currency || undefined,
          method: r.method as any,
          referenceId: r.referenceId,
          proofUrl: r.proofUrl || undefined,
          notes: r.notes || undefined,
        });
        const created = await createManualPayment(prisma, req.user!.id, parsed);
        results.push({ row: i + 1, ok: true, id: created.id });
      } catch (e: any) {
        results.push({ row: i + 1, ok: false, error: e.message });
      }
    }
    await writeAudit(prisma, { actorUserId: req.user!.id, action: 'MANUAL_PAYMENT_CREATE', entityType: 'ManualPayment', entityId: 'csv-import', details: { count: rows.length, ok: results.filter((r) => r.ok).length } });
    res.json({ total: rows.length, results });
  }));

  return router;
}
