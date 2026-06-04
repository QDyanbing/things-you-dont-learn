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
