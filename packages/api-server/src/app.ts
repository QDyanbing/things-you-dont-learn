import Fastify from 'fastify';
import cors from '@fastify/cors';
import { demoAuthRoutes } from './modules/demo-auth/routes.js';
import { uploadRoutes } from './modules/uploads/routes.js';

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
