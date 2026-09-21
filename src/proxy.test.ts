import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {
    cookies: {
      sessionToken: {
        name: "next-auth.session-token",
      },
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cart: {
      findFirst: vi.fn(),
    },
  },
}));

import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { proxy } from "./proxy";

const mockedGetToken = vi.mocked(getToken);
const mockedFindFirst = prisma.cart.findFirst as unknown as Mock;

function buildRequest(pathname: string, method = "GET") {
  return new NextRequest(`http://localhost:3000${pathname}`, {
    method,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetToken.mockResolvedValue({
    id: "user-1",
  });
});

describe("proxy", () => {
  it("redirects logged users with a paid cart missing an address", async () => {
    mockedFindFirst.mockResolvedValue({
      stripeCheckoutSessionId: "cs_1",
    });

    const response = await proxy(buildRequest("/"));

    expect(mockedFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          NOT: {
            shippingMethod: "pickup",
          },
          checkoutAddress: {
            is: null,
          },
        }),
      }),
    );
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "http://localhost:3000/checkout/endereco?session_id=cs_1",
    );
  });

  it("allows the checkout address page while the address is pending", async () => {
    const response = await proxy(
      buildRequest("/checkout/endereco?session_id=cs_1"),
    );

    expect(response?.status).toBe(200);
    expect(mockedGetToken).not.toHaveBeenCalled();
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("allows navigation when there is no pending checkout address", async () => {
    mockedFindFirst.mockResolvedValue(null);

    const response = await proxy(buildRequest("/about"));

    expect(response?.status).toBe(200);
    expect(response?.headers.get("location")).toBeNull();
  });

  it("does not redirect paid pickup orders without an address", async () => {
    mockedFindFirst.mockResolvedValue(null);

    const response = await proxy(buildRequest("/"));

    expect(mockedFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: {
            shippingMethod: "pickup",
          },
        }),
      }),
    );
    expect(response?.status).toBe(200);
    expect(response?.headers.get("location")).toBeNull();
  });
});
