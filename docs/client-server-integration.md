# Client Server Integration

This guide describes the handoff between the browser upload demo, the SDK
coordinator, and the local API server. Use it when changes touch both packages or
when route behavior needs to be reflected in the UI.

## Local Startup

- Use `pnpm dev` when checking the full browser-to-server upload path.
- Use package-specific dev commands only when isolating a frontend or API issue.
- Keep browser expectations aligned with the API server's local host, port, and
  route prefixes.

## Authentication Modes

- Public uploads should work without extra auth headers.
- Bearer demos should refresh the fixed demo token before protected upload calls.
- Cookie demos should create the demo session before sending cookie-protected
  upload requests.

## Upload Task Handshake

- The client should send file name, hash, file size, and part size when creating
  an upload task.
- The server returns whether the task already existed so the client can decide
  whether it is starting fresh or resuming.
- The SDK should keep using its own file and chunk identities for local UI state.
