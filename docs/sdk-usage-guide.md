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
