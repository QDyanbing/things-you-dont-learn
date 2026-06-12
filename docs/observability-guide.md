# Observability Guide

This guide describes the signals that make the upload demo easier to inspect.
Use it when adding diagnostics, changing progress summaries, or explaining how
to debug client/server upload behavior.

## Client Diagnostics

- Keep file identity, chunk identity, and chunk indexes visible when debugging
  resume behavior.
- Compare status counts with pending, queued, uploading, uploaded, and failed
  lists.
- Reset diagnostic values when a new file starts a fresh coordinator session.

## Server Diagnostics

- Use Fastify request logs to confirm which upload route handled the request.
- Track `uploadId` and `fileHash` together when comparing route responses with
  client state.
- Check uploaded part numbers when resume state differs from SDK chunk indexes.
