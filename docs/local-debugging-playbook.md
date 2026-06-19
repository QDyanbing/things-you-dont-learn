# Local Debugging Playbook

Use this playbook when the upload demo behaves differently on a local machine.
It groups quick checks for dev servers, browser state, SDK state, API routes, and
build failures.

## Dev Server Checks

- Start with `pnpm dev` when the issue may involve browser-to-API handoff.
- Use `pnpm dev:server` or `pnpm dev:large-file-upload` only after narrowing the
  problem to one package.
- Confirm both processes are listening before debugging upload behavior.
