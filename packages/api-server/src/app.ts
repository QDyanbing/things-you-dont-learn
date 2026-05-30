import Fastify from 'fastify';
import cors from '@fastify/cors';
import { demoAuthRoutes } from './modules/demo-auth/routes.js';
import { uploadRoutes } from './modules/uploads/routes.js';

/**
 * Creates the Fastify app used by the demo API server.
 *
 * The app mounts demo auth routes and resumable-upload routes under separate
 * prefixes so the frontend can exercise both flows independently.
 */
export function createApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.register(demoAuthRoutes, {
    prefix: '/api/demo-auth',
  });

  app.register(uploadRoutes, {
    prefix: '/api',
  });

  app.get('/', async () => ({
    name: '@workspace/api-server',
    status: 'ok',
  }));

  return app;
}
