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

## Part Records

- Uploaded parts are stored by one-based `partNumber`.
- Recording the same part number again replaces the previous in-memory value.
- `listUploadedParts()` returns parts sorted by part number so callers can compare
  resume state predictably.

## Completion And Abort

- `completeUpload()` marks the task as completed and records the file hash index.
- Completed tasks remain readable by `uploadId` while the process is alive.
- `abortUpload()` removes the active task and clears the completed hash index
  only when it points at the removed task.

## Demo Limitations

- Records are process-local and disappear when the API server restarts.
- The store does not persist file bytes; it only tracks metadata and part records.
- Add persistence behind the store boundary before treating the upload API as a
  production resumable upload service.
