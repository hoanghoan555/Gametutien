/**
 * P5.5 — Sliding window rate limiter bảo vệ các endpoint API nhạy cảm.
 */

interface RateBucket {
  timestamps: number[];
}

export class RateLimiter {
  private buckets = new Map<string, RateBucket>();

  constructor(private readonly cleanupIntervalMs: number = 60_000) {}

  check(
    key: string,
    limit: number,
    windowMs: number,
    now: number
  ): { allowed: boolean; remaining: number; retryAfterMs: number } {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.buckets.set(key, bucket);
    }

    const windowStart = now - windowMs;
    // Lọc bỏ các timestamp quá cũ
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

    if (bucket.timestamps.length >= limit) {
      const oldestInWindow = bucket.timestamps[0];
      const retryAfterMs = Math.max(0, oldestInWindow + windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
      };
    }

    bucket.timestamps.push(now);
    return {
      allowed: true,
      remaining: limit - bucket.timestamps.length,
      retryAfterMs: 0,
    };
  }

  reset(): void {
    this.buckets.clear();
  }
}
