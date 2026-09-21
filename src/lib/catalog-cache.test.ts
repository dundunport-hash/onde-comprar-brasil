import { beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_TAGS } from "./cache-tags";

const { prismaMock, unstableCacheMock } = vi.hoisted(() => ({
  prismaMock: {
    category: {
      findMany: vi.fn(),
    },
    product: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  unstableCacheMock: vi.fn(
    <Callback extends (...args: never[]) => unknown>(callback: Callback) =>
      callback,
  ),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: unstableCacheMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  getCachedActiveProductOptions,
  getCachedCatalogCategories,
  getCachedCatalogProductCount,
  getCachedCatalogProducts,
  getCachedProductBySlug,
  getCachedProductMetadataBySlug,
} from "./catalog-cache";

beforeEach(() => {
  prismaMock.category.findMany.mockClear();
  prismaMock.product.count.mockClear();
  prismaMock.product.findMany.mockClear();
  prismaMock.product.findUnique.mockClear();
});

describe("catalog cache", () => {
  it("wraps catalog reads with cache keys, ttl and tags", () => {
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["catalog-categories"],
      {
        revalidate: 300,
        tags: [CACHE_TAGS.catalogCategories],
      },
    );
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["catalog-products"],
      {
        revalidate: 300,
        tags: [
          CACHE_TAGS.catalogProducts,
          CACHE_TAGS.catalogPromotions,
          CACHE_TAGS.catalogStock,
        ],
      },
    );
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["catalog-active-product-options"],
      {
        revalidate: 300,
        tags: [CACHE_TAGS.catalogProducts],
      },
    );
  });

  it("uses cached category and product option queries", async () => {
    prismaMock.category.findMany.mockResolvedValueOnce([]);
    prismaMock.product.findMany.mockResolvedValueOnce([]);

    await getCachedCatalogCategories();
    await getCachedActiveProductOptions();

    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });
  });

  it("uses cached filtered product list queries", async () => {
    prismaMock.product.count.mockResolvedValueOnce(1);
    prismaMock.product.findMany.mockResolvedValueOnce([
      {
        id: "product-1",
        ean: BigInt("7891234567890"),
      },
    ]);

    const filters = {
      q: "dor",
      categoryId: "cat-1",
      status: "active",
      stock: "available",
    };

    await getCachedCatalogProductCount(filters);
    const products = await getCachedCatalogProducts({
      filters,
      page: 2,
      sort: "price-desc",
    });

    const expectedWhere = {
      OR: [
        { name: { contains: "dor", mode: "insensitive" } },
        { slug: { contains: "dor", mode: "insensitive" } },
        { description: { contains: "dor", mode: "insensitive" } },
      ],
      categoryId: "cat-1",
      active: true,
      stock: {
        gt: 0,
      },
    };

    expect(prismaMock.product.count).toHaveBeenCalledWith({
      where: expectedWhere,
    });
    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        orderBy: {
          price: "desc",
        },
        skip: 15,
        take: 15,
      }),
    );
    expect(products[0].ean).toBe("7891234567890");
  });

  it("uses cached product detail and metadata queries", async () => {
    prismaMock.product.findUnique
      .mockResolvedValueOnce({
        id: "product-1",
        ean: BigInt("7891234567890"),
      })
      .mockResolvedValueOnce(null);

    const product = await getCachedProductBySlug("dipirona");
    await getCachedProductMetadataBySlug("dipirona");

    expect(prismaMock.product.findUnique).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          slug: "dipirona",
        },
        include: expect.objectContaining({
          category: expect.any(Object),
          promotions: expect.any(Object),
          stocks: expect.any(Object),
        }),
      }),
    );
    expect(prismaMock.product.findUnique).toHaveBeenNthCalledWith(2, {
      where: {
        slug: "dipirona",
      },
      select: {
        name: true,
        description: true,
        imageUrl: true,
      },
    });
    expect(product?.ean).toBe("7891234567890");
  });
});
