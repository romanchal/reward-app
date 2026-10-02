import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const DATABASE_URL =
  process.env.DATABASE_URL?.replace(/^mysql:/, 'postgres:') ||
  process.env.DATABASE_URL ||
  `postgresql://prisma:prisma@localhost:5432/db-rewards-platform?schema=public`;

const nodeEnv = process.env.NODE_ENV || 'development';
const defaultPort = Number(process.env.PORT || '4000');

export interface AppConfig {
  app: {
    name: string;
    port: number;
    nodeEnv: string;
  };
  database: {
    url: string;
    client: PrismaClient;
    query: (command: string, params?: any[]) => Promise<any>;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
  };
  // Backwards-compatible top-level shortcuts
  jwtSecret?: string;
  refreshSecret?: string;
  adminRegistrationAllowed?: boolean;
}

const prismaClient = new PrismaClient({
  log: nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const config: AppConfig = {
  app: {
    name: process.env.APP_NAME || 'Reward App',
    port: parseInt(String(defaultPort), 10) || 4000,
    nodeEnv,
  },
  database: {
    url: DATABASE_URL,
    client: prismaClient,
    query: async (command: string, params?: any[]) => {
      return (config.database.client as any).$queryRawUnsafe(command, ...(params ?? []));
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      process.env.JWT_REFRESH ||
      'super-refresh-secret',
  },
};

// Backwards-compatible aliases expected across the codebase
(config as any).jwtSecret = config.jwt.secret;
(config as any).refreshSecret = config.jwt.refreshSecret;
(config as any).adminRegistrationAllowed = process.env.ADMIN_REGISTRATION_ALLOWED === 'true';
(config as any).nodeEnv = config.app.nodeEnv;
(config as any).port = config.app.port;
(config as any).paymentMode = process.env.PAYMENT_MODE || 'production';

export { config };

export default config;
