import { newDb } from 'pg-mem';
import { PrismaClient } from '@prisma/client';

export function createTestPrisma() {
  const db = newDb();
  const adapter = db.adapters.createPgPromise();
  const prisma = new PrismaClient();
  return { prisma, connection: adapter };
}

export function createConnection() {
  return newDb();
}
