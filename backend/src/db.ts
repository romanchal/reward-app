import { PrismaClient } from '@prisma/client';
import config from './config';

let _prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient({
      log: config.app.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    if (config.app.nodeEnv === 'development') {
      ;(_prisma as any).$on('query', (e: any) => console.log('[SQL]', e.query));
    }
    ;(_prisma as any).$on('error', (e: any) => console.error('[Prisma Error]', e));
  }
  return _prisma;
}

// Backwards-compatible named export used across the codebase
export let prisma: PrismaClient = getPrismaClient();
export default prisma;

// Allow tests or bootstrappers to override the singleton Prisma client.
export function setPrismaClient(client: PrismaClient | null) {
  _prisma = client;
  // update the exported `prisma` binding so modules importing `{ prisma }`
  // receive the new client instance.
  (exports as any).prisma = client as any;
  prisma = client as any;
}
