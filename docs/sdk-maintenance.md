# SDK Maintenance Notes

These notes describe the behavior boundaries that should stay stable while the
large-file upload SDK grows. Use them when adding helpers, changing coordinator
state, or connecting the SDK to a more realistic transport layer.

## Identity Rules

- File identity should remain stable for the same selected file metadata during
  one session.
- Chunk identity should include file identity, chunk index, and byte range.
- Treat default identities as metadata-derived ids, not cryptographic content
  hashes.

## Chunk Range Rules

- Keep chunk ranges half-open: `start` is included and `end` is excluded.
- Keep `size` equal to `end - start` so byte accounting stays predictable.
- Preserve zero-based chunk indexes because UI summaries and retry helpers rely
  on that convention.

## Status Rules

- Keep file-level status separate from chunk-level status.
- Only move chunks to `SUCCESS` after the caller-provided upload handler
  resolves.
- Reset failed chunks back to pending before retrying so counts and byte totals
  stay consistent.

## Progress Rules

- Clamp reported uploaded bytes to the current chunk size.
- Derive aggregate progress from chunk progress records and completed chunks.
- Keep remaining bytes non-negative even when callers report progress more than
  once for the same chunk.
