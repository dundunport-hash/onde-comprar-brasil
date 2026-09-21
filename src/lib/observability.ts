export type ObservabilityLevel = "info" | "warn" | "error";

export type ObservabilityEvent = {
  id: string;
  timestamp: string;
  level: ObservabilityLevel;
  scope: string;
  message: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    digest?: string;
  };
};

type ObservabilityEventInput = {
  level?: ObservabilityLevel;
  scope: string;
  message: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: unknown;
};

const MAX_EVENTS = 200;
const REDACTED_VALUE = "[redacted]";
const SENSITIVE_METADATA_KEY_PATTERN =
  /(authorization|cookie|password|senha|secret|session|token|api[-_]?key|credential)/i;

const startedAt = Date.now();
const events: ObservabilityEvent[] = [];

function getNowMs() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function createEventId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

function normalizeError(
  error: unknown,
): ObservabilityEvent["error"] | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    const errorWithDigest = error as Error & { digest?: string };

    return {
      name: error.name,
      message: error.message,
      digest: errorWithDigest.digest,
    };
  }

  return {
    name: "Error",
    message: String(error),
  };
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[truncated]";
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return normalizeError(value);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 25)
      .map((item) => sanitizeMetadataValue(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]) => [
          key,
          SENSITIVE_METADATA_KEY_PATTERN.test(key)
            ? REDACTED_VALUE
            : sanitizeMetadataValue(item, depth + 1),
        ]),
    );
  }

  return String(value);
}

export function sanitizeObservabilityMetadata(
  metadata?: Record<string, unknown>,
) {
  if (!metadata) {
    return undefined;
  }

  return sanitizeMetadataValue(metadata) as Record<string, unknown>;
}

export function recordObservabilityEvent({
  level = "info",
  scope,
  message,
  durationMs,
  metadata,
  error,
}: ObservabilityEventInput) {
  const event: ObservabilityEvent = {
    id: createEventId(),
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    durationMs,
    metadata: sanitizeObservabilityMetadata(metadata),
    error: normalizeError(error),
  };

  events.unshift(event);
  events.splice(MAX_EVENTS);

  if (process.env.NODE_ENV !== "test") {
    const logPayload = {
      timestamp: event.timestamp,
      level: event.level,
      scope: event.scope,
      message: event.message,
      durationMs: event.durationMs,
      metadata: event.metadata,
      error: event.error,
    };

    if (level === "error") {
      console.error("[observability]", logPayload);
    } else if (level === "warn") {
      console.warn("[observability]", logPayload);
    } else {
      console.info("[observability]", logPayload);
    }
  }

  return event;
}

export async function withObservability<T>(
  scope: string,
  operation: () => Promise<T> | T,
  metadata?: Record<string, unknown>,
) {
  const started = getNowMs();

  try {
    const result = await operation();

    recordObservabilityEvent({
      level: "info",
      scope,
      message: "Operacao concluida",
      durationMs: Math.round(getNowMs() - started),
      metadata,
    });

    return result;
  } catch (error) {
    recordObservabilityEvent({
      level: "error",
      scope,
      message: "Operacao falhou",
      durationMs: Math.round(getNowMs() - started),
      metadata,
      error,
    });

    throw error;
  }
}

export function getObservabilitySnapshot() {
  const levelCounts: Record<ObservabilityLevel, number> = {
    info: 0,
    warn: 0,
    error: 0,
  };
  const scopeCounts = new Map<string, number>();

  for (const event of events) {
    levelCounts[event.level] += 1;
    scopeCounts.set(event.scope, (scopeCounts.get(event.scope) ?? 0) + 1);
  }

  const memory =
    typeof process !== "undefined" && typeof process.memoryUsage === "function"
      ? process.memoryUsage()
      : null;

  return {
    generatedAt: new Date().toISOString(),
    startedAt: new Date(startedAt).toISOString(),
    uptimeMs: Date.now() - startedAt,
    eventCount: events.length,
    maxEvents: MAX_EVENTS,
    levelCounts,
    scopeCounts: Array.from(scopeCounts.entries())
      .map(([scope, count]) => ({ scope, count }))
      .sort((a, b) => b.count - a.count || a.scope.localeCompare(b.scope)),
    runtime: {
      nodeEnv: process.env.NODE_ENV,
      nextRuntime: process.env.NEXT_RUNTIME ?? "nodejs",
      memory,
    },
    events: [...events],
  };
}

export function clearObservabilityForTests() {
  events.length = 0;
}
