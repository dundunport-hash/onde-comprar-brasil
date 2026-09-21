import { beforeEach, describe, expect, it } from "vitest";
import {
  assertRateLimit,
  clearRateLimitStore,
  consumeRateLimit,
  createRateLimitKey,
  getClientIp,
  rateLimitExceededResponse,
  RateLimitError,
} from "./rate-limit";

beforeEach(() => {
  clearRateLimitStore();
});

describe("rate limit utilities", () => {
  it("allows requests until the configured limit is exceeded", () => {
    const options = {
      key: "test:key",
      limit: 2,
      windowMs: 60_000,
    };

    expect(consumeRateLimit(options)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(consumeRateLimit(options)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(consumeRateLimit(options)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it("throws a typed error when asserted over the limit", () => {
    const options = {
      key: "assert:key",
      limit: 1,
      windowMs: 60_000,
    };

    assertRateLimit(options);

    expect(() => assertRateLimit(options)).toThrow(RateLimitError);
  });

  it("normalizes keys and extracts forwarded client IPs", () => {
    const request = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      },
    });

    expect(getClientIp(request)).toBe("203.0.113.10");
    expect(createRateLimitKey("login", " USER@Example.COM ")).toBe(
      "login:user@example.com",
    );
  });

  it("returns a 429 response with retry headers", async () => {
    const result = consumeRateLimit({
      key: "response:key",
      limit: 0,
      windowMs: 60_000,
    });
    const response = rateLimitExceededResponse(result);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(response.headers.get("X-RateLimit-Limit")).toBe("0");
    await expect(response.json()).resolves.toMatchObject({
      error: "Muitas tentativas. Tente novamente mais tarde.",
    });
  });
});
