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
