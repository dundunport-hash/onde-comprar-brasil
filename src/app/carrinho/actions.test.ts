import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/cart", () => ({
  cartHasControlledMedication: vi.fn((cart: { items?: Array<unknown> }) =>
    Boolean(
      cart.items?.some((item) => {
        const category = (
          item as {
            product?: { category?: { name?: string; slug?: string } | null };
          }
        ).product?.category;

        return (
          category?.slug === "medicamentos-controlados" ||
          category?.name?.toLowerCase() === "medicamentos controlados"
        );
      }),
    ),
  ),
  getOrCreateCart: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: vi.fn(),
    },
    cartItem: {
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    coupon: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/shipping", () => ({
  PICKUP_SHIPPING_LABEL: "Retirada na loja",
  PICKUP_SHIPPING_METHOD: "pickup",
  calculateShippingOptionsWithProviders: vi.fn(),
  findShippingOption: (
    options: Array<{ method: string }>,
    method: string | null,
  ) => options.find((option) => option.method === method) ?? options[0],
  validateShippingPostalCode: (postalCode: string) => {
    const normalizedPostalCode = postalCode.replace(/\D/g, "");

    return {
      postalCode: normalizedPostalCode,
      isValid: normalizedPostalCode.length === 8,
      error:
        normalizedPostalCode.length === 8
          ? ""
          : "Informe um CEP com 8 digitos somente números.",
    };
  },
}));

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { getOrCreateCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { calculateShippingOptionsWithProviders } from "@/lib/shipping";
import {
  addCartItem,
  calculateCartShipping,
  clearCart,
  removeCartItem,
  saveControlledMedicationPrescription,
  updateCartItem,
} from "./actions";

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedGetOrCreateCart = vi.mocked(getOrCreateCart) as unknown as Mock;
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedProductFindFirst = prisma.product.findFirst as unknown as Mock;
const mockedCartItemFindUnique = prisma.cartItem.findUnique as unknown as Mock;
const mockedCartItemFindFirst = prisma.cartItem.findFirst as unknown as Mock;
const mockedCartItemUpsert = prisma.cartItem.upsert as unknown as Mock;
const mockedCartItemUpdate = prisma.cartItem.update as unknown as Mock;
const mockedCartItemDelete = prisma.cartItem.delete as unknown as Mock;
const mockedCartItemDeleteMany = prisma.cartItem.deleteMany as unknown as Mock;
const mockedCartFindUnique = prisma.cart.findUnique as unknown as Mock;
const mockedCartUpdate = prisma.cart.update as unknown as Mock;
const mockedCouponFindUnique = prisma.coupon.findUnique as unknown as Mock;
const mockedCalculateShippingOptionsWithProviders = vi.mocked(
  calculateShippingOptionsWithProviders,
) as unknown as Mock;
const clearedShippingData = {
  shippingPostalCode: null,
  shippingMethod: null,
  shippingLabel: null,
  shippingPrice: null,
  shippingEstimatedDays: null,
  shippingCalculatedAt: null,
};

function buildForm(values: Record<string, string>) {
  const formData = new FormData();

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
    },
  });
  mockedGetOrCreateCart.mockResolvedValue({ id: "cart-1" });
  mockedCartFindUnique.mockResolvedValue({
    id: "cart-1",
    items: [],
  });
  mockedProductFindFirst.mockResolvedValue({
    id: "product-1",
    name: "Dipirona",
    price: 10,
    stock: 5,
    active: true,
    promotions: [],
  });
  mockedCartItemFindUnique.mockResolvedValue(null);
  mockedCartItemFindFirst.mockResolvedValue({
    product: {
      id: "product-1",
      name: "Dipirona",
      price: 10,
      stock: 5,
      active: true,
      promotions: [],
    },
  });
  mockedCalculateShippingOptionsWithProviders.mockResolvedValue([
    {
      method: "standard",
      label: "Melhor Envio Standard",
      price: 15,
      estimatedDays: 2,
    },
    {
      method: "express",
      label: "Melhor Envio Express",
      price: 27.9,
      estimatedDays: 1,
    },
  ]);
  mockedCouponFindUnique.mockResolvedValue({
    id: "coupon-1",
    code: "SAUDE10",
    discountPercent: 10,
    active: true,
    products: [{ productId: "product-1" }],
  });
});

describe("calculateCartShipping", () => {
  it("stores the selected shipping option in the cart", async () => {
    mockedGetOrCreateCart.mockResolvedValue({
      id: "cart-1",
      items: [
        {
          quantity: 2,
          unitPrice: 10,
        },
      ],
    });

    const result = await calculateCartShipping(
      {
        status: "idle",
        message: "",
        fulfillmentMethod: "shipping",
        postalCode: "",
        selectedMethod: "standard",
        options: [],
      },
      buildForm({
        postalCode: "01001-000",
        shippingMethod: "express",
      }),
    );

    expect(result.status).toBe("success");
    expect(result.selectedMethod).toBe("express");
    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: expect.objectContaining({
        shippingPostalCode: "01001000",
        shippingMethod: "express",
        shippingLabel: "Melhor Envio Express",
        shippingPrice: 27.9,
        shippingEstimatedDays: 1,
        shippingCalculatedAt: expect.any(Date),
      }),
    });
  });

  it("stores pickup in store without charging shipping", async () => {
    mockedGetOrCreateCart.mockResolvedValue({
      id: "cart-1",
      items: [
        {
          quantity: 1,
          unitPrice: 10,
        },
      ],
    });

    const result = await calculateCartShipping(
      {
        status: "idle",
        message: "",
        fulfillmentMethod: "shipping",
        postalCode: "01001000",
        selectedMethod: "standard",
        options: [],
      },
      buildForm({
        fulfillmentMethod: "pickup",
      }),
    );

    expect(result).toMatchObject({
      status: "success",
      fulfillmentMethod: "pickup",
      message: "Retirada na loja selecionada.",
      postalCode: "",
      options: [],
    });
    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: expect.objectContaining({
        shippingPostalCode: null,
        shippingMethod: "pickup",
        shippingLabel: "Retirada na loja",
        shippingPrice: 0,
        shippingEstimatedDays: null,
        shippingCalculatedAt: expect.any(Date),
      }),
    });
  });

  it("forces pickup when the cart has controlled medication", async () => {
    mockedGetOrCreateCart.mockResolvedValue({
      id: "cart-1",
      items: [
        {
          quantity: 1,
          unitPrice: 10,
          product: {
            category: {
              name: "Medicamentos Controlados",
              slug: "medicamentos-controlados",
            },
          },
        },
      ],
    });

    const result = await calculateCartShipping(
      {
        status: "idle",
        message: "",
        fulfillmentMethod: "shipping",
        postalCode: "",
        selectedMethod: "standard",
        options: [],
      },
      buildForm({
        postalCode: "01001-000",
        shippingMethod: "express",
      }),
    );

    expect(result).toMatchObject({
      status: "success",
      fulfillmentMethod: "pickup",
      message:
        "Medicamentos controlados exigem receita e retirada obrigatoria na loja.",
      postalCode: "",
      options: [],
    });
    expect(mockedCalculateShippingOptionsWithProviders).not.toHaveBeenCalled();
    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: expect.objectContaining({
        shippingMethod: "pickup",
        shippingLabel: "Retirada na loja",
        shippingPrice: 0,
      }),
    });
  });

  it("returns an error for invalid postal codes", async () => {
    const result = await calculateCartShipping(
      {
        status: "idle",
        message: "",
        fulfillmentMethod: "shipping",
        postalCode: "",
        selectedMethod: "standard",
        options: [],
      },
      buildForm({
        postalCode: "123",
        shippingMethod: "standard",
      }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Informe um CEP com 8 digitos somente números.",
      postalCode: "123",
    });
    expect(mockedCartUpdate).not.toHaveBeenCalled();
  });

  it("does not store a fallback estimate when shipping providers fail", async () => {
    mockedGetOrCreateCart.mockResolvedValue({
      id: "cart-1",
      items: [
        {
          quantity: 1,
          unitPrice: 10,
        },
      ],
    });
    mockedCalculateShippingOptionsWithProviders.mockRejectedValueOnce(
      new Error("Provedor de frete indisponivel."),
    );

    const result = await calculateCartShipping(
      {
        status: "idle",
        message: "",
        fulfillmentMethod: "shipping",
        postalCode: "",
        selectedMethod: "standard",
        options: [],
      },
      buildForm({
        postalCode: "01001-000",
        shippingMethod: "standard",
      }),
    );

    expect(result).toMatchObject({
      status: "error",
      message:
        "Nao foi possivel calcular o frete pelos provedores disponiveis: Provedor de frete indisponivel.",
      postalCode: "01001000",
    });
    expect(mockedCartUpdate).not.toHaveBeenCalled();
  });
});

describe("cart actions", () => {
  it("adds an item using the promotional unit price", async () => {
    mockedProductFindFirst.mockResolvedValue({
      id: "product-1",
      name: "Dipirona",
      price: 10,
      stock: 5,
      active: true,
      promotions: [
        {
          name: "Oferta",
          discountPercent: 20,
          discountFixed: 0,
          active: true,
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-12-31T23:59:59.999Z"),
        },
      ],
    });

    await addCartItem(
      buildForm({
        productId: "product-1",
        quantity: "2",
      }),
    );

    expect(mockedGetOrCreateCart).toHaveBeenCalledWith("user-1");
    expect(mockedCartItemUpsert).toHaveBeenCalledWith({
      where: {
        cartId_productId: {
          cartId: "cart-1",
          productId: "product-1",
        },
      },
      create: {
        cartId: "cart-1",
        productId: "product-1",
        quantity: 2,
        baseUnitPrice: 8,
        unitPrice: 8,
        couponId: null,
        couponCode: null,
        couponDiscountPercent: null,
        couponDiscountAmount: 0,
        couponFinalUnitPrice: null,
      },
      update: {
        quantity: {
          increment: 2,
        },
        baseUnitPrice: 8,
        unitPrice: 8,
        couponId: null,
        couponCode: null,
        couponDiscountPercent: null,
        couponDiscountAmount: 0,
        couponFinalUnitPrice: null,
      },
    });
    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: clearedShippingData,
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/checkout/pagamento");
  });

  it("forces pickup after adding a controlled medication", async () => {
    mockedCartFindUnique.mockResolvedValueOnce({
      id: "cart-1",
      items: [
        {
          product: {
            category: {
              name: "Medicamentos Controlados",
              slug: "medicamentos-controlados",
            },
          },
        },
      ],
    });

    await addCartItem(
      buildForm({
        productId: "product-1",
        quantity: "1",
      }),
    );

    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: expect.objectContaining({
        shippingMethod: "pickup",
        shippingLabel: "Retirada na loja",
        shippingPrice: 0,
      }),
    });
  });

  it("adds an item with a valid product coupon already applied", async () => {
    await addCartItem(
      buildForm({
        productId: "product-1",
        quantity: "1",
        couponCode: "SAUDE10",
      }),
    );

    expect(mockedCouponFindUnique).toHaveBeenCalledWith({
      where: {
        code: "SAUDE10",
      },
      select: {
        id: true,
        code: true,
        discountPercent: true,
        active: true,
        products: {
          where: {
            productId: "product-1",
          },
          select: {
            productId: true,
          },
          take: 1,
        },
      },
    });
    expect(mockedCartItemUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          baseUnitPrice: 10,
          unitPrice: 9,
          couponId: "coupon-1",
          couponCode: "SAUDE10",
          couponDiscountPercent: 10,
          couponDiscountAmount: 1,
          couponFinalUnitPrice: 9,
        }),
        update: expect.objectContaining({
          baseUnitPrice: 10,
          unitPrice: 9,
          couponId: "coupon-1",
          couponCode: "SAUDE10",
          couponDiscountPercent: 10,
          couponDiscountAmount: 1,
          couponFinalUnitPrice: 9,
        }),
      }),
    );
  });

  it("saves the prescription image for a controlled medication cart", async () => {
    mockedGetOrCreateCart.mockResolvedValueOnce({
      id: "cart-1",
      items: [
        {
          product: {
            category: {
              name: "Medicamentos Controlados",
              slug: "medicamentos-controlados",
            },
          },
        },
      ],
    });

    await saveControlledMedicationPrescription(
      buildForm({
        prescriptionImageUrl: "https://res.cloudinary.com/demo/receita.webp",
      }),
    );

    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: {
        prescriptionImageUrl: "https://res.cloudinary.com/demo/receita.webp",
        prescriptionUploadedAt: expect.any(Date),
      },
    });
    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: expect.objectContaining({
        shippingMethod: "pickup",
        shippingPrice: 0,
      }),
    });
  });

  it("blocks adding more units than available stock", async () => {
    mockedCartItemFindUnique.mockResolvedValue({ quantity: 4 });

    await expect(
      addCartItem(
        buildForm({
          productId: "product-1",
          quantity: "2",
        }),
      ),
    ).rejects.toThrow("Desse produto temos somente 5 unidades no estoque");

    expect(mockedCartItemUpsert).not.toHaveBeenCalled();
  });

  it("updates an item quantity after stock validation", async () => {
    await updateCartItem(
      buildForm({
        cartItemId: "item-1",
        quantity: "3",
      }),
    );

    expect(mockedCartItemUpdate).toHaveBeenCalledWith({
      where: {
        id: "item-1",
        cartId: "cart-1",
      },
      data: {
        quantity: 3,
      },
    });
    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: clearedShippingData,
    });
  });

  it("removes and clears cart items", async () => {
    await removeCartItem(buildForm({ cartItemId: "item-1" }));
    await clearCart();

    expect(mockedCartItemDelete).toHaveBeenCalledWith({
      where: {
        id: "item-1",
        cartId: "cart-1",
      },
    });
    expect(mockedCartItemDeleteMany).toHaveBeenCalledWith({
      where: {
        cartId: "cart-1",
      },
    });
    expect(mockedCartUpdate).toHaveBeenCalledTimes(2);
    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: clearedShippingData,
    });
  });
});
