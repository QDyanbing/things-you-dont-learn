# Release Checklist

Use this checklist before handing off a batch of workspace changes. It is tuned
for small SDK, demo app, API server, and documentation updates where quick
verification matters more than a heavy release process.

## Scope Review

- Confirm every changed file belongs to the requested area of work.
- Separate unrelated cleanup from behavior changes so review stays clear.
- Check that package-level docs describe any new workflow or public behavior.

## Build Verification

- Run `pnpm build` for workspace-level confidence before handing off changes.
- Use package-specific build commands only when narrowing a failure.
- Treat TypeScript errors as release blockers, even when the changed files are
  mostly documentation.

## Upload Demo Review

- Select a file and confirm the demo resets stale fields before preparing chunks.
- Check queued, pending, uploading, failed, and completed summaries after SDK
  display changes.
- Revisit the upload runbook when behavior changes are more than cosmetic.

## API Review

- Confirm route response shapes still match the browser demo expectations.
- Check demo authentication behavior when access mode handling changes.
- Revisit the API server runbook after route prefixes, CORS, or server startup
  behavior changes.

## Documentation Review

- Check `docs/README.md` whenever a new guide is added.
- Keep root README references broad and package README references specific.
- Prefer JSDoc for code-facing explanations that future callers will inspect in
  editors.
