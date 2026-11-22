import "server-only";

/**
 * Process-local sliding-window rate limiter for server actions and API routes.
 * NOTE: per-instance only in memory. In multi-instance production deployments,
 * pair with a shared store (Redis) — see SECURITY.md.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
  remaining: number;
}

const prune = (hits: number[], windowMs: number, now: number): number[] =>
  hits.filter((t) => now - t < windowMs);

export const rateLimit = (
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult => {
  // Local development and the e2e suite run as one process with a single
  // client IP; throttling there only breaks repeated test runs without
  // protecting anyone. Production builds enforce the real limits.
  if (process.env.NODE_ENV !== "production") {
    return { ok: true, retryAfterMs: 0, remaining: limit };
  }
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = prune(bucket.hits, windowMs, now);

  if (bucket.hits.length >= limit) {
    const oldest = Math.min(...bucket.hits);
    return { ok: false, retryAfterMs: Math.max(0, windowMs - (now - oldest)), remaining: 0 };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // opportunistic cleanup to bound memory
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (prune(v.hits, Math.max(windowMs, 60_000), now).length === 0) buckets.delete(k);
    }
  }

  return { ok: true, retryAfterMs: 0, remaining: limit - bucket.hits.length };
};

/**
 * Best-effort client identity for rate limiting from server context.
 * Uses x-forwarded-for when present, else "local".
 */
export const clientIp = (headers: Headers): string => {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "local";
};
