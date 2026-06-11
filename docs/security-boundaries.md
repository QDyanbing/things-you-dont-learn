# Security Boundaries

This guide records the security assumptions of the local demo. It is not a
production security model; it documents which pieces are intentionally lightweight
so future examples do not accidentally treat them as hardened behavior.

## Demo Auth

- Bearer and cookie flows use fixed demo values for predictable local examples.
- Demo auth routes are meant to exercise request wiring, not real identity.
- Do not reuse the demo token or cookie behavior as a production authentication
  pattern.

## Upload Data Boundary

- The API store tracks upload metadata and part records, not durable file bytes.
- File hash values are client-provided resume keys and are not verified content
  hashes by the demo server.
- Add server-side validation and persistence before treating uploads as trusted
  or recoverable across restarts.
