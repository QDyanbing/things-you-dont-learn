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
