import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";

const mockedFindFirst = vi.mocked(prisma.user.findFirst);
const validResetToken = "a".repeat(64);

function buildDbUser(overrides: { id: string }) {
  return {
    name: null,
    email: "test@example.com",
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

describe("GET /api/auth/verify-reset-token", () => {
  it("returns 400 when token is missing", async () => {
    const request = new Request("http://localhost/api/auth/verify-reset-token");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Token é obrigatório.");
  });

  it("returns 400 for invalid or expired token", async () => {
    mockedFindFirst.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/auth/verify-reset-token?token=invalid-token",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Token invalido ou expirado.");
  });

  it("returns valid when token is valid", async () => {
    mockedFindFirst.mockResolvedValue(buildDbUser({ id: "user-1" }));

    const request = new Request(
      `http://localhost/api/auth/verify-reset-token?token=${validResetToken}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.valid).toBe(true);
  });
});
