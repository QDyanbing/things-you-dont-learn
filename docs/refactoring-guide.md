# Refactoring Guide

This guide records how to approach small refactors in the upload demo workspace.
Use it when moving behavior between files, renaming helpers, or simplifying code
without changing the user-visible upload flow.

## Refactor Boundaries

- Keep behavior-preserving refactors separate from feature work.
- Start with the closest owning package before creating shared helpers.
- Update nearby docs or JSDoc when moving behavior changes how future readers
  discover it.

## SDK Refactors

- Keep chunk status transitions inside `FileCoordinator`.
- Keep progress aggregation in SDK helpers instead of duplicating byte math in
  the browser demo.
- Preserve abort signal ownership when simplifying pause or cancel paths.

## Frontend Refactors

- Keep file-selection resets close to the upload control flow.
- Preserve visible diagnostic fields when extracting UI pieces.
- Prefer grouping related SDK reads before introducing new React state.

## API Refactors

- Keep route response shapes aligned with `api-contracts.md`.
- Preserve the upload store boundary when changing route handlers.
- Keep demo auth helpers separate from upload metadata logic.
