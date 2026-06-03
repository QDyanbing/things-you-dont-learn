# Frontend Maintenance Notes

These notes describe how to keep the large-file upload demo readable while its
SDK surface grows. The app is intentionally diagnostic: it exposes many internal
upload values so changes can be checked without adding a separate debug panel.

## State Display

- Group related coordinator values together in the UI so new fields are easy to
  compare.
- Reset displayed values when a new file is selected to avoid stale state.
- Keep empty values explicit instead of hiding them when the field helps debug a
  transition.

## SDK Integration

- Prefer reading values from `FileCoordinator` getters instead of duplicating
  upload calculations in React state.
- Keep demo-only previews isolated in helpers when they temporarily mutate SDK
  state.
- Add a visible field when a new SDK getter is meant to support user-facing
  behavior.

## Progress Rendering

- Show byte totals alongside percentages when progress behavior changes.
- Keep chunk progress and aggregate file progress visually distinct.
- Avoid timer-only progress indicators because they can drift away from SDK
  state.

## Manual Checks

- Select a file after UI changes and confirm all summary fields reset first.
- Exercise pause, resume, cancel, and retry previews when those controls change.
- Run the browser demo with the API server whenever UI work depends on route
  responses.
