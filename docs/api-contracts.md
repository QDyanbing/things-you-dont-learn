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
