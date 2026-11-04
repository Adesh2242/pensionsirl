import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// One of OWASP's equivalent scrypt settings (N=2^15, r=8, p=3): the same
// work as N=2^17/p=1 but 32 MiB of memory per hash instead of 128, so a
// burst of logins can't exhaust a small container.
const N = 1 << 15;
const R = 8;
const P = 3;
const KEY_LENGTH = 64;
const MAXMEM = 256 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 256;

/** "scrypt$N$r$p$salt$hash", base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAXMEM });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/**
 * Checks a password against a stored hash. Accepts our scrypt format and the
 * bcrypt ($2a$/$2b$) hashes carried over from Supabase Auth; `needsRehash`
 * says the caller should store a fresh scrypt hash now it has the password.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (stored.startsWith("$2")) {
    const ok = await bcrypt.compare(password, stored);
    return { ok, needsRehash: ok };
  }
  const [scheme, n, r, p, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return { ok: false, needsRehash: false };
  const expected = Buffer.from(keyB64, "base64url");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  const ok = actual.length === expected.length && timingSafeEqual(actual, expected);
  return { ok, needsRehash: ok && (Number(n) !== N || Number(r) !== R || Number(p) !== P) };
}

/**
 * A hash to compare against when the email doesn't exist, so a login for an
 * unknown account takes as long as one with a wrong password.
 */
let dummyHash: Promise<string> | null = null;
export function dummyPasswordHash() {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}
