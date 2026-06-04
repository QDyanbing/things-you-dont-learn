# Upload Troubleshooting

Use this guide when the large-file upload demo behaves differently from the
expected runbook. It collects symptoms, likely causes, and the first place to
check before changing SDK or API code.

## App Does Not Start

- Confirm `pnpm install` has been run with the workspace package manager.
- Use `pnpm dev` for the full local path so the browser app and API server start
  together.
- If only one side fails, run the package-specific dev command to isolate the
  failing package.

## File Details Look Stale

- Select a different file and confirm all displayed fields reset before the new
  coordinator prepares chunks.
- Check `App.tsx` state resets when a newly added display field keeps an older
  value.
- Confirm the SDK file identity is read from the active coordinator instance.

## Progress Looks Wrong

- Compare uploaded bytes, remaining bytes, total bytes, and percentage together.
- Inspect chunk-level progress before changing aggregate progress helpers.
- Check whether the upload handler reports progress more than once for the same
  chunk.
