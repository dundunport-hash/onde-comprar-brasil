import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { CartStatus, PaymentStatus, StockMovementType } from "@prisma/client";

const tx = {
  cart: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  product: {
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  stock: {
    aggregate: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  stockMovement: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(tx)),
    cart: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/melhor-envio", () => ({
  createMelhorEnvioShipment: vi.fn(),
}));

import { createMelhorEnvioShipment } from "@/lib/melhor-envio";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fulfillPaidCart } from "./checkout-fulfillment";

const mockedTransaction = prisma.$transaction as unknown as Mock;
const mockedPrismaCartFindFirst = prisma.cart.findFirst as unknown as Mock;
const mockedPrismaCartUpdateMany = prisma.cart.updateMany as unknown as Mock;
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedCreateMelhorEnvioShipment = vi.mocked(
  createMelhorEnvioShipment,
) as unknown as Mock;

const baseCart = {
  id: "cart-1",
  userId: "user-1",
  paidAt: null,
  stockDeductedAt: null,
  shippingMethod: "express",
  shippingPrice: 27.9,
  shipmentId: null,
  checkoutAddress: {
    fullName: "Cliente Teste",
    document: "93541134780",
    phone: "19999999999",
    postalCode: "01001000",
    street: "Rua Teste",
    number: "123",
    complement: null,
    neighborhood: "Centro",
    city: "Sao Paulo",
    state: "SP",
  },
  items: [
    {
      productId: "product-1",
      quantity: 3,
      product: {
        id: "product-1",
        name: "Produto Teste",
        active: true,
        stock: 10,
      },
    },
  ],
};

const stockLot = {
  id: "stock-1",
  productId: "product-1",
  batch: "L001",
  quantity: 5,
  expirationDate: new Date("2026-12-31T00:00:00"),
  createdAt: new Date("2026-01-01T00:00:00"),
  updatedAt: new Date("2026-01-01T00:00:00"),
  reservedQuantity: 0,
  minimumQuantity: 0,
  receivedAt: new Date("2026-01-01T00:00:00"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedTransaction.mockImplementation((callback) => callback(tx));
  tx.cart.findFirst.mockResolvedValue(baseCart);
  tx.cart.updateMany.mockResolvedValue({ count: 1 });
  tx.product.updateMany.mockResolvedValue({ count: 1 });
  tx.stock.findMany.mockResolvedValue([stockLot]);
  tx.stock.aggregate.mockResolvedValue({
    _sum: {
      quantity: 7,
    },
  });
  mockedPrismaCartFindFirst.mockResolvedValue({
    ...baseCart,
    paidAt: new Date("2026-05-17T10:00:00"),
  });
  mockedPrismaCartUpdateMany.mockResolvedValue({ count: 1 });
  mockedCreateMelhorEnvioShipment.mockResolvedValue({
    id: "shipment-1",
    trackingCode: "AA123456789BR",
    labelRequestId: "https://melhorenvio.test/label.pdf",
    rawCart: { id: "shipment-1" },
    rawCheckout: { paid: true },
    rawGenerate: { generated: true },
    rawPrint: { url: "https://melhorenvio.test/label.pdf" },
  });
});

describe("fulfillPaidCart", () => {
  it("deducts product stock, stock lot and creates an outgoing movement", async () => {
    const result = await fulfillPaidCart({
      cartId: "cart-1",
      userId: "user-1",
      stripeCheckoutSessionId: "cs_1",
      stripePaymentIntentId: "pi_1",
    });

    expect(result).toEqual({ fulfilled: true, reason: "paid" });
    expect(tx.cart.updateMany).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
        stockDeductedAt: null,
      },
      data: {
        stockDeductedAt: expect.any(Date),
      },
    });
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: "product-1",
        active: true,
        stock: {
          gte: 3,
        },
      },
      data: {
        stock: {
          decrement: 3,
        },
      },
    });
    expect(tx.stock.update).toHaveBeenCalledWith({
      where: {
        id: "stock-1",
      },
      data: {
        quantity: 2,
      },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: {
        type: StockMovementType.OUT,
        quantity: 3,
        previousQuantity: 5,
        newQuantity: 2,
        reason: "Venda checkout",
        notes: "Baixa automatica do carrinho cart-1.",
        expirationDate: new Date("2026-12-31T00:00:00"),
        productId: "product-1",
        stockId: "stock-1",
      },
    });
    expect(tx.product.update).toHaveBeenCalledWith({
      where: {
        id: "product-1",
      },
      data: {
        stock: 7,
      },
    });
    expect(tx.cart.update).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: expect.objectContaining({
        status: CartStatus.AWAITING_SHIPMENT,
        paymentStatus: PaymentStatus.PAID,
        stripeCheckoutSessionId: "cs_1",
        stripePaymentIntentId: "pi_1",
        paidAt: expect.any(Date),
        stockDeductedAt: expect.any(Date),
      }),
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mockedCreateMelhorEnvioShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        cartId: "cart-1",
        method: "express",
        shippingPrice: 27.9,
      }),
    );
    expect(mockedPrismaCartUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
        shipmentId: null,
      },
      data: expect.objectContaining({
        shipmentId: "shipment-1",
        shipmentTrackingCode: "AA123456789BR",
        shipmentLabelRequestId: "https://melhorenvio.test/label.pdf",
        shipmentStatus: "created",
      }),
    });
  });

  it("does not deduct stock again when cart was already deducted", async () => {
    tx.cart.findFirst.mockResolvedValueOnce({
      ...baseCart,
      stockDeductedAt: new Date("2026-05-17T10:00:00"),
    });

    await fulfillPaidCart({
      stripeCheckoutSessionId: "cs_1",
      userId: "user-1",
    });

    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.cart.updateMany).not.toHaveBeenCalled();
    expect(tx.stock.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("does not deduct stock when another fulfillment already claimed the cart", async () => {
    tx.cart.updateMany.mockResolvedValueOnce({ count: 0 });
    tx.cart.findFirst.mockResolvedValueOnce(baseCart).mockResolvedValueOnce({
      stockDeductedAt: new Date("2026-05-17T10:00:00"),
    });

    await fulfillPaidCart({
      stripeCheckoutSessionId: "cs_1",
      userId: "user-1",
    });

    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.stock.update).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("creates a legacy lot when product stock has no matching lot rows", async () => {
    tx.stock.findMany.mockResolvedValueOnce([]);
    tx.stock.create.mockResolvedValueOnce({
      ...stockLot,
      id: "stock-legacy",
      batch: "LEGADO",
      quantity: 10,
      expirationDate: null,
    });

    await fulfillPaidCart({
      stripeCheckoutSessionId: "cs_1",
      userId: "user-1",
    });

    expect(tx.stock.create).toHaveBeenCalledWith({
      data: {
        productId: "product-1",
        batch: "LEGADO",
        quantity: 10,
      },
    });
    expect(tx.stock.update).toHaveBeenCalledWith({
      where: {
        id: "stock-legacy",
      },
      data: {
        quantity: 7,
      },
    });
  });

  it("does not fulfill carts when the Stripe session has no matching user", async () => {
    const result = await fulfillPaidCart({
      cartId: "cart-1",
      stripeCheckoutSessionId: "cs_1",
      stripePaymentIntentId: "pi_1",
    });

    expect(result).toEqual({ fulfilled: false, reason: "user-mismatch" });
    expect(tx.cart.updateMany).not.toHaveBeenCalled();
    expect(tx.cart.update).not.toHaveBeenCalled();
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });
});
