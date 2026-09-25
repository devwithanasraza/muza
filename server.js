import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import next from 'next';
import { buildApp } from './apps/api/dist/server.js';
import { startWorkers } from './apps/worker/dist/worker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== 'production';

async function bootstrap() {
  console.log('🚀 Starting MUZA Unified Production Server on Hostinger...');

  // 1. Initialize BullMQ Background Workers
  try {
    startWorkers();
    console.log('✅ BullMQ Background Workers started successfully.');
  } catch (err) {
    console.warn('⚠️ BullMQ Workers initialization notice:', err.message);
  }

  // 2. Initialize Fastify REST API Server
  const fastifyApp = await buildApp();
  await fastifyApp.ready();
  console.log('✅ Fastify REST API engine initialized.');

  // 3. Initialize Next.js Web App
  const nextApp = next({
    dev,
    dir: path.join(__dirname, 'apps/web'),
  });
  await nextApp.prepare();
  const nextHandler = nextApp.getRequestHandler();
  console.log('✅ Next.js Frontend engine prepared.');

  // 4. Unified HTTP Gateway Server (Phusion Passenger / Hostinger Compatible)
  const server = http.createServer((req, res) => {
    // If request is directed to /api -> Route to Fastify REST API
    if (req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
      fastifyApp.routing(req, res);
    } else {
      // All other requests -> Route to Next.js Dashboard UI
      nextHandler(req, res);
    }
  });

  server.listen(PORT, () => {
    console.log(`🎉 MUZA Live on Hostinger! Listening on Port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start MUZA Production Server:', err);
  process.exit(1);
});
