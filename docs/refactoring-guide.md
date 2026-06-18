# Refactoring Guide

This guide records how to approach small refactors in the upload demo workspace.
Use it when moving behavior between files, renaming helpers, or simplifying code
without changing the user-visible upload flow.

## Refactor Boundaries

- Keep behavior-preserving refactors separate from feature work.
- Start with the closest owning package before creating shared helpers.
- Update nearby docs or JSDoc when moving behavior changes how future readers
  discover it.
