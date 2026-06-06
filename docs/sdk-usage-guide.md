# SDK Usage Guide

This guide explains how the browser demo should consume `FileCoordinator`.
It focuses on the public SDK surface that app code can call directly, leaving
transport details to the caller-provided upload handler.

## Lifecycle Calls

- Create one coordinator per selected file.
- Call `prepare()` before reading chunk metadata or starting upload work.
- Call `upload()` when the SDK should own chunk scheduling and concurrency.

## Chunk Metadata

- Use prepared chunk indexes when rendering queue or retry summaries.
- Treat chunk byte ranges as half-open ranges where `start` is included and
  `end` is excluded.
- Read chunk identity from the coordinator instead of deriving it again in UI
  code.

## Progress Reads

- Use `getProgress()` for aggregate uploaded, remaining, total, and percent
  values.
- Use chunk-level progress helpers when the UI needs to explain one active
  chunk.
- Prefer byte totals over timer-derived values when showing progress to users.

## Queue And Failure Reads

- Read pending, queued, uploading, uploaded, and failed sets through coordinator
  getters.
- Reset failed chunks through SDK methods before retrying them.
- Keep UI summaries aligned with status counts when adding a new diagnostic
  field.
