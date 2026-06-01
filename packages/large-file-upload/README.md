# Large File Upload

This package contains the browser demo for the large-file upload example. It
combines a React UI with SDK primitives that coordinate file selection, upload
state, progress reporting, and local API calls.

## Commands

- `pnpm dev:large-file-upload`: Starts the Vite development server from the
  workspace root.
- `pnpm --filter @workspace/large-file-upload build`: Runs TypeScript checking
  and creates the production build for this package.

## SDK And Demo Roles

The SDK layer owns reusable upload behavior, while the React app turns that
behavior into a visible workflow. Keep transport and queue decisions in the SDK
when they should be reused, and keep display-only formatting in the app.
