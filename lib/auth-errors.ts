/**
 * Turns an auth error into something a person can act on. A paused or
 * unreachable Supabase project surfaces as a bare network failure ("Failed
 * to fetch"), which reads like the user did something wrong.
 */
export function describeAuthError(error: { message: string; status?: number }): string {
  const unreachable =
    /failed to fetch|network|fetch failed|timeout|timed out|load failed/i.test(error.message) ||
    (error.status !== undefined && error.status >= 500);
  if (unreachable) {
    return "we can't reach the sign-in service right now. nothing's wrong with your details — please try again in a few minutes.";
  }
  return error.message;
}
