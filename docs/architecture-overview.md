# Architecture Overview

This guide gives a high-level view of how the workspace pieces fit together. Use
it before moving behavior between the browser demo, the upload SDK, and the local
API server.

## Workspace Boundaries

- The browser package owns user-visible upload state and SDK usage examples.
- The SDK owns single-file chunk preparation, scheduling, cancellation, retry,
  and progress accounting.
- The API server owns demo auth routes and upload coordination endpoints.
