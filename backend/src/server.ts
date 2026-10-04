import { initSentry, captureError, flushSentry } from './lib/sentry';
initSentry();
import { createApp } from './app';
import { config } from './config';
import { prisma } from './db';

async function main() {
  const app = createApp(prisma);
  const server = app.listen(config.port, () => {
    console.log(`[reward-app] api listening on :${config.port} (${config.nodeEnv})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[reward-app] received ${signal}, shutting down`);
    server.close(() => process.exit(0));
    await Promise.all([prisma.$disconnect().catch(() => undefined), flushSentry()]);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => captureError(err, { source: 'unhandledRejection' }));
  process.on('uncaughtException', (err) => { captureError(err, { source: 'uncaughtException' }); });
}

main().catch((err) => {
  console.error('[reward-app] fatal boot error', err);
  process.exit(1);
});
