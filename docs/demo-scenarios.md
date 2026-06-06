# Demo Scenarios

Use these scenarios when checking the large-file upload demo from a user's point
of view. They complement the runbooks by describing the visible flow through the
browser app.

## File Selection

- Select one file from the upload control.
- Confirm file name, size, last modified time, and file identity update together.
- Select another file and confirm the previous file's progress and chunk state
  are cleared.

## Preparation

- Confirm `prepare()` creates chunk metadata before upload starts.
- Check the first chunk identity, status, type, range, byte range, and blob size.
- Confirm prepared chunk count and prepared byte size match the selected file.

## Upload Progress

- Start upload and watch uploading chunk indexes appear before completion.
- Confirm aggregate uploaded bytes, remaining bytes, total bytes, and percent
  move together.
- Compare first-chunk progress with the aggregate progress summary.

## Pause And Resume

- Pause during an active upload and confirm the coordinator leaves the uploading
  state.
- Confirm `canResume()` becomes true after pause.
- Resume and confirm the upload can continue from the pending or unfinished set.

## Failure Recovery

- Force a failed chunk preview and confirm failed indexes and byte totals update.
- Reset failed chunks and confirm they return to retryable state.
- Cancel the upload and confirm stale uploading values are cleared afterward.
