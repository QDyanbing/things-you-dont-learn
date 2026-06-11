# Architecture Overview

This guide gives a high-level view of how the workspace pieces fit together. Use
it before moving behavior between the browser demo, the upload SDK, and the local
API server.

## Workspace Boundaries

- The browser package owns user-visible upload state and SDK usage examples.
- The SDK owns single-file chunk preparation, scheduling, cancellation, retry,
  and progress accounting.
- The API server owns demo auth routes and upload coordination endpoints.

## Browser Demo Role

- Renders file, chunk, progress, and lifecycle state for quick inspection.
- Calls SDK getters directly instead of reimplementing upload calculations.
- Keeps demo-only previews isolated so they do not become SDK behavior by
  accident.

## SDK Role

- Owns one selected file per `FileCoordinator` instance.
- Tracks chunk status, aggregate progress, retryable failures, and active abort
  signals.
- Delegates request details, authentication, and request body shape to the
  caller-provided upload handler.

## API Server Role

- Provides local route contracts for upload coordination and demo auth.
- Stores upload metadata in process memory for examples and resume checks.
- Keeps durable file storage, production identity, and deployment concerns out of
  the current demo scope.
