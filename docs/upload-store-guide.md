# Upload Store Guide

This guide explains the in-memory upload store used by the local API server.
It documents the current demo behavior so route changes can stay aligned with
the browser upload flow.

## Store Keys

- Active upload records are keyed by server-generated `uploadId`.
- Completed lookup records are keyed by client-provided `fileHash`.
- The two indexes let the demo support direct task reads and simple duplicate
  detection without adding persistent storage.

## Task Creation

- `createUpload()` computes `totalParts` from `fileSize` and `partSize`.
- Existing completed records are returned as completed when the file hash is
  already indexed.
- Existing non-completed records are reused so the demo can resume a pending
  upload instead of creating duplicate tasks.
