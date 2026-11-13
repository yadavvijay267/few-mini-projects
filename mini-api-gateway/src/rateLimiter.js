// Token-bucket rate limiter (per API key). No dependencies.
// Each bucket: capacity tokens, refilled continuously at refillPerSecond.
// A request costs 1 token; when empty, the request is rejected with 429 + Retry-After.
class TokenBucket {
  constructor(capacity, refillPerSecond) {
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefill = now;
  }
  tryConsume(cost = 1) {
    this.refill();
    if (this.tokens >= cost) { this.tokens -= cost; return { allowed: true, remaining: Math.floor(this.tokens) }; }
    const deficit = cost - this.tokens;
    const retryAfter = Math.ceil(deficit / this.refillPerSecond);
    return { allowed: false, remaining: 0, retryAfter };
  }
}
class RateLimiter {
  constructor() { this.buckets = new Map(); this.usage = new Map(); }
  // Per-key config: { capacity, refillPerSecond }
  check(key, config) {
    if (!this.buckets.has(key)) this.buckets.set(key, new TokenBucket(config.capacity, config.refillPerSecond));
    const result = this.buckets.get(key).tryConsume(1);
    const u = this.usage.get(key) || { allowed: 0, blocked: 0 };
    if (result.allowed) u.allowed++; else u.blocked++;
    this.usage.set(key, u);
    return { ...result, limit: config.capacity, usage: u };
  }
  usageFor(key) { return this.usage.get(key) || { allowed: 0, blocked: 0 }; }
  reset(key) { this.buckets.delete(key); this.usage.delete(key); }
}
module.exports = { TokenBucket, RateLimiter };
