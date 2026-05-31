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

  /**
   * Allows the local frontend demo to call authenticated upload endpoints.
   */
  app.register(cors, {
    origin: true,
    credentials: true,
  });

  /**
   * Demo auth routes issue fixed bearer tokens and cookie sessions.
   */
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
