# API Examples

This guide collects small request and response examples for the local API server.
Use it when checking browser integration, demo auth modes, or upload route
contracts from a client point of view.

## Health And Auth

- `GET /api/health` should return `{ "ok": true }` when upload routes are mounted.
- `POST /api/demo-auth/token/refresh` returns the fixed demo bearer token.
- `POST /api/demo-auth/session` creates the demo cookie session for cookie-mode
  upload requests.
