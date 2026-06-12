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
