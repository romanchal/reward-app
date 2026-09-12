export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://reward_app:reward_app@localhost:5432/reward_app',
  jwtSecret: process.env.JWT_SECRET ?? 'local-development-access-secret-change-me',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'local-development-refresh-secret-change-me',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  adminOrigin: process.env.ADMIN_ORIGIN ?? 'http://localhost:5174',
  paymentMode: process.env.PAYMENT_MODE ?? 'demo',
  offerMode: process.env.OFFER_MODE ?? 'demo',
  emailMode: process.env.EMAIL_MODE ?? 'console',
  adminRegistrationAllowed: process.env.ADMIN_REGISTRATION_ALLOWED !== 'false',
};
