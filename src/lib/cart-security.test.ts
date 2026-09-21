import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedCookieSet = vi.fn();
const mockedCookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockedCookieGet,
    set: mockedCookieSet,
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cart: {
      create: vi.fn(async () => ({
        id: "cart-1",
        items: [],
        shippingPrice: null,
      })),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    cartItem: {
      upsert: vi.fn(),
    },
  },
}));

import { CART_COOKIE_NAME, getOrCreateCart } from "./cart";

beforeEach(() => {
  vi.clearAllMocks();
  mockedCookieGet.mockReturnValue(undefined);
});

describe("cart cookie security", () => {
  it("sets anonymous cart cookies with httpOnly and strict sameSite flags", async () => {
    await getOrCreateCart();

    expect(mockedCookieSet).toHaveBeenCalledWith(
      CART_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }),
    );
  });
});
