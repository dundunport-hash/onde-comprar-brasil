import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/auth-session", () => ({
  getAuthSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cart: {
      findUnique: vi.fn(),
    },
  },
}));

import { getAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const mockedGetAuthSession = vi.mocked(getAuthSession);
const mockedFindCart = prisma.cart.findUnique as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetAuthSession.mockResolvedValue({
    user: {
      id: "admin-1",
      role: "ADMIN",
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  });
  mockedFindCart.mockResolvedValue({
    prescriptionImageUrl:
      "https://res.cloudinary.com/demo/raw/upload/receitas/receita.pdf",
  });
  global.fetch = vi.fn().mockResolvedValue(
    new Response("arquivo original", {
      headers: {
        "content-type": "application/pdf",
      },
    }),
  );
});

describe("GET /dashboard/pedidos/[orderId]/receita", () => {
  it("downloads the original prescription URL saved on the order", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ orderId: "cart-1" }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://res.cloudinary.com/demo/raw/upload/receitas/receita.pdf",
      { cache: "no-store" },
    );
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="receita-cart-1.pdf"',
    );
    await expect(response.text()).resolves.toBe("arquivo original");
  });

  it("keeps the extension when the content type has parameters", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("arquivo original", {
        headers: {
          "content-type": "application/pdf; charset=utf-8",
        },
      }),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ orderId: "cart-1" }),
    });

    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="receita-cart-1.pdf"',
    );
  });

  it("uses the upstream filename extension when available", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("arquivo original", {
        headers: {
          "content-disposition": 'inline; filename="receita-original.png"',
          "content-type": "application/octet-stream",
        },
      }),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ orderId: "cart-1" }),
    });

    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="receita-cart-1.png"',
    );
  });
});
