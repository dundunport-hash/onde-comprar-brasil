import { PaymentStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cart: {
      findMany: vi.fn(),
    },
    cartItem: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getDailyPaidSales,
  getPaidCartMetrics,
  getTopPaidProducts,
} from "./prisma-analytics";

const mockedCartFindMany = prisma.cart.findMany as unknown as Mock;
const mockedCartItemFindMany = prisma.cartItem.findMany as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("prisma analytics aggregations", () => {
  it("calculates paid cart metrics from Prisma results", async () => {
    mockedCartFindMany.mockResolvedValueOnce([
      {
        items: [
          { quantity: 2, unitPrice: 10 },
          { quantity: 1, unitPrice: 4.9 },
        ],
      },
    ]);

    await expect(getPaidCartMetrics()).resolves.toEqual({
      orders: 1,
      revenue: 24.9,
      itemsSold: 3,
    });

    expect(mockedCartFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          paymentStatus: PaymentStatus.PAID,
        },
      }),
    );
  });

  it("groups paid sales by day", async () => {
    mockedCartFindMany.mockResolvedValueOnce([
      {
        paidAt: new Date("2026-05-01T12:00:00.000Z"),
        updatedAt: new Date("2026-05-01T12:00:00.000Z"),
        items: [{ quantity: 2, unitPrice: 15 }],
      },
      {
        paidAt: null,
        updatedAt: new Date("2026-05-01T18:00:00.000Z"),
        items: [{ quantity: 1, unitPrice: 9.5 }],
      },
    ]);

    await expect(
      getDailyPaidSales(new Date("2026-05-01T00:00:00.000Z")),
    ).resolves.toEqual([
      {
        day: new Date(2026, 4, 1),
        orders: 2,
        revenue: 39.5,
      },
    ]);
  });

  it("ranks top products by paid revenue", async () => {
    mockedCartItemFindMany.mockResolvedValueOnce([
      {
        quantity: 1,
        unitPrice: 20,
        product: { id: "p1", name: "Produto A", slug: "produto-a" },
      },
      {
        quantity: 3,
        unitPrice: 9,
        product: { id: "p2", name: "Produto B", slug: "produto-b" },
      },
      {
        quantity: 2,
        unitPrice: 4,
        product: { id: "p1", name: "Produto A", slug: "produto-a" },
      },
    ]);

    await expect(getTopPaidProducts(2)).resolves.toEqual([
      {
        id: "p1",
        name: "Produto A",
        slug: "produto-a",
        quantity: 3,
        revenue: 28,
      },
      {
        id: "p2",
        name: "Produto B",
        slug: "produto-b",
        quantity: 3,
        revenue: 27,
      },
    ]);
  });
});
