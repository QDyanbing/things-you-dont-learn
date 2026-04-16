import type { FastifyPluginAsync } from 'fastify';
import {
  DEMO_ACCESS_TOKEN,
  DEMO_UPLOAD_SESSION_COOKIE,
  DEMO_UPLOAD_SESSION_VALUE,
} from './constants.js';

function buildSessionCookie(value: string, maxAgeSeconds: number) {
  return `${DEMO_UPLOAD_SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export const demoAuthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/token/refresh', async () => ({
    accessToken: DEMO_ACCESS_TOKEN,
    expiresIn: 3600,
  }));

  fastify.post('/session', async (_request, reply) => {
    reply.header('Set-Cookie', buildSessionCookie(DEMO_UPLOAD_SESSION_VALUE, 3600));

    return {
      ok: true,
      mode: 'cookie',
    };
  });

  fastify.delete('/session', async (_request, reply) => {
    reply.header('Set-Cookie', buildSessionCookie('', 0));

    return {
      ok: true,
      mode: 'cookie',
    };
  });
};
