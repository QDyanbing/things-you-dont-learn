/**
 * Fixed credential values used only by the local demo authentication routes.
 *
 * These constants make auth examples deterministic and should not be treated as
 * production secret material.
 */
/**
 * Demo bearer token returned by the refresh endpoint.
 */
export const DEMO_ACCESS_TOKEN = 'demo-access-token';
/**
 * Demo token value used by the upload API to simulate an expired token branch.
 */
export const DEMO_EXPIRED_ACCESS_TOKEN = 'expired-demo-token';
/**
 * Cookie name used by the demo cookie-auth upload flow.
 */
export const DEMO_UPLOAD_SESSION_COOKIE = 'demo_upload_session';
/**
 * Cookie value that represents an active demo upload session.
 */
export const DEMO_UPLOAD_SESSION_VALUE = 'active';
