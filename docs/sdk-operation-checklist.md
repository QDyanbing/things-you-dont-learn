# SDK Operation Checklist

Use this checklist when exercising `FileCoordinator` from the browser demo or a
small SDK experiment. It focuses on the order of calls and the values worth
checking after each phase.

## Prepare Phase

- Create one coordinator for the selected file.
- Call `prepare()` before reading chunk metadata.
- Check file identity, chunk count, first chunk range, and prepared byte size.

## Upload Phase

- Check `canUpload()` before starting a full upload.
- Watch uploading indexes and status counts while work is active.
- Compare uploaded bytes, remaining bytes, total bytes, and percent after
  progress reports.
