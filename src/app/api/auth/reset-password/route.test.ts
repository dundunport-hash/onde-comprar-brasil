import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const mockedFindFirst = vi.mocked(prisma.user.findFirst);
const mockedUpdate = vi.mocked(prisma.user.update);
const mockedHash = vi.mocked(bcrypt.hash);
const validResetToken = "a".repeat(64);

function buildDbUser(overrides: { id: string; email: string }) {
  return {
    name: null,
    phone: null,
    image: null,
    passwordHash: null,
    role: "USER",
    resetToken: validResetToken,
    resetTokenExpiry: new Date("2026-01-01T01:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/reset-password", () => {
  it("returns 400 when token or password are missing", async () => {
    const request = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Token e senha são obrigatórios.");
  });

  it("returns 400 for expired or invalid token", async () => {
    mockedFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "invalid-token",
        password: "novaSenha123",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Token invalido ou expirado.");
  });

  it("updates the password when the token is valid", async () => {
    mockedFindFirst.mockResolvedValue(
      buildDbUser({
        id: "user-1",
        email: "test@example.com",
      }),
    );

    const request = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: validResetToken,
        password: "novaSenha123",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Senha redefinida com sucesso.");
    expect(mockedHash).toHaveBeenCalledWith("novaSenha123", 12);
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: "hashed-password",
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  });
});
