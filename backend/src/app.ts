import express from 'express';
import type { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware, auditMiddleware } from './middleware/auth';
import router from './router';
import { errorHandler } from './lib/http-error';

export function createApp(prisma: PrismaClient) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', authMiddleware(prisma));
  app.use('/api', router);
  app.use('/api/admin', adminMiddleware, auditMiddleware(prisma));

  app.use(errorHandler);

  return app;
}

export default createApp;
