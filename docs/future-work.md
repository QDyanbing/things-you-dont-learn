# Future Work

This guide collects small follow-up ideas that fit the current upload demo
direction. Use it as a parking place for scoped improvements before they become
implementation tasks.

## SDK Follow-Ups

- Add focused tests around progress aggregation and retryable chunk state.
- Consider snapshot helpers for exporting coordinator state to diagnostics.
- Keep future transport adapters outside `FileCoordinator` until a shared pattern
  is clear.

## Demo And API Follow-Ups

- Add smaller UI sections if the diagnostic surface becomes harder to scan.
- Explore API persistence only after the in-memory store boundary stays stable.
- Keep demo auth improvements separate from upload coordination changes.
