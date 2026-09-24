import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { config } from './config/index.js';
import { sendError } from './utils/response.js';

// Route modules
import { authRoutes } from './modules/auth/routes.js';
import { driveRoutes } from './modules/drive/routes.js';
import { videoRoutes } from './modules/videos/routes.js';
import { contentRoutes } from './modules/content/routes.js';
import { youtubeRoutes } from './modules/youtube/routes.js';
import { instagramRoutes } from './modules/instagram/routes.js';
import { publishingRoutes } from './modules/publishing/routes.js';
import { brandRoutes } from './modules/brand/routes.js';
import { hashtagRoutes } from './modules/hashtags/routes.js';
import { analyticsRoutes } from './modules/analytics/routes.js';
import { notificationRoutes } from './modules/notifications/routes.js';
import { auditRoutes } from './modules/audit/routes.js';
import { settingsRoutes } from './modules/settings/routes.js';
import { healthRoutes } from './modules/health/routes.js';

export async function buildApp() {
  const app = fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost and frontend app url
      cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Rate Limiting
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
  });

  // Cookie parsing
  await app.register(cookie);

  // JWT
  await app.register(jwt, {
    secret: config.jwtSecret,
  });

  // Global Error Handler - never leak stack traces to client
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode || 500;
    const message = statusCode >= 500 ? 'An internal server error occurred.' : error.message;
    const code = error.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');

    return sendError(reply, statusCode, code, message, (error as any).validation || null);
  });

  // Register routes under /api
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(driveRoutes, { prefix: '/api/drive' });
  await app.register(videoRoutes, { prefix: '/api/videos' });
  await app.register(contentRoutes, { prefix: '/api/content' });
  await app.register(youtubeRoutes, { prefix: '/api/youtube' });
  await app.register(instagramRoutes, { prefix: '/api/instagram' });
  await app.register(publishingRoutes, { prefix: '/api/publishing' });
  await app.register(brandRoutes, { prefix: '/api/brand' });
  await app.register(hashtagRoutes, { prefix: '/api/hashtags' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(notificationRoutes, { prefix: '/api/notifications' });
  await app.register(auditRoutes, { prefix: '/api/audit' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });

  return app;
}

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`⚡ MUZA REST API listening at http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}
