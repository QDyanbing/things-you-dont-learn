# Local Debugging Playbook

Use this playbook when the upload demo behaves differently on a local machine.
It groups quick checks for dev servers, browser state, SDK state, API routes, and
build failures.

## Dev Server Checks

- Start with `pnpm dev` when the issue may involve browser-to-API handoff.
- Use `pnpm dev:server` or `pnpm dev:large-file-upload` only after narrowing the
  problem to one package.
- Confirm both processes are listening before debugging upload behavior.

## Browser State Checks

- Select a fresh file before comparing UI state.
- Confirm stale values clear before new chunk preparation starts.
- Compare visible diagnostics with the demo scenarios guide before changing
  component state.

## SDK State Checks

- Inspect chunk status counts before changing upload scheduling logic.
- Compare progress bytes with chunk-level progress when percent values look
  wrong.
- Check failed and pending indexes before assuming retry state was lost.

## API Route Checks

- Check `/api/health` before debugging upload task behavior.
- Track response status, `uploadId`, and `fileHash` together.
- Compare route responses with `api-contracts.md` before changing client code.
