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

## Upload States

The demo should make the main upload states easy to scan: waiting, uploading,
completed, failed, and canceled. When adding SDK states, update the visible copy
and visual indicators at the same time so the example remains readable.

## Progress Display

Progress values are derived from uploaded bytes and total file size. Prefer
byte-based calculations over timer-only UI updates so the demo reflects actual
upload progress when the transport layer becomes more realistic.

## API Expectations

Run the API server while developing this package. The demo expects local upload
coordination endpoints and demo authentication routes to be reachable, which
keeps browser behavior aligned with the server examples in this workspace.

## Extension Notes

When adding features, prefer narrow SDK methods that the demo can call directly.
Document new user-visible behavior in this README or the SDK README so future
changes have a clear place to check expected behavior.
