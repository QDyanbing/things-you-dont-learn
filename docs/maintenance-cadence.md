# Maintenance Cadence

This guide describes how to keep the documentation and comments useful as the
demo grows. It favors small updates near the change instead of large periodic
rewrites.

## Documentation Updates

- Update package READMEs when package-specific commands or usage expectations
  change.
- Update `docs/` guides when behavior spans SDK, browser demo, and API server
  boundaries.
- Add troubleshooting notes when a bug teaches a reusable diagnostic path.

## JSDoc Updates

- Add JSDoc near public SDK types, route bodies, and exported helpers.
- Prefer JSDoc when callers need editor-visible context before using a method.
- Keep internal comments short and focused on behavior that is not obvious from
  the code.
