import express from 'express';
import type { PrismaClient } from '@prisma/client';
import { authMiddleware, adminMiddleware, auditMiddleware } from './middleware/auth';
import { setPrismaClient } from './db';
import router from './router';
import { errorHandler } from './lib/http-error';

export function createApp(prisma: PrismaClient) {
  const app = express();

  // When tests supply a Prisma client, make it the global singleton so
  // existing modules that import `prisma` get the test client as well.
  setPrismaClient(prisma);

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
