import { beforeEach, describe, expect, it } from "vitest";
import {
  clearObservabilityForTests,
  getObservabilitySnapshot,
  recordObservabilityEvent,
  sanitizeObservabilityMetadata,
  withObservability,
} from "./observability";

beforeEach(() => {
  clearObservabilityForTests();
});

describe("observability helpers", () => {
  it("redacts sensitive metadata recursively", () => {
    expect(
      sanitizeObservabilityMetadata({
        requestId: "req-1",
        authorization: "Bearer secret",
        nested: {
          resetToken: "abc",
          visible: true,
        },
        events: [
          {
            apiKey: "key-1",
            status: "sent",
          },
        ],
      }),
    ).toEqual({
      requestId: "req-1",
      authorization: "[redacted]",
      nested: {
        resetToken: "[redacted]",
        visible: true,
      },
      events: [
        {
          apiKey: "[redacted]",
          status: "sent",
        },
      ],
    });
  });

  it("records events in newest-first order with level counts", () => {
    recordObservabilityEvent({
      scope: "checkout",
      message: "Pedido iniciado",
    });
    recordObservabilityEvent({
      level: "warn",
      scope: "checkout",
      message: "Pagamento pendente",
    });

    const snapshot = getObservabilitySnapshot();

    expect(snapshot.eventCount).toBe(2);
    expect(snapshot.levelCounts).toEqual({
      info: 1,
      warn: 1,
      error: 0,
    });
    expect(snapshot.events[0].message).toBe("Pagamento pendente");
    expect(snapshot.scopeCounts).toContainEqual({
      scope: "checkout",
      count: 2,
    });
  });

  it("keeps only the configured recent event window", () => {
    for (let index = 0; index < 205; index += 1) {
      recordObservabilityEvent({
        scope: "stress",
        message: `Evento ${index}`,
      });
    }

    const snapshot = getObservabilitySnapshot();

    expect(snapshot.eventCount).toBe(snapshot.maxEvents);
    expect(snapshot.events[0].message).toBe("Evento 204");
    expect(snapshot.events.at(-1)?.message).toBe("Evento 5");
  });

  it("wraps successful operations with duration metadata", async () => {
    const result = await withObservability(
      "products.refresh",
      async () => "ok",
      {
        productId: "product-1",
      },
    );

    const snapshot = getObservabilitySnapshot();

    expect(result).toBe("ok");
    expect(snapshot.events[0]).toMatchObject({
      level: "info",
      scope: "products.refresh",
      message: "Operacao concluida",
      metadata: {
        productId: "product-1",
      },
    });
    expect(snapshot.events[0].durationMs).toEqual(expect.any(Number));
  });

  it("records failed operations and rethrows the error", async () => {
    await expect(
      withObservability(
        "payments.webhook",
        async () => {
          throw new Error("Stripe indisponivel");
        },
        {
          secretToken: "hidden",
        },
      ),
    ).rejects.toThrow("Stripe indisponivel");

    const snapshot = getObservabilitySnapshot();

    expect(snapshot.events[0]).toMatchObject({
      level: "error",
      scope: "payments.webhook",
      message: "Operacao falhou",
      metadata: {
        secretToken: "[redacted]",
      },
      error: {
        name: "Error",
        message: "Stripe indisponivel",
      },
    });
  });
});
