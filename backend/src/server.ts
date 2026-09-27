/**
 * Reward App - Complete Backend Server
 * Production-ready Express.js backend for a rewards platform
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'node:http';
import { onExit } from 'signal-exit';

import config from './config';
import { getPrismaClient } from './db';
import router from './router';
import { authMiddleware, adminMiddleware } from './middleware/auth';
import { auditMiddleware } from './middleware/audit';
import { errorHandler } from './lib/http-error';

const app = express();
const PORT = Number(process.env.PORT ?? config.app.port ?? 4000);
const isProduction = config.app.nodeEnv === 'production';
const prisma = getPrismaClient();

app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? false
      : {
          useDefaults: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
          },
        },
  })
);

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  })
);

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW) || 60_000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.', retryAfter: 60 },
});

app.use('/api/', limiter);
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

app.get('/', (_req, res) => {
  res.json({
    name: process.env.APP_NAME || 'Reward App',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api', authMiddleware(prisma));
app.use('/api', router);
app.use('/api/admin', adminMiddleware, auditMiddleware(prisma));

app.get('/api/docs', (_req, res) => {
  res.json({
    title: 'Reward API v1',
    version: '1.0.0',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Health check' },
      { method: 'POST', path: '/api/auth/register', description: 'Register new user' },
      { method: 'POST', path: '/api/auth/login', description: 'User login' },
      { method: 'GET', path: '/api/tasks', description: 'List available tasks' },
      { method: 'GET', path: '/api/wallet/balance', description: 'Get wallet balance' },
      { method: 'GET', path: '/api/admin/tasks', description: 'Admin: Manage tasks' },
    ],
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

app.use(errorHandler);

const server = http.createServer(app);

export function startServer() {
  return new Promise<http.Server>((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the process using it or start with PORT=4100. Current PORT=${PORT}`);
        reject(error);
        return;
      }
      reject(error);
    });

    server.once('listening', () => {
      console.log(`\n🚀 ${process.env.APP_NAME || 'Reward App'} Server`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Port: ${PORT}`);
      console.log(`  API: http://localhost:${PORT}/api`);
      console.log(`  Health: http://localhost:${PORT}/health`);
      resolve(server);
    });

    server.listen(PORT);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start reward app server', error);
    process.exit(1);
  });
}

onExit(() => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;