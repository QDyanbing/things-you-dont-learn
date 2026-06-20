# Things You Do Not Learn

This workspace collects small, practical examples that are easier to understand
by reading and running code than by studying isolated notes. The current focus is
a large-file upload demo with a browser client, a small SDK layer, and a local
API server used for upload coordination.

## Workspace Layout

- `packages/large-file-upload`: React demo app and SDK primitives for managing
  file selection, queueing, upload progress, and user-facing upload state.
- `packages/api-server`: Local Fastify server that provides demo authentication
  routes and upload coordination endpoints for the browser app.

## Scripts

- `pnpm dev`: Starts the API server and the large-file upload demo app together.
- `pnpm dev:server`: Starts only the local API server.
- `pnpm dev:large-file-upload`: Starts only the browser demo app.
- `pnpm build`: Runs the workspace build across all packages.

## Package Purpose

The upload demo is split so the browser package can stay focused on UI and SDK
state, while the API package owns transport-facing behavior. This keeps examples
small enough to inspect while still showing the handoff between client code and
server routes.

## Local Development

Install dependencies with `pnpm install`, then run `pnpm dev` from the workspace
root. The browser app expects the API server to be available during the demo
flow, so running both packages together is the simplest way to exercise the
project end to end.

## Build Check

Use `pnpm build` before sharing changes. The command compiles every package in
the workspace and is the quickest smoke test for TypeScript and package wiring
regressions.

## Maintenance Docs

Longer operational and maintenance notes live in `docs/`. Start there when
checking upload behavior, API server behavior, frontend display expectations, or
SDK behavior rules.

The documentation set also includes the workspace development workflow and an
upload troubleshooting guide for symptom-based checks before deeper code
changes.

Use the API contracts guide when route response shapes change, and the release
checklist before handing off a larger batch of small commits.

Use the SDK usage guide for public coordinator calls, and the demo scenarios
guide when checking the browser flow from a user's point of view.

Use the client/server integration guide and upload store guide when work spans
the browser package and local API server.

Use the testing strategy guide before deciding verification scope, and the
glossary when SDK, demo, and API terms need to stay aligned.

Use the architecture overview to orient package responsibilities, and the
security boundaries guide before changing demo auth or upload metadata behavior.

Use the error handling and observability guides when adding failure states,
diagnostics, or debugging notes.

Use the performance guide for scheduling, rendering, and build-size concerns,
and the maintenance cadence guide to keep docs and JSDoc close to changes.

Use the refactoring guide before moving behavior across package boundaries, and
the future work guide to park scoped follow-up ideas.

Use the local debugging playbook for machine-specific issues, and the
documentation style guide to keep future notes consistent.

Use the API examples guide when checking local route calls, and the SDK operation
checklist when exercising `FileCoordinator` step by step.

## Upload Flow

The large-file upload path starts in the demo app, passes selected files through
the SDK coordinator, and then calls the API server routes that track upload
metadata. The UI reflects queue state, progress, completion, and failure so the
example stays useful while changing SDK behavior.

## Demo Authentication

The API server includes lightweight demo authentication routes. They are meant
to support local examples and integration experiments, not production identity
behavior. Keep real auth concerns outside this package unless the project grows
into a dedicated server example.
