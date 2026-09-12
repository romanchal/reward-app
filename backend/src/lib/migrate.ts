import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';

export async function migrateDatabase(prisma: PrismaClient) {
  const migrationPath = path.resolve(process.cwd(), 'prisma/migrations/20260910000000_init/migration.sql');
  if (!fs.existsSync(migrationPath)) return;
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await prisma.$executeRawUnsafe(sql);
}

export function nowIso() {
  return new Date().toISOString();
}
