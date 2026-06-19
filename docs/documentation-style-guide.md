# Documentation Style Guide

Use this guide to keep project documentation concise and consistent. It covers
where new notes should live, how sections should read, and when to prefer JSDoc
near source code.

## Placement

- Use package READMEs for package-specific commands, usage, and local context.
- Use `docs/` for cross-package behavior, runbooks, and maintenance guidance.
- Prefer updating an existing guide before creating a new one for a small note.

## Section Style

- Keep sections short enough to scan during debugging.
- Lead with the practical rule before explaining background.
- Use bullets for checklists and plain paragraphs for overview context.

## References

- Wrap commands, package names, route paths, and code identifiers in backticks.
- Prefer relative repository paths in docs so the notes stay portable.
- Link related guides when a reader should check another behavior boundary.

## JSDoc Style

- Use JSDoc for exported helpers, public SDK types, and route request bodies.
- Explain behavior boundaries rather than repeating obvious field names.
- Keep JSDoc close to the code path a caller will inspect in an editor.
