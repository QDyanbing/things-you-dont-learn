# Development Workflow

Use this guide when making small changes across the workspace. It keeps the
habit of scoped edits, nearby documentation, and quick verification visible so
future work stays easy to review.

## Before Editing

- Check `git status --short --branch` so unrelated local changes stay visible.
- Read the package README and relevant guide before changing behavior.
- Pick the narrowest package or document that can explain the current change.

## Change Scope

- Keep one commit focused on one behavior, documentation topic, or comment area.
- Prefer extending existing helpers before introducing new abstractions.
- Leave generated build output untracked unless the project explicitly asks for
  it.

## Documentation Updates

- Update the closest README when a package-level workflow changes.
- Use `docs/` for cross-package runbooks, maintenance rules, and checklists.
- Keep JSDoc comments near the code path they explain, especially for public SDK
  types and route contracts.

## Verification

- Run `pnpm build` before ending a change set that touches TypeScript or package
  wiring.
- Run package-specific build commands when the change is isolated to one package.
- Pair build checks with manual browser checks when the user-visible upload flow
  changes.
