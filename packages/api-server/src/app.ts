import Fastify from 'fastify';
import cors from '@fastify/cors';
import { uploadRoutes } from './modules/uploads/routes.js';

export function createApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
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
