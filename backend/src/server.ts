/**
 * Reward App - Complete Backend Server
 * Production-ready Express.js backend for a rewards platform
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'node:http';
import crypto from 'node:crypto';
import { onExit } from 'signal-exit';

import config from './config';
import { getPrismaClient } from './db';
import router from './router';
import { authMiddleware, adminMiddleware } from './middleware/auth';
import { auditMiddleware } from './middleware/audit';
import { errorHandler } from './lib/http-error';

const app = express();
// trust proxy when deployed behind a load balancer / reverse proxy
// Set to false for development, or specific count for production
app.set('trust proxy', false);
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

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:4175,http://localhost:4176,http://localhost:4179,http://localhost:4180,http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isLocalDevelopmentOrigin(origin: string) {
  if (isProduction) return false;

  try {
    const url = new URL(origin);
    const octets = url.hostname.split('.').map(Number);
    const isPrivateIPv4 =
      octets.length === 4 &&
      octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) &&
      (octets[0] === 10 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168));

    return (
      url.protocol === 'http:' &&
      (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || isPrivateIPv4)
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
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

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again later.' },
});

app.use('/api/', limiter);
app.use('/api/auth', authLimiter);
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// assign a request id and track simple metrics
app.locals.requestCount = 0;
app.locals.idempotency = new Map<string, unknown>();
app.use((req, res, next) => {
  const rid = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as any).requestId = rid;
  res.setHeader('X-Request-Id', rid);
  app.locals.requestCount = (app.locals.requestCount || 0) + 1;

  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} - ${ms}ms - rid=${rid}`);
  });

  next();
});

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

// basic metrics endpoint for dashboards / probes
app.get('/api/metrics', async (_req, res) => {
  try {
    const mem = process.memoryUsage();
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      requests: app.locals.requestCount || 0,
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
      },
      env: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    res.status(500).json({ error: 'failed to collect metrics' });
  }
});

app.get('/', (_req, res) => {
  res.json({
    name: process.env.APP_NAME || 'Reward App',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api', (_req, res) => {
  res.json({
    name: process.env.APP_NAME || 'Reward App',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    status: 'ok',
    docs: '/api/docs',
    health: '/health',
    endpoints: [
      '/api/auth/register',
      '/api/auth/login',
      '/api/tasks',
      '/api/wallet/balance',
      '/api/admin/tasks',
    ],
  });
});

app.get('/api/', (_req, res) => {
  res.redirect('/api');
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