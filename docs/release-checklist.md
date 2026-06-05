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
