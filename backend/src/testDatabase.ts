let warned = false;

export function createTestPrisma(connection?: any) {
  try {
    // Lazy require to avoid hard dependency during normal development
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pgMem = require('pg-mem');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaPg } = require('@prisma/adapter-pg');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client');

    let db: any = connection;
    if (!db) {
      // Support both older `createConnection()` API and newer `newDb()` API from pg-mem.
      if (typeof pgMem.createConnection === 'function') {
        db = pgMem.createConnection();
      } else if (typeof pgMem.newDb === 'function') {
        db = pgMem.newDb();
      } else {
        throw new Error('Unsupported pg-mem version');
      }
    }

    let pg: any;
    const adapter = db.adapters && typeof db.adapters.createPg === 'function'
      ? (() => {
          pg = db.adapters.createPg();
          return new PrismaPg(new pg.Pool());
        })()
      : new PrismaPg(db);
    const prisma = new PrismaClient({ adapter });

    // Ensure the returned `connection` supports `exec(sql)` used by tests.
    if (typeof db.exec === 'function') {
      return { prisma, connection: db };
    }

    // For pg-mem `newDb()` the adapter provides a PG-compatible client factory.
    // Create a thin `connection` wrapper exposing `exec(sql)` which executes
    // SQL statements sequentially using the adapter client.
    if (db.adapters && typeof db.adapters.createPg === 'function') {
      const pg = db.adapters.createPg();
      const connectionWrapper = {
        exec: async (sql: string) => {
          const client = new pg.Client();
          await client.connect();
          const stmts = String(sql)
            .split(/;\s*\n|;\s*$/)
            .map((s: string) => s.trim())
            .filter(Boolean);
          for (const s of stmts) {
            await client.query(s);
          }
          await client.end();
        },
      };
      return { prisma, connection: connectionWrapper };
    }

    return { prisma, connection: db };
  } catch (err) {
    if (!warned) {
      console.warn('createTestPrisma: optional dev dependencies missing (pg-mem, @prisma/adapter-pg).');
      warned = true;
    }
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('createTestPrisma error:', stack ?? String(err));
    throw new Error('createTestPrisma requires dev dependencies: pg-mem and @prisma/adapter-pg');
  }
}
