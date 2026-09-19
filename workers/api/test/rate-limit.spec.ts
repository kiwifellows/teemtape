import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const BASE = "https://api.test";

describe("rate limiting", () => {
  it("is enforced by the RATE_LIMITER binding, per client IP", async () => {
    expect(env.RATE_LIMITER).toBeDefined();
    const headers = { "cf-connecting-ip": "203.0.113.9" };
    const limit = env.TEST_RATE_LIMIT; // overridden in vitest.config.ts (60/min in wrangler.toml)

    for (let i = 0; i < limit; i++) {
      const res = await SELF.fetch(`${BASE}/api/quotes?symbols=AAPL`, { headers });
      expect(res.status, `request ${i + 1}`).toBe(200);
    }

    const blocked = await SELF.fetch(`${BASE}/api/quotes?symbols=AAPL`, { headers });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("60");

    // Another caller is unaffected.
    const other = await SELF.fetch(`${BASE}/api/quotes?symbols=AAPL`, {
      headers: { "cf-connecting-ip": "203.0.113.10" },
    });
    expect(other.status).toBe(200);
  });

  it("never limits the health check", async () => {
    const headers = { "cf-connecting-ip": "203.0.113.9" };
    const res = await SELF.fetch(`${BASE}/health`, { headers });
    expect(res.status).toBe(200);
  });
});
