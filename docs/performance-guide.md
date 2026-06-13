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

## Browser Rendering

- Keep diagnostic fields grouped so adding new values does not make the page hard
  to scan.
- Avoid deriving large arrays repeatedly in render paths when the SDK already
  exposes a getter.
- Reset stale state before preparing a new file so old diagnostics do not force
  extra comparisons.

## API Store

- The in-memory store is fast enough for local examples but grows with active
  upload task count.
- Keep uploaded part lookups keyed by part number when adding resume-related
  helpers.
- Add cleanup or persistence before modeling long-lived upload traffic.

## Build Checks

- Watch workspace build output when dependency or bundling changes affect the
  browser package.
- Treat unexpected bundle growth as a prompt to inspect imports before adding
  more UI dependencies.
- Keep package-specific builds for narrowing failures, not for replacing the
  final workspace build.
