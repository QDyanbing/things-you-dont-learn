# API Server Runbook

Use this runbook when checking the local API server after route, store, or
configuration changes. It focuses on the small Fastify service that supports the
large-file upload demo and its demo authentication flow.

## Startup Checks

- Run `pnpm dev:server` when checking the API package by itself.
- Run `pnpm dev` when checking the full browser-to-server path.
- Confirm the server prints a listening address before testing routes from the
  demo app.

## Configuration Checks

- Keep host, port, and CORS expectations visible in the package README when
  they change.
- Check that local configuration remains friendly for Vite development.
- Avoid adding production-only assumptions to this demo server without a clear
  migration note.

## Demo Auth Checks

- Confirm demo sign-in responses stay deterministic enough for frontend examples.
- Keep demo auth route names stable unless the browser package is updated in the
  same change.
- Document any new demo-only credential assumptions near the route definitions.

## Upload Route Checks

- Confirm upload metadata can be created and read back during one server
  process.
- Check duplicate upload identifiers before changing in-memory store behavior.
- Keep route response shapes aligned with browser SDK expectations.
