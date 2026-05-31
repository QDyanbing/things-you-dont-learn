# API Server

Demo API server for local resumable-upload development.

The server mounts demo auth routes under `/api/demo-auth` and upload routes under `/api`.

## Demo Auth

- `POST /api/demo-auth/token/refresh` returns a fixed bearer token for frontend retry flows.
- `POST /api/demo-auth/session` sets a cookie session for cookie-mode upload requests.
- `DELETE /api/demo-auth/session` clears the cookie session.

## Runtime

The server reads `PORT` and `HOST` from the environment. Defaults are `4000` and `0.0.0.0`, which makes the local frontend demo easy to reach from the same machine or local network.
