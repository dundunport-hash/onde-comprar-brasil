import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "./route";
import { prisma } from "@/lib/prisma";

const mockedFindUnique = vi.mocked(prisma.user.findUnique);
const mockedUpdate = vi.mocked(prisma.user.update);

function buildDbUser(overrides: { id: string; name: string; email: string }) {
  return {
    image: null,
    phone: null,
    passwordHash: null,
    role: "USER",
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 when email is missing", async () => {
    const request = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("E-mail e obrigatorio.");
  });

  it("returns success for unknown email without exposing user existence", async () => {
    mockedFindUnique.mockResolvedValue(null);

    const request = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "  UNKNOWN@Example.COM " }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain("Se o e-mail existir em nossa base");
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { email: "unknown@example.com" },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("creates a reset token for existing email", async () => {
    mockedFindUnique.mockResolvedValue(
      buildDbUser({
        id: "user-1",
        name: "Usuário de Teste",
        email: "test@example.com",
      }),
    );

    const request = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain("Se o e-mail existir em nossa base");
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        resetToken: expect.any(String),
        resetTokenExpiry: expect.any(Date),
      }),
    });
  });
});
