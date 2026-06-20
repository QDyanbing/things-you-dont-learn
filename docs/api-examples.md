# API Examples

This guide collects small request and response examples for the local API server.
Use it when checking browser integration, demo auth modes, or upload route
contracts from a client point of view.

## Health And Auth

- `GET /api/health` should return `{ "ok": true }` when upload routes are mounted.
- `POST /api/demo-auth/token/refresh` returns the fixed demo bearer token.
- `POST /api/demo-auth/session` creates the demo cookie session for cookie-mode
  upload requests.

## Create Upload

- `POST /api/uploads` accepts `fileName`, `fileHash`, `fileSize`, and `partSize`.
- A new upload task returns `201` with `{ upload, existed: false, completed: false }`.
- A resumable task returns `200` with `{ upload, existed: true }` so the client
  can continue from existing part records.

## Part Records

- `PUT /api/uploads/:uploadId/parts/:partNumber` records one uploaded part.
- The request body contains `partHash` and `size`.
- `GET /api/uploads/:uploadId/parts` returns part records sorted by one-based
  part number.
