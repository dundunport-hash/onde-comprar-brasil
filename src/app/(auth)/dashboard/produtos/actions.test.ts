import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { createProduct, deleteProduct, updateProduct } from "./actions";

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedRedirect = vi.mocked(redirect);
const mockedCreate = vi.mocked(prisma.product.create);
const mockedDelete = vi.mocked(prisma.product.delete);
const mockedFindUnique = prisma.product.findUnique as unknown as Mock;
const mockedUpdate = vi.mocked(prisma.product.update);

function buildProductForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    name: "Dipirona 500mg",
    description: "Analgesico em comprimidos",
    technicalData: "Sabor: Chocolate. NCM: 1806 90 00.",
    imageUrl: "https://example.com/dipirona.png",
    imageUrl2: "",
    imageUrl3: "",
    ean: "7891234567890",
    price: "12,90",
    stock: "15",
    lengthCm: "20",
    widthCm: "16",
    heightCm: "5",
    weightKg: "0.5",
    categoryId: "cat-1",
    active: "on",
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
      role: "ADMIN",
    },
  });
});

describe("product actions", () => {
  it("creates a product with a generated slug and price history", async () => {
    mockedFindUnique.mockResolvedValue(null);

    await createProduct(buildProductForm());

    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        name: "Dipirona 500mg",
        description: "Analgesico em comprimidos",
        technicalData: "Sabor: Chocolate. NCM: 1806 90 00.",
        imageUrl: "https://example.com/dipirona.png",
        imageUrl2: null,
        imageUrl3: null,
        ean: BigInt("7891234567890"),
        price: 12.9,
        stock: 15,
        lengthCm: 20,
        widthCm: 16,
        heightCm: 5,
        weightKg: 0.5,
        active: true,
        categoryId: "cat-1",
        slug: "dipirona-500mg",
        prices: {
          create: {
            price: 12.9,
          },
        },
        stocks: {
          create: {
            batch: "Lote inicial",
            quantity: 15,
            reservedQuantity: 0,
            minimumQuantity: 0,
          },
        },
        promotions: undefined,
      },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/produtos");
    expect(mockedRedirect).toHaveBeenCalledWith(
      "/dashboard/produtos?created=1",
    );
  });

  it("creates an initial promotion when an initial discount is provided", async () => {
    mockedFindUnique.mockResolvedValue(null);

    await createProduct(buildProductForm({ initialDiscountPercent: "15" }));

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promotions: {
            create: {
              name: "Desconto inicial",
              description: "Desconto cadastrado junto com o produto.",
              discountPercent: 15,
              discountFixed: 0,
              startDate: expect.any(Date),
              endDate: expect.any(Date),
              active: true,
            },
          },
        }),
      }),
    );
  });

  it("sanitizes persisted product text and image URLs", async () => {
    mockedFindUnique.mockResolvedValue(null);

    await createProduct(
      buildProductForm({
        name: " <strong>Dipirona</strong>   500mg ",
        description: "<em>Analgesico</em>   em comprimidos",
        technicalData: "<strong>Sabor:</strong>   Chocolate.",
        imageUrl: "javascript:alert(1)",
      }),
    );

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Dipirona 500mg",
          description: "Analgesico em comprimidos",
          technicalData: "Sabor: Chocolate.",
          imageUrl: null,
          slug: "dipirona-500mg",
        }),
      }),
    );
  });

  it("accepts decimal price typed with a dot without treating it as thousands", async () => {
    mockedFindUnique.mockResolvedValue(null);

    await createProduct(buildProductForm({ price: "153.51" }));

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          price: 153.51,
        }),
      }),
    );
  });

  it("updates a product and creates a price history entry when price changes", async () => {
    mockedFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ price: 10, _count: { stocks: 1 } });

    await updateProduct("product-1", buildProductForm({ price: "11,50" }));

    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: {
        name: "Dipirona 500mg",
        description: "Analgesico em comprimidos",
        technicalData: "Sabor: Chocolate. NCM: 1806 90 00.",
        imageUrl: "https://example.com/dipirona.png",
        imageUrl2: null,
        imageUrl3: null,
        ean: BigInt("7891234567890"),
        price: 11.5,
        stock: 15,
        lengthCm: 20,
        widthCm: 16,
        heightCm: 5,
        weightKg: 0.5,
        active: true,
        categoryId: "cat-1",
        slug: "dipirona-500mg",
        stocks: undefined,
        prices: {
          create: {
            price: 11.5,
          },
        },
      },
    });
  });

  it("creates an initial stock batch when updating an old product without batches", async () => {
    mockedFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ price: 12.9, _count: { stocks: 0 } });

    await updateProduct("product-1", buildProductForm());

    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stocks: {
            create: {
              batch: "Lote inicial",
              quantity: 15,
              reservedQuantity: 0,
              minimumQuantity: 0,
            },
          },
        }),
      }),
    );
  });

  it("deletes a product", async () => {
    const formData = new FormData();
    formData.set("productId", "product-1");

    await deleteProduct(formData);

    expect(mockedDelete).toHaveBeenCalledWith({
      where: { id: "product-1" },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/produtos");
    expect(mockedRedirect).toHaveBeenCalledWith(
      "/dashboard/produtos?deleted=1",
    );
  });

  it("blocks mutations for non-admin users", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: {
        role: "USER",
      },
    });

    await expect(createProduct(buildProductForm())).rejects.toThrow(
      "Acesso negado.",
    );
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
