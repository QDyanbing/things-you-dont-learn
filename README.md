# Things You Do Not Learn

This workspace collects small, practical examples that are easier to understand
by reading and running code than by studying isolated notes. The current focus is
a large-file upload demo with a browser client, a small SDK layer, and a local
API server used for upload coordination.

## Workspace Layout

- `packages/large-file-upload`: React demo app and SDK primitives for managing
  file selection, queueing, upload progress, and user-facing upload state.
- `packages/api-server`: Local Fastify server that provides demo authentication
  routes and upload coordination endpoints for the browser app.

## Scripts

- `pnpm dev`: Starts the API server and the large-file upload demo app together.
- `pnpm dev:server`: Starts only the local API server.
- `pnpm dev:large-file-upload`: Starts only the browser demo app.
- `pnpm build`: Runs the workspace build across all packages.
