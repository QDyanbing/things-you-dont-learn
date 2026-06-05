# API Contracts

This guide records the local API response contracts that the browser upload demo
expects. Keep it in sync with route changes so UI and SDK examples can evolve
without guessing at server behavior.

## Health And Demo Auth

- `GET /api/health` returns `{ ok: true }` when the upload plugin is mounted.
- `POST /api/demo-auth/token/refresh` returns a fixed `accessToken` and
  `expiresIn` value for bearer-token demos.
- `POST /api/demo-auth/session` and `DELETE /api/demo-auth/session` set or clear
  the demo upload session cookie and return `{ ok: true, mode: "cookie" }`.

## Upload Access Modes

- Upload routes default to public access when `x-demo-upload-access` is absent.
- `x-demo-upload-access: bearer` requires a valid `Authorization: Bearer ...`
  header and returns `MISSING_TOKEN`, `TOKEN_EXPIRED`, or `INVALID_TOKEN` errors.
- `x-demo-upload-access: cookie` requires the demo session cookie and returns
  `MISSING_SESSION` when it is absent.

## Upload Task Contracts

- `POST /api/uploads` accepts `fileName`, `fileHash`, `fileSize`, and `partSize`.
- New upload tasks return status `201`; existing resumable or completed tasks
  return status `200`.
- `GET /api/uploads/:uploadId` returns `{ upload }` or `404` when the in-memory
  task no longer exists.
