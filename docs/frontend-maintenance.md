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
