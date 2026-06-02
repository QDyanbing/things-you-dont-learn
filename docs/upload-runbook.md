# Large File Upload Runbook

Use this runbook when checking the browser upload demo after SDK, API, or UI
changes. It focuses on observable behavior rather than implementation details so
the same checks can be reused while internals evolve.

## Preflight

- Confirm dependencies are installed with the workspace package manager.
- Start from a clean working tree when comparing behavior before and after a
  change.
- Keep one small test file available and one larger file available so chunking
  and single-chunk paths can both be observed.

## Startup Checks

- Run `pnpm dev` from the workspace root for the full local demo path.
- Use `pnpm dev:server` and `pnpm dev:large-file-upload` only when isolating a
  package-specific issue.
- Confirm the browser app loads before testing upload state transitions.

## File Selection Checks

- Select a file and confirm the displayed name, byte size, and last modified
  value update together.
- Select a second file and confirm stale upload state from the first selection
  is cleared before the new file is prepared.
- Check that generated file identity remains stable for the selected file during
  the current demo session.

## State Checks

- Confirm preparation moves the coordinator into a ready state before upload
  starts.
- Confirm queued, pending, uploading, uploaded, and failed counts can be read
  independently.
- Confirm completion state is only shown after all prepared chunks reach a
  successful terminal state.
