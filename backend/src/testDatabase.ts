let warned = false;

export function createTestPrisma(connection?: any) {
  try {
    // Lazy require to avoid hard dependency during normal development
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createConnection } = require('pg-mem');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaPg } = require('@prisma/adapter-pg');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client');

    const db = connection ?? createConnection();
    const adapter = new PrismaPg(db);
    const prisma = new PrismaClient({ adapter });
    return { prisma, connection: db };
  } catch (err) {
    if (!warned) {
      console.warn('createTestPrisma: optional dev dependencies missing (pg-mem, @prisma/adapter-pg).');
      warned = true;
    }
    throw new Error('createTestPrisma requires dev dependencies: pg-mem and @prisma/adapter-pg');
  }
}
