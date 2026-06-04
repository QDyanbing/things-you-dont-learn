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
