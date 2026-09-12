import { createConnection } from 'pg-mem';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export function createTestPrisma() {
  const connection = createConnection();
  const adapter = new PrismaPg(connection);
  const prisma = new PrismaClient({ adapter });
  return { prisma, connection };
}
