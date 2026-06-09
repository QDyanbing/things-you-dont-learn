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
