# Error Handling Guide

This guide describes how errors should be explained across the upload SDK,
browser demo, and local API server. Use it when adding failure states, route
errors, retry behavior, or user-visible diagnostics.

## SDK Error Boundaries

- Let `FileCoordinator` represent chunk failures with chunk status and retryable
  indexes.
- Keep transport-specific errors inside the caller-provided upload handler until
  they need to affect SDK state.
- Treat abort errors from pause and cancel flows as controlled lifecycle events.

## API Validation Errors

- Return `400` when request bodies are missing required upload or part fields.
- Return `404` when an upload id does not exist in the in-memory store.
- Keep validation messages aligned with the API contracts guide so browser error
  copy can stay predictable.

## Auth Errors

- Use `MISSING_TOKEN`, `TOKEN_EXPIRED`, and `INVALID_TOKEN` for bearer demo
  failures.
- Use `MISSING_SESSION` when cookie-protected upload calls do not include the
  demo session.
- Keep auth failures separate from upload validation failures in UI diagnostics.

## Retry And Recovery

- Retry SDK failures through failed or pending chunk helpers instead of rebuilding
  the file selection.
- Compare server part records with SDK uploaded indexes before resuming an
  interrupted upload.
- Reset failed chunks before retrying so byte totals and status counts stay
  consistent.

## UI Error Display

- Show enough error context to distinguish auth, validation, transport, and SDK
  state failures.
- Keep user-facing copy short, while retaining diagnostic fields in the demo
  surface for debugging.
- Clear stale errors when a new file selection starts a fresh coordinator flow.

## Handoff Notes

- Mention which error paths were checked when handing off behavior changes.
- Link related API contract or troubleshooting notes when an error path depends
  on server behavior.
- Add JSDoc near public helpers when callers need to understand a controlled
  failure path.
