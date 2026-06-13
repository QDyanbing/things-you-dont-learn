# Performance Guide

This guide records lightweight performance expectations for the upload demo.
Use it when changes affect chunk scheduling, progress updates, rendering, API
store behavior, or workspace build time.

## SDK Scheduling

- Tune `chunkSize` and `concurrency` together because both affect request count
  and memory pressure.
- Keep scheduling decisions inside `FileCoordinator` so callers do not duplicate
  queue logic.
- Prefer SDK progress aggregation over repeated UI-side byte calculations.
