import { StockMovementType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

const tx = {
  product: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  stock: {
    aggregate: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  stockMovement: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(tx)),
  },
}));

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { createStockMovement } from "./actions";

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedTransaction = prisma.$transaction as unknown as Mock;

function buildMovementForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    productId: "product-1",
    stockId: "",
    type: StockMovementType.IN,
    quantity: "12",
    batch: "L001",
    expirationDate: "2026-12-31",
    reason: "Compra",
    notes: "Entrada inicial",
    ...overrides,
  };

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetServerSession.mockResolvedValue({
    user: {
      id: "user-1",
      role: "ADMIN",
    },
  });
  mockedTransaction.mockImplementation((callback) => callback(tx));
  tx.product.findUnique.mockResolvedValue({ id: "product-1" });
  tx.stock.create.mockResolvedValue({
    id: "stock-1",
    productId: "product-1",
    batch: "L001",
    quantity: 0,
    expirationDate: new Date("2026-12-31T00:00:00"),
  });
  tx.stock.findUnique.mockResolvedValue({
    id: "stock-1",
    productId: "product-1",
    batch: "L001",
    quantity: 20,
    expirationDate: new Date("2026-12-31T00:00:00"),
  });
  tx.stock.aggregate.mockResolvedValue({
    _sum: {
      quantity: 32,
    },
  });
});

describe("createStockMovement", () => {
  it("creates an incoming movement and updates product stock total", async () => {
    await createStockMovement(buildMovementForm());

    expect(tx.stock.create).toHaveBeenCalledWith({
      data: {
        productId: "product-1",
        batch: "L001",
        expirationDate: new Date("2026-12-31T00:00:00"),
      },
    });
    expect(tx.stock.update).toHaveBeenCalledWith({
      where: { id: "stock-1" },
      data: {
        quantity: 12,
        batch: "L001",
        expirationDate: new Date("2026-12-31T00:00:00"),
      },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: {
        type: StockMovementType.IN,
        quantity: 12,
        previousQuantity: 0,
        newQuantity: 12,
        reason: "Compra",
        notes: "Entrada inicial",
        expirationDate: new Date("2026-12-31T00:00:00"),
        productId: "product-1",
        stockId: "stock-1",
        createdById: "user-1",
      },
    });
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: {
        stock: 32,
      },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/estoque");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/produtos");
  });

  it("creates an outgoing audit movement from an existing lot", async () => {
    await createStockMovement(
      buildMovementForm({
        stockId: "stock-1",
        type: StockMovementType.OUT,
        quantity: "5",
      }),
    );

    expect(tx.stock.create).not.toHaveBeenCalled();
    expect(tx.stock.update).toHaveBeenCalledWith({
      where: { id: "stock-1" },
      data: {
        quantity: 15,
        batch: "L001",
        expirationDate: new Date("2026-12-31T00:00:00"),
      },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: StockMovementType.OUT,
        quantity: 5,
        previousQuantity: 20,
        newQuantity: 15,
      }),
    });
  });
});
