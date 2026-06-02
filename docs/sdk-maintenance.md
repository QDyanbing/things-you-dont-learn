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
