import type { FastifyPluginAsync } from 'fastify';
import {
  DEMO_ACCESS_TOKEN,
  DEMO_UPLOAD_SESSION_COOKIE,
  DEMO_UPLOAD_SESSION_VALUE,
} from './constants.js';

/**
 * Builds the demo session cookie header used by cookie-auth examples.
 *
 * Passing an empty value with `Max-Age=0` clears the browser cookie.
 */
function buildSessionCookie(value: string, maxAgeSeconds: number) {
  return `${DEMO_UPLOAD_SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

/**
 * Registers small demo auth endpoints for bearer and cookie upload examples.
 */
export const demoAuthRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Returns a fixed bearer token so frontend demos can exercise token refresh.
   */
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
