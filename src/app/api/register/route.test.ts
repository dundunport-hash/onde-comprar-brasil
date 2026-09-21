import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const mockedHash = vi.mocked(bcrypt.hash);
const mockedCreate = vi.mocked(prisma.user.create);
const mockedFindUnique = vi.mocked(prisma.user.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
  mockedHash.mockResolvedValue("hashed-password" as never);
  mockedFindUnique.mockResolvedValue(null);
  mockedCreate.mockResolvedValue({
    id: "user-1",
    email: "test@example.com",
    name: "Teste",
  } as never);
});

describe("POST /api/register", () => {
  it("stores only normalized image URLs", async () => {
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
          name: "Teste",
          imageUrl: "data:image/png;base64,abc123",
          termsAccepted: true,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        email: "test@example.com",
        name: "Teste",
        passwordHash: "hashed-password",
        image: null,
      },
    });
  });

  it("normalizes email and sanitizes the display name", async () => {
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "  TEST@Example.COM ",
          password: "password123",
          name: " <strong>Teste</strong>   Seguro ",
          imageUrl: "https://example.com/avatar.png",
          termsAccepted: true,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        email: "test@example.com",
        name: "Teste Seguro",
        passwordHash: "hashed-password",
        image: "https://example.com/avatar.png",
      },
    });
  });

  it("requires accepting the terms of use", async () => {
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
          name: "Teste",
          termsAccepted: false,
        }),
      }),
    );

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Voce precisa aceitar os Termos de Uso para criar conta.",
    );
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
