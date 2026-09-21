import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { clearRateLimitStore } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { POST as register } from "./register/route";
import { POST as forgotPassword } from "./auth/forgot-password/route";
import { POST as resetPassword } from "./auth/reset-password/route";

const mockedCreateUser = vi.mocked(prisma.user.create);
const mockedFindUniqueUser = vi.mocked(prisma.user.findUnique);
const mockedFindFirstUser = vi.mocked(prisma.user.findFirst);
const mockedUpdateUser = vi.mocked(prisma.user.update);

function jsonRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": randomUUID(),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearRateLimitStore();
});

describe("security-sensitive route handlers", () => {
  it("does not return password hashes or internal fields after registration", async () => {
    mockedFindUniqueUser.mockResolvedValue(null);
    mockedCreateUser.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      name: "Teste",
      passwordHash: "hashed-password",
      resetToken: "secret",
    } as never);

    const response = await register(
      jsonRequest("http://localhost/api/register", {
        email: "test@example.com",
        password: "password123",
        name: "Teste",
        termsAccepted: true,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      id: "user-1",
      email: "test@example.com",
      name: "Teste",
    });
    expect(JSON.stringify(body)).not.toContain("password");
    expect(JSON.stringify(body)).not.toContain("resetToken");
  });

  it("keeps forgot-password responses neutral for unknown accounts", async () => {
    mockedFindUniqueUser.mockResolvedValue(null);

    const response = await forgotPassword(
      jsonRequest("http://localhost/api/auth/forgot-password", {
        email: "unknown@example.com",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message:
        "Se o e-mail existir em nossa base, enviamos instrucoes para redefinir sua senha.",
    });
    expect(mockedUpdateUser).not.toHaveBeenCalled();
  });

  it("does not hash or persist password reset attempts with invalid tokens", async () => {
    mockedFindFirstUser.mockResolvedValue(null);

    const response = await resetPassword(
      jsonRequest("http://localhost/api/auth/reset-password", {
        token: "not-a-token",
        password: "novaSenha123",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Token invalido ou expirado.");
    expect(mockedUpdateUser).not.toHaveBeenCalled();
  });
});
