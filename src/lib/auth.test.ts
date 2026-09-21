import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockedFunction } from "vitest";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

vi.mock("./prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

import { authOptions, authorizeCredentials } from "./auth";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

const mockedFindUnique = vi.mocked(prisma.user.findUnique);
const mockedCompare = vi.mocked(bcrypt.compare) as unknown as MockedFunction<
  (password: string, hash: string) => Promise<boolean>
>;

function buildDbUser(overrides: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  image: string | null;
  passwordHash: string | null;
}) {
  return {
    phone: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authOptions providers", () => {
  it("returns null when credentials are missing", async () => {
    const result = await authorizeCredentials({});

    expect(result).toBeNull();
  });

  it("returns null when user does not exist", async () => {
    mockedFindUnique.mockResolvedValue(null);

    const result = await authorizeCredentials({
      email: "nonexistent@example.com",
      password: "password123",
    });

    expect(result).toBeNull();
    expect(mockedFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "nonexistent@example.com" },
      }),
    );
  });

  it("normalizes email credentials before lookup", async () => {
    mockedFindUnique.mockResolvedValue(null);

    const result = await authorizeCredentials({
      email: " <b>TEST@Example.COM</b> ",
      password: "password123",
    });

    expect(result).toBeNull();
    expect(mockedFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "test@example.com" },
      }),
    );
  });

  it("returns null when password is invalid", async () => {
    mockedFindUnique.mockResolvedValue(
      buildDbUser({
        id: "user-1",
        email: "test@example.com",
        name: "Teste",
        role: "USER",
        image: null,
        passwordHash: "hashed-pass",
      }),
    );
    mockedCompare.mockResolvedValue(false);

    const result = await authorizeCredentials({
      email: "test@example.com",
      password: "wrong-password",
    });

    expect(result).toBeNull();
    expect(mockedCompare).toHaveBeenCalledWith("wrong-password", "hashed-pass");
  });

  it("returns user object when credentials are valid", async () => {
    mockedFindUnique.mockResolvedValue(
      buildDbUser({
        id: "user-1",
        email: "test@example.com",
        name: "Teste",
        role: "ADMIN",
        image: "https://example.com/avatar.png",
        passwordHash: "hashed-pass",
      }),
    );
    mockedCompare.mockResolvedValue(true);

    const result = await authorizeCredentials({
      email: "test@example.com",
      password: "correct-password",
    });

    expect(result).toEqual({
      id: "user-1",
      name: "Teste",
      email: "test@example.com",
      image: "https://example.com/avatar.png",
      role: "ADMIN",
    });
  });

  it("does not return inline base64 images from credentials", async () => {
    mockedFindUnique.mockResolvedValue(
      buildDbUser({
        id: "user-1",
        email: "test@example.com",
        name: "Teste",
        role: "ADMIN",
        image: "data:image/png;base64,abc123",
        passwordHash: "hashed-pass",
      }),
    );
    mockedCompare.mockResolvedValue(true);

    const result = await authorizeCredentials({
      email: "test@example.com",
      password: "correct-password",
    });

    expect(result?.image).toBeNull();
  });
});

describe("authOptions callbacks", () => {
  it("adds id, picture and role to the JWT token when user is present", async () => {
    type JwtCallback = NonNullable<
      NonNullable<typeof authOptions.callbacks>["jwt"]
    >;
    type JwtCallbackParams = Parameters<JwtCallback>[0];

    const token: JWT = {};
    const user = {
      id: "user-1",
      image: "https://example.com/avatar.png",
      role: "ADMIN",
    } satisfies User;

    const result = await authOptions.callbacks?.jwt?.({
      token,
      user,
      account: null,
      trigger: "signIn",
    } as JwtCallbackParams);

    expect(result?.id).toBe("user-1");
    expect(result?.picture).toBe("https://example.com/avatar.png");
    expect(result?.role).toBe("ADMIN");
  });

  it("removes unsafe images from the JWT token", async () => {
    type JwtCallback = NonNullable<
      NonNullable<typeof authOptions.callbacks>["jwt"]
    >;
    type JwtCallbackParams = Parameters<JwtCallback>[0];

    const token: JWT = {
      picture: "https://example.com/previous.png",
    };
    const user = {
      id: "user-1",
      image: "data:image/png;base64,abc123",
      role: "ADMIN",
    } satisfies User;

    const result = await authOptions.callbacks?.jwt?.({
      token,
      user,
      account: null,
      trigger: "signIn",
    } as JwtCallbackParams);

    expect(result?.id).toBe("user-1");
    expect(result?.picture).toBeUndefined();
    expect(result?.role).toBe("ADMIN");
  });

  it("merges token values into session user data", async () => {
    type SessionCallback = NonNullable<
      NonNullable<typeof authOptions.callbacks>["session"]
    >;
    type SessionCallbackParams = Parameters<SessionCallback>[0];

    const session = {
      user: {
        id: "user-1",
        name: "Teste",
        email: "test@example.com",
      },
      expires: new Date(Date.now() + 60_000).toISOString(),
    } satisfies Session;
    const token: JWT = {
      id: "user-1",
      picture: "https://example.com/avatar.png",
      role: "ADMIN",
    };

    const sessionCallback = authOptions.callbacks?.session;
    expect(sessionCallback).toBeDefined();

    const result = (await sessionCallback?.({
      session,
      token,
    } as SessionCallbackParams)) as Session;

    expect(result.user.id).toBe("user-1");
    expect(result.user.image).toBe("https://example.com/avatar.png");
    expect(result.user.role).toBe("ADMIN");
  });
});
