import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getAuditActor, recordAuditLog, redactAuditMetadata } from "./audit";

const mockedCreate = vi.mocked(prisma.auditLog.create);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("audit helpers", () => {
  it("extracts the audit actor from the session", () => {
    expect(
      getAuditActor({
        user: {
          id: "user-1",
          email: "admin@example.com",
        },
        expires: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toEqual({
      id: "user-1",
      email: "admin@example.com",
    });
  });

  it("redacts sensitive metadata recursively", () => {
    expect(
      redactAuditMetadata({
        orderId: "cart-1",
        resetToken: "secret-token",
        nested: {
          passwordHash: "hashed",
          visible: "ok",
        },
        events: [
          {
            apiKey: "key-1",
            action: "sent",
          },
        ],
      }),
    ).toEqual({
      orderId: "cart-1",
      resetToken: "[redacted]",
      nested: {
        passwordHash: "[redacted]",
        visible: "ok",
      },
      events: [
        {
          apiKey: "[redacted]",
          action: "sent",
        },
      ],
    });
  });

  it("records sanitized audit log payloads", async () => {
    await recordAuditLog({
      action: "auth.password_reset.request",
      entity: "User",
      entityId: "user-1",
      actor: {
        id: "user-1",
        email: "user@example.com",
      },
      metadata: {
        token: "abc",
        emailSent: true,
      },
    });

    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        action: "auth.password_reset.request",
        entity: "User",
        entityId: "user-1",
        actorId: "user-1",
        actorEmail: "user@example.com",
        metadata: {
          token: "[redacted]",
          emailSent: true,
        },
      },
    });
  });

  it("does not throw when audit persistence fails", async () => {
    mockedCreate.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      recordAuditLog({
        action: "test.failure",
        entity: "Test",
      }),
    ).resolves.toBeUndefined();
  });
});
