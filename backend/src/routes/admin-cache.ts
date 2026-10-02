import { Router } from 'express';
import { z } from 'zod';
import { clearRewardCache } from '../services/reward-cache';

const router = Router();

const clearCacheSchema = z.object({
  source: z.string().optional(),
});

router.post('/cache/clear', async (req, res) => {
  try {
    clearCacheSchema.parse(req.body ?? {});
    const result = await clearRewardCache();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invalid clear cache payload',
    });
  }
});

export default router;
