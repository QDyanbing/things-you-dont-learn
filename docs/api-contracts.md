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

## Part Contracts

- `GET /api/uploads/:uploadId/parts` returns uploaded part records in ascending
  part number order.
- `PUT /api/uploads/:uploadId/parts/:partNumber` records or replaces one part
  using `partHash` and `size`.
- Invalid part payloads return `400`, while missing upload tasks return `404`.

## Completion And Abort

- `POST /api/uploads/:uploadId/complete` succeeds only after every expected part
  has been recorded.
- Successful completion returns `{ upload, file }`, where `file.url` is derived
  from the original file name.
- `DELETE /api/uploads/:uploadId` removes the in-memory task and returns
  `{ ok: true, upload }`.
