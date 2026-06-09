# Testing Strategy

Use this guide when deciding how much verification a change needs. The workspace
is small, so the goal is to keep checks lightweight while still covering SDK,
browser demo, and API server behavior.

## Workspace Build

- Run `pnpm build` before handing off changes that touch TypeScript, package
  wiring, route contracts, or SDK behavior.
- Treat build failures as blockers because both packages compile from the same
  workspace command.
- Re-run the workspace build after adjusting commits or combining changes.

## Package Checks

- Use `pnpm --filter @workspace/api-server build` when narrowing API-only
  TypeScript errors.
- Use `pnpm --filter @workspace/large-file-upload build` when narrowing browser
  app or SDK errors.
- Return to the full workspace build before final handoff.

## Manual Upload Checks

- Use the demo scenarios guide when UI-visible upload behavior changes.
- Select a file, prepare chunks, start upload, and verify progress summaries.
- Exercise pause, resume, cancel, and retry previews when coordinator state
  logic changes.

## API Contract Checks

- Revisit the API contracts guide when request bodies or response shapes change.
- Check public, bearer, and cookie access modes when authentication routing
  changes.
- Compare server part numbers with SDK chunk indexes when resume behavior changes.

## Regression Notes

- Record newly found edge cases in the closest runbook or troubleshooting guide.
- Add JSDoc near public SDK or route contract code when a regression depends on
  a subtle behavior boundary.
- Keep final handoff notes explicit about which checks were actually run.
