import { createApp } from './app.js';

const app = createApp();
/**
 * Runtime port for the demo API server.
 */
const port = Number(process.env.PORT ?? 4000);
/**
 * Runtime host for local network access during frontend integration testing.
 */
const host = process.env.HOST ?? '0.0.0.0';

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
