/** Where signing in lands by default: the portfolio is the heart of the site. */
export const HOME_AFTER_SIGN_IN = "/portfolio";

/**
 * Where to send someone after they sign in: the `next` path they were trying
 * to reach, or `fallback`.
 *
 * Only same-site paths are accepted. `next` arrives in a URL anyone can
 * craft, and an unchecked one turns sign-in into an open redirect:
 * `//evil.com` and `/\evil.com` are read by browsers as another host,
 * `@evil.com` appended to an origin becomes userinfo + another host, and
 * browsers strip tabs and newlines, so `/\t/evil.com` collapses to
 * `//evil.com`.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = HOME_AFTER_SIGN_IN,
): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (/[\\\s\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}

/** The login page, set to bring the visitor back to `path` afterwards. */
export function loginHref(path: string): string {
  return `/login?next=${encodeURIComponent(path)}`;
}
