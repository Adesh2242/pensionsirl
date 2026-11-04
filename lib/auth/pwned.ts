import "server-only";
import { createHash } from "node:crypto";

/**
 * Has this password appeared in a known data breach? Uses Have I Been
 * Pwned's k-anonymity range API: only the first 5 characters of the
 * password's SHA-1 hash leave the server, never the password or the full
 * hash, and padded responses hide which suffix was looked for.
 *
 * Fails open: if the service is slow or down, sign-up isn't blocked.
 */
export async function isPwnedPassword(password: string): Promise<boolean> {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "PensionIQ" },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [candidate, count] = line.trim().split(":");
      return candidate === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}
