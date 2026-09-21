import { NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter: number;
};

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const store = new Map<string, RateLimitEntry>();

export class RateLimitError extends Error {
  result: RateLimitResult;

  constructor(result: RateLimitResult) {
    super("Muitas tentativas. Tente novamente mais tarde.");
    this.name = "RateLimitError";
    this.result = result;
  }
}

function normalizeIdentifier(value: string | null | undefined) {
  return (value ?? "anonymous").trim().toLowerCase() || "anonymous";
}

export function getClientIp(source: Request | Headers) {
  const headers = source instanceof Request ? source.headers : source;
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return (
    forwardedFor ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function createRateLimitKey(scope: string, identifier?: string | null) {
  return `${scope}:${normalizeIdentifier(identifier)}`;
}

export function consumeRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);
  const entry =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + windowMs,
        };

  entry.count += 1;
  store.set(key, entry);

  const retryAfter = Math.max(Math.ceil((entry.resetAt - now) / 1000), 0);
  const remaining = Math.max(limit - entry.count, 0);

  return {
    allowed: entry.count <= limit,
    limit,
    remaining,
    resetAt: new Date(entry.resetAt),
    retryAfter,
  };
}

export function assertRateLimit(options: RateLimitOptions) {
  const result = consumeRateLimit(options);

  if (!result.allowed) {
    throw new RateLimitError(result);
  }

  return result;
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfter),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
  };
}

export function rateLimitExceededResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      error: "Muitas tentativas. Tente novamente mais tarde.",
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: rateLimitHeaders(result),
    },
  );
}

export function clearRateLimitStore() {
  store.clear();
}
