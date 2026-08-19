import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Durable rate limiting via Upstash Redis when configured
 * (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN), falling back to an
 * in-memory sliding window otherwise. The in-memory fallback resets on
 * server restart and doesn't share state across instances — fine for local
 * dev and single-instance deployments, not for a multi-instance production
 * deployment (which is exactly what Upstash fixes).
 */

const inMemoryLog = new Map<string, number[]>();

function inMemoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const timestamps = (inMemoryLog.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  inMemoryLog.set(key, timestamps);
  return { success: timestamps.length <= limit };
}

let upstashLimiter: Ratelimit | null | undefined;

function getUpstashLimiter(limit: number, windowSeconds: number) {
  if (upstashLimiter !== undefined) return upstashLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    upstashLimiter = null;
    return null;
  }

  upstashLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: "pensioniq",
  });
  return upstashLimiter;
}

export function isUpstashConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * @param key Identifies the caller (e.g. IP address).
 * @param limit Max requests allowed within the window.
 * @param windowSeconds Window length, in seconds.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ success: boolean }> {
  const limiter = getUpstashLimiter(limit, windowSeconds);
  if (limiter) {
    const { success } = await limiter.limit(key);
    return { success };
  }
  return inMemoryLimit(key, limit, windowSeconds * 1000);
}
