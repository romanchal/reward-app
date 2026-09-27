import 'dotenv/config';

export interface AppConfig {
  app: {
    name: string;
    port: number;
    nodeEnv: string;
  };
  database: {
    url: string | undefined;
  };
  jwt: {
    secret: string;
  };
  // Backwards-compatible top-level shortcuts
  jwtSecret?: string;
  refreshSecret?: string;
  adminRegistrationAllowed?: boolean;
}

const config: AppConfig = {
  app: {
    name: process.env.APP_NAME || 'Reward App',
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
  },
};

// Backwards-compatible aliases expected across the codebase
(config as any).jwtSecret = config.jwt.secret;
(config as any).refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH || 'super-refresh-secret';
(config as any).adminRegistrationAllowed = process.env.ADMIN_REGISTRATION_ALLOWED === 'true';
(config as any).nodeEnv = config.app.nodeEnv;
(config as any).port = config.app.port;
(config as any).paymentMode = process.env.PAYMENT_MODE || 'production';

export { config };

export default config;
